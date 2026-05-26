# Finora - Seu Guardião Financeiro Inteligente 💎🛡️

O **Finora** é um ecossistema de gestão financeira nativo em IA, projetado para oferecer controle total, proatividade e clareza sobre o seu patrimônio. Mais do que um organizador de gastos, o Finora atua como um **Coach Financeiro Ativo**, ajudando você a economizar, planejar metas e entender sua riqueza real em tempo real.

---

## 🌟 Funcionalidades Principais

### 1. 🤖 AI Coach Proativo
*   **Análise em Tempo Real**: A IA analisa cada gasto no momento do registro e oferece conselhos contextuais.
*   **Memória Semântica (RAG)**: O sistema lembra de fatos pessoais e objetivos de vida para personalizar as recomendações.
*   **Proatividade**: Alertas automáticos sobre faturas fechando, contas vencendo e orçamentos próximos do limite ao abrir o chat.

### 2. 💰 Gestão de Patrimônio (Net Worth)
*   **Cálculo Real**: Visualização de Ativos (saldos, investimentos) vs. Passivos (contas a pagar, faturas de cartão).
*   **Saldo Projetado**: Previsão de como você terminará o mês baseado em seus compromissos pendentes.
*   **Assinaturas e Drenos**: Widget dedicado para monitorar gastos recorrentes e evitar desperdícios.

### 3. 💳 Contas Híbridas e Cartões
*   **Gestão Unificada**: Controle de Débito e Crédito em uma única conta bancária (ex: Nubank, Inter).
*   **Faturas Inteligentes**: Controle automático de ciclos de fechamento e vencimento de faturas.

### 4. 🎯 Metas e Orçamentos
*   **Gamificação**: Barras de progresso estilo "termômetro" para objetivos de vida (viagens, reserva de emergência).
*   **Orçamentos Opcionais**: Defina limites mensais por categoria e receba alertas proativos da IA.

### 5. 🎤 Interação Multimodal
*   **Voz Nativa**: Envie áudios via chat (Whisper) para comandos complexos.
*   **Fala da IA**: A IA responde por voz com fluidez e velocidade ajustável, mantendo a preferência de voz salva.
*   **Reconciliação de Extratos**: Suba PDFs/Excel e deixe a IA auditar e sincronizar os lançamentos faltantes.

---

## 🛠️ Stack Tecnológica

### Backend
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
*   **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) + [PgVector](https://github.com/pgvector/pgvector) (Busca Vetorial)
*   **IA**: OpenAI GPT-4o-Mini, Whisper-1, Embeddings.
*   **Processamento**: Pandas, SQLAlchemy.
*   **Cache**: Redis.

### Frontend
*   **Framework**: [Next.js 15](https://nextjs.org/) (TypeScript)
*   **Estilização**: Tailwind CSS.
*   **Ícones**: Lucide React.
*   **Gráficos**: Recharts.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
*   [Docker](https://www.docker.com/) e Docker Compose instalados.
*   Chave de API da OpenAI.

### Instalação

1.  Clone o repositório:
    ```bash
    git clone <url-do-repositorio>
    cd meus_gastos
    ```

2.  Configure as variáveis de ambiente:
    *   Crie um arquivo `.env` na raiz do projeto seguindo o modelo do `.env.example`.
    *   Insira sua `OPENAI_API_KEY` e configurações de SMTP (opcional para e-mails).

3.  Suba os containers:
    ```bash
    docker-compose up -d --build
    ```

4.  Acesse o sistema:
    *   **Frontend**: `http://localhost:3000`
    *   **Backend (Documentação API)**: `http://localhost:8000/docs`

---

## 📂 Estrutura do Projeto

```text
├── backend/            # Código fonte da API FastAPI
│   ├── app/            # Lógica principal, rotas, modelos e utils
│   ├── migrate_*.py    # Scripts de migração de banco de dados
│   └── Dockerfile      # Configuração Docker do Backend
├── frontend/           # Aplicação Next.js
│   ├── src/app/        # Páginas e roteamento
│   ├── src/components/ # Componentes reutilizáveis
│   └── Dockerfile      # Configuração Docker do Frontend
├── docker-compose.yml  # Orquestração de todos os serviços
└── venda.txt           # Material estratégico de diferenciais do produto
```

---

## 🛡️ Segurança e Privacidade
O Finora é um ambiente isolado. Suas transações e memórias são armazenadas em seu próprio banco de dados PostgreSQL. A IA processa dados apenas sob demanda para oferecer os insights solicitados.

---

## 📈 Roadmap & Evolução
Confira o arquivo [TODO.md](./TODO.md) para ver as próximas funcionalidades planejadas, como o **Modo Arquiteto Financeiro** e o **Tema Escuro**.

---
*Desenvolvido com o objetivo de dar o poder da inteligência artificial ao seu bolso.* 💸🚀
