from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from .. import crud, schemas, models, database
from ..auth.router import get_current_user
from datetime import datetime, timedelta
import calendar

router = APIRouter()

@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(
    month: int = None, 
    year: int = None, 
    account_id: int = None,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year

    # 1. Patrimônio Líquido (Net Worth)
    # Ativos = Saldo Inicial + Entradas Pagas + Investimentos - Saídas Pagas (não crédito)
    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
    initial_balances = sum(acc.initial_balance or 0.0 for acc in accounts)
    
    total_income_all_time = db.query(func.sum(models.Transaction.amount)).join(models.Category).filter(
        models.Transaction.user_id == current_user.id,
        models.Category.type == 'income',
        models.Transaction.is_paid == True
    ).scalar() or 0.0
    
    total_expense_paid_all_time = db.query(func.sum(models.Transaction.amount)).join(models.Category).filter(
        models.Transaction.user_id == current_user.id,
        models.Category.type == 'expense',
        models.Transaction.is_paid == True,
        models.Transaction.payment_method != models.PaymentMethod.CREDIT_CARD
    ).scalar() or 0.0

    # Investimentos
    investments_total = db.query(func.sum(models.Transaction.amount)).join(models.Category).filter(
        models.Transaction.user_id == current_user.id,
        models.Category.name.ilike('%investimento%')
    ).scalar() or 0.0

    # Saldo Líquido Atual (Dinheiro na mão/conta)
    current_cash = initial_balances + total_income_all_time - total_expense_paid_all_time
    assets_total = current_cash + investments_total

    # Passivos = Contas a Pagar (Total - Valor já Pago) + Faturas de Cartão não pagas
    all_pending_expenses = db.query(models.Transaction).join(models.Category).filter(
        models.Transaction.user_id == current_user.id,
        models.Category.type == 'expense',
        models.Transaction.is_paid == False
    ).all()
    
    # Dívida Real = (Valor Total das contas pendentes) - (O que já foi pago delas)
    liabilities_total = sum((t.amount - (t.amount_paid or 0.0)) for t in all_pending_expenses)
    
    net_worth = assets_total - liabilities_total

    # 1.1 Projeção de Fim de Mês (Forecast)

    # 1.1 Projeção de Fim de Mês (Forecast)
    # Saldo Projetado = Saldo Atual + Entradas Pendentes do Mês - Saídas Pendentes do Mês
    pending_income_month = db.query(func.sum(models.Transaction.amount)).join(models.Category).filter(
        models.Transaction.user_id == current_user.id,
        models.Category.type == 'income',
        models.Transaction.is_paid == False,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    ).scalar() or 0.0

    pending_expense_month = db.query(func.sum(models.Transaction.amount)).join(models.Category).filter(
        models.Transaction.user_id == current_user.id,
        models.Category.type == 'expense',
        models.Transaction.is_paid == False,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    ).scalar() or 0.0

    # Saldo Atual Líquido (Ativos Líquidos - Passivos Imediatos)
    current_liquid_balance = initial_balances + total_income_all_time - total_expense_paid_all_time
    projected_balance = current_liquid_balance + pending_income_month - pending_expense_month

    # 2. Resumo Mensal
    query = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    )
    if account_id:
        query = query.filter(models.Transaction.account_id == account_id)
    transactions = query.all()

    # 3. Orçamentos (Budgets)
    db_budgets = db.query(models.Budget).filter(models.Budget.user_id == current_user.id).all()
    budget_progress = []
    for b in db_budgets:
        spent = sum(t.amount for t in transactions if t.category_id == b.category_id)
        budget_progress.append({
            "category": b.category.name,
            "limit": b.amount,
            "spent": spent,
            "percentage": (spent / b.amount * 100) if b.amount > 0 else 0
        })

    def calculate_totals(txs):
        income = sum(t.amount for t in txs if t.category and t.category.type == 'income')
        expense = sum(t.amount for t in txs if t.category and t.category.type == 'expense')
        return income, expense

    current_income, current_expense = calculate_totals(transactions)

    # Comparison with previous month
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    prev_query = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        extract('month', models.Transaction.date) == prev_month,
        extract('year', models.Transaction.date) == prev_year
    )
    if account_id:
        prev_query = prev_query.filter(models.Transaction.account_id == account_id)
    prev_transactions = prev_query.all()
    prev_income, prev_expense = calculate_totals(prev_transactions)

    # Categories
    category_totals = {}
    for t in transactions:
        if t.category.type == 'expense':
            cat_name = t.category.name
            category_totals[cat_name] = category_totals.get(cat_name, 0) + t.amount
    
    expenses_by_category = [{"name": name, "value": value} for name, value in category_totals.items()]

    # Payment Methods
    payment_totals = {}
    for t in transactions:
        if t.category.type == 'expense':
            pm = t.payment_method
            pm_name = pm.name if hasattr(pm, 'name') else str(pm)
            payment_totals[pm_name] = payment_totals.get(pm_name, 0) + t.amount
    
    expenses_by_payment_method = [{"name": name, "value": value} for name, value in payment_totals.items()]

    # Fixed vs Variable
    fixed_total = sum(t.amount for t in transactions if t.category.type == 'expense' and t.is_fixed_expense)
    variable_total = current_expense - fixed_total

    # Recurring
    recurring_total = sum(t.amount for t in transactions if t.category.type == 'expense' and t.is_recurrent)

    # Reserves / Investments (Assuming categories with 'investimento' or 'reserva' in name)
    investments_total = sum(t.amount for t in transactions if 'investimento' in t.category.name.lower() or 'reserva' in t.category.name.lower())

    # Credit vs Debit
    credit_total = sum(t.amount for t in transactions if t.payment_method == models.PaymentMethod.CREDIT_CARD or t.payment_method == "CREDIT_CARD")
    debit_total = sum(t.amount for t in transactions if t.payment_method == models.PaymentMethod.DEBIT_CARD or t.payment_method == "DEBIT_CARD")

    # Comparison percentages
    income_change = ((current_income - prev_income) / prev_income * 100) if prev_income > 0 else 0
    expense_change = ((current_expense - prev_expense) / prev_expense * 100) if prev_expense > 0 else 0

    # Pending Bills
    pending_bills = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.is_paid == False
    ).order_by(models.Transaction.date.asc()).all()

    # Subscriptions (Recurring expenses)
    active_subscriptions = [t for t in transactions if t.category.type == 'expense' and t.is_recurrent]

    return {
        "total_income": current_income,
        "total_expense": current_expense,
        "balance": current_income - current_expense,
        "net_worth": net_worth,
        "projected_balance": projected_balance,
        "active_subscriptions": active_subscriptions,
        "assets_total": assets_total,
        "liabilities_total": liabilities_total,
        "prev_income": prev_income,
        "prev_expense": prev_expense,
        "income_change": income_change,
        "expense_change": expense_change,
        "expenses_by_category": expenses_by_category,
        "expenses_by_payment_method": expenses_by_payment_method,
        "fixed_expenses": fixed_total,
        "variable_expenses": variable_total,
        "recurring_expenses": recurring_total,
        "investments": investments_total,
        "credit_expenses": credit_total,
        "debit_expenses": debit_total,
        "income_commitment_pct": (current_expense / current_income * 100) if current_income > 0 else 0,
        "pending_bills": pending_bills,
        "budgets": budget_progress
    }

@router.get("/report")
def get_financial_report(
    month: int = None, 
    year: int = None, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import SystemMessage, HumanMessage
    import os
    import json

    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"report": "A chave da API da OpenAI não foi configurada."}

    # Fetch data for the report
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    ).all()

    summary = get_dashboard_summary(month, year, db, current_user)
    
    data_context = {
        "user_name": current_user.name,
        "month": month,
        "year": year,
        "income": summary["total_income"],
        "expense": summary["total_expense"],
        "balance": summary["balance"],
        "income_commitment_pct": summary["income_commitment_pct"],
        "expenses_by_category": summary["expenses_by_category"],
        "fixed_vs_variable": {
            "fixed": summary["fixed_expenses"],
            "variable": summary["variable_expenses"]
        },
        "investments": summary["investments"]
    }

    prompt = f"""
    Você é um consultor financeiro sênior. Analise os dados financeiros do usuário abaixo e forneça um relatório curto, direto e útil (em Português do Brasil).
    
    Dados do mês {month}/{year}:
    {json.dumps(data_context, indent=2)}
    
    O relatório deve incluir:
    1. Uma avaliação geral da saúde financeira do mês.
    2. Destaques positivos ou negativos.
    3. 3 dicas práticas para melhorar as finanças no próximo mês.
    
    Use um tom motivador mas profissional.
    """

    try:
        chat = ChatOpenAI(model="gpt-5.4-mini", api_key=api_key)
        response = chat.invoke([SystemMessage(content=prompt)])
        
        # Extract text content safely
        content = response.content
        if isinstance(content, list):
            text = "".join([part["text"] for part in content if "text" in part])
        else:
            text = str(content)
            
        return {"report": text}
    except Exception as e:
        return {"report": f"Erro ao gerar relatório: {str(e)}"}
