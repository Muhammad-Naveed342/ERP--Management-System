from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    sync_id = Column(String, unique=True, index=True, nullable=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    unit_type = Column(String, nullable=False, default="piece")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    synced_at = Column(DateTime, nullable=True)

    shop = relationship("Shop")
    item = relationship("Item")
    user = relationship("User")
