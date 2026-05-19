from pydantic import BaseModel
from typing import Optional, List
from app.schemas.pricing import ItemPrice, ItemPriceBase

class ItemBase(BaseModel):
    item_name: str
    price: float
    company_id: Optional[int] = None
    image_url: Optional[str] = None
    pieces_per_carton: int = 12

class ItemCreate(ItemBase):
    prices: Optional[List[ItemPriceBase]] = None

class ItemUpdate(BaseModel):
    item_name: Optional[str] = None
    price: Optional[float] = None
    company_id: Optional[int] = None
    image_url: Optional[str] = None
    pieces_per_carton: Optional[int] = None
    prices: Optional[List[ItemPriceBase]] = None

class Item(ItemBase):
    id: int
    company_name: Optional[str] = None
    prices: List[ItemPrice] = []

    class Config:
        from_attributes = True


