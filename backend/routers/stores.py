from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import User, get_db, get_user_store_enabled, is_store_globally_enabled
from scrapers import SCRAPERS

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("")
def list_stores(db: Session = Depends(get_db), user: User | None = Depends(get_current_user)):
    """Public list of stores currently enabled for the requester — globally
    enabled, and (if logged in) not opted out of in this account's own Stores
    preference — for the search page's store filter. No sensitive info here —
    store names are already visible on every result; the enable/disable
    toggle itself and the proxy URL stay admin-only via /settings."""
    return [
        {"key": key, "store_name": cls.store_name}
        for key, cls in SCRAPERS.items()
        if is_store_globally_enabled(db, key)
        and (user is None or get_user_store_enabled(db, user.id, key))
    ]
