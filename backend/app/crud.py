from sqlalchemy.orm import Session
from . import models, schemas
from .auth import security

# User
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email, 
        name=user.name, 
        hashed_password=hashed_password,
        phone=user.phone,
        currency=user.currency
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if db_user:
        update_data = user_update.dict(exclude_unset=True)
        
        # 🛡️ Lógica de Segurança: Resetar verificações se os dados mudarem
        if 'phone' in update_data and update_data['phone'] != db_user.phone:
            db_user.phone_verified = False
            db_user.whatsapp_lid = None # Força novo mapeamento seguro
            
        if 'email' in update_data and update_data['email'] != db_user.email:
            db_user.email_verified = False

        if 'password' in update_data:
            db_user.hashed_password = security.get_password_hash(update_data.pop('password'))

        for key, value in update_data.items():
            setattr(db_user, key, value)

        db.commit()
        db.refresh(db_user)
    return db_user

# Category
def get_categories(db: Session, user_id: int, only_active: bool = False):
    query = db.query(models.Category).filter(models.Category.user_id == user_id)
    if only_active:
        query = query.filter(models.Category.is_active == True)
    return query.all()

def create_category(db: Session, category: schemas.CategoryCreate, user_id: int):
    db_category = models.Category(**category.dict(), user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def update_category(db: Session, category_id: int, category: schemas.CategoryCreate, user_id: int):
    db_category = db.query(models.Category).filter(models.Category.id == category_id, models.Category.user_id == user_id).first()
    if db_category:
        for key, value in category.dict().items():
            setattr(db_category, key, value)
        db.commit()
        db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int, user_id: int):
    db_category = db.query(models.Category).filter(models.Category.id == category_id, models.Category.user_id == user_id).first()
    if db_category:
        # Em vez de deletar, desativamos
        db_category.is_active = False
        db.commit()
        db.refresh(db_category)
        return True
    return False

# Account
def get_accounts(db: Session, user_id: int):
    return db.query(models.Account).filter(models.Account.user_id == user_id).all()

def create_account(db: Session, account: schemas.AccountCreate, user_id: int):
    # SECURITY: Ensure only one default account exists using atomic update
    if account.is_default:
        db.query(models.Account).filter(models.Account.user_id == user_id).update({"is_default": False})
    
    db_account = models.Account(**account.dict(), user_id=user_id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

def update_account(db: Session, account_id: int, account: schemas.AccountUpdate, user_id: int):
    # SECURITY: Lock the row for update to prevent race conditions during balance or setting changes
    db_account = db.query(models.Account).filter(models.Account.id == account_id, models.Account.user_id == user_id).with_for_update().first()
    if db_account:
        if account.is_default:
            db.query(models.Account).filter(models.Account.user_id == user_id).update({"is_default": False})
        
        for key, value in account.dict(exclude_unset=True).items():
            setattr(db_account, key, value)
        db.commit()
        db.refresh(db_account)
    return db_account

def delete_account(db: Session, account_id: int, user_id: int):
    db_account = db.query(models.Account).filter(models.Account.id == account_id, models.Account.user_id == user_id).first()
    if db_account:
        tx_count = db.query(models.Transaction).filter(models.Transaction.account_id == account_id).count()
        if tx_count > 0:
            return False
        db.delete(db_account)
        db.commit()
        return True
    return False

# Goal
def get_goals(db: Session, user_id: int):
    return db.query(models.Goal).filter(models.Goal.user_id == user_id).all()

def create_goal(db: Session, goal: schemas.GoalCreate, user_id: int):
    db_goal = models.Goal(**goal.dict(), user_id=user_id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

def update_goal(db: Session, goal_id: int, goal: schemas.GoalUpdate, user_id: int):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == user_id).first()
    if db_goal:
        for key, value in goal.dict(exclude_unset=True).items():
            setattr(db_goal, key, value)
        db.commit()
        db.refresh(db_goal)
    return db_goal

def delete_goal(db: Session, goal_id: int, user_id: int):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == user_id).first()
    if db_goal:
        db.delete(db_goal)
        db.commit()
        return True
    return False

def add_goal_progress(db: Session, goal_id: int, amount: float, user_id: int):
    # SECURITY: Use atomic increment to prevent race conditions (current_amount = current_amount + amount)
    db.query(models.Goal).filter(
        models.Goal.id == goal_id, 
        models.Goal.user_id == user_id
    ).update({models.Goal.current_amount: models.Goal.current_amount + amount})
    
    db.commit()
    return db.query(models.Goal).filter(models.Goal.id == goal_id).first()

# Budget
def get_budgets(db: Session, user_id: int):
    return db.query(models.Budget).filter(models.Budget.user_id == user_id).all()

def get_budget_by_category(db: Session, user_id: int, category_id: int):
    return db.query(models.Budget).filter(models.Budget.user_id == user_id, models.Budget.category_id == category_id).first()

def create_or_update_budget(db: Session, budget: schemas.BudgetCreate, user_id: int):
    db_budget = get_budget_by_category(db, user_id, budget.category_id)
    if db_budget:
        db_budget.amount = budget.amount
    else:
        db_budget = models.Budget(**budget.dict(), user_id=user_id)
        db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

def delete_budget(db: Session, budget_id: int, user_id: int):
    db_budget = db.query(models.Budget).filter(models.Budget.id == budget_id, models.Budget.user_id == user_id).first()
    if db_budget:
        db.delete(db_budget)
        db.commit()
        return True
    return False

# Notification
import redis
import os
import json

_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
    return _redis_client

def get_unread_notifications(db: Session, user_id: int):
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).order_by(models.Notification.created_at.desc()).all()

def create_notification(db: Session, notification: schemas.NotificationCreate):
    db_notification = models.Notification(**notification.dict())
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)

    # Notificar via Redis para o stream SSE em tempo real
    try:
        r = get_redis()
        # Publica o evento para o canal específico do usuário
        r.publish(f"notifications_{notification.user_id}", json.dumps({
            "id": db_notification.id,
            "title": db_notification.title,
            "content": db_notification.content,
            "type": db_notification.type,
            "created_at": db_notification.created_at.isoformat() if db_notification.created_at else None
        }))
    except Exception as e:
        print(f"Erro ao publicar notificação no Redis: {e}")

    return db_notification
def mark_notification_as_read(db: Session, notification_id: int, user_id: int):
    db_notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user_id
    ).first()
    if db_notification:
        db_notification.is_read = True
        db.commit()
        db.refresh(db_notification)
    return db_notification

# Project
def get_projects(db: Session, user_id: int):
    return db.query(models.Project).filter(
        models.Project.user_id == user_id,
        models.Project.is_business == False
    ).all()

def get_businesses(db: Session, user_id: int, status: str = None):
    query = db.query(models.Project).filter(
        models.Project.user_id == user_id,
        models.Project.is_business == True
    )
    if status:
        query = query.filter(models.Project.status == status)
    return query.all()

def get_project(db: Session, project_id: int, user_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == user_id).first()

def create_project(db: Session, project: schemas.ProjectCreate, user_id: int):
    # Se for Unidade de Negócio/Empresa, força o status para "active" se estiver como "planning" ou None
    status_val = project.status
    if project.is_business and (status_val is None or status_val == "planning"):
        status_val = "active"

    db_project = models.Project(
        user_id=user_id,
        name=project.name,
        total_budget=project.total_budget,
        target_date=project.target_date,
        color=project.color,
        icon=project.icon,
        status=status_val or "active",
        type=project.type or "event",
        is_business=project.is_business or False,
        cnpj=project.cnpj,
        logo_path=project.logo_path
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Criar itens do projeto se existirem
    if project.items:
        for item in project.items:
            db_item = models.ProjectItem(
                project_id=db_project.id,
                name=item.name,
                budget_allocation=item.budget_allocation
            )
            db.add(db_item)
        db.commit()
        db.refresh(db_project)
        
    return db_project

def update_project(db: Session, project_id: int, project: schemas.ProjectUpdate, user_id: int):
    db_project = get_project(db, project_id, user_id)
    if db_project:
        update_data = project.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_project, key, value)
        db.commit()
        db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int, user_id: int):
    db_project = get_project(db, project_id, user_id)
    if db_project:
        # Se for negócio, desativa em vez de deletar
        if db_project.is_business:
            db_project.status = "deactivated"
            db.commit()
            return True
        else:
            db.delete(db_project)
            db.commit()
            return True
    return False

def get_project_summary(db: Session, project_id: int, user_id: int):
    from sqlalchemy import func
    db_project = get_project(db, project_id, user_id)
    if not db_project:
        return None
        
    # Soma de todos os gastos (Saídas) vinculados ao projeto usando o campo 'type' direto
    total_expense = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.project_id == project_id,
        models.Transaction.type == 'expense',
        models.Transaction.is_paid == True
    ).scalar() or 0.0

    # Soma de todas as arrecadações (Entradas) vinculadas ao projeto
    total_income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.project_id == project_id,
        models.Transaction.type == 'income',
        models.Transaction.is_paid == True
    ).scalar() or 0.0
    
    # Detalhe por item
    items_summary = []
    for item in db_project.items:
        # spent is calculated based on the item type
        item_spent = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.project_item_id == item.id,
            models.Transaction.is_paid == True
        ).scalar() or 0.0
        
        items_summary.append({
            "id": item.id,
            "name": item.name,
            "type": item.type or "expense",
            "allocated": item.budget_allocation,
            "spent": item_spent,
            "remaining": (item.budget_allocation - item_spent) if item.type == 'expense' else (item_spent - item.budget_allocation)
        })
        
    # Lista de movimentações recentes do projeto
    project_txs = db.query(models.Transaction).filter(
        models.Transaction.project_id == project_id
    ).order_by(models.Transaction.date.desc()).limit(20).all()
    
    tx_list = []
    for tx in project_txs:
        tx_list.append({
            "id": tx.id,
            "description": tx.description,
            "amount": tx.amount,
            "type": tx.type,
            "date": tx.date.isoformat(),
            "is_paid": tx.is_paid
        })
        
    return {
        "id": db_project.id,
        "name": db_project.name,
        "type": db_project.type,
        "total_budget": db_project.total_budget,
        "total_income": total_income,
        "total_expense": total_expense,
        "remaining_budget": db_project.total_budget - total_expense,
        "percentage_spent": (total_expense / db_project.total_budget * 100) if db_project.total_budget > 0 else 0,
        "items": items_summary,
        "transactions": tx_list,
        # Business metrics
        "revenue": total_income,
        "costs": total_expense,
        "profit": total_income - total_expense,
        "profit_margin": ( (total_income - total_expense) / total_income * 100 ) if total_income > 0 else 0
    }

# Transaction
def get_transactions(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 30,
    start_date: str = None,
    end_date: str = None,
    category_id: int = None,
    type: str = None,
    payment_method: str = None,
    account_id: int = None,
    description: str = None
):
    from sqlalchemy.orm import joinedload
    query = db.query(models.Transaction).options(
        joinedload(models.Transaction.category),
        joinedload(models.Transaction.account)
    ).filter(models.Transaction.user_id == user_id)

    if description:
        query = query.filter(models.Transaction.description.ilike(f"%{description}%"))
    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        from datetime import datetime, timedelta
        end_dt = datetime.fromisoformat(end_date) + timedelta(days=1)
        query = query.filter(models.Transaction.date < end_dt)
    if category_id:
        query = query.filter(models.Transaction.category_id == category_id)
    if account_id:
        query = query.filter(models.Transaction.account_id == account_id)
    if type:
        query = query.filter(models.Transaction.type == type)
    if payment_method:
        query = query.filter(models.Transaction.payment_method == payment_method)

    total = query.count()
    items = query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).offset(skip).limit(limit).all()

    return items, total
def create_transaction(db: Session, transaction: schemas.TransactionCreate, user_id):
    try:
        # Validate ownership of related resources
        if transaction.account_id:
            acc = db.query(models.Account).filter(models.Account.id == transaction.account_id, models.Account.user_id == user_id).first()
            if not acc: raise ValueError("Account not found or access denied")
        
        if transaction.category_id:
            cat = db.query(models.Category).filter(models.Category.id == transaction.category_id, models.Category.user_id == user_id).first()
            if not cat: raise ValueError("Category not found or access denied")

        if transaction.project_id:
            proj = db.query(models.Project).filter(models.Project.id == transaction.project_id, models.Project.user_id == user_id).first()
            if not proj: raise ValueError("Project not found or access denied")

        # SECURITY: Validate attachment_path to prevent unauthorized file manipulation
        attachment_path = transaction.attachment_path
        if attachment_path:
            # Flexible prefix check to handle UUIDs correctly
            user_segment = f"user_{user_id}"
            if user_segment not in attachment_path or ".." in attachment_path:
                print(f"DEBUG: Security block on attachment. Path: {attachment_path}, Expected segment: {user_segment}")
                raise ValueError("Unauthorized attachment path")

        # Handle default account if not provided
        account_id = transaction.account_id
        if not account_id:
            default_acc = db.query(models.Account).filter(models.Account.user_id == user_id, models.Account.is_default == True).first()
            if default_acc:
                account_id = default_acc.id

        # Handle installments
        installments_count = transaction.installments or 1
        
        if installments_count > 1:
            created_transactions = []
            import datetime
            from dateutil.relativedelta import relativedelta
            
            installment_amount = transaction.amount / installments_count
            base_date = transaction.date
            
            for i in range(installments_count):
                tx_date = base_date + relativedelta(months=i)
                tx_desc = f"{transaction.description} ({i+1}/{installments_count})"
                
                db_transaction = models.Transaction(
                    user_id=user_id,
                    category_id=transaction.category_id,
                    account_id=account_id,
                    project_id=transaction.project_id,
                    project_item_id=transaction.project_item_id,
                    goal_id=transaction.goal_id,
                    amount=installment_amount,
                    date=tx_date,
                    description=tx_desc,
                    is_fixed_expense=transaction.is_fixed_expense,
                    is_recurrent=transaction.is_recurrent,
                    payment_method=transaction.payment_method,
                    installments=installments_count,
                    attachment_path=transaction.attachment_path
                )
                db.add(db_transaction)
                created_transactions.append(db_transaction)
            
            db.commit()
            
            # Update Goal progress if linked
            if transaction.goal_id and transaction.is_paid:
                # If it's income to the goal or expense towards the goal (savings)
                # We assume the user wants to add this amount to the goal
                add_goal_progress(db, transaction.goal_id, transaction.amount, user_id)

            for tx in created_transactions:
                db.refresh(tx)
            return created_transactions[0]
        else:
            db_transaction = models.Transaction(**transaction.dict(exclude={'account_id'}), user_id=user_id, account_id=account_id)
            db.add(db_transaction)
            db.commit()
            
            # Update Goal progress if linked
            if transaction.goal_id and transaction.is_paid:
                add_goal_progress(db, transaction.goal_id, transaction.amount, user_id)
                
            db.refresh(db_transaction)
            return db_transaction
    except Exception as e:
        db.rollback()
        raise e

def update_transaction(db: Session, transaction_id: int, transaction: schemas.TransactionUpdate, user_id: int):
    try:
        db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == user_id).first()
        if db_transaction:
            update_data = transaction.dict(exclude_unset=True)
            
            # SECURITY: Remove user_id from update data if it exists to prevent ownership transfer
            update_data.pop('user_id', None)

            # Validate ownership if updating linked resources
            if 'account_id' in update_data and update_data['account_id']:
                acc = db.query(models.Account).filter(models.Account.id == update_data['account_id'], models.Account.user_id == user_id).first()
                if not acc: raise ValueError("Account access denied")
            
            if 'category_id' in update_data and update_data['category_id']:
                cat = db.query(models.Category).filter(models.Category.id == update_data['category_id'], models.Category.user_id == user_id).first()
                if not cat: raise ValueError("Category access denied")

            # SECURITY: Validate attachment_path on update
            if 'attachment_path' in update_data and update_data['attachment_path']:
                expected_prefix = f"finora/user_{user_id}/"
                if not update_data['attachment_path'].startswith(expected_prefix) or ".." in update_data['attachment_path']:
                    raise ValueError("Unauthorized attachment path")

            for key, value in update_data.items():
                setattr(db_transaction, key, value)
            
            # Auto-mark as paid if amount_paid >= amount
            if db_transaction.amount_paid and db_transaction.amount_paid >= db_transaction.amount:
                db_transaction.is_paid = True
                
            db.commit()
            db.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        db.rollback()
        raise e

def delete_transaction(db: Session, transaction_id: int, user_id: int):
    from .utils.minio_client import delete_file_from_minio
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == user_id).first()
    if db_transaction:
        # Se houver anexo no MinIO, deletar fisicamente (LGPD Compliance)
        if db_transaction.attachment_path:
            delete_file_from_minio(db_transaction.attachment_path)
            
        db.delete(db_transaction)
        db.commit()
        return True
    return False

# User Memories
def get_user_memories(db: Session, user_id: int, limit: int = 10):
    return db.query(models.UserMemory).filter(models.UserMemory.user_id == user_id).all()

def get_relevant_memories(db: Session, user_id: int, query_embedding: list, limit: int = 3):
    """Busca memórias semanticamente similares à mensagem do usuário."""
    return db.query(models.UserMemory).filter(
        models.UserMemory.user_id == user_id
    ).order_by(
        models.UserMemory.embedding.l2_distance(query_embedding)
    ).limit(limit).all()

def create_user_memory(db: Session, user_id: int, content: str, embedding: list = None):
    db_memory = models.UserMemory(user_id=user_id, content=content, embedding=embedding)
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)
    return db_memory
