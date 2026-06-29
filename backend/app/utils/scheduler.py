from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models, crud, schemas
from ..auth.security import create_payment_confirmation_token
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import os
import asyncio
from sqlalchemy import func
from markupsafe import escape
from .email import get_email_footer, send_market_insight_email, get_email_template
from .market_data import get_ticker_history

# Global scheduler instance
scheduler = BackgroundScheduler()

def send_bill_reminder_email(user_email: str, user_name: str, bill_description: str, due_day: int = None, transaction_id: int = None):
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    base_url = "https://app.gestaofinora.com.br"
    
    msg = MIMEMultipart('alternative')
    msg['From'] = f"Finora Lembretes <{smtp_user}>"
    msg['To'] = user_email
    msg['Subject'] = f"🔔 Lembrete: {bill_description}"
    
    date_info = f"Vencimento: dia {due_day}" if due_day else "Vencimento em breve"
    
    confirm_url = None
    if transaction_id:
        token = create_payment_confirmation_token(transaction_id)
        confirm_url = f"{base_url}/confirm-payment/{token}"

    text_body = f"Olá {user_name}, o Finora lembra que a conta '{bill_description}' ({date_info}) está pendente. Confirme em: {confirm_url}"
    
    html_body = get_email_template(
        user_email=user_email,
        user_name=user_name,
        title=bill_description,
        content_html=f"Sua conta está pendente: <b>{date_info}</b>.<br>Manter suas contas em dia é o primeiro passo para uma saúde financeira incrível. 🚀",
        button_label="Marcar como Pago",
        button_url=confirm_url,
        badge_text="Conta Pendente"
    )
    
    msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))
    
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Erro ao enviar lembrete: {e}")
        return False

def check_pending_bills():
    """Verifica contas fixas e faturas de cartão vencendo hoje."""
    db = SessionLocal()
    today = datetime.now()
    try:
        # Contas Fixas
        pending_bills = db.query(models.Transaction).filter(
            models.Transaction.is_fixed_expense == True,
            models.Transaction.notify_me == True,
            models.Transaction.due_day == today.day,
            models.Transaction.is_paid == False
        ).all()
        
        for bill in pending_bills:
            user = db.query(models.User).filter(models.User.id == bill.user_id, models.User.spending_alerts_enabled == True).first()
            if user:
                send_bill_reminder_email(user.email, user.name, bill.description, bill.due_day, transaction_id=bill.id)
                crud.create_notification(db, schemas.NotificationCreate(
                    user_id=user.id, title="Conta Pendente",
                    content=f"Sua conta '{bill.description}' vence hoje.", type="bill_due"
                ))

        # Faturas de Cartão
        accounts = db.query(models.Account).filter(models.Account.has_credit_card == True).all()
        for acc in accounts:
            if acc.due_day == today.day:
                user = db.query(models.User).filter(models.User.id == acc.user_id, models.User.spending_alerts_enabled == True).first()
                if user:
                    send_bill_reminder_email(user.email, user.name, f"Vencimento Fatura {acc.name}", acc.due_day)
                
    except Exception as e:
        print(f"Erro no scheduler de contas: {e}")
    finally:
        db.close()

async def check_market_insights():
    """Analisa o mercado e envia insights proativos."""
    db = SessionLocal()
    try:
        users = db.query(models.User).filter(models.User.market_insights_enabled == True).all()
        for user in users:
            # Busca ativos que o usuário possui
            tickers = db.query(models.Transaction.ticker).filter(
                models.Transaction.user_id == user.id, 
                models.Transaction.ticker != None
            ).distinct().all()
            
            for (ticker,) in tickers:
                history = get_ticker_history(ticker, period="2d")
                if len(history) >= 2:
                    last_price = history[-1]['Close']
                    prev_price = history[-2]['Close']
                    drop = (prev_price - last_price) / prev_price
                    
                    if drop > 0.02: # Queda > 2%
                        insight = f"O ativo <b>{ticker}</b> caiu <b>{drop*100:.1f}%</b> hoje. Baseado no seu perfil, pode ser uma oportunidade estratégica para aporte."
                        send_market_insight_email(user.email, user.name, f"💡 Oportunidade: {ticker}", insight)
    except Exception as e:
        print(f"Erro no scheduler de mercado: {e}")
    finally:
        db.close()

def generate_proactive_insights():
    """Gera insights financeiros proativos e personalizados para cada usuário utilizando a OpenAI baseado no agendamento individual."""
    from openai import OpenAI
    import json
    db = SessionLocal()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Erro scheduler: OPENAI_API_KEY ausente.")
        db.close()
        return

    client = OpenAI(api_key=api_key)

    try:
        from zoneinfo import ZoneInfo

        # O agendador proativo roda para todos os usuários ativos (as notificações no site sempre acontecem!)
        users = db.query(models.User).all()
        for user in users:
            try:
                # Determina o fuso horário configurado do usuário
                user_timezone_str = user.timezone or "America/Sao_Paulo"
                try:
                    user_now = datetime.now(ZoneInfo(user_timezone_str))
                except Exception:
                    user_now = datetime.now(ZoneInfo("America/Sao_Paulo"))

                user_hour = user.proactive_insights_hour if user.proactive_insights_hour is not None else 10
                user_minute = user.proactive_insights_minute if user.proactive_insights_minute is not None else 0
                
                if user_now.hour != user_hour or user_now.minute != user_minute:
                    continue  # Não está no horário agendado deste usuário

                user_days = [d.strip().lower() for d in (user.proactive_insights_days or "fri").split(",") if d.strip()]
                days_map = {0: 'mon', 1: 'tue', 2: 'wed', 3: 'thu', 4: 'fri', 5: 'sat', 6: 'sun'}
                user_day_str = days_map[user_now.weekday()]
                
                if user_day_str not in user_days:
                    continue  # Não é o dia agendado para este usuário

                # 1. Calcula resumo financeiro real do usuário
                accounts = db.query(models.Account).filter(models.Account.user_id == user.id).all()
                initial_balances = sum(acc.initial_balance or 0.0 for acc in accounts)
                total_income_paid = db.query(func.sum(models.Transaction.amount)).filter(
                    models.Transaction.user_id == user.id,
                    models.Transaction.type == 'income',
                    models.Transaction.is_paid == True
                ).scalar() or 0.0
                total_expense_paid = db.query(func.sum(models.Transaction.amount)).filter(
                    models.Transaction.user_id == user.id,
                    models.Transaction.type == 'expense',
                    models.Transaction.is_paid == True,
                    models.Transaction.payment_method != "CREDIT_CARD"
                ).scalar() or 0.0
                current_balance = initial_balances + total_income_paid - total_expense_paid
                liabilities = db.query(func.sum(models.Transaction.amount)).filter(
                    models.Transaction.user_id == user.id,
                    models.Transaction.type == 'expense',
                    models.Transaction.is_paid == False
                ).scalar() or 0.0

                # 2. Calcula inatividade do usuário no sistema (último lançamento de transação)
                latest_tx = db.query(models.Transaction).filter(models.Transaction.user_id == user.id).order_by(models.Transaction.date.desc()).first()
                days_inactive = 0
                if latest_tx:
                    days_inactive = (datetime.now() - latest_tx.date).days

                # 3. Calcula contas pendentes, vencidas e a receber
                pending_transactions = db.query(models.Transaction).filter(
                    models.Transaction.user_id == user.id,
                    models.Transaction.is_paid == False
                ).all()

                today_bills = []
                overdue_bills = []
                today_receivables = []
                overdue_receivables = []

                today_day = datetime.now().day
                for tx in pending_transactions:
                    is_today = False
                    is_overdue = False

                    if tx.due_day:
                        if tx.due_day == today_day:
                            is_today = True
                        elif tx.due_day < today_day:
                            is_overdue = True
                    elif tx.date:
                        if tx.date.date() == datetime.now().date():
                            is_today = True
                        elif tx.date.date() < datetime.now().date():
                            is_overdue = True

                    formatted_desc = f"{tx.description} (R$ {tx.amount:.2f})"
                    if tx.type == "expense":
                        if is_today:
                            today_bills.append(formatted_desc)
                        elif is_overdue:
                            overdue_bills.append(formatted_desc)
                    elif tx.type == "income":
                        if is_today:
                            today_receivables.append(formatted_desc)
                        elif is_overdue:
                            overdue_receivables.append(formatted_desc)

                # 4. Busca os ativos na carteira do usuário para analisar quedas reais de mercado
                user_tickers = db.query(models.Transaction.ticker).filter(
                    models.Transaction.user_id == user.id,
                    models.Transaction.ticker != None
                ).distinct().all()
                
                tickers_list = [t[0].upper() for t in user_tickers if t[0]]
                dropped_assets = []
                
                if tickers_list:
                    # Busca preços atuais via Yahoo Finance
                    prices = get_current_prices(tickers_list)
                    for ticker in tickers_list:
                        try:
                            # Busca o histórico do último mês
                            history = get_ticker_history(ticker, period="1mo")
                            if len(history) >= 2:
                                close_prices = [h.get("Close") or h.get("close") for h in history if h.get("Close") is not None or h.get("close") is not None]
                                if close_prices:
                                    max_price = max(close_prices)
                                    curr_price = prices.get(ticker, close_prices[-1])
                                    
                                    if max_price > 0:
                                        drop_pct = (curr_price - max_price) / max_price * 100
                                        # Se o ativo caiu mais de 5% em relação ao topo do mês
                                        if drop_pct <= -5.0:
                                            dropped_assets.append(f"{ticker} (queda de {abs(drop_pct):.1f}%, preço de hoje: R$ {curr_price:.2f})")
                        except Exception as ticker_err:
                            print(f"Erro ao analisar quedas do ticker {ticker}: {ticker_err}")

                # Constrói o contexto de dados reais compilado
                data_context = {
                    "saldo_caixa_total": f"R$ {current_balance:.2f}",
                    "passivos_contas_pendentes": f"R$ {liabilities:.2f}",
                    "patrimonio_liquido": f"R$ {current_balance - liabilities:.2f}",
                    "contas_a_pagar_hoje": today_bills,
                    "contas_a_pagar_atrasadas_vencidas": overdue_bills,
                    "contas_a_receber_hoje": today_receivables,
                    "contas_a_receber_atrasadas": overdue_receivables,
                    "ativos_com_queda_relevante_no_mes": dropped_assets,
                    "dias_de_inatividade_no_sistema": days_inactive
                }
                
                # Gera o prompt dinâmico personalizado
                prompt = f"""
                Você é o Finora, o mentor de inteligência financeira de elite para {user.name}.
                Sua persona é sofisticada, concisa, imponente e proativa.
                
                DADOS REAIS DE CAIXA E MERCADO DELE HOJE:
                - Saldo de caixa disponível atual: {data_context['saldo_caixa_total']}
                - Contas pendentes que ele precisa pagar (passivos): {data_context['passivos_contas_pendentes']}
                - Patrimônio líquido estimado: {data_context['patrimonio_liquido']}
                - Dias sem movimentar ou acessar o sistema: {data_context['dias_de_inatividade_no_sistema']} dias
                - Contas a Pagar HOJE: {", ".join(data_context['contas_a_pagar_hoje']) if data_context['contas_a_pagar_hoje'] else "Nenhuma"}
                - Contas a Pagar VENCIDAS/ATRASADAS: {", ".join(data_context['contas_a_pagar_atrasadas_vencidas']) if data_context['contas_a_pagar_atrasadas_vencidas'] else "Nenhuma"}
                - Contas a Receber HOJE: {", ".join(data_context['contas_a_receber_hoje']) if data_context['contas_a_receber_hoje'] else "Nenhuma"}
                - Contas a Receber ATRASADAS (Não pagas ainda): {", ".join(data_context['contas_a_receber_atrasadas']) if data_context['contas_a_receber_atrasadas'] else "Nenhuma"}
                - Ativos dele com queda relevante de mercado (>5%) no mês: {", ".join(data_context['ativos_com_queda_relevante_no_mes']) if data_context['ativos_com_queda_relevante_no_mes'] else "Nenhum"}

                DIRETRIZES DE CONVERSAÇÃO PROATIVA (UX DE ELITE):
                1. Se o usuário estiver INATIVO há mais de 21 dias (3 semanas): Chame a atenção dele com firmeza, elegância e um tom de puxão de orelha sofisticado, inspirando-se livremente no seguinte conceito: "Há muito tempo você não movimenta suas contas. Para uma boa educação financeira e um crescimento próspero é necessária a constância para não cair e voltar no negativo...". Crie um alerta original e persuasivo sob essa temática, acompanhado de um mini-resumo rápido de como está a situação dele hoje.
                2. Se houver Contas a Pagar hoje ou vencidas: Avise-o claramente, inspirando-se no tom: "Hoje você tem a conta X, Y e Z para pagar, vamos realizar as transações juntas??" ou listando-as de forma refinada.
                3. Se houver Contas a Receber hoje ou atrasadas: Lembre-o de confirmar se as receitas X ou Y já entraram em conta para que possamos conciliar juntos.
                4. Se houver Ativos dele com quedas acentuadas de mercado no mês (como criptos, ações ou FIIs que ele possui na carteira): Alerte-o de forma analítica e sob a ótica de oportunidade de compra ("buy the dip"), inspirando-se no tom: "Observei também que o ativo X ficou mais barato no mercado financeiro (queda de Y%), vamos analisar juntos se vale a pena comprar mais ou não...". NUNCA fale sobre ativos que ele não possui. Baseie-se estritamente na lista fornecida.
                5. Se o caixa dele estiver saudável, saldo alto e sem pendências críticas: Dê um elogio sofisticado sobre a saúde de caixa dele hoje e sugira alguma alocação estratégica de investimentos de forma breve.
                
                NUNCA invente ativos ou use dados falsos de saldo. NUNCA ultrapasse 6 linhas de texto se estiver inativo ou com pendências, ou 3 linhas se for apenas um conselho de rotina rápida. Seja extremamente memorável, imponente, elegante e direto ao ponto. Responda em português (pt-BR).
                """

                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Você é o Finora, um mentor de finanças de elite. Responda de forma extremamente concisa, elegante e em português (pt-BR)."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=250,
                    temperature=0.7
                )
                insight_text = completion.choices[0].message.content.strip()

                if insight_text:
                    # 1. Salva na tabela de notificações do banco de dados (que automaticamente envia via Redis Pub/Sub e aciona o push SSE na tela)
                    crud.create_notification(db, schemas.NotificationCreate(
                        user_id=user.id,
                        title="Finora Proativo 🧠",
                        content=insight_text,
                        type="proactive_insight"
                    ))

                    # 2. Injeta no histórico de chat do Redis para que, ao abrir o chat, a dica proativa já esteja lá!
                    try:
                        history_key = f"chat_history:{user.id}"
                        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
                        import redis
                        r_cli = redis.from_url(redis_url, decode_responses=True)
                        history_raw = r_cli.get(history_key)
                        hist = json.loads(history_raw) if history_raw else []
                        hist.append({"role": "assistant", "content": f"🧠 *Insight Proativo:* {insight_text}"})
                        r_cli.setex(history_key, 86400, json.dumps(hist[-50:]))
                    except Exception as re_err:
                        print(f"Erro ao salvar histórico do Redis: {re_err}")

                    # 3. Disparo de canais de notificação proativos (Email & WhatsApp)
                    
                    # Decisão sobre WhatsApp:
                    # Se explicitamente ativado pelo usuário, ou se unset (None) mas o número está verificado (regra de prioridade/default).
                    should_send_whatsapp = False
                    if user.proactive_insights_whatsapp is True:
                        should_send_whatsapp = True
                    elif user.proactive_insights_whatsapp is None:
                        # Por padrão, se tiver celular verificado, envia via WhatsApp!
                        should_send_whatsapp = bool(user.phone_verified and user.whatsapp_lid)
                        
                    # Decisão sobre E-mail:
                    # Se explicitamente ativado pelo usuário, ou se unset (None) mas não tem WhatsApp verificado e o e-mail está verificado (regra de prioridade/default).
                    should_send_email = False
                    if user.proactive_insights_email is True:
                        should_send_email = True
                    elif user.proactive_insights_email is None:
                        # Se não for enviar por WhatsApp e tiver e-mail verificado, envia via e-mail!
                        should_send_email = not should_send_whatsapp and bool(user.email_verified)

                    # Envio WhatsApp
                    if should_send_whatsapp and user.whatsapp_lid:
                        try:
                            from ..routers.whatsapp import send_whatsapp_message
                            remote_jid = f"{user.whatsapp_lid}@s.whatsapp.net" if "@" not in user.whatsapp_lid else user.whatsapp_lid
                            import asyncio
                            asyncio.run(send_whatsapp_message(remote_jid, f"🧠 *Insight Proativo Finora:*\n\n{insight_text}"))
                            print(f"WhatsApp enviado com sucesso para {user.name} ({remote_jid})")
                        except Exception as wpp_err:
                            print(f"Erro ao enviar insight proativo por WhatsApp: {wpp_err}")

                    # Envio E-mail
                    if should_send_email and user.email and user.email_verified:
                        try:
                            from .email import send_market_insight_email
                            send_market_insight_email(user.email, user.name, "🧠 Finora Proativo: Seu Insight Financeiro", insight_text)
                            print(f"E-mail enviado com sucesso para {user.name} ({user.email})")
                        except Exception as email_err:
                            print(f"Erro ao enviar insight proativo por e-mail: {email_err}")

                    print(f"Sucesso: Insight proativo gerado para o usuário {user.name} ({user.email}).")
            except Exception as user_err:
                print(f"Erro ao gerar insight para {user.name}: {user_err}")
                
    except Exception as e:
        print(f"Erro geral no scheduler proativo: {e}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(check_pending_bills, 'cron', hour=9, minute=0)
        # Nota: insights de mercado às 18h
        scheduler.add_job(lambda: asyncio.run(check_market_insights()), 'cron', hour=18, minute=0)
        # Insights proativos da IA do Finora - roda a cada minuto para verificar agendamentos individuais dos usuários
        scheduler.add_job(generate_proactive_insights, 'cron', minute='*')
        try:
            scheduler.start()
            print("Scheduler de notificações e insights iniciado!")
        except Exception as e:
            print(f"Falha ao iniciar scheduler: {e}")
