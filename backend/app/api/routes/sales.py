from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.api import deps
from app.models.sale import Sale
from app.models.item import Item
from app.schemas.sale import Sale as SaleSchema, SaleCreate, SaleSyncRequest, SaleSyncResponse
from app.models.user import User
from app.services.sync_service import process_sales_sync, resolve_unit_price

router = APIRouter()

@router.post("/", response_model=SaleSchema)
def create_sale(
    *,
    db: Session = Depends(deps.get_db),
    sale_in: SaleCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in ["admin", "sales_man"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    item = db.query(Item).filter(Item.id == sale_in.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    unit_price = resolve_unit_price(
        db, 
        sale_in.item_id, 
        sale_in.unit_type, 
        item.price, 
        item.pieces_per_carton, 
        sale_in.price_tier or "wholesale"
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
        created_by=sale_in.created_by if (sale_in.created_by and current_user.role == "admin") else current_user.id,
        timestamp=sale_in.timestamp or now,
        synced_at=now,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale

@router.post("/sync", response_model=SaleSyncResponse)
def sync_sales(
    *,
    db: Session = Depends(deps.get_db),
    sync_request: SaleSyncRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in ["admin", "sales_man"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return process_sales_sync(db=db, sales=sync_request.sales, user_id=current_user.id)

@router.get("/", response_model=List[SaleSchema])
def read_sales(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    q = db.query(Sale).options(joinedload(Sale.shop), joinedload(Sale.item), joinedload(Sale.user))
    if current_user.role == "admin":
        sales = q.order_by(Sale.id.desc()).offset(skip).limit(limit).all()
    else:
        sales = (
            q.filter(Sale.created_by == current_user.id)
            .order_by(Sale.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    return [
        SaleSchema(
            id=s.id,
            shop_id=s.shop_id,
            item_id=s.item_id,
            quantity=s.quantity,
            income_received=s.income_received,
            loan=s.loan,
            sync_id=s.sync_id,
            timestamp=s.timestamp,
            total_price=s.total_price,
            unit_type=s.unit_type,
            created_by=s.created_by,
            synced_at=s.synced_at,
            shop_name=s.shop.shop_name if s.shop else None,
            shop_location=s.shop.location if s.shop else None,
            item_name=s.item.item_name if s.item else None,
            created_by_name=s.user.username if s.user else "Unknown",
        )
        for s in sales
    ]

@router.delete("/by-date/{date_str}")
def delete_sales_by_date(
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
    sales_query = db.query(Sale).filter(
        (cast(Sale.synced_at, Date) == target_date) | 
        ((Sale.synced_at == None) & (cast(Sale.timestamp, Date) == target_date))
    )
    count = sales_query.count()
    sales_query.delete(synchronize_session=False)
    db.commit()
    return {"detail": f"Successfully deleted {count} sales."}

@router.delete("/{sale_id}")
def delete_sale(
    sale_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    db.delete(sale)
    db.commit()
    return {"detail": "Sale deleted successfully"}
