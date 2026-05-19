from typing import Optional
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, unique=True, index=True, nullable=False)
    price = Column(Float, nullable=False)
    image_url = Column(String, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    pieces_per_carton = Column(Integer, nullable=False, default=12)

    company = relationship("Company", back_populates="items")
    prices = relationship("ItemPrice", back_populates="item", cascade="all, delete-orphan")

    @property
    def company_name(self) -> Optional[str]:
        return self.company.name if self.company else None


