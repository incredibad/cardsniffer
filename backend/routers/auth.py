from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import (
    SESSION_COOKIE_NAME,
    clear_session,
    create_session,
    get_current_user,
    hash_password,
    verify_password,
)
from database import User, get_db, get_setting

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=256)


class UserOut(BaseModel):
    username: str
    is_admin: bool


class StatusOut(BaseModel):
    setup_required: bool
    user: UserOut | None = None
    # The admin-configured display timezone (Settings → Admin → System) —
    # exposed here since every page loads this on mount regardless of login
    # state, so any timestamp anywhere in the app can be rendered in it.
    timezone: str = "UTC"


@router.get("/status", response_model=StatusOut)
def status(db: Session = Depends(get_db), user: User | None = Depends(get_current_user)):
    setup_required = db.query(User).count() == 0
    return StatusOut(
        setup_required=setup_required,
        user=UserOut(username=user.username, is_admin=user.is_admin) if user else None,
        timezone=get_setting(db, "timezone", "UTC"),
    )


@router.post("/setup", response_model=UserOut)
def setup(payload: Credentials, response: Response, db: Session = Depends(get_db)):
    if db.query(User).count() > 0:
        raise HTTPException(status_code=403, detail="Setup already completed")

    user = User(username=payload.username, password_hash=hash_password(payload.password), is_admin=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    create_session(db, response, user)
    return UserOut(username=user.username, is_admin=user.is_admin)


@router.post("/login", response_model=UserOut)
def login(payload: Credentials, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled")

    create_session(db, response, user)
    return UserOut(username=user.username, is_admin=user.is_admin)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    clear_session(db, response, request.cookies.get(SESSION_COOKIE_NAME))
    return {"ok": True}
