from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db, get_setting
from scrapers import SCRAPERS

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("")
def list_stores(db: Session = Depends(get_db)):
    """Public list of currently enabled stores, for the search page's store
    filter. No sensitive info here — store names are already visible on
    every result; the enable/disable toggle itself and the proxy URL stay
    admin-only via /settings."""
    return [
        {"key": key, "store_name": cls.store_name}
        for key, cls in SCRAPERS.items()
        if get_setting(db, f"store_{key}_enabled", "true") != "false"
    ]
