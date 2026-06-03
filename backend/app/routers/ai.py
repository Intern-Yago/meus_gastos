from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
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
import redis.asyncio as aioredis
import asyncio

from ..utils import email
from ..utils.document_processor import process_document
from ..utils.minio_client import get_presigned_url, download_file_from_minio, upload_file_to_minio
from ..utils.statement_processor import process_statement_logic
from ..utils.market_data import get_current_prices, get_ticker_history
from ..utils.scheduler import check_pending_bills

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
def create_category_tool(name: str, type: str, color: str = "#3b82f6", icon: str = "Tag"):
    """Cria uma nova categoria financeira. type deve ser 'income' ou 'expense'."""
    return f"Categoria '{name}' criada."

@tool
def process_statement_tool(file_path: str):
    """Processa arquivo de extrato (Excel/CSV) e importa transações.
    Use esta ferramenta quando o usuário enviar um arquivo de banco.
    """
    return f"O processamento do arquivo foi iniciado."

@tool
def get_spending_summary_tool(month: int = None, year: int = None):
    """Retorna um resumo dos gastos totais do usuário no mês especificado."""
    return "Resumo financeiro obtido."

@tool
def adjust_account_balance_tool(account_name: str, real_balance: float):
    """Ajusta o saldo do sistema para bater com o saldo real do banco."""
    return f"Saldo da conta '{account_name}' ajustado."

@tool
def manage_goals_tool(
    action: str, 
    goal_id: int = None, 
    name: str = None, 
    target_amount: float = None, 
    add_to_current: float = None,
    deadline: str = None
):
    """Gerencia as metas financeiras do usuário (list, create, add_progress)."""
    return f"Ação {action} realizada na meta."

@tool
def set_budget_tool(category_name: str, amount: float):
    """Define um teto de gastos (orçamento) para uma categoria específica."""
    return f"Orçamento definido."

@tool
def update_account_tool(
    account_name: str,
    initial_balance: float = None,
    has_credit_card: bool = None,
    credit_limit: float = None,
    closing_day: int = None,
    due_day: int = None
):
    """Atualiza as configurações de uma conta bancária."""
    return f"Conta atualizada."

@tool
def create_project_scaffold_tool(name: str, total_budget: float, target_date: str = None, items: list = None, is_business: bool = False):
    """Cria um projeto financeiro estruturado (Evento ou Unidade de Negócio).
    - items: Lista de categorias internas, ex: [{'name': 'Buffet', 'budget_allocation': 5000}]
    - is_business: True se for uma Unidade de Negócio (Empresa), False se for Projeto Pessoal.
    """
    return f"Projeto criado."

@tool
def update_project_item_tool(item_id: int, name: str = None, budget_allocation: float = None):
    """Atualiza um item (categoria interna) de um projeto ou unidade de negócio.
    Use para alterar o nome ou o teto de gastos (budget_allocation) desse item.
    """
    return f"Item {item_id} atualizado."

@tool
def add_project_item_tool(project_id: int, name: str, budget_allocation: float = 0.0):
    """Adiciona uma nova categoria/item a um projeto ou unidade de negócio existente."""
    return f"Item '{name}' adicionado."

@tool
def register_transaction_tool(
    amount: float, 
    description: str, 
    category_name: str = None, 
    type: str = "expense", 
    payment_method: str = "OTHERS",
    original_currency: str = "BRL",
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
    account_name: str = None,
    project_id: int = None,
    project_item_id: int = None,
    force_new_registration: bool = False
):
    """Registra uma transação financeira. 
    INTELIGÊNCIA DE DADOS:
    - Analise a descrição para definir o 'type': 'income' (recebido/crédito) ou 'expense' (pago/débito).
    - Escolha uma categoria precisa (ex: Alimentação, Lazer, Transporte) baseada no texto. EVITE 'Outros'.
    - Payment Method: 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER', 'BOLETO' ou 'OTHERS'.
    - attachment_path: Caminho do arquivo de comprovante (se houver).
    - Use 'original_currency' para moedas estrangeiras (USD, EUR).
    - force_new_registration: Se True, força o registro novo mesmo se houver uma conta pendente similar.
    """
    return f"Transação registrada."

@tool
def bulk_update_transactions_tool(
    count: int = None,
    account_name: str = None,
    category_name: str = None,
    is_paid: bool = None,
    date_from: str = None
):
    """Atualiza múltiplas transações recentes de uma vez.
    - count: Número de transações mais recentes a atualizar (ex: 30).
    - account_name: Nome da nova conta (opcional).
    - category_name: Nome da nova categoria (opcional).
    """
    return "Processando atualização em lote..."

@tool
def update_transaction_tool(
    transaction_id: int,
    amount: float = None,
    description: str = None,
    category_name: str = None,
    is_paid: bool = None,
    amount_paid: float = None
):
    """Atualiza uma transação existente com base no seu ID."""
    return f"Transação atualizada."

@tool
def search_transactions_tool(description: str = None, category_name: str = None):
    """Busca transações no banco de dados por descrição ou categoria."""
    return "Busca realizada."

@tool
def schedule_notification_tool(description: str, scheduled_time: str):
    """Agenda uma notificação por e-mail para um momento específico no futuro."""
    return f"Notificação agendada."

@tool
def get_investment_analysis_tool(ticker: str):
    """Busca dados de mercado para um ativo (ticker)."""
    return f"Análise solicitada."

@tool
def save_memory_tool(content: str):
    """Salva fatos importantes ou regras de negócio sobre o usuário para lembrança futura."""
    return f"Memória salva."

@tool
def get_financial_summary_tool():
    """Gera um resumo da saúde financeira, do caixa e dos cadastros ativos do usuário, incluindo saldo total, contas bancárias do usuário, e a lista com os nomes de todas as lojas, negócios (is_business) e projetos ativos registrados."""
    return "Resumo financeiro obtido."

@tool
def generate_download_link_tool(transaction_id: int):
    """Gera um link para o comprovante de uma transação."""
    return f"Link gerado."

@tool
def generate_report_tool(format: str = "pdf", month: int = None, year: int = None):
    """Gera um relatório financeiro detalhado. Retorna os parâmetros para o link de download."""
    from datetime import datetime
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    return {"month": m, "year": y, "format": format}

# --- HELPER FUNCTIONS ---

def extract_text(content):
    if not content: return ""
    if isinstance(content, str): return content.strip()
    if isinstance(content, list):
        text_parts = [part.get("text", "") if isinstance(part, dict) else str(part) for part in content]
        return "".join(text_parts).strip()
    return str(content).strip()

@router.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_ai(
    chat_input: schemas.ChatMessage, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user),
    request = None # Sem type hint para não quebrar o Pydantic do FastAPI
):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key: return {"response": "API Key OpenAI ausente."}

    current_msg = chat_input.messages[-1].content
    attachment_path = chat_input.attachment_path
    
    # Resolver base_url para links (Download/Reports)
    base_url = "https://api.gestaofinora.com.br" # Default profissional
    if request and hasattr(request, "base_url"):
        base_url = str(request.base_url).rstrip("/")
    
    # 1. SELECIONAR FERRAMENTAS
    all_tools_objs = [
        register_transaction_tool, create_category_tool, process_statement_tool, 
        update_transaction_tool, generate_download_link_tool, save_memory_tool, 
        get_financial_summary_tool, get_investment_analysis_tool, schedule_notification_tool, 
        search_transactions_tool, get_spending_summary_tool, manage_goals_tool, set_budget_tool, update_account_tool,
        create_project_scaffold_tool, adjust_account_balance_tool, generate_report_tool,
        update_project_item_tool, add_project_item_tool, bulk_update_transactions_tool
    ]

    # 2. CONTEXTO E PROMPT
    memories = crud.get_user_memories(db, user_id=current_user.id)
    memories_context = ""
    if memories:
        memories_context = "\nMEMÓRIA DE LONGO PRAZO (Preferências do Usuário):\n" + "\n".join([f"- {m.content}" for m in memories])

    now_dt = datetime.now()
    today_str = now_dt.strftime("%A, %d de %B de %Y")

    system_prompt = f"""
    Você é o Finora, o mentor de inteligência financeira de elite para {current_user.name}. 
    Sua persona é sofisticada, ultra-proativa, concisa e imponente.
    
    DATA/HORA ATUAL DO SISTEMA: {today_str} (Use este ano {now_dt.year} como referência absoluta para qualquer meta, transação, contas, relatórios ou agendamento. NUNCA use anos passados como 2024 se hoje já for {now_dt.year}).
    
    DIRETRIZES DE OURO:
    1. AÇÕES ANTES DE RESUMOS: Se o usuário enviar um extrato ou pedir registros de despesas/entradas reais cujos detalhes (descrições e valores reais) foram fornecidos, você DEVE chamar 'register_transaction_tool' para CADA item antes de dar qualquer resposta final. Se os dados reais não forem informados, NUNCA chame as ferramentas de registro e peça esclarecimentos primeiro (conforme a Regra 10).
    2. CONFIRMAÇÃO DE REGISTRO: Sempre que registrar uma transação de imagem/comprovante, sua resposta final DEVE ser: 
       "✅ Registro Concluído: [Título] | [Data] | [Valor]"
    3. ANEXOS: Se você estiver processando uma imagem, você DEVE garantir que o 'attachment_path' seja enviado para a ferramenta 'register_transaction_tool'.
    4. CATEGORIZAÇÃO INTELIGENTE: NUNCA use 'Outros' se puder identificar a categoria (Ifood -> Alimentação, Bar -> Lazer).
    5. FORMAS DE PAGAMENTO: Pix -> 'PIX', Cartão -> 'DEBIT_CARD' ou 'CREDIT_CARD', Dinheiro -> 'CASH'.
    
    6. SIMULADOR DE DECISÃO FINANCEIRA: Quando o usuário perguntar se pode realizar uma compra (ex: comprar um notebook de R$ 4.000), você DEVE consultar os dados financeiros reais com 'get_financial_summary_tool'. Faça uma projeção precisa de dois caminhos:
       a) Compra à Vista: Mostre o impacto imediato no saldo líquido disponível e na reserva de emergência.
       b) Compra Parcelada: Mostre o impacto mensal no fluxo de caixa e o comprometimento percentual da renda.
       Forneça uma recomendação estratégica, profissional e elegante baseada na liquidez dele.

    7. CONCILIAÇÃO INTERATIVA (RECONCILIATION): Se você tentar registrar uma transação via 'register_transaction_tool' e ela retornar um JSON indicando 'reconciliation_match: true', você NÃO deve criar uma transação duplicada. Pare imediatamente o registro, explique amigavelmente que localizou uma conta a pagar pendente similar (mostrando a descrição, data e valor) e pergunte:
       "Reparei que você tem um registro de conta a pagar pendente similar: [Descrição] no valor de [Valor] (Vencimento: [Data]). Posso marcar esta conta como concluída/paga ou você prefere registrar uma nova do zero?"
       Se o usuário confirmar, chame 'update_transaction_tool' com 'is_paid=true' para aquela transação. Se ele disser para registrar como nova, repita a chamada de 'register_transaction_tool' passando 'force_new_registration=true'.
    
    8. PROATIVIDADE MASTER (O FINORA É O SISTEMA): Você NUNCA deve dar conselhos teóricos genéricos como "use uma ferramenta", "crie um orçamento", ou "separe um fundo". VOCÊ É O SISTEMA INTEGRADO FINORA! Se o usuário deseja poupar, controlar ou planejar, tome a iniciativa imediatamente:
       - Ofereça e sugira criar uma meta real de poupança no sistema agora mesmo usando 'manage_goals_tool' (ex: "Quer que eu crie uma meta chamada 'Notebook' com o teto de R$ 4.000 para começarmos a poupar?").
       - Ofereça definir tetos de gastos reais nas categorias dele usando 'set_budget_tool' para liberar o caixa necessário.
       - Faça chamadas de atenção imponentes e elegantes caso o caixa dele esteja crítico ou negativo (ex: seu saldo está em R$ -127,02, o que é gravíssimo): sugira registrar receitas pendentes ou ajustar o saldo se houver defasagem de dados com 'adjust_account_balance_tool'.
       - Seja prático, focado em ações executáveis no banco de dados do Finora, e encaminhe o usuário ativamente pelas ferramentas que possui.
    
    9. GESTÃO DE SILOS E NEGÓCIOS (NEGÓCIO VS CATEGORIA): Sempre que o usuário falar sobre uma "loja", "marca", "empresa", "unidade de negócio" ou "silo" (ex: "minha loja Fiora Store", "minha marca EAATA"), você DEVE tratar isso como uma Unidade de Negócio/Empresa real (is_business=True). Use a ferramenta 'create_project_scaffold_tool' para cadastrá-lo como um Negócio no sistema. Qualquer transação futura desse negócio deve ser associada passando o 'project_id' correspondente, e NUNCA criada como uma nova categoria financeira. Categorias são apenas classificações genéricas de despesas (ex: Alimentação, Impostos, Lazer). Nunca confunda marcas ou lojas individuais do usuário com categorias!
    
    10. PROIBIÇÃO DE INVENÇÃO DE DADOS (DADOS SUBESPECIFICADOS): Se o usuário solicitar o registro de transações, mas NÃO fornecer os dados vitais e específicos de descrição real e valor (ex: o usuário fala apenas "registre 5 saídas para mim" sem dizer o que são ou quanto custaram), você NUNCA deve inventar, fabricar ou simular esses valores e descrições fictícias (ex: criar "Transação normal 1" ou inventar valores aleatórios como R$ 100,00). 
       No entanto, se o usuário fornecer a descrição e o valor de uma despesa (ex: "pão, 10 reais"), você DEVE deduzir a categoria correspondente de forma inteligente por conta própria (ex: pão -> categoria "Alimentação") e assumir a data como hoje, registrando a transação imediatamente SEM parar a conversa para fazer perguntas óbvias que você consegue deduzir de forma autônoma! Só interrompa o fluxo para pedir esclarecimentos se de fato faltar a descrição ou o valor real do item.
    
    11. MENTORIA DE INVESTIMENTOS E EDUCAÇÃO FINANCEIRA (PROFILING ATIVO): O Finora é uma plataforma de educação e mentoria de investimentos, e não apenas controle. Quando o usuário perguntar sobre mercado financeiro, investimentos, ou se um ativo (ex: MANA11) é viável para ele:
       a) CONSULTE O CAIXA E VERIFIQUE DÉFICIT: Sempre use 'get_financial_summary_tool' primeiro. Se o usuário estiver com o caixa geral ou saldo disponível no vermelho (crítico ou negativo), você DEVE alertá-lo imediatamente e dar uma "chamada de atenção" elegante mas firme: explique que **não é recomendado realizar nenhum investimento no momento**, pois a prioridade absoluta é recuperar o saldo e sanear o caixa. Sugira criar uma meta de recuperação ou limitar despesas com orçamentos primeiro.
       b) RECONHEÇA O PERFIL: Verifique se você já tem em suas memórias de longo prazo (memories_context) o perfil de investidor dele (Conservador, Moderado, Arrojado).
       c) EXIJA O PROFILING SE DESCONHECIDO: Se o perfil do usuário for desconhecido nas memórias, você está **expressamente proibido** de fazer sugestões de alocação ou analisar a viabilidade de ativos às cegas! Explique que para dar qualquer diretriz segura, precisa conhecer o perfil dele. Faça imediatamente um questionário proativo de 3 perguntas curtas e padrão de profiling (ex: tolerância a perdas/oscilações, horizonte de tempo para resgatar o dinheiro, e conhecimento de mercado). Grave o perfil dele em sua memória com 'save_memory_tool' assim que ele responder!
       d) ALOCAÇÃO ATIVA COM VALORES REAIS: Se o perfil for conhecido e o saldo for positivo, faça sugestões didáticas com ativos reais brasileiros (MXRF11, MANA11, ETFs, Tesouro, etc.) e estabeleça **valores numéricos exatos** recomendados de alocação de forma proporcional e responsável baseado na sobra líquida de caixa real dele (ex: "Sua sobra líquida é de R$ 500. Dado seu perfil Moderado, sugiro colocar R$ 200 no Tesouro Selic, R$ 150 no FII MXRF11...").
       e) DISCLAIMER LEGAL OBRIGATÓRIO: Sempre enfatize de forma clara que você é um mentor inteligente para fins didáticos/educacionais e que suas sugestões são apenas simulações e referências de apoio, e não recomendações formais de compra e venda de ativos ou assessoria de investimentos profissional.
    
    {memories_context}
    """

    chat = ChatOpenAI(model="gpt-4o-mini", api_key=api_key, timeout=45).bind_tools(all_tools_objs)
    
    # 3. CONSTRUÇÃO DA MENSAGEM (MULTIMODAL)
    messages = [SystemMessage(content=system_prompt)]
    for msg in chat_input.messages[-5:-1]:
        if msg.role == "user": messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant" and msg.content.strip(): messages.append(AIMessage(content=msg.content))
    
    content_list = [{"type": "text", "text": current_msg}]
    if attachment_path and attachment_path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        try:
            from ..utils.minio_client import download_file_from_minio
            import base64
            temp_img = f"tmp_vision_{uuid.uuid4()}.jpg"
            if download_file_from_minio(attachment_path, temp_img):
                with open(temp_img, "rb") as f:
                    b64_img = base64.b64encode(f.read()).decode('utf-8')
                content_list.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}})
                if os.path.exists(temp_img): os.remove(temp_img)
        except Exception as e: print(f"ERROR VISION: {e}")

    messages.append(HumanMessage(content=content_list))

    # 4. EXECUÇÃO DE FERRAMENTAS
    final_ai_response = ""
    for _ in range(20):
        response = await chat.ainvoke(messages)
        if not response.tool_calls:
            final_ai_response = extract_text(response.content)
            break
        
        messages.append(response)
        for tool_call in response.tool_calls:
            t_name = tool_call["name"]
            t_args = tool_call["args"]
            res = ""

            if t_name == "register_transaction_tool":
                try:
                    # Prioridade para o anexo: Tool Args > Chat Input
                    final_attachment = t_args.get("attachment_path") or attachment_path
                    print(f"DEBUG AI: Registering with Attachment={final_attachment}")

                    orig_curr = t_args.get("original_currency", current_user.currency).upper()
                    amount = float(t_args.get("amount"))
                    rate = 1.0
                    if orig_curr != current_user.currency:
                        import yfinance as yf
                        ticker = yf.Ticker(f"{orig_curr}{current_user.currency}=X")
                        info = await asyncio.to_thread(lambda: ticker.info)
                        rate = info.get('regularMarketPrice') or 1.0
                        amount = amount * rate

                    acc_id = None
                    if t_args.get("account_name"):
                        acc = db.query(models.Account).filter(models.Account.name.ilike(t_args.get("account_name")), models.Account.user_id == current_user.id).first()
                        if not acc: acc = crud.create_account(db, schemas.AccountCreate(name=t_args.get("account_name")), current_user.id)
                        acc_id = acc.id
                    
                    cat_name = t_args.get("category_name", "Outros")
                    cat = db.query(models.Category).filter(models.Category.name.ilike(cat_name), models.Category.user_id == current_user.id).first()
                    if not cat: cat = crud.create_category(db, schemas.CategoryCreate(name=cat_name, type=t_args.get("type", "expense")), current_user.id)
                    
                    # Se não foi forçado um novo registro, checar conciliação sugerida
                    force_new = t_args.get("force_new_registration", False)
                    tx_type = t_args.get("type", "expense")
                    
                    if not force_new and tx_type == "expense":
                        amount_lower = amount * 0.95
                        amount_upper = amount * 1.05
                        tx_date = datetime.fromisoformat(t_args.get("date")) if t_args.get("date") else datetime.now()
                        date_lower = tx_date - timedelta(days=5)
                        date_upper = tx_date + timedelta(days=5)
                        
                        similar_unpaid = db.query(models.Transaction).filter(
                            models.Transaction.user_id == current_user.id,
                            models.Transaction.type == 'expense',
                            models.Transaction.is_paid == False,
                            models.Transaction.amount.between(amount_lower, amount_upper),
                            models.Transaction.date.between(date_lower, date_upper)
                        ).first()
                        
                        if similar_unpaid:
                            res = json.dumps({
                                "reconciliation_match": True,
                                "transaction_id": similar_unpaid.id,
                                "description": similar_unpaid.description,
                                "date": similar_unpaid.date.strftime("%Y-%m-%d"),
                                "amount": similar_unpaid.amount,
                                "message": f"SUGESTÃO DE CONCILIAÇÃO: Encontrada transação pendente similar ID {similar_unpaid.id} com descrição '{similar_unpaid.description}' no valor de R$ {similar_unpaid.amount:.2f}. Você DEVE interromper e perguntar educadamente se o usuário deseja marcar essa conta como paga ou registrar uma nova do zero."
                            })
                        else:
                            new_tx = schemas.TransactionCreate(
                                amount=amount, description=t_args.get("description", "IA"), 
                                category_id=cat.id, account_id=acc_id, type=t_args.get("type", "expense"),
                                payment_method=t_args.get("payment_method", "OTHERS"),
                                original_currency=orig_curr, exchange_rate=rate,
                                project_id=t_args.get("project_id"), project_item_id=t_args.get("project_item_id"),
                                is_paid=t_args.get("is_paid", True),
                                date=tx_date,
                                attachment_path=final_attachment
                            )
                            created = crud.create_transaction(db, new_tx, current_user.id)
                            res = f"Transação registrada ID {created.id}."
                    else:
                        tx_date = datetime.fromisoformat(t_args.get("date")) if t_args.get("date") else datetime.now()
                        new_tx = schemas.TransactionCreate(
                            amount=amount, description=t_args.get("description", "IA"), 
                            category_id=cat.id, account_id=acc_id, type=t_args.get("type", "expense"),
                            payment_method=t_args.get("payment_method", "OTHERS"),
                            original_currency=orig_curr, exchange_rate=rate,
                            project_id=t_args.get("project_id"), project_item_id=t_args.get("project_item_id"),
                            is_paid=t_args.get("is_paid", True),
                            date=tx_date,
                            attachment_path=final_attachment
                        )
                        created = crud.create_transaction(db, new_tx, current_user.id)
                        res = f"Transação registrada ID {created.id}."
                except Exception as e: 
                    print(f"ERROR REGISTER: {e}")
                    res = str(e)

            elif t_name == "bulk_update_transactions_tool":
                try:
                    count = t_args.get("count")
                    acc_name = t_args.get("account_name")
                    cat_name = t_args.get("category_name")
                    is_paid = t_args.get("is_paid")
                    query = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)
                    target_txs = query.order_by(models.Transaction.id.desc()).limit(count if count else 100).all()
                    if not target_txs: res = "Nada encontrado."
                    else:
                        for tx in target_txs:
                            if acc_name:
                                acc = db.query(models.Account).filter(models.Account.name.ilike(acc_name), models.Account.user_id == current_user.id).first()
                                if acc: tx.account_id = acc.id
                            if cat_name:
                                cat = db.query(models.Category).filter(models.Category.name.ilike(cat_name), models.Category.user_id == current_user.id).first()
                                if cat: tx.category_id = cat.id
                        db.commit()
                        res = "Lote atualizado."
                except Exception as e: res = str(e)

            elif t_name == "generate_report_tool":
                try:
                    m = t_args.get("month") or datetime.now().month
                    y = t_args.get("year") or datetime.now().year
                    ticket = str(uuid.uuid4())
                    r_async = aioredis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
                    await r_async.setex(f"sse_ticket:{ticket}", 86400, str(current_user.id))
                    await r_async.close()
                    res = f"{base_url}/reports/financial-summary?month={m}&year={y}&format=pdf&ticket={ticket}"
                except Exception as e: res = str(e)
            
            elif t_name == "save_memory_tool":
                try:
                    content = t_args.get("content")
                    crud.create_user_memory(db, user_id=current_user.id, content=content)
                    
                    # Atualização automática da coluna investor_profile ao detectar salvamento de perfil
                    lower_content = content.lower()
                    if "perfil" in lower_content and ("investidor" in lower_content or "investimento" in lower_content or "investimentos" in lower_content):
                        profile = "Não Definido"
                        if "moderado" in lower_content: profile = "Moderado"
                        elif "conservador" in lower_content: profile = "Conservador"
                        elif "arrojado" in lower_content: profile = "Arrojado"
                        
                        if profile != "Não Definido":
                            current_user.investor_profile = profile
                            db.commit()
                            
                    res = f"Memória de longo prazo salva com sucesso: '{content}'."
                except Exception as e:
                    res = f"Erro ao salvar memória: {str(e)}"

            elif t_name == "get_spending_summary_tool":
                try:
                    m = t_args.get("month") or datetime.now().month
                    y = t_args.get("year") or datetime.now().year
                    spending_by_cat = db.query(
                        models.Category.name,
                        func.sum(models.Transaction.amount)
                    ).join(models.Transaction, models.Transaction.category_id == models.Category.id).filter(
                        models.Transaction.user_id == current_user.id,
                        models.Transaction.type == 'expense',
                        func.extract('month', models.Transaction.date) == m,
                        func.extract('year', models.Transaction.date) == y
                    ).group_by(models.Category.name).all()
                    
                    total_spending = db.query(func.sum(models.Transaction.amount)).filter(
                        models.Transaction.user_id == current_user.id,
                        models.Transaction.type == 'expense',
                        func.extract('month', models.Transaction.date) == m,
                        func.extract('year', models.Transaction.date) == y
                    ).scalar() or 0.0
                    
                    spending_list = {cat_name: amt for cat_name, amt in spending_by_cat}
                    res_dict = {
                        "mes": m,
                        "ano": y,
                        "gasto_total": total_spending,
                        "gastos_por_categoria": spending_list
                    }
                    res = json.dumps(res_dict)
                except Exception as e:
                    res = f"Erro ao buscar sumário de gastos: {str(e)}"

            elif t_name == "search_transactions_tool":
                try:
                    desc = t_args.get("description")
                    cat_name = t_args.get("category_name")
                    query = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)
                    if desc:
                        query = query.filter(models.Transaction.description.ilike(f"%{desc}%"))
                    if cat_name:
                        query = query.join(models.Category).filter(models.Category.name.ilike(f"%{cat_name}%"))
                    results = query.order_by(models.Transaction.date.desc()).limit(15).all()
                    res_list = []
                    for tx in results:
                        res_list.append({
                            "id": tx.id,
                            "date": tx.date.strftime("%Y-%m-%d"),
                            "description": tx.description,
                            "amount": tx.amount,
                            "type": tx.type,
                            "category": tx.category.name if tx.category else "Outros",
                            "is_paid": tx.is_paid
                        })
                    res = json.dumps(res_list)
                except Exception as e:
                    res = f"Erro na busca de transações: {str(e)}"

            elif t_name == "adjust_account_balance_tool":
                try:
                    acc_name = t_args.get("account_name")
                    real_bal = float(t_args.get("real_balance"))
                    acc = db.query(models.Account).filter(
                        models.Account.user_id == current_user.id,
                        models.Account.name.ilike(acc_name)
                    ).first()
                    if not acc:
                        acc = crud.create_account(db, schemas.AccountCreate(name=acc_name, initial_balance=real_bal), current_user.id)
                        res = f"Conta '{acc_name}' não existia. Criada com saldo de R$ {real_bal:.2f}."
                    else:
                        acc.initial_balance = real_bal
                        db.commit()
                        res = f"Saldo da conta '{acc.name}' adjusted com sucesso para R$ {real_bal:.2f}."
                except Exception as e:
                    res = f"Erro ao ajustar saldo: {str(e)}"

            elif t_name == "manage_goals_tool":
                try:
                    action = t_args.get("action")
                    g_id = t_args.get("goal_id")
                    name = t_args.get("name")
                    target = t_args.get("target_amount")
                    add_current = t_args.get("add_to_current")
                    deadline_str = t_args.get("deadline")
                    
                    dl = None
                    if deadline_str:
                        try:
                            dl = datetime.fromisoformat(deadline_str.replace("Z", ""))
                        except:
                            pass

                    if action == "create":
                        new_goal = schemas.GoalCreate(
                            name=name or "Nova Meta",
                            target_amount=float(target) if target else 0.0,
                            current_amount=0.0,
                            deadline=dl
                        )
                        created = crud.create_goal(db, new_goal, current_user.id)
                        res = f"Meta '{created.name}' criada com sucesso com teto de R$ {created.target_amount:.2f}."
                    elif action == "add_progress" and g_id:
                        amt = float(add_current) if add_current else 0.0
                        updated = crud.add_goal_progress(db, g_id, amt, current_user.id)
                        res = f"Progresso de R$ {amt:.2f} adicionado à meta '{updated.name}'. Novo total: R$ {updated.current_amount:.2f}."
                    elif action == "delete" and g_id:
                        crud.delete_goal(db, g_id, current_user.id)
                        res = f"Meta ID {g_id} excluída com sucesso."
                    elif action == "list":
                        goals = crud.get_goals(db, current_user.id)
                        res = json.dumps([{"id": g.id, "name": g.name, "target": g.target_amount, "current": g.current_amount} for g in goals])
                    else:
                        res = f"Ação de metas {action} não suportada ou parâmetros ausentes."
                except Exception as e:
                    res = f"Erro ao gerenciar metas: {str(e)}"

            elif t_name == "set_budget_tool":
                try:
                    cat_name = t_args.get("category_name")
                    amount = float(t_args.get("amount"))
                    cat = db.query(models.Category).filter(
                        models.Category.name.ilike(cat_name),
                        models.Category.user_id == current_user.id
                    ).first()
                    if not cat:
                        cat = crud.create_category(db, schemas.CategoryCreate(name=cat_name, type="expense"), current_user.id)
                    
                    new_budget = schemas.BudgetCreate(
                        category_id=cat.id,
                        amount=amount
                    )
                    bgt = crud.create_or_update_budget(db, new_budget, current_user.id)
                    res = f"Orçamento para a categoria '{cat.name}' definido para R$ {bgt.amount:.2f} com sucesso."
                except Exception as e:
                    res = f"Erro ao definir orçamento: {str(e)}"

            elif t_name == "create_category_tool":
                try:
                    name = t_args.get("name")
                    t_type = t_args.get("type", "expense")
                    color = t_args.get("color", "#3b82f6")
                    icon = t_args.get("icon", "Tag")
                    new_cat = schemas.CategoryCreate(name=name, type=t_type, color=color, icon=icon)
                    created = crud.create_category(db, new_cat, current_user.id)
                    res = f"Categoria '{created.name}' criada com sucesso."
                except Exception as e:
                    res = f"Erro ao criar categoria: {str(e)}"

            elif t_name == "process_statement_tool":
                try:
                    f_path = t_args.get("file_path")
                    asyncio.create_task(process_statement_logic(f_path, current_user.id))
                    res = "O processamento do arquivo de extrato foi iniciado com sucesso em segundo plano."
                except Exception as e:
                    res = f"Erro ao iniciar processamento do extrato: {str(e)}"

            elif t_name == "update_transaction_tool":
                try:
                    tx_id = int(t_args.get("transaction_id"))
                    amount = t_args.get("amount")
                    desc = t_args.get("description")
                    cat_name = t_args.get("category_name")
                    is_paid = t_args.get("is_paid")
                    amt_paid = t_args.get("amount_paid")
                    
                    cat_id = None
                    if cat_name:
                        cat = db.query(models.Category).filter(
                            models.Category.name.ilike(cat_name),
                            models.Category.user_id == current_user.id
                        ).first()
                        if cat:
                            cat_id = cat.id
                        else:
                            cat = crud.create_category(db, schemas.CategoryCreate(name=cat_name, type="expense"), current_user.id)
                            cat_id = cat.id
                    
                    tx_update = schemas.TransactionUpdate(
                        amount=float(amount) if amount is not None else None,
                        description=desc,
                        category_id=cat_id,
                        is_paid=is_paid,
                        amount_paid=float(amt_paid) if amt_paid is not None else None
                    )
                    updated = crud.update_transaction(db, transaction_id=tx_id, transaction=tx_update, user_id=current_user.id)
                    res = f"Transação ID {updated.id} atualizada com sucesso. Descrição: '{updated.description}' | Pago: {updated.is_paid}."
                except Exception as e:
                    res = f"Erro ao atualizar transação: {str(e)}"

            elif t_name == "generate_download_link_tool":
                try:
                    tx_id = int(t_args.get("transaction_id"))
                    tx = db.query(models.Transaction).filter(
                        models.Transaction.id == tx_id,
                        models.Transaction.user_id == current_user.id
                    ).first()
                    if not tx or not tx.attachment_path:
                        res = "Nenhum arquivo ou comprovante foi anexado a esta transação."
                    else:
                        url = get_presigned_url(tx.attachment_path)
                        res = f"Aqui está o link temporário de download do seu comprovante: {url}"
                except Exception as e:
                    res = f"Erro ao gerar link de download: {str(e)}"

            elif t_name == "get_investment_analysis_tool":
                try:
                    ticker_symbol = t_args.get("ticker").upper()
                    prices = get_current_prices([ticker_symbol])
                    current_price = prices.get(ticker_symbol, "N/A")
                    history = get_ticker_history(ticker_symbol, period="5d")
                    res_dict = {
                        "ticker": ticker_symbol,
                        "preco_atual": current_price,
                        "historico_recente": history[-5:] if history else []
                    }
                    res = json.dumps(res_dict)
                except Exception as e:
                    res = f"Erro ao analisar investimentos: {str(e)}"

            elif t_name == "schedule_notification_tool":
                try:
                    desc = t_args.get("description")
                    sch_time_str = t_args.get("scheduled_time")
                    st = datetime.now()
                    if sch_time_str:
                        try:
                            st = datetime.fromisoformat(sch_time_str.replace("Z", ""))
                        except:
                            pass
                    new_notif = schemas.NotificationCreate(
                        title="Lembrete Agendado",
                        content=desc,
                        type="reminder",
                        user_id=current_user.id
                    )
                    db_notif = models.Notification(**new_notif.dict(), created_at=st)
                    db.add(db_notif)
                    db.commit()
                    db.refresh(db_notif)
                    res = f"Lembrete agendado com sucesso para {st.strftime('%d/%m/%Y às %H:%M')}: '{desc}'."
                except Exception as e:
                    res = f"Erro ao agendar lembrete: {str(e)}"

            elif t_name == "update_account_tool":
                try:
                    acc_name = t_args.get("account_name")
                    init_bal = t_args.get("initial_balance")
                    has_cc = t_args.get("has_credit_card")
                    limit = t_args.get("credit_limit")
                    close_day = t_args.get("closing_day")
                    due_day = t_args.get("due_day")
                    acc = db.query(models.Account).filter(
                        models.Account.name.ilike(acc_name),
                        models.Account.user_id == current_user.id
                    ).first()
                    if not acc:
                        new_acc = schemas.AccountCreate(
                            name=acc_name,
                            initial_balance=float(init_bal) if init_bal is not None else 0.0,
                            has_credit_card=bool(has_cc) if has_cc is not None else False,
                            credit_limit=float(limit) if limit is not None else None,
                            closing_day=int(close_day) if close_day is not None else None,
                            due_day=int(due_day) if due_day is not None else None
                        )
                        acc = crud.create_account(db, new_acc, current_user.id)
                        res = f"Conta '{acc.name}' não existia e foi criada com sucesso."
                    else:
                        if init_bal is not None: acc.initial_balance = float(init_bal)
                        if has_cc is not None: acc.has_credit_card = bool(has_cc)
                        if limit is not None: acc.credit_limit = float(limit)
                        if close_day is not None: acc.closing_day = int(close_day)
                        if due_day is not None: acc.due_day = int(due_day)
                        db.commit()
                        res = f"Configurações da conta '{acc.name}' atualizadas com sucesso."
                except Exception as e:
                    res = f"Erro ao atualizar conta bancária: {str(e)}"

            elif t_name == "create_project_scaffold_tool":
                try:
                    name = t_args.get("name")
                    budget_val = t_args.get("total_budget")
                    budget = float(budget_val) if budget_val is not None else 0.0
                    target_date_str = t_args.get("target_date")
                    items_list = t_args.get("items") or []
                    is_biz = bool(t_args.get("is_business"))
                    td = None
                    if target_date_str:
                        try:
                            td = datetime.fromisoformat(target_date_str.replace("Z", ""))
                        except:
                            pass
                    proj_items = []
                    if items_list:
                        for it in items_list:
                            proj_items.append(schemas.ProjectItemCreate(
                                name=it.get("name"),
                                budget_allocation=float(it.get("budget_allocation", 0.0))
                            ))
                    new_proj = schemas.ProjectCreate(
                        name=name,
                        total_budget=budget,
                        target_date=td,
                        is_business=is_biz,
                        status="active",
                        items=proj_items
                    )
                    created = crud.create_project(db, new_proj, current_user.id)
                    res = f"Projeto/Negócio '{created.name}' criado com sucesso com verba de R$ {created.total_budget:.2f} e {len(items_list)} categorias internas."
                except Exception as e:
                    res = f"Erro ao criar projeto: {str(e)}"

            elif t_name == "update_project_item_tool":
                try:
                    item_id = int(t_args.get("item_id"))
                    it_name = t_args.get("name")
                    budget_alloc = t_args.get("budget_allocation")
                    item = db.query(models.ProjectItem).join(models.Project).filter(
                        models.ProjectItem.id == item_id,
                        models.Project.user_id == current_user.id
                    ).first()
                    if not item:
                        res = f"Categoria interna de projeto com ID {item_id} não encontrada ou não pertence a você."
                    else:
                        if it_name: item.name = it_name
                        if budget_alloc is not None: item.budget_allocation = float(budget_alloc)
                        db.commit()
                        res = f"Categoria interna '{item.name}' do projeto atualizada com sucesso."
                except Exception as e:
                    res = f"Erro ao atualizar item do projeto: {str(e)}"

            elif t_name == "add_project_item_tool":
                try:
                    project_id = int(t_args.get("project_id"))
                    it_name = t_args.get("name")
                    budget_alloc = float(t_args.get("budget_allocation", 0.0))
                    proj = crud.get_project(db, project_id, current_user.id)
                    if not proj:
                        res = f"Projeto/Negócio com ID {project_id} não encontrado."
                    else:
                        db_item = models.ProjectItem(
                            project_id=project_id,
                            name=it_name,
                            budget_allocation=budget_alloc
                        )
                        db.add(db_item)
                        db.commit()
                        db.refresh(db_item)
                        res = f"Categoria interna '{it_name}' adicionada com sucesso ao projeto '{proj.name}'."
                except Exception as e:
                    res = f"Erro ao adicionar item ao projeto: {str(e)}"
            
            elif t_name == "get_financial_summary_tool":
                try:
                    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
                    initial_balances = sum(acc.initial_balance or 0.0 for acc in accounts)
                    total_income_paid = db.query(func.sum(models.Transaction.amount)).filter(
                        models.Transaction.user_id == current_user.id,
                        models.Transaction.type == 'income',
                        models.Transaction.is_paid == True
                    ).scalar() or 0.0
                    total_expense_paid = db.query(func.sum(models.Transaction.amount)).filter(
                        models.Transaction.user_id == current_user.id,
                        models.Transaction.type == 'expense',
                        models.Transaction.is_paid == True,
                        models.Transaction.payment_method != "CREDIT_CARD"
                    ).scalar() or 0.0
                    current_balance = initial_balances + total_income_paid - total_expense_paid
                    liabilities = db.query(func.sum(models.Transaction.amount)).filter(
                        models.Transaction.user_id == current_user.id,
                        models.Transaction.type == 'expense',
                        models.Transaction.is_paid == False
                    ).scalar() or 0.0
                    net_worth = current_balance - liabilities
                    
                    now = datetime.now()
                    pending_income_month = db.query(func.sum(models.Transaction.amount)).filter(
                        models.Transaction.user_id == current_user.id,
                        models.Transaction.type == 'income',
                        models.Transaction.is_paid == False,
                        func.extract('month', models.Transaction.date) == now.month,
                        func.extract('year', models.Transaction.date) == now.year
                    ).scalar() or 0.0
                    pending_expense_month = db.query(func.sum(models.Transaction.amount)).filter(
                        models.Transaction.user_id == current_user.id,
                        models.Transaction.type == 'expense',
                        models.Transaction.is_paid == False,
                        func.extract('month', models.Transaction.date) == now.month,
                        func.extract('year', models.Transaction.date) == now.year
                    ).scalar() or 0.0
                    projected_balance = current_balance + pending_income_month - pending_expense_month
                    
                    # Busca e agrupa os projetos/silos ativos
                    active_projects = db.query(models.Project).filter(
                        models.Project.user_id == current_user.id,
                        models.Project.status == "active"
                    ).all()
                    silos_business = [p.name for p in active_projects if p.is_business]
                    silos_personal = [p.name for p in active_projects if not p.is_business]
                    
                    res_dict = {
                        "saldo_disponivel_total": current_balance,
                        "passivos_totais": liabilities,
                        "patrimonio_liquido": net_worth,
                        "entradas_pendentes_mes": pending_income_month,
                        "saidas_pendentes_mes": pending_expense_month,
                        "saldo_projetado_fim_mes": projected_balance,
                        "contas_usuario": [acc.name for acc in accounts],
                        "lojas_negocios_ativos": silos_business,
                        "projetos_pessoais_ativos": silos_personal
                    }
                    res = json.dumps(res_dict)
                except Exception as e:
                    res = f"Erro ao coletar sumário financeiro: {str(e)}"

            else: res = "OK"
            messages.append(ToolMessage(tool_call_id=tool_call["id"], content=res))

    if not final_ai_response: final_ai_response = extract_text(response.content) or "Pronto!"
    if chat_input.save_history:
        history_key = f"chat_history:{current_user.id}"
        hist = get_chat_history(current_user)
        hist.append({"role": "user", "content": current_msg})
        hist.append({"role": "assistant", "content": final_ai_response})
        r.setex(history_key, 86400, json.dumps(hist[-50:]))
    return {"response": final_ai_response}

@router.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...)):
    api_key = os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)
    temp_filename = f"temp_voice_{uuid.uuid4()}.m4a"
    with open(temp_filename, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    try:
        audio_file = open(temp_filename, "rb")
        transcript = client.audio.transcriptions.create(model="whisper-1", file=audio_file, language="pt")
        return {"text": transcript.text}
    finally:
        audio_file.close()
        if os.path.exists(temp_filename): os.remove(temp_filename)

@router.post("/memory")
def add_memory(payload: dict, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    content = payload.get("content")
    if not content:
        raise HTTPException(status_code=400, detail="Content required")
    db_mem = crud.create_user_memory(db, user_id=current_user.id, content=content)
    return {"message": "Memory saved", "id": db_mem.id, "content": db_mem.content}
