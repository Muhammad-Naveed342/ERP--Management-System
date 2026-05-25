from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from datetime import datetime
from app.api import deps
from app.models.order import Order
from app.models.item import Item
from app.schemas.order import Order as OrderSchema, OrderCreate, OrderSyncRequest, OrderSyncResponse
from app.models.user import User
from app.services.sync_service import process_orders_sync, resolve_unit_price

router = APIRouter()

@router.post("/", response_model=OrderSchema)
def create_order(
    *,
    db: Session = Depends(deps.get_db),
    order_in: OrderCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in ["admin", "order_taker"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    item = db.query(Item).filter(Item.id == order_in.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    resolved_price = resolve_unit_price(
        db,
        order_in.item_id,
        order_in.unit_type,
        item.price,
        item.pieces_per_carton,
        order_in.price_tier or "retail"
    )
    price_per_unit = order_in.unit_price if order_in.unit_price is not None else resolved_price
    total_price = price_per_unit * order_in.quantity

    now = datetime.utcnow()
    order = Order(
        shop_id=order_in.shop_id,
        item_id=order_in.item_id,
        quantity=order_in.quantity,
        total_price=total_price,
        unit_type=order_in.unit_type,
        sync_id=order_in.sync_id,
        created_by=order_in.created_by if (order_in.created_by and current_user.role == "admin") else current_user.id,
        timestamp=order_in.timestamp or now,
        synced_at=now,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.post("/sync", response_model=OrderSyncResponse)
def sync_orders(
    *,
    db: Session = Depends(deps.get_db),
    sync_request: OrderSyncRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in ["admin", "order_taker"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return process_orders_sync(db=db, orders=sync_request.orders, user_id=current_user.id)

@router.get("/", response_model=List[OrderSchema])
def read_orders(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    q = db.query(Order).options(joinedload(Order.shop), joinedload(Order.item), joinedload(Order.user))
    if current_user.role == "admin":
        orders = q.order_by(Order.id.desc()).offset(skip).limit(limit).all()
    else:
        orders = (
            q.filter(Order.created_by == current_user.id)
            .order_by(Order.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    return [
        OrderSchema(
            id=o.id,
            shop_id=o.shop_id,
            item_id=o.item_id,
            quantity=o.quantity,
            sync_id=o.sync_id,
            timestamp=o.timestamp,
            total_price=o.total_price,
            unit_price=(o.total_price / o.quantity if o.quantity else 0),
            unit_type=o.unit_type,
            created_by=o.created_by,
            synced_at=o.synced_at,
            shop_name=o.shop.shop_name if o.shop else None,
            shop_location=o.shop.location if o.shop else None,
            item_name=o.item.item_name if o.item else None,
            created_by_name=o.user.username if o.user else "Unknown",
        )
        for o in orders
    ]

@router.delete("/by-date/{date_str}")
def delete_orders_by_date(
    date_str: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    from sqlalchemy import cast, Date
    orders_query = db.query(Order).filter(
        (cast(Order.synced_at, Date) == target_date) | 
        ((Order.synced_at == None) & (cast(Order.timestamp, Date) == target_date))
    )
    count = orders_query.count()
    orders_query.delete(synchronize_session=False)
    db.commit()
    return {"detail": f"Successfully deleted {count} orders."}

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"detail": "Order deleted successfully"}
