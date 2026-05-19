from pydantic import BaseModel
from typing import Optional

class ShopBase(BaseModel):
    shop_name: str
    location: Optional[str] = None

class ShopCreate(ShopBase):
    pass

class ShopUpdate(BaseModel):
    shop_name: Optional[str] = None
    location: Optional[str] = None

class Shop(ShopBase):
    id: int

    class Config:
        from_attributes = True
