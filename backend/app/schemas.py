from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    currency: Optional[str] = "BRL"
    monthly_income_goal: Optional[float] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Account schemas
class AccountBase(BaseModel):
    name: str
    is_default: Optional[bool] = False
    color: Optional[str] = "#3b82f6"
    initial_balance: Optional[float] = 0.0
    has_credit_card: Optional[bool] = False
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    is_default: Optional[bool] = None
    color: Optional[str] = None
    initial_balance: Optional[float] = None
    has_credit_card: Optional[bool] = None
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None

class Account(AccountBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Category schemas
class CategoryBase(BaseModel):
    name: str
    type: str # income or expense
    color: Optional[str] = None
    icon: Optional[str] = "Tag"

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Goal schemas
class GoalBase(BaseModel):
    name: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    deadline: Optional[datetime] = None
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "Star"

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[datetime] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class Goal(GoalBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Budget schemas
class BudgetBase(BaseModel):
    category_id: int
    amount: float

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    amount: Optional[float] = None

class Budget(BudgetBase):
    id: int
    user_id: int
    category: Optional[Category] = None

    class Config:
        from_attributes = True

# Notification schemas
class NotificationBase(BaseModel):
    title: str
    content: str
    type: str
    is_read: Optional[bool] = False

class NotificationCreate(NotificationBase):
    user_id: int

class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Transaction schemas
class TransactionBase(BaseModel):
    amount: float
    date: datetime
    description: str
    category_id: int
    account_id: Optional[int] = None
    is_fixed_expense: Optional[bool] = False
    is_recurrent: Optional[bool] = False
    payment_method: Optional[str] = "OTHERS"
    installments: Optional[int] = 1
    attachment_path: Optional[str] = None
    due_day: Optional[int] = None
    notify_me: Optional[bool] = False
    is_paid: Optional[bool] = True
    amount_paid: Optional[float] = 0.0
    ticker: Optional[str] = None
    shares: Optional[float] = 0

    @field_validator('payment_method')
    @classmethod
    def payment_method_to_upper(cls, v: str) -> str:
        if v: return v.upper()
        return "OTHERS"

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    user_id: int
    category: Optional[Category] = None
    account: Optional[Account] = None

    class Config:
        from_attributes = True

# AI Chat schemas
class MessageEntry(BaseModel):
    role: str
    content: str

class ChatMessage(BaseModel):
    messages: List[MessageEntry]
    attachment_path: Optional[str] = None

class ChatResponse(BaseModel):
    response: str

# Dashboard schemas
class ChartData(BaseModel):
    name: str
    value: float

class DashboardSummary(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    net_worth: float
    projected_balance: float # Saldo previsto ao fim do mês
    active_subscriptions: List[Transaction] # Lista de gastos recorrentes
    assets_total: float
    liabilities_total: float
    prev_income: float
    prev_expense: float
    income_change: float
    expense_change: float
    expenses_by_category: List[ChartData]
    expenses_by_payment_method: List[ChartData]
    fixed_expenses: float
    variable_expenses: float
    recurring_expenses: float
    investments: float
    credit_expenses: float
    debit_expenses: float
    income_commitment_pct: float
    pending_bills: List[Transaction]
    budgets: List[dict] # Resumo do progresso de orçamentos

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
