from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, database
from ..auth.router import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Account])
def read_accounts(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_accounts(db, user_id=current_user.id)

@router.post("/", response_model=schemas.Account)
def create_account(account: schemas.AccountCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_account(db, account=account, user_id=current_user.id)

@router.put("/{account_id}", response_model=schemas.Account)
def update_account(account_id: int, account: schemas.AccountUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_account = crud.update_account(db, account_id=account_id, account=account, user_id=current_user.id)
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    return db_account

@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.delete_account(db, account_id=account_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete account with transactions or account not found")
    return {"message": "Account deleted"}
