from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AgencyBase(BaseModel):
    name: str
    contact: Optional[str] = None

class AgencyCreate(AgencyBase):
    pass

class Agency(AgencyBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class AgencyPurchaseItemBase(BaseModel):
    item_name: str
    quantity: int
    unit_type: str
    unit_price: float
    total_price: float

class AgencyPurchaseItemCreate(AgencyPurchaseItemBase):
    pass

class AgencyPurchaseItem(AgencyPurchaseItemBase):
    id: int
    purchase_id: int
    class Config:
        from_attributes = True

class AgencyPurchaseBase(BaseModel):
    agency_id: int
    total_amount: float

class AgencyPurchaseCreate(AgencyPurchaseBase):
    items: List[AgencyPurchaseItemCreate]

class AgencyPurchase(AgencyPurchaseBase):
    id: int
    purchase_date: datetime
    created_at: datetime
    agency: Optional[Agency] = None
    items: List[AgencyPurchaseItem] = []
    class Config:
        from_attributes = True
