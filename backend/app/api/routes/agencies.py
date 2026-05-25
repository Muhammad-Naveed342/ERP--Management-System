from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import database
from app.models.user import User
from app.models.agency import Agency, AgencyPurchase, AgencyPurchaseItem
from app.schemas.agency import Agency as AgencySchema, AgencyCreate, AgencyPurchase as AgencyPurchaseSchema, AgencyPurchaseCreate
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[AgencySchema])
def read_agencies(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return db.query(Agency).all()

@router.post("/", response_model=AgencySchema)
def create_agency(
    agency_in: AgencyCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    agency = Agency(**agency_in.model_dump())
    db.add(agency)
    db.commit()
    db.refresh(agency)
    return agency

@router.delete("/{agency_id}")
def delete_agency(
    agency_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    db.delete(agency)
    db.commit()
    return {"detail": "Agency deleted"}

@router.get("/{agency_id}/purchases", response_model=List[AgencyPurchaseSchema])
def read_agency_purchases(
    agency_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    purchases = db.query(AgencyPurchase).filter(AgencyPurchase.agency_id == agency_id).all()
    return purchases

@router.post("/purchases", response_model=AgencyPurchaseSchema)
def create_agency_purchase(
    purchase_in: AgencyPurchaseCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    agency = db.query(Agency).filter(Agency.id == purchase_in.agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
        
    db_purchase = AgencyPurchase(
        agency_id=purchase_in.agency_id,
        total_amount=purchase_in.total_amount
    )
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)
    
    for item_in in purchase_in.items:
        db_item = AgencyPurchaseItem(
            purchase_id=db_purchase.id,
            item_name=item_in.item_name,
            quantity=item_in.quantity,
            unit_type=item_in.unit_type,
            unit_price=item_in.unit_price,
            total_price=item_in.total_price
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_purchase)
    return db_purchase

@router.delete("/purchases/{purchase_id}")
def delete_agency_purchase(
    purchase_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    purchase = db.query(AgencyPurchase).filter(AgencyPurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    db.delete(purchase)
    db.commit()
    return {"detail": "Purchase deleted"}
