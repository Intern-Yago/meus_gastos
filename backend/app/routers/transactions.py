from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
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

@router.get("/", response_model=schemas.PaginatedTransactions)
def read_transactions(
    page: int = 1,
    size: int = 30,
    start_date: str = None,
    end_date: str = None,
    category_id: int = None,
    account_id: int = None,
    type: str = None,
    payment_method: str = None,
    description: str = None,
    include_inactive_categories: bool = True, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Retorna a lista de transações paginada."""
    skip = (page - 1) * size
    items, total = crud.get_transactions(
        db, 
        user_id=current_user.id, 
        skip=skip, 
        limit=size,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        account_id=account_id,
        type=type,
        payment_method=payment_method,
        description=description
    )
    
    print(f"DEBUG: Found {len(items)} items, total: {total}")
    
    summary = {}
    try:
        from .dashboard import get_dashboard_summary
        summary = get_dashboard_summary(None, None, None, db, current_user)
    except Exception as e:
        print(f"ERROR: Failed to get dashboard summary for transactions view: {e}")

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
        **summary
    }

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

@router.get("/closing/uncategorized")
def get_closing_uncategorized(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Busca transações recentes sem categoria ou marcadas como 'Outros'."""
    cutoff = datetime.now() - timedelta(days=45)
    return db.query(models.Transaction).join(
        models.Category, models.Transaction.category_id == models.Category.id, isouter=True
    ).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.date >= cutoff,
        (models.Category.name.ilike("Outros") | (models.Category.name.ilike("Sem Categoria")) | (models.Transaction.category_id == None))
    ).order_by(models.Transaction.date.desc()).all()

@router.get("/closing/duplicates")
def get_closing_duplicates(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Encontra possíveis transações duplicadas recentes (mesmo valor, data e tipo)."""
    cutoff = datetime.now() - timedelta(days=45)
    all_txs = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.date >= cutoff
    ).order_by(models.Transaction.date.desc()).all()
    
    from collections import defaultdict
    groups = defaultdict(list)
    for tx in all_txs:
        key = (round(tx.amount, 2), tx.date.strftime("%Y-%m-%d"), tx.type)
        groups[key].append(tx)
        
    duplicate_groups = []
    for key, items in groups.items():
        if len(items) > 1:
            duplicate_groups.append({
                "amount": key[0],
                "date": key[1],
                "type": key[2],
                "transactions": [
                    {
                        "id": t.id,
                        "description": t.description,
                        "amount": t.amount,
                        "date": t.date.strftime("%Y-%m-%d"),
                        "category": t.category.name if t.category else "Outros"
                    } for t in items
                ]
            })
    return duplicate_groups

@router.get("/closing/missing-attachments")
def get_closing_missing_attachments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Busca despesas pagas recentes de valor relevante (>= R$ 50) sem comprovante anexo."""
    cutoff = datetime.now() - timedelta(days=45)
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == 'expense',
        models.Transaction.is_paid == True,
        models.Transaction.amount >= 50.0,
        (models.Transaction.attachment_path == None) | (models.Transaction.attachment_path == "")
    ).order_by(models.Transaction.amount.desc()).all()

@router.get("/{transaction_id}")
def read_transaction(transaction_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.put("/{transaction_id}")
def update_transaction(transaction_id: int, transaction_data: dict, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id).first()
    if not db_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # List of fields allowed to be updated by the user
    allowed_fields = {
        'amount', 'description', 'category_id', 'account_id', 'date', 'type', 
        'payment_method', 'is_paid', 'amount_paid', 'ticker', 'shares', 'notify_me', 'due_day',
        'attachment_path'
    }
    
    for key, value in transaction_data.items():
        if key in allowed_fields and hasattr(db_tx, key):
            # Validate ownership of linked resources
            if key == 'account_id' and value:
                acc = db.query(models.Account).filter(models.Account.id == value, models.Account.user_id == current_user.id).first()
                if not acc: raise HTTPException(status_code=400, detail="Invalid account")
            
            if key == 'category_id' and value:
                cat = db.query(models.Category).filter(models.Category.id == value, models.Category.user_id == current_user.id).first()
                if not cat: raise HTTPException(status_code=400, detail="Invalid category")

            # Handle date conversion
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
