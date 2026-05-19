from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    role: str
    is_active: bool = True
    hashed_password: Optional[str] = None
    plain_password: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: int

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass
