from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import hash_password, require_admin, require_user, verify_password
from database import (
    AuthSession,
    SearchLog,
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
    enabled: bool  # this user's own preference


class MyStoreUpdate(BaseModel):
    stores: dict[str, bool]  # scraper key -> enabled


class ChangePassword(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=8, max_length=256)


class SearchHistoryItem(BaseModel):
    query: str
    result_count: int
    searched_at: datetime
    search_type: str

    class Config:
        from_attributes = True


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
    # Globally-disabled stores are omitted entirely — there's nothing for a
    # per-account preference to do once the admin has already turned a store
    # off for everyone.
    return [
        MyStoreSetting(
            key=key,
            store_name=cls.store_name,
            enabled=get_user_store_enabled(db, user.id, key),
        )
        for key, cls in SCRAPERS.items()
        if get_setting(db, f"store_{key}_enabled", "true") != "false"
    ]


@router.put("/me/stores", response_model=list[MyStoreSetting])
def update_my_stores(payload: MyStoreUpdate, db: Session = Depends(get_db), user: User = Depends(require_user)):
    for key, enabled in payload.stores.items():
        if key not in SCRAPERS:
            continue
        set_user_store_enabled(db, user.id, key, enabled)
    db.commit()
    return get_my_stores(db, user)


@router.put("/me/password")
def change_my_password(payload: ChangePassword, db: Session = Depends(get_db), user: User = Depends(require_user)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.get("/me/searches", response_model=list[SearchHistoryItem])
def get_my_searches(db: Session = Depends(get_db), user: User = Depends(require_user)):
    return (
        db.query(SearchLog)
        .filter(SearchLog.user_id == user.id)
        .order_by(SearchLog.searched_at.desc())
        .limit(20)
        .all()
    )


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
    db.query(SearchLog).filter(SearchLog.user_id == user.id).update({SearchLog.user_id: None})
    db.delete(user)
    db.commit()
    return {"ok": True}
