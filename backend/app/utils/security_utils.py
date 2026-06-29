import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime

async def get_ip_info(ip: str):
    """Busca informações de localização baseadas no IP."""
    # Detecta faixas de IP privadas locais, de intranet ou Docker
    clean_ip = ip.strip() if ip else ""
    if (
        clean_ip == "127.0.0.1" or 
        clean_ip == "::1" or 
        clean_ip.startswith("192.168.") or 
        clean_ip.startswith("172.") or 
        clean_ip.startswith("10.") or
        clean_ip.startswith("169.254.")
    ):
        return {"city": "Localhost", "country": "Desenvolvimento"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{clean_ip}")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return {
                        "city": data.get("city", "Desconhecida"),
                        "country": data.get("country", "Desconhecido"),
                        "region": data.get("regionName", "")
                    }
    except Exception as e:
        print(f"Erro ao buscar IP info: {e}")
    return {"city": "Desconhecida", "country": "Desconhecido"}

from .email import get_email_template, get_email_footer

def send_security_alert(email: str, ip: str, location: str):
    """Envia alerta de login suspeito."""
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    
    msg = MIMEMultipart('alternative')
    msg['From'] = f"Finora Seguran\u00e7a <{smtp_user}>"
    msg['To'] = email
    msg['Subject'] = "ALERTA: Novo acesso detectado"
    
    now = datetime.now()
    date_str = now.strftime("%d/%m/%Y")
    time_str = now.strftime("%H:%M:%S")
    
    content = f"""
    Detectamos um novo acesso \u00e0 sua conta Finora a partir de um local ou dispositivo n\u00e3o reconhecido.<br><br>
    <b>Detalhes:</b><br>
    \u2022 IP: {ip}<br>
    \u2022 Localiza\u00e7\u00e3o: {location}<br>
    \u2022 Hor\u00e1rio: {date_str} {time_str}<br><br>
    Se n\u00e3o foi voc\u00ea, recomendamos alterar sua senha imediatamente.
    """

    html = get_email_template(
        user_email=email,
        user_name="Investidor",
        title="Novo Acesso Detectado",
        content_html=content,
        button_label="Proteger Minha Conta",
        button_url="https://app.gestaofinora.com.br/settings",
        badge_text="Seguran\u00e7a"
    )
    
    msg.attach(MIMEText(html, 'html'))
    
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Erro ao enviar alerta de segurança: {e}")
        return False
