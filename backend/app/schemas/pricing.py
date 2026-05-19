from pydantic import BaseModel
from typing import Optional

class PriceTypeBase(BaseModel):
    code: str
    name: str

class PriceTypeCreate(PriceTypeBase):
    pass

class PriceType(PriceTypeBase):
    id: int

    class Config:
        from_attributes = True

class ItemPriceBase(BaseModel):
    price_type_id: int
    price: float

class ItemPriceCreate(ItemPriceBase):
    item_id: int

class ItemPrice(ItemPriceBase):
    id: int
    item_id: int
    price_type_code: Optional[str] = None

    class Config:
        from_attributes = True
