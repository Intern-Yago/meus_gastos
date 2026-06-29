# 💎 Finora - Arquitetura de Planos & Modelo de Negócio SaaS

Este documento descreve a especificação técnica e comercial do modelo de assinaturas em camadas (Tiered SaaS Model) do **Finora**, projetado para garantir aquisição viral (via trial do Oráculo), controle rigoroso de custos de API (via limites de histórico e compressão do Headroom) e proteção absoluta contra pirataria (anti-compartilhamento de contas).

---

## 🗺️ Matriz de Camadas e Recursos (Tiers)

| Recurso | ⚪ Standard (Trial 7 Dias) | 🔵 Executivo Elite (R$ 29,90) | 👑 Enterprise (R$ 59,90) |
| :--- | :--- | :--- | :--- |
| **Público-Alvo** | Novos Usuários (Degustação) | Pessoas Físicas / Investidores | Freelancers, MEIs, Sócio/Parceiro |
| **Expiração** | 7 dias após o cadastro | Recorrente Mensal | Recorrente Mensal |
| **Limite de Lançamentos** | Máximo **10 lançamentos/dia** | Sem limite de lançamentos | Sem limite de lançamentos |
| **Dispositivos/Sessão** | Máximo **5 IPs cadastrados** | **Apenas 1 Sessão Ativa** (Derruba o anterior) | **Múltiplas Sessões Livres** (Uso simultâneo) |
| **Memória do Oráculo (Chat)**| Curta (**Últimas 5 mensagens**) | Média (**Últimas 15 mensagens**) | Longa (**Últimas 30 mensagens**) |
| **Integração WhatsApp** | Inativa | Ativa (Somente texto) | Ativa (Texto, Imagens e Áudio/Voz) |
| **Silos de Projetos** | Inativo | Ativo (Ilimitado) | Ativo (Ilimitado) |
| **Silos de Negócios (PJ/MEI)**| Inativo | Inativo | Ativo (Ilimitado) |
| **Exportação PDF de Extrato**| Ativo | Ativo | Ativo (Relatórios Estendidos + XLS) |
| **Notificações Mercado** | Inativo | Inativo | Ativos ao Vivo (Alertas de Alocação) |
| **Multiusuários (Sócios)** | Inativo | Inativo | Ativo (Compartilhamento com Sócios) |

---

## 🛠️ Especificação de Implementação Técnica (Backend)

### 1. Modelagem no Banco de Dados (`models.py`)
Adição de campos na tabela `User` (utilizando SQLAlchemy & Alembic):
```python
class PlanEnum(str, enum.Enum):
    STANDARD = "STANDARD"
    ELITE = "ELITE"
    ENTERPRISE = "ENTERPRISE"

# Campos a serem adicionados na classe User:
plan = Column(Enum(PlanEnum), default=PlanEnum.STANDARD, nullable=False)
plan_expiration = Column(DateTime, nullable=True) # created_at + 7 dias para STANDARD
```

### 2. Controle Anti-Compartilhamento (Sessão Única via Redis)
Para proteger o plano **Elite**, o sistema impede acessos simultâneos de dispositivos diferentes:
*   No momento do login, o backend registra o ID do token JWT gerado na chave `active_session:{user_id}` no Redis, com o mesmo tempo de expiração do token (TTL).
*   A cada requisição autenticada, um Middleware no FastAPI intercepta e compara o token enviado no cabeçalho com o token armazenado na chave `active_session:{user_id}` no Redis.
*   Se o token for diferente (indicando que o usuário logou em outro aparelho e gravou um novo token), a sessão anterior é **imediatamente derrubada** (retornando `401 Unauthorized`), deslogando o aparelho antigo na hora!
*   *Nota:* Para usuários do plano **Enterprise**, essa verificação de token único é ignorada, permitindo uso simultâneo livre por múltiplos sócios.

### 3. Janela Deslizante de Contexto Reativa no Oráculo (`ai.py`)
Para equilibrar o foco da IA e manter os custos de tokens de API sob controle rígido (em sintonia com a compressão do Headroom), a janela de histórico de conversas enviada para a OpenAI é reativa ao plano do usuário:
```python
# Roteamento de histórico adaptativo baseado no plano
history_limit = 5
if current_user.plan == PlanEnum.ELITE:
    history_limit = 15
elif current_user.plan == PlanEnum.ENTERPRISE:
    history_limit = 30

# Injeta a janela deslizante de mensagens de chat
messages.extend(chat_input.messages[-history_limit:-1])
```

### 4. Bloqueio Diário de Lançamentos no Standard (`transactions.py`)
Para o plano **Standard**, limitamos as escritas de transações diárias:
*   Ao tentar criar uma transação (`POST /transactions/`), o endpoint verifica se o usuário é do plano `STANDARD`.
*   Caso seja, o backend faz uma contagem rápida na tabela de transações para verificar quantas transações com a data de **hoje** o usuário já registrou.
*   Se o contador for maior ou igual a 10, o salvamento é bloqueado e o sistema retorna `403 Forbidden` com a instrução de upgrade para o plano Elite.

---

## 📈 Benefícios do Modelo de Negócio

1.  **Funil de Alta Conversão:** A liberação de 20 mensagens grátis da IA permite que o usuário veja o Oráculo operar na sua melhor performance contábil. Após experimentar e cadastrar seus ativos, ele atinge o limite natural e se sente impelido a assinar o Elite para continuar sua jornada de riqueza.
2.  **Proteção de Margem de Lucro (Tokens):** O limite estrito de 5 mensagens no Standard e 15 no Elite garante que você nunca sofra com rombos de faturamento por faturas gigantescas de API da OpenAI. O plano Enterprise cobra R$ 59,90 e suporta com folga o histórico estendido de 30 mensagens.
3.  **Inviabilização de Fraude (Sessão Única):** A derrubada instantânea de sessões no plano Elite inviabiliza o compartilhamento de logins de R$ 29,90 entre amigos, acelerando o volume de assinantes individuais da plataforma.
