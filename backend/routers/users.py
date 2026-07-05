from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import hash_password, require_admin, require_user
from database import (
    AuthSession,
    User,
    UserStoreSetting,
    get_db,
    get_setting,
    get_user_store_enabled,
    set_user_store_enabled,
)
from scrapers import SCRAPERS

router = APIRouter(prefix="/users", tags=["users"])


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool
    created_at: datetime
    last_seen_at: datetime | None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=256)
    is_admin: bool = False


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=256)
    is_admin: bool | None = None


class MyStoreSetting(BaseModel):
    key: str
    store_name: str
    globally_enabled: bool
    enabled: bool  # this user's own preference — only meaningful when globally_enabled


class MyStoreUpdate(BaseModel):
    stores: dict[str, bool]  # scraper key -> enabled


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    return db.query(User).order_by(User.username).all()


@router.post("", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me/stores", response_model=list[MyStoreSetting])
def get_my_stores(db: Session = Depends(get_db), user: User = Depends(require_user)):
    return [
        MyStoreSetting(
            key=key,
            store_name=cls.store_name,
            globally_enabled=get_setting(db, f"store_{key}_enabled", "true") != "false",
            enabled=get_user_store_enabled(db, user.id, key),
        )
        for key, cls in SCRAPERS.items()
    ]


@router.put("/me/stores", response_model=list[MyStoreSetting])
def update_my_stores(payload: MyStoreUpdate, db: Session = Depends(get_db), user: User = Depends(require_user)):
    for key, enabled in payload.stores.items():
        if key not in SCRAPERS:
            continue
        set_user_store_enabled(db, user.id, key, enabled)
    db.commit()
    return get_my_stores(db, user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.is_admin is False and user.is_admin and user.id == admin.id:
        raise HTTPException(status_code=400, detail="Can't remove your own admin access")
    if payload.is_admin is False and user.is_admin:
        remaining_admins = db.query(User).filter(User.is_admin.is_(True), User.id != user.id).count()
        if remaining_admins == 0:
            raise HTTPException(status_code=400, detail="Can't remove the last admin")

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Can't delete your own account")
    if user.is_admin:
        remaining_admins = db.query(User).filter(User.is_admin.is_(True), User.id != user.id).count()
        if remaining_admins == 0:
            raise HTTPException(status_code=400, detail="Can't delete the last admin")

    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.query(UserStoreSetting).filter(UserStoreSetting.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"ok": True}
