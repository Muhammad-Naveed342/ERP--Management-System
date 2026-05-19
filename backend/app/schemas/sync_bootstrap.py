from pydantic import BaseModel
from typing import List

from app.schemas.shop import Shop
from app.schemas.item import Item


class MobileUserRow(BaseModel):
    """Field-user row for offline auth on devices (hashed password only)."""

    id: int
    username: str
    role: str
    is_active: bool
    hashed_password: str


class SyncBootstrapResponse(BaseModel):
    users: List[MobileUserRow]
    shops: List[Shop]
    items: List[Item]
