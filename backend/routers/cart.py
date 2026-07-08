from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import require_user
from database import CartItem, User, get_db

router = APIRouter(prefix="/cart", tags=["cart"])


class CartItemIn(BaseModel):
    """Snapshot of a live search result at the moment it's added — mirrors
    the SearchResult fields the cart page needs to render a row and link out
    to the store."""

    store_name: str = Field(min_length=1, max_length=128)
    card_name: str = Field(min_length=1, max_length=512)
    set_name: str | None = None
    collector_number: str | None = None
    foil: bool = False
    foil_treatment: str | None = None
    condition: str = Field(min_length=1, max_length=64)
    price: float
    currency: str = Field(min_length=1, max_length=8)
    price_original: float | None = None
    currency_original: str | None = None
    shipping_price: float | None = None
    image_url: str | None = None
    product_url: str = Field(min_length=1, max_length=2048)


class CartItemOut(CartItemIn):
    id: int
    quantity: int
    added_at: datetime

    class Config:
        from_attributes = True


def _cart_items(db: Session, user: User) -> list[CartItem]:
    return (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id)
        .order_by(CartItem.added_at.desc(), CartItem.id.desc())
        .all()
    )


# Every mutation returns the full cart so the frontend's CartContext can
# replace its state in one step — no separate refetch round-trip.
@router.get("", response_model=list[CartItemOut])
def get_cart(db: Session = Depends(get_db), user: User = Depends(require_user)):
    return _cart_items(db, user)


@router.post("", response_model=list[CartItemOut])
def add_to_cart(payload: CartItemIn, db: Session = Depends(get_db), user: User = Depends(require_user)):
    # The same listing added again bumps quantity instead of duplicating.
    # product_url alone isn't enough — some stores list every condition/foil
    # variant on one product page, so those are part of the identity too.
    existing = (
        db.query(CartItem)
        .filter(
            CartItem.user_id == user.id,
            CartItem.store_name == payload.store_name,
            CartItem.product_url == payload.product_url,
            CartItem.condition == payload.condition,
            CartItem.foil == payload.foil,
        )
        .first()
    )
    if existing:
        existing.quantity += 1
    else:
        db.add(CartItem(user_id=user.id, **payload.model_dump()))
    db.commit()
    return _cart_items(db, user)


# Declared before /{item_id} so "store" is never swallowed by the int path
# converter's 422.
@router.delete("/store/{store_name}", response_model=list[CartItemOut])
def clear_store_cart(store_name: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    db.query(CartItem).filter(CartItem.user_id == user.id, CartItem.store_name == store_name).delete()
    db.commit()
    return _cart_items(db, user)


@router.delete("/{item_id}", response_model=list[CartItemOut])
def delete_cart_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    deleted = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user.id).delete()
    if not deleted:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.commit()
    return _cart_items(db, user)


@router.delete("", response_model=list[CartItemOut])
def clear_all_carts(db: Session = Depends(get_db), user: User = Depends(require_user)):
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    db.commit()
    return []
