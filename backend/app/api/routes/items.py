from typing import Any, List, Optional
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session

from app.api import deps
from app.models.item import Item
from app.models.pricing import ItemPrice
from app.schemas.item import Item as ItemSchema, ItemCreate, ItemUpdate
from app.models.user import User
from app.models.order import Order
from app.models.sale import Sale

router = APIRouter()

@router.post("/upload")
def upload_item_image(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    """
    Upload a product image. Returns the relative URL path.
    """
    # Check file extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        raise HTTPException(status_code=400, detail="Invalid image file format. Only JPG, PNG, WEBP, and GIF are allowed.")
    
    # Generate unique filename to prevent collisions
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = f"uploads/{unique_name}"
    
    # Save file locally on disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"image_url": f"/uploads/{unique_name}"}

@router.post("/", response_model=ItemSchema)
def create_item(
    *,
    db: Session = Depends(deps.get_db),
    item_in: ItemCreate,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    item = db.query(Item).filter(Item.item_name == item_in.item_name).first()
    if item:
        raise HTTPException(status_code=400, detail="Item already exists.")
    
    # Create the item record
    item = Item(
        item_name=item_in.item_name, 
        price=item_in.price, 
        company_id=item_in.company_id,
        image_url=item_in.image_url,
        pieces_per_carton=item_in.pieces_per_carton
    )
    db.add(item)
    db.flush() # Resolve item.id

    # Create associated price points if provided
    if item_in.prices:
        for p in item_in.prices:
            db_price = ItemPrice(
                item_id=item.id,
                price_type_id=p.price_type_id,
                price=p.price
            )
            db.add(db_price)
    
    db.commit()
    db.refresh(item)
    return item

@router.get("/", response_model=List[ItemSchema])
def read_items(
    db: Session = Depends(deps.get_db),
    company_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    q = db.query(Item)
    if company_id is not None:
        q = q.filter(Item.company_id == company_id)
    items = q.offset(skip).limit(limit).all()
    return items


@router.get("/{item_id}", response_model=ItemSchema)
def read_item(
    item_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/{item_id}", response_model=ItemSchema)
def update_item(
    *,
    db: Session = Depends(deps.get_db),
    item_id: int,
    item_in: ItemUpdate,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item_in.item_name is not None and item_in.item_name != item.item_name:
        if db.query(Item).filter(Item.item_name == item_in.item_name).first():
            raise HTTPException(status_code=400, detail="Item name already exists")
        item.item_name = item_in.item_name
    if item_in.price is not None:
        item.price = item_in.price
    if item_in.company_id is not None:
        item.company_id = item_in.company_id
    if item_in.image_url is not None:
      item.image_url = item_in.image_url
    if item_in.pieces_per_carton is not None:
      item.pieces_per_carton = item_in.pieces_per_carton
        
    # Update associated pricing if provided
    if item_in.prices is not None:
        # Delete old price records
        db.query(ItemPrice).filter(ItemPrice.item_id == item.id).delete()
        # Add new price records
        for p in item_in.prices:
            db_price = ItemPrice(
                item_id=item.id,
                price_type_id=p.price_type_id,
                price=p.price
            )
            db.add(db_price)

    db.add(item)
    db.commit()
    db.refresh(item)
    return item




@router.delete("/{item_id}")
def delete_item(
    *,
    db: Session = Depends(deps.get_db),
    item_id: int,
    current_user: User = Depends(deps.get_current_admin),
) -> Any:
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if db.query(Order).filter(Order.item_id == item_id).first():
        raise HTTPException(status_code=400, detail="Item is referenced by orders")
    if db.query(Sale).filter(Sale.item_id == item_id).first():
        raise HTTPException(status_code=400, detail="Item is referenced by sales")
    db.delete(item)
    db.commit()
    return {"ok": True}
