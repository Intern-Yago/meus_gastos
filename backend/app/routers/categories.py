from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, database
from ..auth.router import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Category])
def read_categories(
    include_inactive: bool = False,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_categories(db, user_id=current_user.id, only_active=not include_inactive)

@router.post("/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_category(db=db, category=category, user_id=current_user.id)

@router.put("/{category_id}", response_model=schemas.Category)
def update_category(category_id: int, category: schemas.CategoryCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_category = crud.update_category(db=db, category_id=category_id, category=category, user_id=current_user.id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.delete_category(db=db, category_id=category_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deactivated"}

@router.post("/{category_id}/reactivate", response_model=schemas.Category)
def reactivate_category(category_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_category = db.query(models.Category).filter(models.Category.id == category_id, models.Category.user_id == current_user.id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    db_category.is_active = True
    db.commit()
    db.refresh(db_category)
    return db_category
