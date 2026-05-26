from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from .database import Base
import datetime
import enum

class TransactionType(enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"

class PaymentMethod(enum.Enum):
    CASH = "CASH"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    PIX = "PIX"
    TRANSFER = "TRANSFER"
    BOLETO = "BOLETO"
    OTHERS = "OTHERS"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    currency = Column(String, default="BRL")
    monthly_income_goal = Column(Float, nullable=True)
    known_ips = Column(String, default="") # Lista separada por vírgula de IPs conhecidos
    last_location = Column(String, nullable=True) # Última cidade/país detectado
    
    categories = relationship("Category", back_populates="owner")
    transactions = relationship("Transaction", back_populates="owner")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="owner", cascade="all, delete-orphan")
    memories = relationship("UserMemory", back_populates="owner", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="owner", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="owner", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="owner", cascade="all, delete-orphan")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    target_amount = Column(Float)
    current_amount = Column(Float, default=0.0)
    deadline = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    color = Column(String, default="#3b82f6")
    icon = Column(String, default="Star")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="goals")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_default = Column(Boolean, default=False)
    color = Column(String, default="#3b82f6")
    
    # Novos campos para Net Worth e Cartão de Crédito
    initial_balance = Column(Float, default=0.0)
    has_credit_card = Column(Boolean, default=False)
    credit_limit = Column(Float, nullable=True)
    closing_day = Column(Integer, nullable=True)
    due_day = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    amount = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="budgets")
    category = relationship("Category")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    content = Column(String)
    type = Column(String) # 'bill_closing', 'bill_due', 'budget_warning'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="notifications")

from pgvector.sqlalchemy import Vector

class UserMemory(Base):
    __tablename__ = "user_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String) # O fato ou preferência guardada
    embedding = Column(Vector(1536)) # Vetor para busca semântica (OpenAI usa 1536)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="memories")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    email = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)

    owner = relationship("User", back_populates="password_reset_tokens")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String) # income or expense
    color = Column(String, nullable=True)
    icon = Column(String, nullable=True) # Nome do ícone da lucide-react

    owner = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    amount = Column(Float)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    description = Column(String)
    is_fixed_expense = Column(Boolean, default=False)
    is_recurrent = Column(Boolean, default=False)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.OTHERS)
    installments = Column(Integer, default=1)
    attachment_path = Column(String, nullable=True)
    due_day = Column(Integer, nullable=True) # Dia do mês para vencimento
    notify_me = Column(Boolean, default=False) # Se deve notificar por email
    is_paid = Column(Boolean, default=True) # Para contas fixas, marcar se já foi pago no mês atual
    amount_paid = Column(Float, default=0.0) # Valor já pago para contas parceladas ou pendentes
    ticker = Column(String, nullable=True) # Ex: MXRF11, PETR4
    shares = Column(Float, default=0) # Quantidade de cotas/ações

    owner = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
