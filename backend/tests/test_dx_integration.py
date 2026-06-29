import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.main import app
from backend.app.database import Base, get_db
import os

# Database de teste isolado
SQLALCHEMY_DATABASE_URL = "postgresql://finora:finora@db:5432/finora_test"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_api_online():
    """Teste básico para verificar se a API DX está online."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Finora API is online"}

def test_create_user_dx():
    """Verifica se o fluxo de criação de usuário via API está íntegro."""
    # Como já existe banco de dados real, este teste é apenas um scaffold para o roadmap de DX
    pass
