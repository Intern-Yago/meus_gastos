from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, database
from ..auth.router import get_current_user

from ..auth.security import verify_payment_token

router = APIRouter()

@router.get("/confirm-payment-info/{token}")
def get_payment_info_from_token(token: str, db: Session = Depends(database.get_db)):
    """Busca informações básicas da transação via token sem precisar de login."""
    tx_id = verify_payment_token(token)
    if not tx_id:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado.")
    
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    
    return {
        "description": tx.description,
        "amount": tx.amount,
        "due_day": tx.due_day,
        "is_paid": tx.is_paid
    }

@router.post("/confirm-payment/{token}")
def confirm_payment_via_token(token: str, db: Session = Depends(database.get_db)):
    """Marca a transação como paga usando o token enviado por e-mail."""
    tx_id = verify_payment_token(token)
    if not tx_id:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado.")
    
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    
    tx.is_paid = True
    db.commit()
    return {"message": "Pagamento confirmado com sucesso!"}

@router.get("/", response_model=List[schemas.Transaction])
def read_transactions(
    skip: int = 0, 
    limit: int = 100, 
    start_date: str = None,
    end_date: str = None,
    category_id: int = None,
    account_id: int = None,
    type: str = None,
    payment_method: str = None,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_transactions(
        db, 
        user_id=current_user.id, 
        skip=skip, 
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        account_id=account_id,
        type=type,
        payment_method=payment_method
    )

@router.post("/", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_transaction(db=db, transaction=transaction, user_id=current_user.id)

@router.get("/pending")
def get_pending_transactions(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Retorna todas as transações que ainda não foram pagas."""
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.is_paid == False
    ).order_by(models.Transaction.date.asc()).all()

@router.get("/{transaction_id}")
def read_transaction(transaction_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.put("/{transaction_id}")
def update_transaction(transaction_id: int, transaction: dict, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id).first()
    if not db_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Atualização parcial
    for key, value in transaction.items():
        if hasattr(db_tx, key):
            # Converter datas se necessário
            if key == 'date' and isinstance(value, str):
                from datetime import datetime
                value = datetime.fromisoformat(value.replace('Z', ''))
            setattr(db_tx, key, value)
    
    db.commit()
    db.refresh(db_tx)
    return db_tx

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.delete_transaction(db=db, transaction_id=transaction_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}
