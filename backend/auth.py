import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from database import AuthSession, User, get_db

SESSION_COOKIE_NAME = "cardsniffer_session"
SESSION_TTL = timedelta(days=30)

_PBKDF2_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt, hash_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations))
        return secrets.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


def create_session(db: Session, response: Response, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(token=token, user_id=user.id, expires_at=datetime.utcnow() + SESSION_TTL))
    db.commit()
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        samesite="lax",
        # Not forcing `secure=True` here — this app is designed to also work
        # accessed directly over plain HTTP (no bundled TLS termination).
        # Deployments fronted by an HTTPS reverse proxy still work fine
        # without it; the cookie just isn't refused on a plain-HTTP setup.
    )
    return token


def clear_session(db: Session, response: Response, token: Optional[str]):
    if token:
        db.query(AuthSession).filter(AuthSession.token == token).delete()
        db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    session = db.query(AuthSession).filter(AuthSession.token == token).first()
    if not session or session.expires_at < datetime.utcnow():
        return None

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        return None

    user.last_seen_at = datetime.utcnow()
    db.commit()
    return user


def require_admin(user: Optional[User] = Depends(get_current_user)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Login required")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
