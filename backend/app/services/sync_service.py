from typing import List
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.order import Order
from app.models.sale import Sale
from app.models.item import Item
from app.models.pricing import ItemPrice, PriceType
from app.schemas.order import OrderCreate, OrderSyncResponse
from app.schemas.sale import SaleCreate, SaleSyncResponse

def resolve_unit_price(db: Session, item_id: int, unit_type: str, default_price: float, pieces_per_carton: int, price_code_base: str) -> float:
    price_code = price_code_base
    if unit_type == "carton":
        price_code = f"{price_code_base}_carton"
        
    price_val = db.query(ItemPrice.price).join(PriceType).filter(
        ItemPrice.item_id == item_id,
        PriceType.code == price_code
    ).scalar()
    
    if price_val is None:
        if unit_type == "carton":
            return default_price * (pieces_per_carton or 12)
        else:
            return default_price
    return price_val

def process_orders_sync(db: Session, orders: List[OrderCreate], user_id: int) -> OrderSyncResponse:
    synced = 0
    errors = []

    for order_in in orders:
        try:
            if order_in.sync_id:
                existing = db.query(Order).filter(Order.sync_id == order_in.sync_id).first()
                if existing:
                    continue

            item = db.query(Item).filter(Item.id == order_in.item_id).first()
            if not item:
                errors.append(f"Item {order_in.item_id} not found for sync_id {order_in.sync_id}")
                continue

            # Resolve unit price using retail tiers
            unit_price = resolve_unit_price(
                db, 
                order_in.item_id, 
                order_in.unit_type, 
                item.price, 
                item.pieces_per_carton, 
                "retail"
            )
            total_price = unit_price * order_in.quantity

            now = datetime.utcnow()
            order = Order(
                shop_id=order_in.shop_id,
                item_id=order_in.item_id,
                quantity=order_in.quantity,
                total_price=total_price,
                unit_type=order_in.unit_type,
                sync_id=order_in.sync_id,
                created_by=user_id,
                timestamp=order_in.timestamp or now,
                synced_at=now,
            )
            db.add(order)
            synced += 1
        except Exception as e:
            errors.append(f"Error syncing order {order_in.sync_id}: {str(e)}")

    db.commit()
    return OrderSyncResponse(synced=synced, errors=errors)

def process_sales_sync(db: Session, sales: List[SaleCreate], user_id: int) -> SaleSyncResponse:
    synced = 0
    errors = []

    for sale_in in sales:
        try:
            if sale_in.sync_id:
                existing = db.query(Sale).filter(Sale.sync_id == sale_in.sync_id).first()
                if existing:
                    continue

            item = db.query(Item).filter(Item.id == sale_in.item_id).first()
            if not item:
                errors.append(f"Item {sale_in.item_id} not found for sync_id {sale_in.sync_id}")
                continue

            # Resolve unit price using wholesale tiers
            unit_price = resolve_unit_price(
                db, 
                sale_in.item_id, 
                sale_in.unit_type, 
                item.price, 
                item.pieces_per_carton, 
                "wholesale"
            )
            total_price = unit_price * sale_in.quantity

            now = datetime.utcnow()
            sale = Sale(
                shop_id=sale_in.shop_id,
                item_id=sale_in.item_id,
                quantity=sale_in.quantity,
                income_received=sale_in.income_received,
                loan=sale_in.loan,
                total_price=total_price,
                unit_type=sale_in.unit_type,
                sync_id=sale_in.sync_id,
                created_by=user_id,
                timestamp=sale_in.timestamp or now,
                synced_at=now,
            )
            db.add(sale)
            synced += 1
        except Exception as e:
            errors.append(f"Error syncing sale {sale_in.sync_id}: {str(e)}")

    db.commit()
    return SaleSyncResponse(synced=synced, errors=errors)
