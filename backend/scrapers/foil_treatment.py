# Maintained list of Magic foil treatment names, cross-referenced against
# each store's raw title text. Chosen over generically parsing "whichever
# parenthetical mentions foil" because titles vary too much store to store
# (multiple parenthetical groups, frame/border descriptors glued on,
# collector numbers mixed in) to parse reliably — see git history for the
# false starts. The tradeoff: a treatment not in this list shows as a plain
# "Foil" badge until someone spots it and it gets added here.
_KNOWN_TREATMENTS = [
    "Foil Etched",
    "Surge Foil",
    "Galaxy Foil",
    "Textured Foil",
    "Fracture Foil",
    "Halo Foil",
    "Dragonscale Foil",
    "Chocobo Track Foil",
    "Chocobo Foil",
    "Mana Foil",
    "Rainbow Foil",
    "Confetti Foil",
    "Gilded Foil",
    "Oil Slick Raised Foil",
    "Ripple Foil",
    "Step-and-Compleat Foil",
    "Serialized Foil",
]


def extract_foil_treatment(*texts: str | None) -> str | None:
    """Cross-references title text (or fragments of it) against the known
    treatment list above, returning the longest match found — longest so a
    specific hit like "Chocobo Track Foil" wins over a shorter one it
    contains ("Chocobo Foil") rather than whichever happens to come first.
    """
    combined = " ".join(t for t in texts if t).lower()
    if not combined:
        return None
    matches = [name for name in _KNOWN_TREATMENTS if name.lower() in combined]
    return max(matches, key=len) if matches else None


def humanize_foil_tag(tag: str) -> str:
    """Turns a Scryfall-style promo_type tag ending in "foil" (e.g.
    "surgefoil", "dragonscalefoil", "rainbowfoil") into a readable label
    ("Surge Foil", "Dragonscale Foil", "Rainbow Foil")."""
    tag = tag.strip()
    if len(tag) > 4 and tag.lower().endswith("foil"):
        prefix = tag[:-4]
        return f"{prefix[:1].upper()}{prefix[1:]} Foil"
    return tag
