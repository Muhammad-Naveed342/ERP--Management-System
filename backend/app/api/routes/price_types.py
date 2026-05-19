from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.pricing import PriceType
from app.schemas.pricing import PriceType as PriceTypeSchema
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[PriceTypeSchema])
def read_price_types(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve all active price types."""
    return db.query(PriceType).offset(skip).limit(limit).all()
