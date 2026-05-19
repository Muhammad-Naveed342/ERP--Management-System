from pydantic import BaseModel
from typing import Optional

class CompanyBase(BaseModel):
    name: str

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None

class Company(CompanyBase):
    id: int

    class Config:
        from_attributes = True
