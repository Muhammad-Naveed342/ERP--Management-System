from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.shop import Shop
from app.schemas.shop import Shop as ShopSchema, ShopCreate, ShopUpdate
from app.models.user import User
from app.models.order import Order
from app.models.sale import Sale

router = APIRouter()

@router.post("/", response_model=ShopSchema)
def create_shop(
    *,
    db: Session = Depends(deps.get_db),
    shop_in: ShopCreate,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    shop = db.query(Shop).filter(Shop.shop_name == shop_in.shop_name).first()
    if shop:
        raise HTTPException(status_code=400, detail="Shop already exists.")
    shop = Shop(shop_name=shop_in.shop_name, location=shop_in.location, mobile_phone=shop_in.mobile_phone)
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop

@router.get("/", response_model=List[ShopSchema])
def read_shops(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    shops = db.query(Shop).offset(skip).limit(limit).all()
    return shops


@router.get("/{shop_id}", response_model=ShopSchema)
def read_shop(
    shop_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop


@router.put("/{shop_id}", response_model=ShopSchema)
def update_shop(
    *,
    db: Session = Depends(deps.get_db),
    shop_id: int,
    shop_in: ShopUpdate,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop_in.shop_name is not None and shop_in.shop_name != shop.shop_name:
        if db.query(Shop).filter(Shop.shop_name == shop_in.shop_name).first():
            raise HTTPException(status_code=400, detail="Shop name already exists")
        shop.shop_name = shop_in.shop_name
    if shop_in.location is not None:
        shop.location = shop_in.location
    if shop_in.mobile_phone is not None:
        shop.mobile_phone = shop_in.mobile_phone
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop


@router.delete("/{shop_id}")
def delete_shop(
    *,
    db: Session = Depends(deps.get_db),
    shop_id: int,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    # Cascade delete all orders and sales associated with this shop
    db.query(Order).filter(Order.shop_id == shop_id).delete()
    db.query(Sale).filter(Sale.shop_id == shop_id).delete()
    
    db.delete(shop)
    db.commit()
    return {"ok": True}
