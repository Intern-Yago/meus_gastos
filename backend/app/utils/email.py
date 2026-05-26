import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def send_reset_password_email(email: str, token: str):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    
    msg = MIMEMultipart()
    msg['From'] = f"Finora <{SMTP_USER}>"
    msg['To'] = email
    msg['Subject'] = "Recuperação de Senha - Finora"

    body = f"""
    Olá,
    
    Você solicitou a recuperação de senha no Finora.
    Clique no link abaixo para redefinir sua senha:
    
    {reset_link}
    
    Este link expira em 1 hora.
    Se você não solicitou isso, ignore este e-mail.
    
    Atenciosamente,
    Equipe Finora
    """
    
    msg.attach(MIMEText(body, 'plain'))

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
