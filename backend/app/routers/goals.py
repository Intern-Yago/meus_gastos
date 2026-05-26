from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, database
from ..auth.router import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Goal])
def read_goals(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_goals(db, user_id=current_user.id)

@router.post("/", response_model=schemas.Goal)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_goal(db, goal=goal, user_id=current_user.id)

@router.put("/{goal_id}", response_model=schemas.Goal)
def update_goal(goal_id: int, goal: schemas.GoalUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_goal = crud.update_goal(db, goal_id=goal_id, goal=goal, user_id=current_user.id)
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal

@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.delete_goal(db, goal_id=goal_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted"}

@router.post("/{goal_id}/add-progress", response_model=schemas.Goal)
def add_goal_progress(goal_id: int, amount: float, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_goal = crud.add_goal_progress(db, goal_id=goal_id, amount=amount, user_id=current_user.id)
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal
