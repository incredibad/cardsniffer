# Maintained list of Magic foil treatment names, cross-referenced against
# each store's raw title text. Chosen over generically parsing "whichever
# parenthetical mentions foil" because titles vary too much store to store
# (multiple parenthetical groups, frame/border descriptors glued on,
# collector numbers mixed in) to parse reliably — see git history for the
# false starts. The tradeoff: a treatment not in this list shows as a plain
# "Foil" badge until someone spots it and it gets added here.
#
# Each canonical name maps to the raw-text spellings actually seen (or
# reasonably expected) in the wild — stores abbreviate/mangle these
# differently (Hareruya alone has shown "SurgeFoil", "RetroF", and
# "Silver screen Foil" for the same three treatments across different
# products), so matching needs more than one exact string per treatment.
_KNOWN_TREATMENTS: dict[str, tuple[str, ...]] = {
    "Foil Etched": ("foil etched", "foil-etched"),
    "Surge Foil": ("surge foil", "surgefoil"),
    "Galaxy Foil": ("galaxy foil",),
    "Textured Foil": ("textured foil",),
    "Fracture Foil": ("fracture foil",),
    "Halo Foil": ("halo foil",),
    "Dragonscale Foil": ("dragonscale foil",),
    "Chocobo Track Foil": ("chocobo track foil",),
    "Chocobo Foil": ("chocobo foil",),
    "Mana Foil": ("mana foil",),
    "Rainbow Foil": ("rainbow foil",),
    "Confetti Foil": ("confetti foil",),
    "Gilded Foil": ("gilded foil",),
    "Oil Slick Raised Foil": ("oil slick raised foil", "oil slick foil"),
    "Ripple Foil": ("ripple foil",),
    "Step-and-Compleat Foil": ("step-and-compleat foil", "step and compleat foil"),
    "Serialized Foil": ("serialized foil",),
    # Confirmed via live Hareruya data (Solitude/H2R, Isolation at Orthanc/
    # LTR-BF) — Hareruya truncates "Retro Foil" to the bare tag "RetroF".
    "Retro Foil": ("retro foil", "retrof"),
    "Silver Screen Foil": ("silver screen foil",),
    # Confirmed via live MTGMintCard/Hareruya data (Traveling Chocobo, FIN) —
    # raw tag is just "Neon Ink", no store has been seen appending "Foil".
    "Neon Ink": ("neon ink",),
    # Not yet confirmed against a live listing — added off general knowledge,
    # remove/adjust if a real title turns out to spell these differently.
    "Invisible Ink Foil": ("invisible ink foil", "invisible ink"),
    "Ampersand Foil": ("ampersand foil",),
}


def extract_foil_treatment(*texts: str | None) -> str | None:
    """Cross-references title text (or fragments of it) against the known
    treatment list above, returning the canonical name for the longest
    matching raw spelling — longest so a specific hit like "Chocobo Track
    Foil" wins over a shorter one it contains ("Chocobo Foil") rather than
    whichever happens to come first.
    """
    combined = " ".join(t for t in texts if t).lower()
    if not combined:
        return None
    best_name = None
    best_len = 0
    for name, aliases in _KNOWN_TREATMENTS.items():
        for alias in aliases:
            if alias in combined and len(alias) > best_len:
                best_name = name
                best_len = len(alias)
    return best_name


def humanize_foil_tag(tag: str) -> str:
    """Turns a Scryfall-style promo_type tag ending in "foil" (e.g.
    "surgefoil", "dragonscalefoil", "rainbowfoil") into a readable label
    ("Surge Foil", "Dragonscale Foil", "Rainbow Foil")."""
    tag = tag.strip()
    if len(tag) > 4 and tag.lower().endswith("foil"):
        prefix = tag[:-4]
        return f"{prefix[:1].upper()}{prefix[1:]} Foil"
    return tag
