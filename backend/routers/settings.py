import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import require_admin
from database import Setting, get_db, get_setting
from scrapers import SCRAPERS

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(require_admin)])


class StoreSetting(BaseModel):
    key: str
    store_name: str
    enabled: bool


class SettingsOut(BaseModel):
    vpn_proxy_url: str
    stores: list[StoreSetting]


class SettingsUpdate(BaseModel):
    vpn_proxy_url: str | None = None
    stores: dict[str, bool] | None = None  # scraper key -> enabled


def _set(db: Session, key: str, value: str):
    row = db.query(Setting).filter(Setting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return SettingsOut(
        vpn_proxy_url=get_setting(db, "vpn_proxy_url", ""),
        stores=[
            StoreSetting(
                key=key,
                store_name=cls.store_name,
                enabled=get_setting(db, f"store_{key}_enabled", "true") != "false",
            )
            for key, cls in SCRAPERS.items()
        ],
    )


@router.put("", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    if payload.vpn_proxy_url is not None:
        _set(db, "vpn_proxy_url", payload.vpn_proxy_url)
    if payload.stores:
        for key, enabled in payload.stores.items():
            if key not in SCRAPERS:
                continue
            _set(db, f"store_{key}_enabled", "true" if enabled else "false")
    db.commit()
    return get_settings(db)


@router.post("/test-proxy")
async def test_proxy(db: Session = Depends(get_db)):
    proxy_url = get_setting(db, "vpn_proxy_url", "")
    if not proxy_url:
        raise HTTPException(status_code=400, detail="No proxy URL configured")
    try:
        async with httpx.AsyncClient(proxy=proxy_url, timeout=10.0) as client:
            r = await client.get("https://ipinfo.io/json")
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy test failed: {e}")

    return {
        "ip": data.get("ip"),
        "org": data.get("org"),
        "city": data.get("city"),
        "country": data.get("country"),
    }
