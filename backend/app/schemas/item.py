from pydantic import BaseModel
from typing import Optional, List
from app.schemas.pricing import ItemPrice, ItemPriceBase

class ItemBase(BaseModel):
    item_name: str
    price: float
    price_per_item: Optional[float] = None
    company_id: Optional[int] = None
    image_url: Optional[str] = None
    pieces_per_carton: int = 12
    quantity: int = 0

class ItemCreate(ItemBase):
    prices: Optional[List[ItemPriceBase]] = None

class ItemUpdate(BaseModel):
    item_name: Optional[str] = None
    price: Optional[float] = None
    price_per_item: Optional[float] = None
    company_id: Optional[int] = None
    image_url: Optional[str] = None
    pieces_per_carton: Optional[int] = None
    quantity: Optional[int] = None
    prices: Optional[List[ItemPriceBase]] = None

class Item(ItemBase):
    id: int
    company_name: Optional[str] = None
    prices: List[ItemPrice] = []

    class Config:
        from_attributes = True


