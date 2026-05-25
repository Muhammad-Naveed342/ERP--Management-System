from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class SaleBase(BaseModel):
    shop_id: int
    item_id: int
    quantity: int
    income_received: float
    loan: float
    sync_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    unit_type: str = "piece"
    price_tier: Optional[str] = "wholesale"
    created_by: Optional[int] = None

class SaleCreate(SaleBase):
    pass

class Sale(SaleBase):
    id: int
    total_price: float
    created_by: int
    timestamp: datetime
    synced_at: Optional[datetime] = None
    shop_name: Optional[str] = None
    shop_location: Optional[str] = None
    item_name: Optional[str] = None
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True

class SaleSyncRequest(BaseModel):
    sales: List[SaleCreate]

class SaleSyncResponse(BaseModel):
    synced: int
    errors: List[str]
