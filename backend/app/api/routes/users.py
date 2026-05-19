from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.models.order import Order
from app.models.sale import Sale

router = APIRouter()

@router.post("/", response_model=UserSchema)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        plain_password=user_in.password,
        role=user_in.role,
        is_active=user_in.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/", response_model=List[UserSchema])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.patch("/{user_id}", response_model=UserSchema)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_in.username is not None and user_in.username != user.username:
        if db.query(User).filter(User.username == user_in.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = user_in.username
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        if user.username == "admin" and user_in.is_active == False:
            raise HTTPException(status_code=400, detail="The default admin account cannot be deactivated.")
        user.is_active = user_in.is_active
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)
        user.plain_password = user_in.password
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="The default admin account cannot be deleted.")
    # Clean up user's data before deleting the user to avoid foreign key errors
    db.query(Order).filter(Order.created_by == user_id).delete()
    db.query(Sale).filter(Sale.created_by == user_id).delete()
    
    db.delete(user)
    db.commit()
    return {"ok": True}
