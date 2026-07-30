"""Best-effort resolution of a real Magic card name out of noisy free text —
built for eBay listing titles (e.g. "MTG [FIC-295 NM] Hellkite Tyrant",
"MTG - RMS TITANIC - Doctor Who (R)"), which have no structured name/set
split unlike every other scraper's own parsed card_name (see ebay.py).

Cross-references against two Scryfall bulk datasets:
  - "Oracle Cards" (one entry per unique card, ~38k) for real card names,
    including each face of split/MDFC/Adventure cards individually (a title
    naming just one face, e.g. "Bonecrusher Giant", is the common case).
  - "Default Cards" (~116k printings) for flavor-name reskins used by
    Universes Beyond crossovers — e.g. a Transformers-crossover printing of
    Blightsteel Colossus is flavor-texted "Megatron" on the card itself and
    that's what sellers title the listing after, not the real rules name.

Both are streamed and gzip-decompressed incrementally rather than loaded
into memory whole — "Default Cards" alone decompresses to several hundred
MB, which OOM'd a decompress-then-parse-everything first attempt on this
project's (memory-constrained) host. Reduced to name-only data and cached
to disk (a few MB total), so this is a network fetch on first use per
deploy (or after _CACHE_MAX_AGE) and free (in-memory) afterwards.
"""

import asyncio
import json
import logging
import os
import re
import time
import zlib
from collections.abc import AsyncIterator

import httpx

logger = logging.getLogger(__name__)

_CACHE_PATH = "/data/card_names_cache.json"
_CACHE_MAX_AGE = 7 * 24 * 60 * 60  # seconds
_BULK_DATA_URL = "https://api.scryfall.com/bulk-data"
_HEADERS = {"User-Agent": "cardsniffer (github.com/timhedley/cardsniffer)", "Accept": "*/*"}

_TOKEN_RE = re.compile(r"[a-z0-9']+")

# token-tuple -> canonical name, bucketed by first token for a fast narrow-down
# instead of scanning every one of the ~40k known names per lookup.
_index: dict[str, list[tuple[tuple[str, ...], str]]] | None = None
_lock = asyncio.Lock()


def _tokenize(text: str) -> tuple[str, ...]:
    return tuple(_TOKEN_RE.findall(text.lower()))


async def _iter_jsonl_gz(client: httpx.AsyncClient, url: str) -> AsyncIterator[dict]:
    """Streams a Scryfall .jsonl.gz bulk file and yields one parsed dict per
    line, decompressing incrementally — never holds the full (un)compressed
    payload in memory at once, unlike gzip.decompress() on the whole body."""
    decompressor = zlib.decompressobj(zlib.MAX_WBITS | 16)
    buffer = ""
    async with client.stream("GET", url) as response:
        response.raise_for_status()
        async for chunk in response.aiter_bytes():
            buffer += decompressor.decompress(chunk).decode("utf-8", errors="ignore")
            *lines, buffer = buffer.split("\n")
            for line in lines:
                if line:
                    yield json.loads(line)
        tail = decompressor.flush()
        if tail:
            buffer += tail.decode("utf-8", errors="ignore")
        if buffer.strip():
            yield json.loads(buffer)


async def _bulk_download_uri(client: httpx.AsyncClient, bulk_type: str) -> str:
    manifest = (await client.get(_BULK_DATA_URL)).json()
    entry = next(d for d in manifest["data"] if d["type"] == bulk_type)
    return entry["jsonl_download_uri"]


async def _fetch_oracle_names(client: httpx.AsyncClient) -> list[dict]:
    """One record per unique card: {"name": ..., "faces": [...]} — faces only
    present (and only when they differ in a useful way) for split/MDFC/
    Adventure cards."""
    url = await _bulk_download_uri(client, "oracle_cards")
    names_data = []
    async for card in _iter_jsonl_gz(client, url):
        record = {"name": card["name"]}
        faces = card.get("card_faces")
        if faces:
            face_names = [f["name"] for f in faces if f.get("name")]
            if face_names:
                record["faces"] = face_names
        names_data.append(record)
    return names_data


async def _fetch_flavor_pairs(client: httpx.AsyncClient) -> list[list[str]]:
    """[flavor_name, real_name] pairs from Universes Beyond-style crossover
    reskins (e.g. ["Megatron", "Blightsteel Colossus"]) — only ~600 of
    ~116k printings carry one, at either the whole-card or per-face level."""
    url = await _bulk_download_uri(client, "default_cards")
    pairs = []
    async for card in _iter_jsonl_gz(client, url):
        flavor = card.get("flavor_name")
        if flavor:
            pairs.append([flavor, card["name"]])
        for face in card.get("card_faces") or ():
            face_flavor = face.get("flavor_name")
            if face_flavor and face.get("name"):
                pairs.append([face_flavor, face["name"]])
    return pairs


def _build_index(
    names_data: list[dict], flavor_pairs: list[list[str]]
) -> dict[str, list[tuple[tuple[str, ...], str]]]:
    index: dict[str, list[tuple[tuple[str, ...], str]]] = {}
    seen: set[tuple[str, ...]] = set()

    def add(candidate: str, canonical: str) -> None:
        tokens = _tokenize(candidate)
        if not tokens or tokens in seen:
            return
        seen.add(tokens)
        index.setdefault(tokens[0], []).append((tokens, canonical))

    for entry in names_data:
        combined = entry["name"]
        # The combined name ("Fire // Ice") only wins when a title actually
        # mentions both halves; each face also maps to *its own* name, not
        # the combined one — otherwise a title naming just one face (by far
        # the common case for Adventures/MDFCs, e.g. "Bonecrusher Giant")
        # would resolve to the clunky two-name form. Some art-card variants
        # even have two identical face names, which without this would
        # resolve to a nonsensical "X // X".
        add(combined, combined)
        for face_name in entry.get("faces", ()):
            add(face_name, face_name)

    # Flavor names last: real names take priority in the (extremely
    # unlikely) event of an identical-token collision between the two sets.
    for flavor, real in flavor_pairs:
        add(flavor, real)

    return index


def _load_cache() -> dict | None:
    if not os.path.exists(_CACHE_PATH):
        return None
    if time.time() - os.path.getmtime(_CACHE_PATH) > _CACHE_MAX_AGE:
        return None
    try:
        with open(_CACHE_PATH) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


async def _fetch_and_cache() -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=120.0, headers=_HEADERS, follow_redirects=True) as client:
            names_data = await _fetch_oracle_names(client)
            flavor_pairs = await _fetch_flavor_pairs(client)
    except Exception as e:
        logger.warning(f"carddb: failed to fetch Scryfall card data: {e}")
        return None

    cache = {"names": names_data, "flavors": flavor_pairs}
    try:
        with open(_CACHE_PATH, "w") as f:
            json.dump(cache, f)
    except OSError as e:
        logger.warning(f"carddb: failed to write card name cache: {e}")

    logger.info(f"carddb: refreshed card name index ({len(names_data)} cards, {len(flavor_pairs)} flavor names)")
    return cache


async def _ensure_index() -> None:
    global _index
    if _index is not None:
        return
    async with _lock:
        if _index is not None:  # another caller already won the race
            return
        cache = _load_cache()
        try:
            if cache is not None:
                _index = _build_index(cache["names"], cache["flavors"])
                return
        except (KeyError, TypeError):
            logger.warning("carddb: on-disk cache is an older/incompatible format, refetching")
        cache = await _fetch_and_cache()
        if cache is not None:
            _index = _build_index(cache["names"], cache["flavors"])


async def match_card_name(text: str) -> str | None:
    """The longest known Magic card name — or a single face of a split/MDFC/
    Adventure card, or a Universes Beyond flavor-name reskin — found as a
    contiguous, whole-word run inside `text`, resolved to its canonical
    Scryfall/rules name. None if the index isn't available (first-ever fetch
    failed) or nothing matched."""
    await _ensure_index()
    if _index is None:
        return None

    tokens = _tokenize(text)
    best: tuple[int, str] | None = None  # (token length, canonical name)
    for start, token in enumerate(tokens):
        for candidate_tokens, canonical in _index.get(token, ()):
            length = len(candidate_tokens)
            if best is not None and length <= best[0]:
                continue
            if tokens[start:start + length] == candidate_tokens:
                best = (length, canonical)
    return best[1] if best else None
