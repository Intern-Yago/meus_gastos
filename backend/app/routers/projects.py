from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import crud, schemas, models, database
from ..auth.router import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Project])
def read_projects(
    is_business: bool = False,
    status: str = None,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if is_business:
        return crud.get_businesses(db, user_id=current_user.id, status=status)
    return crud.get_projects(db, user_id=current_user.id)

@router.post("/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_project(db=db, project=project, user_id=current_user.id)

@router.get("/{project_id}", response_model=schemas.Project)
def read_project(project_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_project = crud.get_project(db, project_id=project_id, user_id=current_user.id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@router.put("/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, project: schemas.ProjectUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.update_project(db=db, project_id=project_id, project=project, user_id=current_user.id)

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.delete_project(db=db, project_id=project_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}

@router.get("/{project_id}/summary", response_model=schemas.ProjectSummary)
def get_project_summary(project_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    summary = crud.get_project_summary(db, project_id=project_id, user_id=current_user.id)
    if not summary:
        raise HTTPException(status_code=404, detail="Project not found")
    return summary

@router.post("/{project_id}/items", response_model=schemas.ProjectItem)
def create_project_item(project_id: int, item: schemas.ProjectItemCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Verify project ownership
    db_project = crud.get_project(db, project_id=project_id, user_id=current_user.id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_item = models.ProjectItem(**item.dict(), project_id=project_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/items/{item_id}")
def delete_project_item(item_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_item = db.query(models.ProjectItem).filter(models.ProjectItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check ownership via project
    if db_item.project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted"}

@router.put("/items/{item_id}")
def update_project_item(
    item_id: int, 
    item_update: dict, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_item = db.query(models.ProjectItem).filter(models.ProjectItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check ownership
    if db_item.project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if "name" in item_update:
        db_item.name = item_update["name"]
    if "budget_allocation" in item_update:
        db_item.budget_allocation = float(item_update["budget_allocation"])
    if "type" in item_update:
        db_item.type = item_update["type"]
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/{project_id}/transactions")
def get_project_transactions(project_id: int, skip: int = 0, limit: int = 20, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Verify ownership
    db_project = crud.get_project(db, project_id=project_id, user_id=current_user.id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    transactions = db.query(models.Transaction).options(
        joinedload(models.Transaction.account),
        joinedload(models.Transaction.project_item)
    ).filter(
        models.Transaction.project_id == project_id
    ).order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).offset(skip).limit(limit).all()
    
    total = db.query(models.Transaction).filter(models.Transaction.project_id == project_id).count()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "transactions": [
            {
                "id": tx.id,
                "description": tx.description,
                "amount": tx.amount,
                "type": tx.type,
                "date": tx.date.isoformat(),
                "is_paid": tx.is_paid,
                "category_id": tx.category_id,
                "account_id": tx.account_id,
                "project_id": tx.project_id,
                "project_item_id": tx.project_item_id,
                "amount_paid": tx.amount_paid,
                "is_fixed_expense": tx.is_fixed_expense,
                "is_recurrent": tx.is_recurrent,
                "payment_method": tx.payment_method.value if hasattr(tx.payment_method, 'value') else tx.payment_method,
                "installments": tx.installments,
                "attachment_path": tx.attachment_path,
                "due_day": tx.due_day,
                "notify_me": tx.notify_me,
                "account": {"name": tx.account.name, "color": tx.account.color} if tx.account else None,
                "project_item": {"name": tx.project_item.name} if tx.project_item else None
            } for tx in transactions
        ]
    }
