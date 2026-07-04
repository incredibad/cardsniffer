_GENERIC_FOIL_LABELS = {"foil", "foils", "non-foil", "non foil", "nonfoil"}


def extract_foil_treatment(*texts: str | None) -> str | None:
    """Given candidate treatment/parenthetical fragments from a title (e.g.
    Card Kingdom's "(Foil Etched)", MTGMintCard's "(Surge Foil)"), returns
    the first one that names a specific foil treatment — i.e. mentions
    "foil" but is more specific than a plain "Foil"/"Non-Foil" marker.
    Returns None when nothing more specific is found, so callers fall back
    to a generic "Foil" badge.
    """
    for text in texts:
        if not text:
            continue
        cleaned = text.strip()
        if cleaned.lower() in _GENERIC_FOIL_LABELS:
            continue
        if "foil" in cleaned.lower():
            return cleaned
    return None


def humanize_foil_tag(tag: str) -> str:
    """Turns a Scryfall-style promo_type tag ending in "foil" (e.g.
    "surgefoil", "dragonscalefoil", "rainbowfoil") into a readable label
    ("Surge Foil", "Dragonscale Foil", "Rainbow Foil")."""
    tag = tag.strip()
    if len(tag) > 4 and tag.lower().endswith("foil"):
        prefix = tag[:-4]
        return f"{prefix[:1].upper()}{prefix[1:]} Foil"
    return tag
