import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

async def get_ip_info(ip: str):
    """Busca informações de localização baseadas no IP."""
    if ip == "127.0.0.1" or ip.startswith("192.168."):
        return {"city": "Localhost", "country": "N/A"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip}")
            if response.status_code == 200:
                data = response.json()
                return {
                    "city": data.get("city", "Desconhecida"),
                    "country": data.get("country", "Desconhecido"),
                    "region": data.get("regionName", "")
                }
    except Exception as e:
        print(f"Erro ao buscar IP info: {e}")
    return {"city": "Desconhecida", "country": "Desconhecido"}

def send_security_alert(email: str, ip: str, location: str):
    """Envia alerta de login suspeito."""
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    
    msg = MIMEMultipart()
    msg['From'] = f"Finora Segurança <{smtp_user}>"
    msg['To'] = email
    msg['Subject'] = "ALERTA: Novo acesso detectado na sua conta Finora"
    
    body = f"""
    Olá,
    
    Detectamos um novo acesso à sua conta Finora a partir de um local ou dispositivo não reconhecido.
    
    Detalhes do Acesso:
    - IP: {ip}
    - Localização: {location}
    - Horário: {os.popen('date /t').read().strip()} {os.popen('time /t').read().strip()}
    
    Se foi você, pode ignorar este e-mail. Caso contrário, recomendamos que altere sua senha imediatamente.
    
    Atenciosamente,
    Equipe Finora
    """
    
    msg.attach(MIMEText(body, 'plain'))
    
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
