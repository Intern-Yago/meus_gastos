from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import os
from contextlib import asynccontextmanager

# Importações internas
from .database import engine, Base
from .routers import transactions, categories, ai, dashboard, files, investments, accounts, goals, budgets
from .auth.router import router as auth_router
from .utils.scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialização na subida do app
    print("Iniciando Finora API...")
    try:
        Base.metadata.create_all(bind=engine)
        
        # Migração manual simples para adicionar amount_paid se não existir
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_paid FLOAT DEFAULT 0.0"))
                conn.commit()
            except Exception as e:
                print(f"Aviso migração: {e}")

        start_scheduler()
        print("Sistemas de fundo iniciados com sucesso.")
    except Exception as e:
        print(f"Erro na inicialização: {e}")
    yield
    # Limpeza no desligamento (se necessário)
    print("Desligando Finora API...")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Finora API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Ensure uploads directory exists
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configuração de CORS robusta
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://app.gestaofinora.com.br",
        "https://gestaofinora.com.br",
        "https://api.gestaofinora.com.br",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de log para verificar conexões do túnel
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"REQUISIÇÃO: {request.method} {request.url}")
    response = await call_next(request)
    return response

# Roteadores
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(investments.router, prefix="/investments", tags=["investments"])
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(goals.router, prefix="/goals", tags=["goals"])
app.include_router(budgets.router, prefix="/budgets", tags=["budgets"])

@app.get("/")
async def root():
    return {"message": "Finora API is online"}
