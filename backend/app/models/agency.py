from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Agency(Base):
    __tablename__ = "agencies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    contact = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchases = relationship("AgencyPurchase", back_populates="agency", cascade="all, delete-orphan")

class AgencyPurchase(Base):
    __tablename__ = "agency_purchases"
    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"))
    total_amount = Column(Float, default=0.0)
    purchase_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    agency = relationship("Agency", back_populates="purchases")
    items = relationship("AgencyPurchaseItem", back_populates="purchase", cascade="all, delete-orphan")

class AgencyPurchaseItem(Base):
    __tablename__ = "agency_purchase_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("agency_purchases.id"))
    item_name = Column(String)
    quantity = Column(Integer)
    unit_type = Column(String) # 'carton' or 'piece'
    unit_price = Column(Float)
    total_price = Column(Float)

    purchase = relationship("AgencyPurchase", back_populates="items")
