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

    # SECURITY: Validate account ownership if provided
    if account_id:
        acc_check = db.query(models.Account).filter(models.Account.id == account_id, models.Account.user_id == current_user.id).first()
        if not acc_check:
            raise HTTPException(status_code=403, detail="Acesso à conta negado.")

    # 1. Patrimônio Líquido (Net Worth) - CÁLCULO GLOBAL (All-time)
    # Ativos Reais = Saldo Inicial de todas as contas + Entradas Pagas (All-time) - Saídas Pagas (All-time, exceto crédito)
    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
    initial_balances = sum(acc.initial_balance or 0.0 for acc in accounts)
    
    # Entradas Pagas (Total histórico)
    total_income_paid_all_time = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == 'income',
        models.Transaction.is_paid == True
    ).scalar() or 0.0
    
    # Saídas Pagas (Total histórico - Não contamos cartão de crédito como saída de caixa imediata se for pago depois)
    total_expense_paid_all_time = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == 'expense',
        models.Transaction.is_paid == True,
        models.Transaction.payment_method != "CREDIT_CARD"
    ).scalar() or 0.0

    # Saldo Disponível Real (Caixa atual)
    current_liquid_cash = initial_balances + total_income_paid_all_time - total_expense_paid_all_time
    assets_total = current_liquid_cash

    # Passivos = Contas a Pagar Pendentes (Dívida total não paga até o mês selecionado) + Fatura de Cartão do Mês Anterior (que vence no mês atual)
    # Pegar o último dia do mês selecionado para evitar somar parcelas futuras como dívidas ativas do mês corrente
    _, last_day = calendar.monthrange(year, month)
    end_of_selected_month = datetime(year, month, last_day, 23, 59, 59)
    
    liabilities_pending = db.query(func.sum(models.Transaction.amount - models.Transaction.amount_paid)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == 'expense',
        models.Transaction.is_paid == False,
        models.Transaction.date <= end_of_selected_month
    ).scalar() or 0.0
    
    prev_month_temp = month - 1 if month > 1 else 12
    prev_year_temp = year if month > 1 else year - 1
    
    prev_month_credit_spent = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == 'expense',
        models.Transaction.payment_method == 'CREDIT_CARD',
        models.Transaction.is_paid == True,
        extract('month', models.Transaction.date) == prev_month_temp,
        extract('year', models.Transaction.date) == prev_year_temp
    ).scalar() or 0.0
    
    liabilities_total = liabilities_pending + prev_month_credit_spent
    
    net_worth = assets_total - liabilities_total

    # 1.1 Projeção de Fim de Mês (Forecast)
    # Saldo Projetado = Saldo Atual Líquido + Entradas Pendentes do Mês - Saídas Pendentes do Mês
    pending_income_month = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == 'income',
        models.Transaction.is_paid == False,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    ).scalar() or 0.0

    pending_expense_month = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == 'expense',
        models.Transaction.is_paid == False,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    ).scalar() or 0.0

    projected_balance = assets_total + pending_income_month - pending_expense_month

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
            "category_id": b.category_id,
            "category": b.category.name,
            "limit": b.amount,
            "spent": spent,
            "percentage": (spent / b.amount * 100) if b.amount > 0 else 0
        })

    def calculate_totals(txs):
        income = sum(t.amount for t in txs if t.category and t.category.type == 'income' and t.is_paid == True)
        expense = sum(t.amount for t in txs if t.category and t.category.type == 'expense' and t.is_paid == True)
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
    category_data = {} # {id: {name, value}}
    for t in transactions:
        if t.category and t.category.type == 'expense':
            cid = t.category_id
            cname = t.category.name
            if cid not in category_data:
                category_data[cid] = {"id": cid, "name": cname, "value": 0}
            category_data[cid]["value"] += t.amount
    
    expenses_by_category = list(category_data.values())

    # Payment Methods
    payment_totals = {}
    for t in transactions:
        if t.category and t.category.type == 'expense':
            pm = t.payment_method
            pm_name = pm.name if hasattr(pm, 'name') else str(pm)
            payment_totals[pm_name] = payment_totals.get(pm_name, 0) + t.amount
    
    expenses_by_payment_method = [{"name": name, "value": value} for name, value in payment_totals.items()]

    # Fixed vs Variable
    fixed_total = sum(t.amount for t in transactions if t.category and t.category.type == 'expense' and t.is_fixed_expense)
    variable_total = current_expense - fixed_total

    # Recurring
    recurring_total = sum(t.amount for t in transactions if t.category and t.category.type == 'expense' and t.is_recurrent)

    # Reserves / Investments (Assuming categories with 'investimento' or 'reserva' in name)
    investments_total = sum(t.amount for t in transactions if t.category and ('investimento' in t.category.name.lower() or 'reserva' in t.category.name.lower()))

    # Credit vs Debit
    credit_total = sum(t.amount for t in transactions if t.payment_method == models.PaymentMethod.CREDIT_CARD or t.payment_method == "CREDIT_CARD")
    debit_total = sum(t.amount for t in transactions if t.payment_method == models.PaymentMethod.DEBIT_CARD or t.payment_method == "DEBIT_CARD")

    # Comparison percentages
    income_change = ((current_income - prev_income) / prev_income * 100) if prev_income > 0 else 0
    expense_change = ((current_expense - prev_expense) / prev_expense * 100) if prev_expense > 0 else 0

    # 4. Contas a Pagar e a Receber (Detalhamento para Gráficos)
    pending_bills_all = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.is_paid == False
    ).all()

    # Contas a Pagar (Expense + Unpaid, exceto cartão de crédito para evitar confundir com boletos manuais)
    to_pay = [t for t in pending_bills_all if t.type == 'expense' and t.payment_method != "CREDIT_CARD" and t.payment_method != models.PaymentMethod.CREDIT_CARD]
    to_pay_late = [t for t in to_pay if t.date < datetime.now()]
    to_pay_on_time = [t for t in to_pay if t.date >= datetime.now()]

    # Contas a Receber (Income + Unpaid)
    to_receive = [t for t in pending_bills_all if t.type == 'income']
    to_receive_late = [t for t in to_receive if t.date < datetime.now()]
    to_receive_on_time = [t for t in to_receive if t.date >= datetime.now()]

    # Métricas de Performance de Pagamento (Pagas no mês)
    paid_this_month = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.is_paid == True,
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year
    ).all()

    # Subscriptions (Recurring expenses)
    active_subscriptions = [t for t in transactions if t.category and t.category.type == 'expense' and t.is_recurrent]

    # === CÁLCULO DE MÉTRICAS DE INTELIGÊNCIA MEI / AUTÔNOMO ===
    # 1. Provisão de DAS/Impostos (6% das entradas de faturamento ligado a Negócios/Lojas)
    business_income_month = db.query(func.sum(models.Transaction.amount)).join(
        models.Project, models.Transaction.project_id == models.Project.id
    ).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == 'income',
        extract('month', models.Transaction.date) == month,
        extract('year', models.Transaction.date) == year,
        models.Project.is_business == True
    ).scalar() or 0.0
    das_provisao = business_income_month * 0.06
    
    # 2. Reserva de Metas Ativas (soma do saldo acumulado de todas as metas)
    goals_reserva = db.query(func.sum(models.Goal.current_amount)).filter(
        models.Goal.user_id == current_user.id
    ).scalar() or 0.0
    
    # 3. Dinheiro Livre Real
    # Livre = Saldo em Conta - Contas a Pagar Totais - Provisão DAS - Reserva de Metas
    dinheiro_livre_real = assets_total - liabilities_total - das_provisao - goals_reserva
    
    # 4. Widget "Meu Mês Fecha?" (Oráculo de Caixa) - Regime de Caixa Puro para total consistência
    # Entradas do Mês (Somente as Realizadas/Pagas, evitando discrepâncias visuais)
    entradas_previstas_mes = current_income
    
    # Contas do Mês Pendentes (A Pagar)
    contas_previstas_mes = pending_expense_month
    
    # Despesas Já Pagas do Mês
    despesas_pagas_mes = current_expense
    
    # === REFINAMENTO DE RISCO BASEADO NO SALDO FINAL PROJETADO ===
    # Saldo Projetado ajustado pelos impostos do mês
    saldo_final_projetado = projected_balance - das_provisao
    
    # Sobra/Resultado de fluxo mensal (Fluxo de caixa líquido do mês - Puro Caixa)
    fluxo_mensal_resultado = current_income - current_expense - das_provisao
    
    risco_caixa = "baixo"
    texto_analise_caixa = "Seu caixa está saudável e equilibrado. Continue mantendo o controle de gastos para acumular patrimônio."
    
    if saldo_final_projetado < 0.0:
        risco_caixa = "alto"
        texto_analise_caixa = f"ALTO RISCO: Sua conta fechará no vermelho com saldo negativo de R$ {abs(saldo_final_projetado):.2f}. Suas despesas superam seu dinheiro disponível. Crie metas de corte urgente!"
    elif fluxo_mensal_resultado < 0.0:
        risco_caixa = "medio"
        texto_analise_caixa = f"QUEIMA DE CAIXA: Sua conta fechará no azul com R$ {saldo_final_projetado:.2f}, mas você está consumindo R$ {abs(fluxo_mensal_resultado):.2f} das suas reservas este mês. Reduza despesas e controle o cartão para proteger seu patrimônio."
    elif fluxo_mensal_resultado < 500.0:
        risco_caixa = "medio"
        texto_analise_caixa = f"Sua conta fechará no azul com R$ {saldo_final_projetado:.2f}, mas sua sobra de fluxo mensal é pequena (R$ {fluxo_mensal_resultado:.2f}). Evite novos gastos extras."

    # === CÁLCULO DE DETALHAMENTO DE CARTÕES DE CRÉDITO (OPÇÃO B) ===
    credit_cards_list = []
    cc_accounts = db.query(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Account.has_credit_card == True
    ).all()
    
    for acc in cc_accounts:
        # Calcular gastos de crédito do mês atual
        current_bill = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.account_id == acc.id,
            models.Transaction.type == 'expense',
            models.Transaction.payment_method == 'CREDIT_CARD',
            models.Transaction.is_paid == True,
            extract('month', models.Transaction.date) == month,
            extract('year', models.Transaction.date) == year
        ).scalar() or 0.0
        
        # Calcular faturada do mês anterior (que vence no mês atual)
        prev_month_temp = month - 1 if month > 1 else 12
        prev_year_temp = year if month > 1 else year - 1
        
        past_bill = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.account_id == acc.id,
            models.Transaction.type == 'expense',
            models.Transaction.payment_method == 'CREDIT_CARD',
            models.Transaction.is_paid == True,
            extract('month', models.Transaction.date) == prev_month_temp,
            extract('year', models.Transaction.date) == prev_year_temp
        ).scalar() or 0.0
        
        limit = acc.credit_limit or 0.0
        utilization_pct = (current_bill / limit * 100) if limit > 0 else 0
        
        credit_cards_list.append({
            "id": acc.id,
            "name": acc.name,
            "limit": limit,
            "due_day": acc.due_day or 10,
            "closing_day": acc.closing_day or 5,
            "current_bill": current_bill,
            "past_bill": past_bill,
            "utilization_pct": utilization_pct,
            "color": acc.color or "#3b82f6"
        })

    # Simplificando para o frontend: No Dashboard enviamos os totais e as listas
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
        "pending_bills": to_pay, # Compatibilidade
        "accounts_payable": {
            "late": [{"id": t.id, "amount": t.amount, "description": t.description, "date": t.date.isoformat()} for t in to_pay_late],
            "on_time": [{"id": t.id, "amount": t.amount, "description": t.description, "date": t.date.isoformat()} for t in to_pay_on_time],
            "total_late": sum(t.amount for t in to_pay_late),
            "total_on_time": sum(t.amount for t in to_pay_on_time)
        },
        "accounts_receivable": {
            "late": [{"id": t.id, "amount": t.amount, "description": t.description, "date": t.date.isoformat()} for t in to_receive_late],
            "on_time": [{"id": t.id, "amount": t.amount, "description": t.description, "date": t.date.isoformat()} for t in to_receive_on_time],
            "total_late": sum(t.amount for t in to_receive_late),
            "total_on_time": sum(t.amount for t in to_receive_on_time)
        },
        "budgets": budget_progress,
        "credit_cards": credit_cards_list,
        "dinheiro_livre_real": dinheiro_livre_real,
        "das_provisao": das_provisao,
        "goals_reserva": goals_reserva,
        "entradas_previstas_mes": entradas_previstas_mes,
        "contas_previstas_mes": contas_previstas_mes,
        "despesas_pagas_mes": despesas_pagas_mes,
        "sobra_provavel": saldo_final_projetado,
        "risco_caixa": risco_caixa,
        "texto_analise_caixa": texto_analise_caixa,
        "entradas_pendentes_mes": pending_income_month,
        "contas_pendentes_mes": pending_expense_month
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

    try:
        summary = get_dashboard_summary(month, year, None, db, current_user)
        
        # SECURITY: Sanitize data to prevent prompt injection
        # Replace characters that could be used for injection
        def sanitize(text):
            return str(text).replace("{", "[").replace("}", "]").replace('"', "'")

        data_context = {
            "user_name": sanitize(current_user.name),
            "month": month,
            "year": year,
            "income": summary["total_income"],
            "expense": summary["total_expense"],
            "balance": summary["balance"],
            "income_commitment_pct": summary["income_commitment_pct"],
            "expenses_by_category": [{"name": sanitize(c["name"]), "value": c["value"]} for c in summary["expenses_by_category"]],
            "fixed_vs_variable": {
                "fixed": summary["fixed_expenses"],
                "variable": summary["variable_expenses"]
            },
            "investments": summary["investments"]
        }

        prompt = f"""
        Você é o Finora, um estrategista financeiro de alto nível. 
        Analise o Silo de Inteligência de {current_user.name} referente a {month}/{year} e forneça um Executive Report sofisticado.
        
        DATA CONTEXT:
        {json.dumps(data_context, indent=2)}
        
        O relatório deve ser estruturado em 3 parágrafos curtos e imponentes:
        1. DIAGNÓSTICO DE FLUXO: Avalie o equilíbrio entre receita e comprometimento.
        2. ANÁLISE DE EFICIÊNCIA: Destaque onde o capital está sendo drenado ou onde houve economia notável.
        3. CALL TO ACTION: Uma recomendação cirúrgica para otimizar o Net Worth no próximo mês.
        
        Seja direto, não use preâmbulos. Destaque valores com R$.
        """

        chat = ChatOpenAI(model="gpt-4o-mini", api_key=api_key)
        response = chat.invoke([SystemMessage(content=prompt)])
        
        # Extract text content safely
        content = response.content
        if isinstance(content, list):
            text = "".join([part["text"] for part in content if "text" in part])
        else:
            text = str(content)
            
        return {"report": text}
    except Exception:
        # Avoid leaking internal error details
        return {"report": "Não foi possível gerar seu relatório agora. Por favor, tente novamente mais tarde."}

