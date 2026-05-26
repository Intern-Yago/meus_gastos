from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_payment_confirmation_token(transaction_id: int):
    """Cria um token de longa duração (7 dias) para confirmação de pagamento via e-mail."""
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode = {"tx_id": transaction_id, "exp": expire, "purpose": "payment_confirmation"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_payment_token(token: str):
    """Verifica se o token de pagamento é válido e retorna o ID da transação."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "payment_confirmation":
            return None
        return payload.get("tx_id")
    except JWTError:
        return None
