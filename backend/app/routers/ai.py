from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from .. import crud, schemas, models, database
from ..auth.router import get_current_user
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage, AIMessage
from langchain_core.tools import tool
import os
import json
from datetime import datetime, timedelta
from openai import OpenAI
from fastapi import UploadFile, File
import uuid
import shutil
import redis
import asyncio

from ..utils import email
from ..utils.document_processor import process_document
from ..utils.minio_client import get_presigned_url, download_file_from_minio
from ..utils.statement_processor import process_statement_logic
from ..utils.market_data import get_current_prices, get_ticker_history
from ..utils.scheduler import schedule_one_off_reminder

router = APIRouter()

# Redis Configuration
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
r = redis.from_url(redis_url, decode_responses=True)

@router.get("/history")
def get_chat_history(current_user: models.User = Depends(get_current_user)):
    """Busca o histórico do chat no Redis."""
    try:
        history_key = f"chat_history:{current_user.id}"
        history_raw = r.get(history_key)
        if history_raw:
            return json.loads(history_raw)
    except Exception as e:
        print(f"DEBUG: Error fetching chat history: {str(e)}")
    return []

# --- TOOL DEFINITIONS ---

@tool
def create_category_tool(name: str, type: str, color: str = "#3b82f6"):
    """Cria uma nova categoria financeira. type deve ser 'income' ou 'expense'."""
    return f"Categoria '{name}' criada."

@tool
def process_statement_tool(file_path: str):
    """Processa arquivo de extrato (Excel/CSV) e importa transações."""
    return f"O processamento do arquivo {file_path} foi iniciado."

@tool
def get_spending_summary_tool(month: int = None, year: int = None):
    """Retorna um resumo dos gastos totais do usuário no mês especificado.
    Útil para dar conselhos financeiros e comparar com meses anteriores.
    """
    return "Resumo financeiro obtido."

@tool
def adjust_account_balance_tool(account_name: str, real_balance: float):
    """Ajusta o saldo do sistema para bater com o saldo real do banco.
    Cria uma transação de 'Ajuste de Saldo' automática.
    """
    return f"Saldo da conta '{account_name}' ajustado para R$ {real_balance}."

@tool
def manage_goals_tool(
    action: str, 
    goal_id: int = None, 
    name: str = None, 
    target_amount: float = None, 
    add_to_current: float = None,
    deadline: str = None
):
    """Gerencia as metas financeiras do usuário.
    'action' pode ser: 'list' (ver todas), 'create' (nova meta), 'update' (mudar valor/nome) ou 'add_progress' (economizou mais um pouco).
    'add_to_current' é usado para ADICIONAR um valor ao que já foi poupado para aquela meta.
    """
    return f"Ação {action} realizada na meta."

@tool
def set_budget_tool(category_name: str, amount: float):
    """Define um teto de gastos (orçamento) para uma categoria específica.
    Recomende o uso disso quando o usuário gastar muito.
    """
    return f"Orçamento de R$ {amount} definido para '{category_name}'."

@tool
def update_account_tool(
    account_name: str,
    initial_balance: float = None,
    has_credit_card: bool = None,
    credit_limit: float = None,
    closing_day: int = None,
    due_day: int = None
):
    """Atualiza as configurações de uma conta bancária.
    Use para mudar limite do cartão, saldo inicial ou dias de fatura.
    """
    return f"Conta '{account_name}' atualizada."

@tool
def register_transaction_tool(
    amount: float, 
    description: str, 
    category_name: str, 
    type: str, 
    payment_method: str = "OTHERS",
    is_fixed: bool = False,
    is_recurrent: bool = False,
    installments: int = 1,
    date: str = None,
    attach_file: bool = False,
    due_day: int = None,
    notify_me: bool = False,
    is_paid: bool = True,
    amount_paid: float = 0.0,
    ticker: str = None,
    shares: float = 0,
    attachment_path: str = None,
    account_name: str = None
):
    """Registra uma transação financeira no banco de dados. 
    Por padrão, is_paid=True (transação já realizada).
    Use is_paid=False APENAS se o usuário especificar que é uma conta 'a pagar', 'pendente' ou 'vencendo'.
    O 'attachment_path' deve ser o caminho do arquivo fornecido no contexto.
    Use 'account_name' se o usuário mencionar um banco (ex: Nubank, Inter, Itaú).
    """
    return f"Transação registrada."

@tool
def update_transaction_tool(
    transaction_id: int,
    amount: float = None,
    description: str = None,
    category_name: str = None,
    account_name: str = None,
    payment_method: str = None,
    is_paid: bool = None,
    amount_paid: float = None,
    add_to_amount_paid: float = None,
    notify_me: bool = None,
    due_day: int = None,
    date: str = None,
    attachment_path: str = None
):
    """Atualiza uma transação existente com base no seu ID. 
    Use 'amount_paid' para definir o valor total pago até agora.
    Use 'add_to_amount_paid' para ADICIONAR um valor ao que já foi pago.
    Use 'attachment_path' para anexar um comprovante enviado pelo usuário.
    Use 'account_name' para mudar o banco/conta da transação.
    """
    return f"Transação {transaction_id} atualizada."

@tool
def search_transactions_tool(description: str = None, category_name: str = None, is_paid: bool = None):
    """Busca transações no banco de dados por descrição ou categoria. 
    Use isso para encontrar o ID de uma conta que o usuário quer alterar.
    """
    return "Busca solicitada."

@tool
def schedule_notification_tool(description: str, scheduled_time: str):
    """Agenda uma notificação por e-mail para um momento específico no futuro. 
    O parâmetro 'scheduled_time' deve ser uma string no formato ISO (YYYY-MM-DDTHH:MM:SS).
    USE ISSO APENAS APÓS REGISTRAR A TRANSAÇÃO.
    """
    return f"Notificação agendada para {scheduled_time}."

@tool
def get_investment_analysis_tool(ticker: str):
    """Busca dados de mercado para um ativo (ticker)."""
    return f"Análise de {ticker} solicitada."

@tool
def save_memory_tool(content: str):
    """Salva fatos importantes sobre o usuário."""
    return f"Memória salva."

@tool
def get_financial_summary_tool():
    """Gera um resumo da saúde financeira do usuário incluindo gastos POR CATEGORIA."""
    return "Resumo financeiro detalhado solicitado."

@tool
def generate_download_link_tool(transaction_id: int):
    """Gera um link para o comprovante de uma transação."""
    return f"Link solicitado para {transaction_id}."

# --- HELPER FUNCTIONS ---

def extract_text(content):
    if not content: return ""
    if isinstance(content, str): return content.strip()
    if isinstance(content, list):
        text_parts = [part.get("text", "") if isinstance(part, dict) else str(part) for part in content]
        return "".join(text_parts).strip()
    return str(content).strip()

@router.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_ai(chat_input: schemas.ChatMessage, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key: return {"response": "API Key OpenAI ausente."}
    api_url = os.getenv("API_URL", "https://api.gestaofinora.com.br")

    current_msg = chat_input.messages[-1].content
    attachment_path = chat_input.attachment_path
    
    if not attachment_path and len(current_msg) < 5 and any(x in current_msg.lower() for x in ["oi", "olá", "ola"]):
        return {"response": f"Olá {current_user.name}! Como posso ajudar com seu dinheiro hoje?"}

    doc_content = None
    temp_local_path = None
    if attachment_path:
        try:
            if attachment_path.startswith("receipts/"):
                ext = os.path.splitext(attachment_path)[1].lower()
                temp_local_path = f"uploads/tmp_ai_{uuid.uuid4()}{ext}"
                if download_file_from_minio(attachment_path, temp_local_path):
                    doc_content = process_document(temp_local_path)
            else:
                full_path = attachment_path.lstrip("/")
                if not os.path.exists(full_path):
                    if os.path.exists(f"uploads/{full_path}"): full_path = f"uploads/{full_path}"
                if os.path.exists(full_path): doc_content = process_document(full_path)
        except: pass

    embeddings = OpenAIEmbeddings(api_key=api_key)
    try: query_embedding = embeddings.embed_query(current_msg)
    except: query_embedding = [0.0] * 1536

    # Contexto para o prompt
    transactions = db.query(models.Transaction).options(joinedload(models.Transaction.category)).filter(models.Transaction.user_id == current_user.id).order_by(models.Transaction.id.desc()).limit(10).all()
    categories = crud.get_categories(db, user_id=current_user.id)
    relevant_memories = crud.get_relevant_memories(db, user_id=current_user.id, query_embedding=query_embedding, limit=2)
    unread_notifications = crud.get_unread_notifications(db, user_id=current_user.id)

    # Injetar notificações se houver
    alerts_context = ""
    if unread_notifications:
        alerts_context = "\nALERTAS ATIVOS (MENCIONE PROATIVAMENTE NO INÍCIO DA CONVERSA):\n"
        for n in unread_notifications:
            alerts_context += f"- {n.title}: {n.content}\n"
        
        # Marcar como lidas para não repetir
        for n in unread_notifications:
            crud.mark_notification_as_read(db, n.id, current_user.id)

    system_prompt = f"""
    Você é o Finora, assistente de {current_user.name}.
    Data/Hora Atual: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.

    SUA MISSÃO: Ser um Coach Financeiro Proativo. Não apenas registre, mas analise e aconselhe.
    {alerts_context}

    DIRETRIZES DE COACHING (SEJA PROATIVO):
    1. Antes de apenas confirmar um registro de GASTO, verifique o resumo do mês com 'get_spending_summary_tool'.
    2. Se o gasto for alto ou recorrente, compare com o mês passado ou com as metas do usuário.
    3. Use 'manage_goals_tool' para saber o que o usuário está buscando (ex: viagem, reserva).
    4. Se o usuário economizar, incentive-o: "Isso te deixa 5% mais perto da sua meta de Viagem!".
    5. Se ele gastar demais em uma categoria (ex: Lazer), dê um aviso educado: "Notei que você já gastou R$ X com isso este mês. Talvez seja bom segurar um pouco?".

    DIRETRIZES DE METAS:
    1. O usuário pode criar, listar ou adicionar dinheiro a metas.
    2. Use 'manage_goals_tool' para todas as operações de metas.

    DIRETRIZES DE CONTAS BANCÁRIAS:
    1. Identifique se o usuário mencionou um banco ou conta (ex: Nubank, Inter, Itaú, PicPay, Carteira).
    2. Se mencionar, passe o nome para 'account_name' nas ferramentas de registro ou atualização.
    3. Se não mencionar, não passe nada (o sistema usará a conta padrão automaticamente).

    DIRETRIZES DE DOCUMENTOS/COMPROVANTES:
    1. Se o usuário enviar um arquivo e disser "coloque como comprovante em tal transação":
       a) Use 'search_transactions_tool' para achar o ID da transação.
       b) Use 'update_transaction_tool' com o ID e o 'attachment_path' fornecido.
    2. Se o usuário apenas enviar um comprovante sem instruções claras, analise e pergunte se quer registrar ou anexar.

    DIRETRIZES DE REGISTRO:
    1. Por padrão, registre transações como PAGAS (is_paid=True).
    2. Registre como 'a pagar' ou 'pendente' (is_paid=False) APENAS se o usuário especificar.
    3. PAGAMENTOS PARCIAIS: Use 'update_transaction_tool' com 'add_to_amount_paid'.
    4. NORMALIZAÇÃO (LIMPEZA VISUAL): Sempre limpe nomes feios de extratos bancários. Ex: 'IFOOD *BR SP' -> 'Ifood', 'UBER *PENDENTE' -> 'Uber', 'PAGTO APPLE.COM' -> 'Apple'. Deixe o nome bonito e reconhecível.
    """

    try:
        history_key = f"chat_history:{current_user.id}"
        current_history = get_chat_history(current_user)
        current_history.append({"role": "user", "content": current_msg})
        r.setex(history_key, 86400, json.dumps(current_history[-50:]))

        tools = [
            register_transaction_tool, create_category_tool, process_statement_tool, 
            update_transaction_tool, generate_download_link_tool, save_memory_tool, 
            get_financial_summary_tool, get_investment_analysis_tool, schedule_notification_tool, 
            search_transactions_tool, get_spending_summary_tool, manage_goals_tool, set_budget_tool, update_account_tool
        ]
        chat = ChatOpenAI(model="gpt-4o-mini", api_key=api_key, timeout=45).bind_tools(tools)
        messages = [SystemMessage(content=system_prompt)]
        
        for msg in chat_input.messages[-5:-1]: 
            if msg.role == "user": messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant" and msg.content.strip(): messages.append(AIMessage(content=msg.content))

        if doc_content:
            if doc_content["type"] == "image":
                messages.append(HumanMessage(content=[{"type": "text", "text": current_msg}, {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{doc_content['data']}"}}]))
            else:
                messages.append(HumanMessage(content=f"{current_msg}\n\nDocumento: {doc_content['data']}"))
        else:
            messages.append(HumanMessage(content=current_msg))
        
        final_ai_response = ""
        for _ in range(5):
            response = await chat.ainvoke(messages)
            if not response.tool_calls: 
                final_ai_response = extract_text(response.content)
                break
            
            messages.append(response)
            for tool_call in response.tool_calls:
                t_name = tool_call["name"]
                t_args = tool_call["args"]
                res = ""

                if t_name == "get_spending_summary_tool":
                    try:
                        from sqlalchemy import func, extract
                        m = t_args.get("month") or datetime.now().month
                        y = t_args.get("year") or datetime.now().year
                        summary = db.query(
                            func.sum(models.Transaction.amount).label("total")
                        ).join(models.Category).filter(
                            models.Transaction.user_id == current_user.id,
                            models.Category.type == "expense",
                            extract('month', models.Transaction.date) == m,
                            extract('year', models.Transaction.date) == y
                        ).first()

                        cats = db.query(
                            models.Category.name, func.sum(models.Transaction.amount)
                        ).join(models.Transaction).filter(
                            models.Transaction.user_id == current_user.id,
                            models.Category.type == "expense",
                            extract('month', models.Transaction.date) == m,
                            extract('year', models.Transaction.date) == y
                        ).group_by(models.Category.name).all()

                        res = json.dumps({
                            "total_spent": summary.total or 0,
                            "by_category": {name: val for name, val in cats},
                            "period": f"{m}/{y}"
                        })
                    except Exception as e: res = f"Erro ao obter resumo: {e}"

                elif t_name == "manage_goals_tool":
                    try:
                        action = t_args.get("action")
                        if action == "list":
                            goals = crud.get_goals(db, user_id=current_user.id)
                            res = json.dumps([{"id": g.id, "name": g.name, "target": g.target_amount, "current": g.current_amount} for g in goals])
                        elif action == "create":
                            new_goal = crud.create_goal(db, schemas.GoalCreate(
                                name=t_args.get("name"), 
                                target_amount=t_args.get("target_amount"),
                                deadline=datetime.fromisoformat(t_args.get("deadline")) if t_args.get("deadline") else None
                            ), user_id=current_user.id)
                            res = f"Meta '{new_goal.name}' criada com sucesso."
                        elif action == "add_progress":
                            g_id = t_args.get("goal_id")
                            amount = float(t_args.get("add_to_current", 0))
                            updated = crud.add_goal_progress(db, goal_id=g_id, amount=amount, user_id=current_user.id)
                            res = f"Progresso adicionado! Agora você tem {updated.current_amount} de {updated.target_amount} para '{updated.name}'."
                        else: res = "Ação não suportada."
                    except Exception as e: res = f"Erro nas metas: {e}"

                elif t_name == "search_transactions_tool":
                    try:
                        desc = t_args.get("description")
                        query = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)
                        if desc: query = query.filter(models.Transaction.description.ilike(f"%{desc}%"))
                        if t_args.get("is_paid") is not None: query = query.filter(models.Transaction.is_paid == t_args.get("is_paid"))
                        found = query.order_by(models.Transaction.id.desc()).limit(5).all()
                        res = json.dumps([{"id": f.id, "desc": f.description, "v": f.amount, "date": f.date.isoformat()} for f in found])
                    except Exception as e: res = f"Erro na busca: {e}"

                elif t_name == "schedule_notification_tool":
                    try:
                        scheduled_iso = t_args.get("scheduled_time")
                        run_at = datetime.fromisoformat(scheduled_iso)
                        desc = t_args.get("description")
                        tx = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id, models.Transaction.description.ilike(f"%{desc}%")).order_by(models.Transaction.id.desc()).first()
                        
                        def job_func():
                            db_job = database.SessionLocal()
                            try:
                                u = db_job.query(models.User).filter(models.User.id == current_user.id).first()
                                if u:
                                    from ..utils.scheduler import send_bill_reminder_email
                                    send_bill_reminder_email(u.email, u.name, desc, transaction_id=tx.id if tx else None)
                            finally: db_job.close()

                        from ..utils.scheduler import scheduler
                        scheduler.add_job(job_func, 'date', run_date=run_at)
                        res = f"Agendado para {run_at.strftime('%H:%M:%S')}."
                    except Exception as e: res = f"Erro: {e}"

                elif t_name == "get_financial_summary_tool":
                    try:
                        now = datetime.now()
                        start_of_month = datetime(now.year, now.month, 1)
                        txs_month = db.query(models.Transaction).options(joinedload(models.Transaction.category)).filter(models.Transaction.user_id == current_user.id, models.Transaction.date >= start_of_month).all()
                        total_in = sum(t.amount for t in txs_month if t.category and t.category.type == 'income')
                        total_out = sum(t.amount for t in txs_month if t.category and t.category.type == 'expense')
                        cat_data = {t.category.name: 0 for t in txs_month if t.category and t.category.type == 'expense'}
                        for t in txs_month:
                            if t.category and t.category.type == 'expense': cat_data[t.category.name] += t.amount
                        res = json.dumps({"in": total_in, "out": total_out, "cats": cat_data})
                    except: res = "Erro"

                elif t_name == "set_budget_tool":
                    try:
                        cat_name = t_args.get("category_name")
                        cat = db.query(models.Category).filter(models.Category.name.ilike(cat_name), models.Category.user_id == current_user.id).first()
                        if cat:
                            crud.create_or_update_budget(db, schemas.BudgetCreate(category_id=cat.id, amount=t_args.get("amount")), current_user.id)
                            res = f"Orçamento de R$ {t_args.get('amount')} definido para {cat.name}."
                        else: res = f"Categoria '{cat_name}' não encontrada."
                    except Exception as e: res = str(e)

                elif t_name == "update_account_tool":
                    try:
                        acc_name = t_args.get("account_name")
                        db_acc = db.query(models.Account).filter(models.Account.name.ilike(acc_name), models.Account.user_id == current_user.id).first()
                        if db_acc:
                            for key, val in t_args.items():
                                if key != "account_name" and val is not None:
                                    setattr(db_acc, key, val)
                            db.commit()
                            res = f"Conta '{db_acc.name}' atualizada com sucesso."
                        else: res = f"Conta '{acc_name}' não encontrada."
                    except Exception as e: res = str(e)

                elif t_name == "adjust_account_balance_tool":
                    try:
                        acc_name = t_args.get("account_name")
                        real_bal = float(t_args.get("real_balance"))
                        db_acc = db.query(models.Account).filter(models.Account.name.ilike(acc_name), models.Account.user_id == current_user.id).first()
                        if db_acc:
                            # Cálculo: Saldo Real - Saldo Atual do Sistema = Ajuste
                            # Simplificação: vamos buscar o resumo do dashboard para essa conta
                            summary = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.account_id == db_acc.id, models.Transaction.user_id == current_user.id, models.Transaction.is_paid == True).scalar() or 0.0
                            # (Entradas - Saídas) + Saldo Inicial
                            # Para simplificar o MVP do ajuste, vamos apenas criar uma transação que acerta a diferença
                            # Mas primeiro precisamos saber o saldo atual calculado
                            current_system_bal = (db_acc.initial_balance or 0.0) # Simplificando cálculo de ajuste
                            # O ideal é usar a mesma lógica do dashboard, mas aqui faremos um ajuste direto no initial_balance por enquanto
                            # ou criamos uma transação de 'Ajuste'
                            diff = real_bal - current_system_bal # Isso é ingênuo, o dashboard soma transações
                            # Vamos apenas atualizar o initial_balance para bater o real menos as transações já feitas
                            db_acc.initial_balance = real_bal - total_income_all_time + total_expense_paid_all_time
                            db.commit()
                            res = f"Saldo de '{db_acc.name}' ajustado para R$ {real_bal}. O Patrimônio foi atualizado."
                        else: res = f"Conta '{acc_name}' não encontrada."
                    except Exception as e: res = str(e)

                elif t_name == "process_statement_tool":
                    try:
                        # Iniciar tarefa de reconciliação
                        result = await process_statement_logic(t_args.get("file_path"), current_user.id)
                        res = result
                    except Exception as e: res = str(e)

                elif t_name == "generate_download_link_tool":
                    try:
                        tx_id = t_args.get("transaction_id")
                        tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id, models.Transaction.user_id == current_user.id).first()
                        if tx and tx.attachment_path:
                            url = get_presigned_url(tx.attachment_path)
                            res = f"Aqui está o link para o comprovante: {url}"
                        else: res = "Comprovante não encontrado para esta transação."
                    except Exception as e: res = str(e)

                elif t_name == "register_transaction_tool":
                    try:
                        acc_id = None
                        acc_name = t_args.get("account_name")
                        if acc_name:
                            acc = db.query(models.Account).filter(models.Account.name.ilike(acc_name), models.Account.user_id == current_user.id).first()
                            if not acc: acc = crud.create_account(db, schemas.AccountCreate(name=acc_name), current_user.id)
                            acc_id = acc.id

                        cat_name = t_args.get("category_name", "Outros")
                        cat = db.query(models.Category).filter(models.Category.name.ilike(cat_name), models.Category.user_id == current_user.id).first()
                        if not cat: cat = crud.create_category(db, schemas.CategoryCreate(name=cat_name, type=t_args.get("type", "expense")), current_user.id)
                        new_tx = schemas.TransactionCreate(
                            amount=float(t_args.get("amount")), description=t_args.get("description", "IA"), category_id=cat.id, 
                            account_id=acc_id,
                            date=datetime.fromisoformat(t_args.get("date")) if t_args.get("date") else datetime.now(), 
                            ticker=t_args.get("ticker"), shares=t_args.get("shares", 0), 
                            is_paid=t_args.get("is_paid", True),
                            amount_paid=t_args.get("amount_paid", 0.0),
                            is_fixed_expense=t_args.get("is_fixed", False), 
                            due_day=t_args.get("due_day"),
                            attachment_path=t_args.get("attachment_path") or attachment_path
                        )
                        created = crud.create_transaction(db, new_tx, current_user.id)
                        db.commit()
                        res = f"Sucesso: ID {created.id} registrado."
                    except Exception as e: res = str(e)

                elif t_name == "update_transaction_tool":
                    try:
                        tx_id = t_args.get("transaction_id")
                        db_tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id, models.Transaction.user_id == current_user.id).first()
                        if db_tx:
                            acc_name = t_args.get("account_name")
                            if acc_name:
                                acc = db.query(models.Account).filter(models.Account.name.ilike(acc_name), models.Account.user_id == current_user.id).first()
                                if not acc: acc = crud.create_account(db, schemas.AccountCreate(name=acc_name), current_user.id)
                                db_tx.account_id = acc.id

                            add_to_paid = t_args.get("add_to_amount_paid")
                            if add_to_paid is not None:
                                db_tx.amount_paid = (db_tx.amount_paid or 0.0) + float(add_to_paid)
                            
                            for key, val in t_args.items():
                                if key not in ["transaction_id", "add_to_amount_paid", "account_name"] and val is not None:
                                    if key == 'date' and isinstance(val, str):
                                        val = datetime.fromisoformat(val.replace('Z', ''))
                                    setattr(db_tx, key, val)
                            
                            # Auto-mark as paid if amount_paid >= amount
                            if db_tx.amount_paid >= db_tx.amount:
                                db_tx.is_paid = True
                                
                            db.commit()
                            res = "Atualizado com sucesso."
                        else: res = "ID não encontrado."
                    except Exception as e: res = f"Erro: {e}"

                messages.append(ToolMessage(tool_call_id=tool_call["id"], content=res))

        if not final_ai_response:
            final_ai_response = extract_text(response.content) or "Pedido processado!"

        current_history = get_chat_history(current_user)
        current_history.append({"role": "assistant", "content": final_ai_response})
        r.setex(history_key, 86400, json.dumps(current_history[-50:]))
        
        if temp_local_path and os.path.exists(temp_local_path): os.remove(temp_local_path)
        return {"response": final_ai_response}

    except Exception as e:
        if temp_local_path and os.path.exists(temp_local_path): os.remove(temp_local_path)
        print(f"FATAL ERROR: {e}")
        return {"response": "A conexão falhou. Tente novamente."}

@router.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key: raise HTTPException(status_code=500, detail="Key ausente")
    client = OpenAI(api_key=api_key)
    temp_filename = f"temp_voice_{uuid.uuid4()}.m4a"
    with open(temp_filename, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    try:
        audio_file = open(temp_filename, "rb")
        transcript = client.audio.transcriptions.create(model="whisper-1", file=audio_file, language="pt")
        return {"text": transcript.text}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally:
        audio_file.close()
        if os.path.exists(temp_filename): os.remove(temp_filename)
