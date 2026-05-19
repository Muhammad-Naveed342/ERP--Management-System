from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.models.shop import Shop
from app.models.item import Item
from app.models.order import Order
from app.models.sale import Sale
from pydantic import BaseModel


class ReportSummary(BaseModel):
    users: int
    shops: int
    items: int
    orders: int
    sales: int
    orders_total_value: float
    sales_total_value: float


router = APIRouter()


@router.get("/summary", response_model=ReportSummary)
def report_summary(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    orders_sum = db.query(func.coalesce(func.sum(Order.total_price), 0)).scalar()
    sales_sum = db.query(func.coalesce(func.sum(Sale.total_price), 0)).scalar()
    return ReportSummary(
        users=db.query(func.count(User.id)).scalar() or 0,
        shops=db.query(func.count(Shop.id)).scalar() or 0,
        items=db.query(func.count(Item.id)).scalar() or 0,
        orders=db.query(func.count(Order.id)).scalar() or 0,
        sales=db.query(func.count(Sale.id)).scalar() or 0,
        orders_total_value=float(orders_sum or 0),
        sales_total_value=float(sales_sum or 0),
    )
