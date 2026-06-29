import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import base64
from dotenv import load_dotenv

load_dotenv()

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

def get_email_footer(email: str):
    token = base64.b64encode(email.encode('utf-8')).decode('utf-8')
    unsub_link = f"{BACKEND_URL}/auth/unsubscribe?token={token}"
    return f"""
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center;">
        Este é um e-mail automático do Silo de Inteligência Finora.<br>
        Para gerenciar suas notificações, acesse as Configurações no app.<br>
        Se não deseja mais receber estes e-mails, <a href="{unsub_link}" style="color: #666; text-decoration: underline;">clique aqui para cancelar a inscrição</a>.
    </div>
    """

from markupsafe import escape

def get_email_template(
    user_email: str, 
    user_name: str, 
    title: str, 
    content_html: str, 
    button_label: str = None, 
    button_url: str = None,
    badge_text: str = None
):
    """Template mestre estilizado para todos os e-mails do Finora."""
    user_name = escape(user_name)
    logo_url = f"{FRONTEND_URL}/logo_fiora.png"
    
    button_html = ""
    if button_label and button_url:
        button_html = f"""
        <div style="padding: 30px 0; text-align: center;">
            <a href="{button_url}" style="background-color: #2563eb; color: #ffffff; padding: 18px 36px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 14px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4); text-transform: uppercase; letter-spacing: 0.05em;">
                {button_label}
            </a>
        </div>
        """

    badge_html = ""
    if badge_text:
        badge_html = f"""<div style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 99px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">{badge_text}</div>"""

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 32px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05); }}
            .header {{ background-color: #000000; padding: 50px 20px; text-align: center; color: white; }}
            .logo {{ width: 60px; height: 60px; margin-bottom: 20px; border-radius: 18px; }}
            .content {{ padding: 50px; }}
            .box {{ background-color: #f8fafc; border-radius: 24px; padding: 30px; margin: 25px 0; border: 1px solid #f1f5f9; }}
            h1 {{ margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.025em; color: #ffffff; }}
            p {{ margin: 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="{logo_url}" alt="Finora" class="logo" style="filter: brightness(0) invert(1);">
                <h1>Finora</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.6; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;">Silo de Inteligência Financeira</p>
            </div>
            <div class="content">
                <p style="font-size: 16px; font-weight: 500; color: #4b5563;">Olá, <span style="color: #111827; font-weight: 800;">{user_name}</span>!</p>
                
                <div class="box">
                    {badge_html}
                    <div style="font-size: 22px; font-weight: 900; color: #111827; line-height: 1.2;">{title}</div>
                    <div style="font-size: 15px; color: #4b5563; margin-top: 12px; line-height: 1.7;">{content_html}</div>
                </div>

                {button_html}
                
                <div style="text-align: center; margin-top: 20px;">
                    <p style="font-size: 13px; color: #9ca3af; font-weight: 500;">Protegendo seu patrimônio com inteligência.</p>
                </div>

                {get_email_footer(user_email)}
            </div>
        </div>
    </body>
    </html>
    """

def send_reset_password_email(email: str, token: str):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    
    # Buscar nome do usuário se possível (ou usar 'Investidor')
    # Como não temos o db aqui, usamos uma saudação genérica ou passamos o nome por parâmetro
    # Para manter a assinatura, vamos assumir 'Investidor' se o nome não for passado
    
    msg = MIMEMultipart()
    msg['From'] = f"Finora Seguran\u00e7a <{SMTP_USER}>"
    msg['To'] = email
    msg['Subject'] = "Recupera\u00e7\u00e3o de Senha - Finora"

    html = get_email_template(
        user_email=email,
        user_name="Investidor",
        title="Redefini\u00e7\u00e3o de Senha",
        content_html="Voc\u00ea solicitou a altera\u00e7\u00e3o de sua credencial de acesso. Por seguran\u00e7a, este link \u00e9 tempor\u00e1rio.",
        button_label="Redefinir Senha",
        button_url=reset_link,
        badge_text="Seguran\u00e7a"
    )
    
    msg.attach(MIMEText(html, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(SMTP_USER, email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

def send_market_insight_email(email: str, name: str, subject: str, insight: str):
    msg = MIMEMultipart()
    msg['From'] = f"Finora Insights <{SMTP_USER}>"
    msg['To'] = email
    msg['Subject'] = subject

    html = get_email_template(
        user_email=email,
        user_name=name,
        title=subject,
        content_html=insight,
        button_label="Ver no Dashboard",
        button_url=FRONTEND_URL,
        badge_text="Market Insight"
    )
    
    msg.attach(MIMEText(html, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(SMTP_USER, email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending market insight: {e}")
        return False
