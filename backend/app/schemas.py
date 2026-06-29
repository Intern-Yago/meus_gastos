from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    currency: Optional[str] = "BRL"
    monthly_income_goal: Optional[float] = None
    push_notifications_enabled: Optional[bool] = True
    spending_alerts_enabled: Optional[bool] = True
    market_insights_enabled: Optional[bool] = True
    proactive_insights_enabled: Optional[bool] = True
    proactive_insights_days: Optional[str] = "fri"
    proactive_insights_hour: Optional[int] = 10
    proactive_insights_minute: Optional[int] = 0
    email_verified: bool = False
    phone_verified: bool = False
    investor_profile: Optional[str] = "Não Definido"
    whatsapp_lid: Optional[str] = None
    timezone: Optional[str] = "America/Sao_Paulo"
    proactive_insights_email: Optional[bool] = None
    proactive_insights_whatsapp: Optional[bool] = None

class UserCreate(UserBase):
    password: str
    invite_code: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    currency: Optional[str] = None
    push_notifications_enabled: Optional[bool] = None
    spending_alerts_enabled: Optional[bool] = None
    market_insights_enabled: Optional[bool] = None
    proactive_insights_enabled: Optional[bool] = None
    proactive_insights_days: Optional[str] = None
    proactive_insights_hour: Optional[int] = None
    proactive_insights_minute: Optional[int] = None
    email_verified: Optional[bool] = None
    phone_verified: Optional[bool] = None
    investor_profile: Optional[str] = None
    whatsapp_lid: Optional[str] = None
    timezone: Optional[str] = None
    proactive_insights_email: Optional[bool] = None
    proactive_insights_whatsapp: Optional[bool] = None

class User(UserBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

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
    currency: Optional[str] = "BRL"
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
    currency: Optional[str] = None
    has_credit_card: Optional[bool] = None
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None

class Account(AccountBase):
    id: int
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)

# Category schemas
class CategoryBase(BaseModel):
    name: str
    type: str # income or expense
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "Tag"
    is_active: Optional[bool] = True

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)

# Project schemas
class ProjectItemBase(BaseModel):
    name: str
    budget_allocation: float = 0.0
    type: str = "expense" # income or expense

class ProjectItemCreate(ProjectItemBase):
    pass

class ProjectItem(ProjectItemBase):
    id: int
    project_id: int
    model_config = ConfigDict(from_attributes=True)

class ProjectBase(BaseModel):
    name: str
    total_budget: float
    target_date: Optional[datetime] = None
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "Target"
    status: Optional[str] = "PLANEJAMENTO"
    type: Optional[str] = "event"
    is_business: Optional[bool] = False
    cnpj: Optional[str] = None
    logo_path: Optional[str] = None

class ProjectCreate(ProjectBase):
    items: Optional[List[ProjectItemCreate]] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    total_budget: Optional[float] = None
    target_date: Optional[datetime] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    is_business: Optional[bool] = None
    cnpj: Optional[str] = None
    logo_path: Optional[str] = None

class Project(ProjectBase):
    id: int
    user_id: UUID
    items: List[ProjectItem] = []
    model_config = ConfigDict(from_attributes=True)

class ProjectItemSummary(BaseModel):
    id: int
    name: str
    type: str
    allocated: float
    spent: float
    remaining: float

class ProjectSummary(BaseModel):
    id: int
    name: str
    type: str
    total_budget: float
    total_income: float
    total_expense: float
    remaining_budget: float
    percentage_spent: float
    items: List[ProjectItemSummary]
    transactions: List[dict]
    revenue: float
    costs: float
    profit: float
    profit_margin: float
    model_config = ConfigDict(from_attributes=True)

# Transaction schemas
class TransactionBase(BaseModel):
    amount: float
    description: str
    date: datetime
    category_id: Optional[int] = None
    account_id: Optional[int] = None
    project_id: Optional[int] = None
    project_item_id: Optional[int] = None
    goal_id: Optional[int] = None
    type: str = "expense"
    payment_method: str = "OTHERS"
    is_fixed_expense: bool = False
    is_recurrent: bool = False
    installments: int = 1
    is_paid: bool = True
    amount_paid: float = 0.0
    due_day: Optional[int] = None
    notify_me: bool = False
    ticker: Optional[str] = None
    shares: Optional[float] = 0
    attachment_path: Optional[str] = None
    original_currency: Optional[str] = "BRL"
    exchange_rate: Optional[float] = 1.0

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    category_id: Optional[int] = None
    account_id: Optional[int] = None
    project_id: Optional[int] = None
    project_item_id: Optional[int] = None
    goal_id: Optional[int] = None
    type: Optional[str] = None
    payment_method: Optional[str] = None
    is_fixed_expense: Optional[bool] = None
    is_recurrent: Optional[bool] = None
    installments: Optional[int] = None
    is_paid: Optional[bool] = None
    amount_paid: Optional[float] = None
    due_day: Optional[int] = None
    notify_me: Optional[bool] = None
    ticker: Optional[str] = None
    shares: Optional[float] = None
    attachment_path: Optional[str] = None
    original_currency: Optional[str] = None
    exchange_rate: Optional[float] = None

class Transaction(TransactionBase):
    id: int
    user_id: UUID
    category: Optional[Category] = None
    account: Optional[Account] = None
    model_config = ConfigDict(from_attributes=True)

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
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)

# Budget schemas
class BudgetBase(BaseModel):
    category_id: int
    amount: float

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    id: int
    user_id: UUID
    category: Optional[Category] = None
    model_config = ConfigDict(from_attributes=True)

# Notification schemas
class NotificationBase(BaseModel):
    title: str
    content: str
    type: str
    user_id: UUID

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Dashboard schemas
class DashboardSummary(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    net_worth: float
    projected_balance: float
    active_subscriptions: List[Transaction]
    assets_total: float
    liabilities_total: float
    prev_income: float
    prev_expense: float
    income_change: float
    expense_change: float
    expenses_by_category: List[dict]
    expenses_by_payment_method: List[dict]
    fixed_expenses: float
    variable_expenses: float
    recurring_expenses: float
    investments: float
    credit_expenses: float
    debit_expenses: float
    income_commitment_pct: float
    pending_bills: List[Transaction]
    accounts_payable: dict
    accounts_receivable: dict
    budgets: List[dict]
    credit_cards: List[dict] = []
    
    # Novas métricas de Inteligência MEI / Autônomo
    dinheiro_livre_real: float
    das_provisao: float
    goals_reserva: float
    entradas_previstas_mes: float
    contas_previstas_mes: float
    despesas_pagas_mes: float
    sobra_provavel: float
    risco_caixa: str
    texto_analise_caixa: str
    entradas_pendentes_mes: float
    contas_pendentes_mes: float

# Pagination schemas
class PaginatedTransactions(BaseModel):
    items: List[Transaction]
    total: int
    page: int
    pages: int
    size: int

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChatMessageSingle(BaseModel):
    role: str # user or assistant
    content: str

class ChatMessage(BaseModel):
    messages: List[ChatMessageSingle]
    attachment_path: Optional[str] = None
    save_history: Optional[bool] = True

class ChatResponse(BaseModel):
    response: str
