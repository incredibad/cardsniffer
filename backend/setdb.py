"""Maps each store's free-text set field onto Scryfall's own set code +
canonical name, so the search results' "Set" filter can group rows by the
same real set even though every scraper's own text/format differs — e.g.
Card Kingdom emits a plain name ("Foundations"), Hareruya emits a bare set
code ("LEB"), and several scrapers (goodgames, guf, hareruya, mtgmintcard)
append a " — <treatment>" suffix of their own onto whichever of those it is.

Unlike carddb.py's two Scryfall bulk-data files (hundreds of MB decompressed,
needing incremental streaming), Scryfall's /sets endpoint is one plain JSON
response covering every set (~1000 entries, a few hundred KB) — no streaming
needed, same on-disk cache convention as carddb.py.
"""

import asyncio
import json
import logging
import os
import re
import time

import httpx

logger = logging.getLogger(__name__)

_CACHE_PATH = "/data/set_names_cache.json"
_CACHE_MAX_AGE = 7 * 24 * 60 * 60  # seconds
_SETS_URL = "https://api.scryfall.com/sets"
_HEADERS = {"User-Agent": "cardsniffer (github.com/timhedley/cardsniffer)", "Accept": "*/*"}

# eBay has no structured set field — sellers who do name a set tend to
# bracket or parenthesize it, either as a bare code ("[DOM]", "(FDN)"), a
# full name ("[Dominaria]"), or a code-collector pair ("[FIC-295 NM]", as in
# carddb.py's docstring example).
_EBAY_BRACKET_RE = re.compile(r"[\[(]([^\[\]()]+)[\])]")
_LEADING_CODE_RE = re.compile(r"^[A-Za-z0-9]{2,5}")

# Falling back to this after the bracket/paren check finds nothing: any
# whole-word set code OR full set name appearing free-form elsewhere in the
# title (e.g. "MTG Llanowar Elves NM Near Mint FDN", or "...Dominaria mtg
# Green...", neither with any delimiter at all) — same longest-contiguous-
# token-run approach as carddb.py's card-name matching, so a multi-word name
# always wins over a shorter/coincidental single-token match at the same
# position (e.g. "The Brothers' War" beats a bare "war" landing on the
# wrong, similarly-worded War of the Spark). Checked empirically against
# ~1,100 real listings across 6 staple cards before adding the bare-code
# half of this — including the ~5% of set codes that double as ordinary
# English words (war/one/all/who/mar/...): true hits outnumbered false ones
# roughly 5 to 1 (things like "ICE AGE"/"Doctor Who"/"Marvel Spider-Man"
# spelled out in the title outnumbering stray words like "Free-for-**all**"
# landing on an unrelated, similarly-worded set) — worth the occasional
# mislabeled row to not leave three-quarters of eBay unfiltered by set.
_TOKEN_RE = re.compile(r"[a-z0-9']+")


def _tokenize(text: str) -> tuple[str, ...]:
    return tuple(_TOKEN_RE.findall(text.lower()))

# Colloquial/vendor set names that don't match Scryfall's own canonical name
# for the same set — confirmed live against Card Kingdom, which uses these
# for its older-edition and pre-2016 core-set listings. Normalized alias ->
# normalized Scryfall name.
_NAME_ALIASES = {
    "3rd edition": "revised edition",
    "3rd edition / revised": "revised edition",
    "4th edition": "fourth edition",
    "4th edition - alternate": "fourth edition",
    "5th edition": "fifth edition",
    "6th edition": "classic sixth edition",
    "7th edition": "seventh edition",
    "8th edition": "eighth edition",
    "9th edition": "ninth edition",
    "10th edition": "tenth edition",
    "unlimited": "unlimited edition",
    "alpha": "limited edition alpha",
    "beta": "limited edition beta",
    "collectors ed": "collectors' edition",
    "collectors ed intl": "intl. collectors' edition",
    "battle royale": "battle royale box set",
    "beatdown": "beatdown box set",
    "2010 core set": "magic 2010",
    "2011 core set": "magic 2011",
    "2012 core set": "magic 2012",
    "2013 core set": "magic 2013",
    "2014 core set": "magic 2014",
    "2015 core set": "magic 2015",
    "magic 30th anniversary edition": "30th anniversary edition",
    "foundations variants": "foundations",
    # Scryfall groups virtually every general Secret Lair Drop release under
    # one running set ("sld") rather than one set per drop, which happens to
    # line up with Card Kingdom/SCG's own single "Secret Lair" bucket.
    "secret lair": "secret lair drop",
    # Scryfall's own name is "Strixhaven Mystical Archive" — singular, no
    # colon — but most stores (and eBay sellers) write the plural "Archives",
    # which the free-text scanner's exact-token-run match won't bridge on
    # its own since "archives" and "archive" are different tokens.
    "strixhaven: mystical archives": "strixhaven mystical archive",
    "strixhaven mystical archives": "strixhaven mystical archive",
    "strixhaven: school of mages mystical archives": "strixhaven mystical archive",
    # Card Kingdom drops "Universe"/"Commander" entirely from these two —
    # each is that store's only product for the set, so no ambiguity.
    "marvel eternal-legal": "marvel universe",
    "universes beyond: warhammer 40,000": "warhammer 40,000 commander",
    # Hareruya's own numbered-edition convention ("<N>ED") matches Scryfall's
    # own code for every other numbered edition (2ed..9ed) — only Tenth
    # Edition's real code breaks the pattern ("10e", not "10ed").
    "10ed": "tenth edition",
    # MTGMintCard's own phrasing/punctuation for two older products.
    "collector's edition international": "intl. collectors' edition",
    "fire & lightning": "premium deck series: fire and lightning",
    # Star City Games's own name for the LOTR Commander decks — Scryfall
    # drops "The Lord of the Rings:" entirely and keeps only the subtitle.
    "the lord of the rings commander": "tales of middle-earth commander",
}

# code -> (code, canonical name); normalized name -> (code, canonical name);
# token-tuple -> (token-tuple, (code, canonical name)) bucketed by first
# token, for the free-text longest-match scan (see _find_longest below).
_Index = tuple[
    dict[str, tuple[str, str]],
    dict[str, tuple[str, str]],
    dict[str, list[tuple[tuple[str, ...], tuple[str, str]]]],
]
_index: _Index | None = None
_lock = asyncio.Lock()


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


def _build_index(sets: list[dict]) -> _Index:
    by_code: dict[str, tuple[str, str]] = {}
    by_name: dict[str, tuple[str, str]] = {}
    for s in sets:
        code, name = s.get("code"), s.get("name")
        if not code or not name:
            continue
        entry = (code.lower(), name)
        by_code.setdefault(code.lower(), entry)
        by_name.setdefault(_normalize(name), entry)

    token_index: dict[str, list[tuple[tuple[str, ...], tuple[str, str]]]] = {}

    def add_tokens(tokens: tuple[str, ...], value: tuple[str, str]) -> None:
        if tokens:
            token_index.setdefault(tokens[0], []).append((tokens, value))

    for normalized_name, value in by_name.items():
        add_tokens(_tokenize(normalized_name), value)
    for code, value in by_code.items():
        add_tokens((code,), value)
    for alias, target_name in _NAME_ALIASES.items():
        target = by_name.get(target_name)
        if target:
            add_tokens(_tokenize(alias), target)

    return by_code, by_name, token_index


def _find_longest(
    tokens: tuple[str, ...],
    token_index: dict[str, list[tuple[tuple[str, ...], tuple[str, str]]]],
) -> tuple[str, str] | None:
    """Longest contiguous run in `tokens` matching a known set name/code/
    alias, anywhere in the text — same approach as carddb.match_card_name,
    so a longer, more specific match always beats a shorter one that merely
    happens to start at the same or an earlier position."""
    best: tuple[int, tuple[str, str]] | None = None
    for start, token in enumerate(tokens):
        for candidate_tokens, value in token_index.get(token, ()):
            length = len(candidate_tokens)
            if best is not None and length <= best[0]:
                continue
            if tokens[start:start + length] == candidate_tokens:
                best = (length, value)
    return best[1] if best else None


def _load_cache() -> list[dict] | None:
    if not os.path.exists(_CACHE_PATH):
        return None
    if time.time() - os.path.getmtime(_CACHE_PATH) > _CACHE_MAX_AGE:
        return None
    try:
        with open(_CACHE_PATH) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


async def _fetch_and_cache() -> list[dict] | None:
    try:
        async with httpx.AsyncClient(timeout=30.0, headers=_HEADERS) as client:
            resp = await client.get(_SETS_URL)
            resp.raise_for_status()
            sets = resp.json()["data"]
    except Exception as e:
        logger.warning(f"setdb: failed to fetch Scryfall set data: {e}")
        return None

    try:
        with open(_CACHE_PATH, "w") as f:
            json.dump(sets, f)
    except OSError as e:
        logger.warning(f"setdb: failed to write set cache: {e}")

    logger.info(f"setdb: refreshed set index ({len(sets)} sets)")
    return sets


async def _ensure_index() -> None:
    global _index
    if _index is not None:
        return
    async with _lock:
        if _index is not None:  # another caller already won the race
            return
        sets = _load_cache()
        if sets is None:
            sets = await _fetch_and_cache()
        if sets is not None:
            _index = _build_index(sets)


async def match_set(raw: str | None) -> tuple[str, str] | None:
    """raw may be a full set name or a bare set code, either with a
    " — <treatment>" suffix already appended by the scraper (see module
    docstring) — returns (code, canonical_name), or None if nothing in
    Scryfall's set list matches.

    Tries an exact (alias-normalized) full-string match first, then a bare
    code, then falls back to the same free-text longest-word-run scan eBay's
    title matching uses (see match_set_from_ebay_title) — several stores
    don't use Scryfall's exact set name verbatim: a branding prefix Scryfall
    itself drops ("Universes Beyond: Doctor Who" vs "Doctor Who"), a colon
    moved or dropped ("Bloomburrow: Commander" vs "Bloomburrow Commander" —
    tokenizing strips the punctuation either way), or a code joined onto
    something else with a dash (Hareruya's "CMR-BF"). Structured retailer
    text carries much less of the false-positive risk eBay's free-text
    titles do, so this runs unconditionally rather than only as a last
    resort."""
    await _ensure_index()
    if not raw or _index is None:
        return None
    by_code, by_name, token_index = _index
    text = raw.split(" — ", 1)[0].strip()
    if not text:
        return None
    normalized = _normalize(text)
    normalized = _NAME_ALIASES.get(normalized, normalized)
    match = by_name.get(normalized)
    if match:
        return match
    if re.fullmatch(r"[A-Za-z0-9]{2,6}", text):
        match = by_code.get(text.lower())
        if match:
            return match
    return _find_longest(_tokenize(raw), token_index)


async def match_set_from_ebay_title(title: str | None, card_name: str | None = None) -> tuple[str, str] | None:
    """Best-effort set match for eBay, which has no structured set field at
    all. Tries a bracketed/parenthesized set signal first (see
    _EBAY_BRACKET_RE), then a free-text set code/name anywhere else in the
    title (see _find_longest) — excluding whatever span card_name (the
    search query, which is also eBay's own card_name field — see ebay.py)
    matches, so a card whose own name happens to be/contain a code-like word
    or set-name word isn't mistaken for one."""
    await _ensure_index()
    if not title or _index is None:
        return None
    by_code, by_name, token_index = _index
    for content in _EBAY_BRACKET_RE.findall(title):
        content = content.strip()
        code_match = _LEADING_CODE_RE.match(content)
        if code_match:
            match = by_code.get(code_match.group(0).lower())
            if match:
                return match
        normalized = _NAME_ALIASES.get(_normalize(content), _normalize(content))
        match = by_name.get(normalized)
        if match:
            return match

    masked_title = title
    if card_name:
        idx = title.lower().find(card_name.lower())
        if idx != -1:
            masked_title = title[:idx] + (" " * len(card_name)) + title[idx + len(card_name):]
    return _find_longest(_tokenize(masked_title), token_index)
