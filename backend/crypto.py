"""Symmetric encryption for secrets stored in the `settings` table (e.g. the
eBay Cert ID). Unlike password hashing in auth.py, these need to be
recoverable — we have to send the raw secret back to the third-party API.

The key lives in the SECRET_KEY env var (set in docker-compose.yml, sourced
from a gitignored .env file) — deliberately outside the data volume, so a
copy of cardsniffer.db alone isn't enough to decrypt anything stored here.
"""

import os

from cryptography.fernet import Fernet

_SECRET_KEY = os.environ.get("SECRET_KEY")
_fernet = Fernet(_SECRET_KEY.encode()) if _SECRET_KEY else None


def encrypt(plaintext: str) -> str:
    if not _fernet:
        raise RuntimeError("SECRET_KEY env var is not set — cannot encrypt secrets")
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    if not _fernet:
        raise RuntimeError("SECRET_KEY env var is not set — cannot decrypt secrets")
    return _fernet.decrypt(ciphertext.encode()).decode()
