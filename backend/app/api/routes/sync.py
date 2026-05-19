from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.models.shop import Shop
from app.models.item import Item
from app.schemas.sync_bootstrap import MobileUserRow, SyncBootstrapResponse

router = APIRouter()


@router.get("/bootstrap", response_model=SyncBootstrapResponse)
def sync_bootstrap(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Pull master data for offline mobile: shops, items, and field-user rows
    (order_taker / sales_man) including password hashes for offline verification.
    """
    if current_user.role not in ("order_taker", "sales_man"):
        raise HTTPException(
            status_code=403,
            detail="Only field accounts (order taker / sales man) can download mobile master data.",
        )
    field_users = (
        db.query(User)
        .filter(User.role.in_(["order_taker", "sales_man"]))
        .order_by(User.id)
        .all()
    )
    shops = db.query(Shop).order_by(Shop.id).all()
    items = db.query(Item).order_by(Item.id).all()

    return SyncBootstrapResponse(
        users=[
            MobileUserRow(
                id=u.id,
                username=u.username,
                role=u.role,
                is_active=u.is_active,
                hashed_password=u.hashed_password,
            )
            for u in field_users
        ],
        shops=shops,
        items=items,
    )
