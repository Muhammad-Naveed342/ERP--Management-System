from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class OrderBase(BaseModel):
    shop_id: int
    item_id: int
    quantity: int
    sync_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    unit_type: str = "piece"
    price_tier: Optional[str] = "retail"
    unit_price: Optional[float] = None
    created_by: Optional[int] = None

class OrderCreate(OrderBase):
    pass

class Order(OrderBase):
    id: int
    total_price: float
    unit_price: Optional[float] = None
    created_by: int
    timestamp: datetime
    synced_at: Optional[datetime] = None
    shop_name: Optional[str] = None
    shop_location: Optional[str] = None
    item_name: Optional[str] = None
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True

class OrderSyncRequest(BaseModel):
    orders: List[OrderCreate]

class OrderSyncResponse(BaseModel):
    synced: int
    errors: List[str]
