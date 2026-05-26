from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)):
    print(f"DEBUG: Validating token: {token[:10]}...")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("DEBUG: Token sub is None")
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except security.JWTError as e:
        print(f"DEBUG: JWT Error: {str(e)}")
        raise credentials_exception
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        print(f"DEBUG: User not found for email: {token_data.email}")
        raise credentials_exception
    return user

@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        print(f"DEBUG: Registration failed. Email already exists: {user.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = crud.create_user(db=db, user=user)
    
    # Create default categories
    default_categories = [
        ("Salário", "income", "#10b981"),
        ("Outras Receitas", "income", "#34d399"),
        ("Alimentação", "expense", "#f59e0b"),
        ("Transporte", "expense", "#3b82f6"),
        ("Lazer", "expense", "#ec4899"),
        ("Saúde", "expense", "#ef4444"),
        ("Educação", "expense", "#8b5cf6"),
        ("Moradia", "expense", "#6366f1"),
        ("Contas Fixas", "expense", "#64748b"),
        ("Outros", "expense", "#94a3b8"),
    ]
    
    for name, cat_type, color in default_categories:
        crud.create_category(db, schemas.CategoryCreate(name=name, type=cat_type, color=color), new_user.id)
        
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
    # Se estiver atrás de um proxy como Cloudflare, o IP real vem no header X-Forwarded-For
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        
    known_ips = user.known_ips.split(",") if user.known_ips else []
    
    if client_ip not in known_ips:
        # Novo local de acesso detectado!
        ip_info = await get_ip_info(client_ip)
        location_str = f"{ip_info['city']}, {ip_info['country']}"
        
        # Envia alerta de segurança por e-mail
        send_security_alert(user.email, client_ip, location_str)
        
        # Adiciona às localizações conhecidas (guarda as últimas 10)
        known_ips.append(client_ip)
        user.known_ips = ",".join(known_ips[-10:])
        user.last_location = location_str
        db.commit()

    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, email=request.email)
    if not user:
        # We don't want to reveal if a user exists or not for security
        return {"message": "Se o e-mail estiver cadastrado, você receberá um link de recuperação."}
    
    # Generate token
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    # Save token
    db_token = models.PasswordResetToken(
        token=token,
        email=request.email,
        user_id=user.id,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    
    # Send email
    send_reset_password_email(request.email, token)
    
    return {"message": "Se o e-mail estiver cadastrado, você receberá um link de recuperação."}

@router.post("/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(database.get_db)):
    # Find token
    db_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == request.token,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    # Update user password
    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.hashed_password = security.get_password_hash(request.new_password)
    db_token.used = True
    db.commit()
    
    return {"message": "Senha alterada com sucesso!"}
