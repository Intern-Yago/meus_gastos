from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from .. import database, models, schemas, crud
from ..auth.router import get_current_user

router = APIRouter()

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.email != "yago.commercial@gmail.com":
        raise HTTPException(
            status_code=403, 
            detail="Acesso negado. Apenas o administrador do sistema pode acessar este painel."
        )
    return current_user

@router.get("/check")
def check_admin_status(admin_user: models.User = Depends(require_admin)):
    return {"is_admin": True}

@router.get("/summary")
def get_admin_summary(db: Session = Depends(database.get_db), admin_user: models.User = Depends(require_admin)):
    users = db.query(models.User).all()
    
    total_users = len(users)
    whatsapp_active_users = sum(1 for u in users if u.phone_verified)
    email_active_users = sum(1 for u in users if u.email_verified)
    pwa_active_users = sum(1 for u in users if u.known_ips and len(u.known_ips.strip()) > 0)

    users_list = []
    total_tokens_all_users = 0
    for u in users:
        accounts_count = db.query(models.Account).filter(models.Account.user_id == u.id).count()
        transactions_count = db.query(models.Transaction).filter(models.Transaction.user_id == u.id).count()
        tokens = getattr(u, "ai_tokens_used", 0) or 0
        total_tokens_all_users += tokens
        
        users_list.append({
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "last_location": u.last_location,
            "known_ips": u.known_ips,
            "phone_verified": u.phone_verified,
            "email_verified": u.email_verified,
            "accounts_count": accounts_count,
            "transactions_count": transactions_count,
            "timezone": u.timezone,
            "is_active": getattr(u, "is_active", True) if getattr(u, "is_active", True) is not None else True,
            "ai_tokens_used": tokens
        })

    import os
    beta_invite_code = os.getenv("BETA_INVITE_CODE")

    return {
        "total_users": total_users,
        "whatsapp_active_users": whatsapp_active_users,
        "email_active_users": email_active_users,
        "pwa_active_users": pwa_active_users,
        "total_ai_tokens_consumed": total_tokens_all_users,
        "beta_invite_code": beta_invite_code,
        "users": users_list
    }

@router.post("/reset-user/{user_id}")
def reset_user_data(user_id: str, db: Session = Depends(database.get_db), admin_user: models.User = Depends(require_admin)):
    import uuid
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de usuário inválido (Formato UUID incorreto)")

    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Deleta transações, contas, orçamentos, metas do usuário especificado
    tx_count = db.query(models.Transaction).filter(models.Transaction.user_id == user.id).delete()
    acc_count = db.query(models.Account).filter(models.Account.user_id == user.id).delete()
    bgt_count = db.query(models.Budget).filter(models.Budget.user_id == user.id).delete()
    goal_count = db.query(models.Goal).filter(models.Goal.user_id == user.id).delete()
    
    db.commit()
    
    return {
        "message": f"Dados do usuário {user.name} foram reiniciados com sucesso.",
        "deleted_transactions": tx_count,
        "deleted_accounts": acc_count,
        "deleted_budgets": bgt_count,
        "deleted_goals": goal_count
    }

@router.post("/toggle-block-user/{user_id}")
def toggle_block_user(user_id: str, db: Session = Depends(database.get_db), admin_user: models.User = Depends(require_admin)):
    import uuid
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de usuário inválido")

    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if user.email == "yago.commercial@gmail.com":
        raise HTTPException(status_code=400, detail="Você não pode bloquear a sua própria conta de administrador!")

    current_status = getattr(user, "is_active", True)
    user.is_active = not current_status
    db.commit()

    action_word = "bloqueado" if not user.is_active else "desbloqueado"
    return {"message": f"Usuário {user.name} foi {action_word} com sucesso.", "is_active": user.is_active}

@router.delete("/delete-user/{user_id}")
def delete_user_completely(user_id: str, db: Session = Depends(database.get_db), admin_user: models.User = Depends(require_admin)):
    import uuid
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de usuário inválido")

    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if user.email == "yago.commercial@gmail.com":
        raise HTTPException(status_code=400, detail="Você não pode excluir a sua própria conta de administrador!")

    # O cascade no relacionamento em models.py se encarrega de deletar contas, transações, etc. automaticamente!
    db.delete(user)
    db.commit()

    return {"message": f"Conta de {user.name} excluída permanentemente do sistema Finora."}
