from datetime import timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.core import security
from app.core.config import settings
from app.schemas.token import Token

def authenticate_user(db: Session, username: str, password: str) -> Token | None:
    user = db.query(User).filter(User.username == username).first()
    if not user or not security.verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")
