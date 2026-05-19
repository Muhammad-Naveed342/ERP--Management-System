from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.company import Company
from app.schemas.company import Company as CompanySchema, CompanyCreate, CompanyUpdate
from app.models.user import User
from app.models.item import Item
from app.models.order import Order
from app.models.sale import Sale

router = APIRouter()

@router.post("/", response_model=CompanySchema)
def create_company(
    *,
    db: Session = Depends(deps.get_db),
    company_in: CompanyCreate,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    company = db.query(Company).filter(Company.name == company_in.name).first()
    if company:
        raise HTTPException(status_code=400, detail="Company already exists.")
    company = Company(name=company_in.name)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

@router.get("/", response_model=List[CompanySchema])
def read_companies(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    companies = db.query(Company).offset(skip).limit(limit).all()
    return companies


@router.get("/{company_id}", response_model=CompanySchema)
def read_company(
    company_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/{company_id}", response_model=CompanySchema)
def update_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int,
    company_in: CompanyUpdate,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if company_in.name is not None and company_in.name != company.name:
        if db.query(Company).filter(Company.name == company_in.name).first():
            raise HTTPException(status_code=400, detail="Company name already exists")
        company.name = company_in.name
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}")
def delete_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Block delete if any items of the company are in active transactions
    for item in company.items:
        if db.query(Order).filter(Order.item_id == item.id).first():
            raise HTTPException(
                status_code=400, 
                detail=f"Company cannot be deleted because its product '{item.item_name}' is referenced in orders."
            )
        if db.query(Sale).filter(Sale.item_id == item.id).first():
            raise HTTPException(
                status_code=400, 
                detail=f"Company cannot be deleted because its product '{item.item_name}' is referenced in sales."
            )

    db.delete(company)
    db.commit()
    return {"ok": True}
