from zoneinfo import ZoneInfoNotFoundError

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import crypto
import tz
from auth import require_admin
from database import count_ebay_api_calls_24h, get_db, get_setting, set_setting
from scrapers import SCRAPERS

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(require_admin)])


class StoreSetting(BaseModel):
    key: str
    store_name: str
    enabled: bool


class SettingsOut(BaseModel):
    vpn_proxy_url: str
    ebay_app_id: str
    ebay_cert_id_configured: bool
    ebay_api_calls_24h: int
    timezone: str
    stores: list[StoreSetting]


class SettingsUpdate(BaseModel):
    vpn_proxy_url: str | None = None
    ebay_app_id: str | None = None
    ebay_cert_id: str | None = None  # None = leave unchanged, "" = clear
    timezone: str | None = None
    stores: dict[str, bool] | None = None  # scraper key -> enabled


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return SettingsOut(
        vpn_proxy_url=get_setting(db, "vpn_proxy_url", ""),
        ebay_app_id=get_setting(db, "ebay_app_id", ""),
        ebay_cert_id_configured=bool(get_setting(db, "ebay_cert_id_encrypted", "")),
        ebay_api_calls_24h=count_ebay_api_calls_24h(db),
        timezone=get_setting(db, "timezone", "UTC"),
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
        set_setting(db, "vpn_proxy_url", payload.vpn_proxy_url)
    if payload.ebay_app_id is not None:
        set_setting(db, "ebay_app_id", payload.ebay_app_id)
    if payload.ebay_cert_id is not None:
        set_setting(db, "ebay_cert_id_encrypted", crypto.encrypt(payload.ebay_cert_id) if payload.ebay_cert_id else "")
    if payload.timezone is not None:
        try:
            tz.set_timezone(payload.timezone)
        except ZoneInfoNotFoundError:
            raise HTTPException(status_code=400, detail=f"Unknown timezone: {payload.timezone}")
        set_setting(db, "timezone", payload.timezone)
    if payload.stores:
        for key, enabled in payload.stores.items():
            if key not in SCRAPERS:
                continue
            set_setting(db, f"store_{key}_enabled", "true" if enabled else "false")
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
