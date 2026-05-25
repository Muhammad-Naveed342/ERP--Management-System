from sqlalchemy import Column, Integer, String
from app.db.base import Base

class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    shop_name = Column(String, unique=True, index=True, nullable=False)
    location = Column(String, nullable=True)
    mobile_phone = Column(String, nullable=True)
