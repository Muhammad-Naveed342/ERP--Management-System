from sqlalchemy import Column, Integer, String, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class PriceType(Base):
    __tablename__ = "price_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False) # e.g., 'retail', 'wholesale'
    name = Column(String, nullable=False) # e.g., 'Retail Price', 'Wholesale Price'

    prices = relationship("ItemPrice", back_populates="price_type", cascade="all, delete-orphan")

class ItemPrice(Base):
    __tablename__ = "item_prices"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    price_type_id = Column(Integer, ForeignKey("price_types.id", ondelete="CASCADE"), nullable=False)
    price = Column(Float, nullable=False)

    item = relationship("Item", back_populates="prices")
    price_type = relationship("PriceType", back_populates="prices")

    @property
    def price_type_code(self) -> str:
        return self.price_type.code if self.price_type else ""

    __table_args__ = (UniqueConstraint('item_id', 'price_type_id', name='uq_item_price_type'),)
