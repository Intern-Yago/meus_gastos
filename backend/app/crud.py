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
        currency=user.currency,
        monthly_income_goal=user.monthly_income_goal
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Category
def get_categories(db: Session, user_id: int):
    return db.query(models.Category).filter(models.Category.user_id == user_id).all()

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
        # Se houver transações, elas ficam sem categoria (ou podíamos impedir)
        db.delete(db_category)
        db.commit()
        return True
    return False

# Account
def get_accounts(db: Session, user_id: int):
    return db.query(models.Account).filter(models.Account.user_id == user_id).all()

def create_account(db: Session, account: schemas.AccountCreate, user_id: int):
    if account.is_default:
        db.query(models.Account).filter(models.Account.user_id == user_id).update({"is_default": False})
    
    db_account = models.Account(**account.dict(), user_id=user_id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

def update_account(db: Session, account_id: int, account: schemas.AccountUpdate, user_id: int):
    db_account = db.query(models.Account).filter(models.Account.id == account_id, models.Account.user_id == user_id).first()
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
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == user_id).first()
    if db_goal:
        db_goal.current_amount += amount
        db.commit()
        db.refresh(db_goal)
    return db_goal

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

# Transaction
def get_transactions(
    db: Session, 
    user_id: int, 
    skip: int = 0, 
    limit: int = 100,
    start_date: str = None,
    end_date: str = None,
    category_id: int = None,
    type: str = None,
    payment_method: str = None,
    account_id: int = None
):
    from sqlalchemy.orm import joinedload
    query = db.query(models.Transaction).options(
        joinedload(models.Transaction.category),
        joinedload(models.Transaction.account)
    ).filter(models.Transaction.user_id == user_id)
    
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
        query = query.join(models.Category).filter(models.Category.type == type)
    if payment_method:
        query = query.filter(models.Transaction.payment_method == payment_method)
        
    return query.order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()

def create_transaction(db: Session, transaction: schemas.TransactionCreate, user_id: int):
    try:
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
                    amount=installment_amount,
                    date=tx_date,
                    description=tx_desc,
                    is_fixed_expense=transaction.is_fixed_expense,
                    is_recurrent=transaction.is_recurrent,
                    payment_method=transaction.payment_method,
                    installments=installments_count
                )
                db.add(db_transaction)
                created_transactions.append(db_transaction)
            
            db.commit()
            for tx in created_transactions:
                db.refresh(tx)
            return created_transactions[0]
        else:
            db_transaction = models.Transaction(**transaction.dict(exclude={'account_id'}), user_id=user_id, account_id=account_id)
            db.add(db_transaction)
            db.commit()
            db.refresh(db_transaction)
            return db_transaction
    except Exception as e:
        db.rollback()
        raise e

def update_transaction(db: Session, transaction_id: int, transaction: schemas.TransactionCreate, user_id: int):
    try:
        db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == user_id).first()
        if db_transaction:
            for key, value in transaction.dict().items():
                setattr(db_transaction, key, value)
            
            # Auto-mark as paid if amount_paid >= amount
            if db_transaction.amount_paid >= db_transaction.amount:
                db_transaction.is_paid = True
                
            db.commit()
            db.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        db.rollback()
        raise e

def delete_transaction(db: Session, transaction_id: int, user_id: int):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == user_id).first()
    if db_transaction:
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
