from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
from .. import crud, models, schemas, database
from . import security
from ..utils.email import send_reset_password_email
from ..utils.security_utils import get_ip_info, send_security_alert
from slowapi import Limiter
from slowapi.util import get_remote_address
import os
import uuid
from datetime import datetime, timedelta

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(database.get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token")
):
    user = get_current_user_optional(db, token, token_query)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Bloqueio estrito de contas suspensas pelo Administrador (imune a valores nulos/None)
    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=403,
            detail="Sua conta está suspensa ou bloqueada pelo administrador."
        )

    return user

def get_current_user_optional(
    db: Session = Depends(database.get_db), 
    token: Optional[str] = Depends(oauth2_scheme), 
    token_query: Optional[str] = Query(None, alias="token")
) -> Optional[models.User]:
    # SECURITY: Check both Authorization header (token) and query param (token_query)
    final_token = token_query if token_query else token
    
    print(f"DEBUG AUTH: token_header={'present' if token else 'None'}, token_query={'present' if token_query else 'None'}")
    
    if not final_token:
        print("DEBUG AUTH: No token found in header or query.")
        return None
    
    try:
        payload = security.jwt.decode(final_token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("DEBUG AUTH: Invalid payload (no sub).")
            return None
        token_data = schemas.TokenData(email=email)
        user = crud.get_user_by_email(db, email=token_data.email)
        print(f"DEBUG AUTH: User found: {user.email if user else 'None'}")
        return user
    except security.JWTError as e:
        print(f"DEBUG AUTH: JWT Error: {e}")
        return None

@router.post("/register", response_model=schemas.User)
@limiter.limit("3/minute")
def register(request: Request, user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    # Validação do código de convite para a Beta pública
    beta_invite_code = os.getenv("BETA_INVITE_CODE")
    if beta_invite_code:
        # O bypass do domínio de teste só é permitido fora do ambiente de produção oficial
        is_prod = "gestaofinora.com.br" in str(os.getenv("FRONTEND_URL", ""))
        is_test_bypass = user.email.endswith("@gestaofinora.com.br") and not is_prod
        
        if not is_test_bypass:
            if not user.invite_code or user.invite_code.strip() != beta_invite_code.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Código de convite inválido ou ausente."
                )

    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = crud.create_user(db=db, user=user)
    
    # Criar categorias padrão para o novo usuário
    default_categories = [
        {"name": "Alimentação", "type": "expense", "color": "#ef4444", "icon": "Utensils"},
        {"name": "Transporte", "type": "expense", "color": "#3b82f6", "icon": "Car"},
        {"name": "Lazer", "type": "expense", "color": "#10b981", "icon": "Gamepad"},
        {"name": "Moradia", "type": "expense", "color": "#f59e0b", "icon": "Home"},
        {"name": "Saúde", "type": "expense", "color": "#ec4899", "icon": "HeartPulse"},
        {"name": "Salário", "type": "income", "color": "#10b981", "icon": "Banknote"},
        {"name": "Investimentos", "type": "income", "color": "#8b5cf6", "icon": "TrendingUp"}
    ]
    for cat in default_categories:
        crud.create_category(db, schemas.CategoryCreate(**cat), new_user.id)
        
    return new_user

@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Detecção de IP/Localização (Google-style security)
    client_ip = request.client.host
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        
    known_ips = user.known_ips.split(",") if user.known_ips else []
    
    if client_ip not in known_ips:
        ip_info = await get_ip_info(client_ip)
        location_str = f"{ip_info['city']}, {ip_info['country']}"
        
        if user.currency == "BRL" and ip_info['country'] != "Brazil":
            country = ip_info['country']
            currency_map = {
                "United States": "USD", "Portugal": "EUR", "Spain": "EUR", "France": "EUR",
                "Germany": "EUR", "Italy": "EUR", "United Kingdom": "GBP", "Argentina": "ARS",
                "Mexico": "MXN", "Japan": "JPY"
            }
            if country in currency_map:
                user.currency = currency_map[country]
        
        send_security_alert(user.email, client_ip, location_str)
        known_ips.append(client_ip)
        user.known_ips = ",".join(known_ips[-10:])
        user.last_location = location_str
        db.commit()

    access_token = security.create_access_token(data={"sub": user.email})
    refresh_token = security.create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh")
async def refresh_token(request: Request, db: Session = Depends(database.get_db)):
    """Gera um novo access_token a partir de um refresh_token válido."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Refresh token ausente")
    
    token = auth_header.split(" ")[1]
    try:
        payload = security.jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido para refresh")
            
        email: str = payload.get("sub")
        user = crud.get_user_by_email(db, email=email)
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
            
        new_access_token = security.create_access_token(data={"sub": user.email})
        return {"access_token": new_access_token, "token_type": "bearer"}
    except security.JWTError:
        raise HTTPException(status_code=401, detail="Refresh token expirado ou inválido")

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.User)
def update_user_me(
    user_update: schemas.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if user_update.email and user_update.email != current_user.email:
        db_user = crud.get_user_by_email(db, email=user_update.email)
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
    return crud.update_user(db, user_id=current_user.id, user_update=user_update)

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, forgot_req: schemas.ForgotPasswordRequest, db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=forgot_req.email)
    if not user:
        return {"message": "Se o e-mail estiver cadastrado, você receberá um link de recuperação."}
    
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    db_token = models.PasswordResetToken(
        token=token,
        email=forgot_req.email,
        user_id=user.id,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    
    send_reset_password_email(forgot_req.email, token)
    return {"message": "Se o e-mail estiver cadastrado, você receberá um link de recuperação."}

@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, reset_req: schemas.ResetPasswordRequest, db: Session = Depends(database.get_db)):
    db_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == reset_req.token,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.hashed_password = security.get_password_hash(reset_req.new_password)
    db_token.used = True
    db.commit()
    
    return {"message": "Senha alterada com sucesso!"}

@router.post("/set-download-cookie")
async def set_download_cookie(
    response: Response,
    current_user: models.User = Depends(get_current_user)
):
    """Define um cookie seguro para downloads que dura 24 horas."""
    access_token_expires = timedelta(hours=24)
    token = security.create_access_token(
        data={"sub": current_user.email, "purpose": "download"}, 
        expires_delta=access_token_expires
    )
    
    # SECURITY: SameSite='Lax' protege contra ataques CSRF de sites de terceiros,
    # permitindo que o nosso frontend (compartilhando a eTLD+1 .gestaofinora.com.br) envie o cookie com segurança.
    is_prod = "gestaofinora.com.br" in str(os.getenv("FRONTEND_URL", ""))
    domain = ".gestaofinora.com.br" if is_prod else None
    
    response.set_cookie(
        key="download_token",
        value=token,
        httponly=True,
        max_age=86400,
        samesite="lax",
        secure=is_prod,
        domain=domain
    )
    return {"status": "cookie_set"}

@router.post("/request-email-verification")
@limiter.limit("3/minute")
async def request_email_verification(
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Gera e envia um token de 6 dígitos para o e-mail do usuário."""
    import random
    token = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Salvar token no banco
    db_token = models.VerificationToken(
        user_id=current_user.id,
        token=token,
        purpose='email',
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    
    # Enviar e-mail estilizado
    from ..utils.email import get_email_template, SMTP_USER, SMTP_PASSWORD, SMTP_SERVER, SMTP_PORT
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    
    msg = MIMEMultipart('alternative')
    msg['From'] = f"Finora Segurança <{SMTP_USER}>"
    msg['To'] = current_user.email
    msg['Subject'] = f"Código de Verificação: {token}"
    
    html = get_email_template(
        user_email=current_user.email,
        user_name=current_user.name,
        title="Verificação de E-mail",
        content_html=f"Seu código de acesso ao Silo é: <br><br><span style='font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #000;'>{token}</span><br><br>Este código expira em 15 minutos.",
        badge_text="Segurança"
    )
    msg.attach(MIMEText(html, 'html'))
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return {"message": "Código enviado com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar e-mail: {str(e)}")

@router.post("/verify-email")
@limiter.limit("5/minute")
async def verify_email(
    request: Request,
    token_req: schemas.ResetPasswordRequest, # Reaproveitando schema de token/str
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Valida o código de 6 dígitos enviado por e-mail."""
    db_token = db.query(models.VerificationToken).filter(
        models.VerificationToken.user_id == current_user.id,
        models.VerificationToken.token == token_req.token,
        models.VerificationToken.purpose == 'email',
        models.VerificationToken.expires_at > datetime.utcnow()
    ).first()
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado.")
    
    current_user.email_verified = True
    db.delete(db_token) # Uso único
    db.commit()
    return {"message": "E-mail verificado com sucesso!"}

@router.post("/request-phone-verification")
@limiter.limit("3/minute")
async def request_phone_verification(
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Gera um token para o usuário mandar via WhatsApp."""
    if not current_user.phone:
        raise HTTPException(status_code=400, detail="Cadastre seu telefone antes de verificar.")
        
    import random
    # Token amigável para digitar no Zap (ex: FIN-1234)
    token = f"FIN-{random.randint(1000, 9999)}"
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    # Limpar tokens antigos de zap
    db.query(models.VerificationToken).filter(
        models.VerificationToken.user_id == current_user.id,
        models.VerificationToken.purpose == 'whatsapp'
    ).delete()
    
    db_token = models.VerificationToken(
        user_id=current_user.id,
        token=token,
        purpose='whatsapp',
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    
    return {"token": token, "instructions": "Mande este código para o WhatsApp do Finora para validar seu número."}

@router.get("/unsubscribe")
def unsubscribe(token: str, db: Session = Depends(database.get_db)):
    # Simple logic: for this demo, we assume the token is the user's email base64 or similar
    # In a real app, use a signed JWT or a one-time token
    import base64
    try:
        email = base64.b64decode(token).decode('utf-8')
        user = crud.get_user_by_email(db, email=email)
        if user:
            user.spending_alerts_enabled = False
            user.market_insights_enabled = False
            db.commit()
            return {"message": "Você foi removido da lista de comunicações proativas."}
    except:
        pass
    raise HTTPException(status_code=400, detail="Token de cancelamento inválido.")
