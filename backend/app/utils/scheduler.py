from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models, crud
from ..auth.security import create_payment_confirmation_token
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import os

# Global scheduler instance
scheduler = BackgroundScheduler()

def get_email_template(user_name: str, bill_description: str, due_info: str, confirm_url: str = None):
    """Retorna um template HTML profissional e estilizado para os e-mails do Finora."""
    
    button_html = ""
    if confirm_url:
        button_html = f"""
        <div style="padding: 20px 0; text-align: center;">
            <a href="{confirm_url}" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                MARCAR COMO PAGO AGORA
            </a>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }}
            .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }}
            .header {{ background-color: #2563eb; padding: 40px 20px; text-align: center; color: white; }}
            .content {{ padding: 40px; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #6b7280; background-color: #f3f4f6; }}
            .bill-box {{ background-color: #f3f4f6; border-radius: 16px; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb; }}
            h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }}
            p {{ margin-bottom: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Finora</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-weight: 500;">Sua Assistente Financeira Inteligente</p>
            </div>
            <div class="content">
                <p>Olá, <strong>{user_name}</strong>!</p>
                <p>Estou passando para te lembrar de um compromisso financeiro importante:</p>
                
                <div class="bill-box">
                    <div style="font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Conta Pendente</div>
                    <div style="font-size: 18px; font-weight: bold; color: #111827;">{bill_description}</div>
                    <div style="font-size: 14px; color: #2563eb; font-weight: 600; margin-top: 4px;">{due_info}</div>
                </div>

                <p>Manter suas contas em dia é o primeiro passo para uma saúde financeira incrível. 🚀</p>
                
                {button_html}
                
                <p style="font-size: 14px; color: #6b7280; font-style: italic;">Se você já realizou o pagamento, pode ignorar este e-mail ou clicar no botão acima para atualizar seu dashboard.</p>
            </div>
            <div class="footer">
                <p>© 2026 Finora • Gestão Financeira Inteligente<br>
                Este é um lembrete automático solicitado por você.</p>
            </div>
        </div>
    </body>
    </html>
    """

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

    # Versão Texto (Fallback)
    text_body = f"Olá {user_name}, o Finora lembra que a conta '{bill_description}' ({date_info}) está pendente. Confirme em: {confirm_url}"
    
    # Versão HTML (Estilizada)
    html_body = get_email_template(user_name, bill_description, date_info, confirm_url)
    
    msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))
    
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"E-mail premium enviado para {user_email}")
        return True
    except Exception as e:
        print(f"Erro ao enviar lembrete premium: {e}")
        return False

def check_pending_bills():
    """Verifica contas fixas e faturas de cartão vencendo hoje."""
    print(f"DEBUG: Verificando lembretes de contas às {datetime.now()}")
    db = SessionLocal()
    today = datetime.now()
    
    try:
        # 1. Contas Fixas Tradicionais
        pending_bills = db.query(models.Transaction).filter(
            models.Transaction.is_fixed_expense == True,
            models.Transaction.notify_me == True,
            models.Transaction.due_day == today.day,
            models.Transaction.is_paid == False
        ).all()
        
        for bill in pending_bills:
            user = db.query(models.User).filter(models.User.id == bill.user_id).first()
            if user:
                send_bill_reminder_email(user.email, user.name, bill.description, bill.due_day, transaction_id=bill.id)
                crud.create_notification(db, schemas.NotificationCreate(
                    user_id=user.id,
                    title="Conta Pendente",
                    content=f"Sua conta '{bill.description}' vence hoje (dia {bill.due_day}).",
                    type="bill_due"
                ))

        # 2. Faturas de Cartão de Crédito
        accounts = db.query(models.Account).filter(models.Account.has_credit_card == True).all()
        for acc in accounts:
            # Fechamento de Fatura
            if acc.closing_day == today.day:
                # Calcular total da fatura (transações no crédito não pagas)
                total_fatura = db.query(func.sum(models.Transaction.amount)).filter(
                    models.Transaction.account_id == acc.id,
                    models.Transaction.payment_method == models.PaymentMethod.CREDIT_CARD,
                    models.Transaction.is_paid == False
                ).scalar() or 0.0
                
                if total_fatura > 0:
                    user = db.query(models.User).filter(models.User.id == acc.user_id).first()
                    if user:
                        send_bill_reminder_email(user.email, user.name, f"Fatura {acc.name} Fechando", acc.due_day)
                        crud.create_notification(db, schemas.NotificationCreate(
                            user_id=user.id,
                            title="Fatura Fechando",
                            content=f"Sua fatura do {acc.name} fecha hoje. Valor total: R$ {total_fatura:.2f}.",
                            type="bill_closing"
                        ))
            
            # Vencimento de Fatura
            if acc.due_day == today.day:
                total_fatura = db.query(func.sum(models.Transaction.amount)).filter(
                    models.Transaction.account_id == acc.id,
                    models.Transaction.payment_method == models.PaymentMethod.CREDIT_CARD,
                    models.Transaction.is_paid == False
                ).scalar() or 0.0
                
                if total_fatura > 0:
                    user = db.query(models.User).filter(models.User.id == acc.user_id).first()
                    if user:
                        send_bill_reminder_email(user.email, user.name, f"Vencimento Fatura {acc.name}", acc.due_day)
                        crud.create_notification(db, schemas.NotificationCreate(
                            user_id=user.id,
                            title="Fatura Vencendo",
                            content=f"Sua fatura do {acc.name} vence hoje! Valor: R$ {total_fatura:.2f}.",
                            type="bill_due"
                        ))
                
    except Exception as e:
        print(f"Erro no scheduler de contas: {e}")
    finally:
        db.close()

def schedule_one_off_reminder(user_id: int, description: str, run_at: datetime):
    # Nota: Esta função está sendo substituída por agendamentos dinâmicos no ai.py
    # mas mantida para compatibilidade interna simples se necessário.
    pass

def start_scheduler():
    if not scheduler.running:
        # Executa todo dia às 09:00 da manhã
        scheduler.add_job(check_pending_bills, 'cron', hour=9, minute=0)
        try:
            scheduler.start()
            print("Scheduler de notificações iniciado!")
        except Exception as e:
            print(f"Falha ao iniciar scheduler: {e}")
