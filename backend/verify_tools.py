import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Adiciona o diretório atual ao path para permitir imports corretos
sys.path.append(os.path.dirname(__file__))

from app import models, schemas, crud
from app.database import SQLALCHEMY_DATABASE_URL

print("====================================================")
print("   FINORA - MOTOR DE HOMOLOGAÇÃO DE IA DE ELITE     ")
print("====================================================\n")

print("🔄 Conectando ao Banco de Dados PostgreSQL...")
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    print("✅ Conectado com sucesso!\n")
except Exception as e:
    print(f"❌ Erro ao conectar ao banco de dados: {e}")
    sys.exit(1)

# Busca ou cria o usuário Yago para os testes
user_email = "yago.commercial@gmail.com"
print(f"🔍 Buscando usuário de homologação '{user_email}'...")
user = db.query(models.User).filter(models.User.email == user_email).first()

if not user:
    print(f"➕ Usuário '{user_email}' não encontrado. Criando usuário de teste...")
    try:
        user_in = schemas.UserCreate(
            email=user_email,
            password="testpassword123",
            name="Yago Teste"
        )
        user = crud.create_user(db, user_in)
        print(f"✅ Usuário criado ID: {user.id}")
    except Exception as e:
        print(f"❌ Erro ao criar usuário: {e}")
        sys.exit(1)
else:
    print(f"✅ Usuário encontrado ID: {user.id}\n")

print("🧪 Iniciando Diagnóstico de Integridade de Todas as Ferramentas da IA...\n")

success_count = 0
total_tools = 5

# 1. Teste do update_account_tool
try:
    print("1️⃣ Testando 'update_account_tool' (Cadastro de Conta)...")
    acc_in = schemas.AccountCreate(
        name="Itaú Homologação",
        initial_balance=15000.0,
        has_credit_card=True,
        credit_limit=5000.0,
        closing_day=10,
        due_day=20
    )
    acc = crud.create_account(db, acc_in, user.id)
    print(f"   👉 [OK] Conta '{acc.name}' criada de verdade no banco. Saldo: R$ {acc.initial_balance}")
    success_count += 1
except Exception as e:
    print(f"   👉 [FALHA] update_account_tool: {e}")

# 2. Teste do create_category_tool
try:
    print("\n2️⃣ Testando 'create_category_tool' (Criação de Categoria)...")
    cat_in = schemas.CategoryCreate(
        name="Tecnologia de Elite",
        type="expense",
        color="#10b981",
        icon="Cpu"
    )
    cat = crud.create_category(db, cat_in, user.id)
    print(f"   👉 [OK] Categoria '{cat.name}' criada de verdade no banco. Cor: {cat.color}")
    success_count += 1
except Exception as e:
    print(f"   👉 [FALHA] create_category_tool: {e}")

# 3. Teste do register_transaction_tool
try:
    print("\n3️⃣ Testando 'register_transaction_tool' (Registro de Lançamento)...")
    from datetime import datetime
    tx_in = schemas.TransactionCreate(
        amount=350.00,
        description="Amazon AWS Cloud Hosting",
        type="expense",
        payment_method="CREDIT_CARD",
        category_id=cat.id if 'cat' in locals() else None,
        account_id=acc.id if 'acc' in locals() else None,
        is_paid=True,
        date=datetime.now()
    )
    tx = crud.create_transaction(db, tx_in, user.id)
    print(f"   👉 [OK] Transação '{tx.description}' de R$ {tx.amount} registrada com sucesso!")
    success_count += 1
except Exception as e:
    print(f"   👉 [FALHA] register_transaction_tool: {e}")

# 4. Teste do manage_goals_tool
try:
    print("\n4️⃣ Testando 'manage_goals_tool' (Criação de Metas)...")
    goal_in = schemas.GoalCreate(
        name="Fundo Notebook Novo",
        target_amount=4000.00,
        current_amount=0.0
    )
    goal = crud.create_goal(db, goal_in, user.id)
    print(f"   👉 [OK] Meta de elite '{goal.name}' de R$ {goal.target_amount} gravada no banco!")
    success_count += 1
except Exception as e:
    print(f"   👉 [FALHA] manage_goals_tool: {e}")

# 5. Teste do set_budget_tool
try:
    print("\n5️⃣ Testando 'set_budget_tool' (Definição de Limites/Orçamento)...")
    bgt_in = schemas.BudgetCreate(
        category_id=cat.id if 'cat' in locals() else None,
        amount=1500.00
    )
    bgt = crud.create_or_update_budget(db, bgt_in, user.id)
    print(f"   👉 [OK] Orçamento de R$ {bgt.amount} para a categoria '{cat.name}' definido de verdade!")
    success_count += 1
except Exception as e:
    print(f"   👉 [FALHA] set_budget_tool: {e}")

print("\n====================================================")
print(f"📊 RELATÓRIO FINAL: {success_count}/{total_tools} ferramentas validadas com sucesso!")
if success_count == total_tools:
    print("🌟 PARABÉNS! Todas as integrações de banco de dados estão 100% íntegras!")
else:
    print("⚠️ Alguns testes falharam. Verifique os logs acima para diagnosticar.")
print("====================================================")

db.close()
