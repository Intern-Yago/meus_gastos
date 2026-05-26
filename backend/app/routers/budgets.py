from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, database
from ..auth.router import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Budget])
def read_budgets(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_budgets(db, user_id=current_user.id)

@router.post("/", response_model=schemas.Budget)
def create_budget(budget: schemas.BudgetCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_or_update_budget(db, budget=budget, user_id=current_user.id)

@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.delete_budget(db, budget_id=budget_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted"}
