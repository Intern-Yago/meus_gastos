from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import transactions, categories, ai, dashboard, files, investments, accounts, goals, budgets, projects, reports, notifications, whatsapp, admin
from .auth import router as auth_router
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finora API")

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

# Add production domains from environment or defaults
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    origins.extend([o.strip() for o in env_origins.split(",")])
else:
    origins.extend([
        "https://app.gestaofinora.com.br",
        "https://api.gestaofinora.com.br"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads - REMOVED public mount for security
os.makedirs("uploads", exist_ok=True)
# app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads") # Comentado para evitar acesso público sem auth

# Include routers
app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(investments.router, prefix="/investments", tags=["investments"])
app.include_router(goals.router, prefix="/goals", tags=["goals"])
app.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(whatsapp.router, prefix="/whatsapp", tags=["whatsapp"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])

@app.get("/")
async def root():
    return {"message": "Finora API is online"}

@app.on_event("startup")
def startup_event():
    from .utils.scheduler import start_scheduler
    start_scheduler()
    
    # Inicializa o proxy de compressão de tokens Headroom em segundo plano de forma 100% automatizada
    import subprocess
    import socket
    def is_port_open(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('127.0.0.1', port)) == 0
            
    if not is_port_open(8787):
        try:
            print("INICIALIZANDO HEADROOM PROXY EM SEGUNDO PLANO...")
            subprocess.Popen(
                ["headroom", "proxy", "--port", "8787", "--host", "0.0.0.0"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            print("HEADROOM PROXY INICIALIZADO EM SEGUNDO PLANO COM SUCESSO!")
        except Exception as he:
            print(f"Erro ao inicializar o Headroom Proxy: {he}")
            
    # Registra o webhook do WhatsApp de forma assíncrona para não travar a inicialização síncrona
    import asyncio
    from .routers.whatsapp import auto_register_whatsapp_webhook
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(auto_register_whatsapp_webhook())
        else:
            asyncio.run(auto_register_whatsapp_webhook())
    except Exception as e:
        print(f"Erro ao disparar auto-registro do WhatsApp Webhook: {e}")
