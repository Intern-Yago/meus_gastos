# Finora - Seu Guardião Financeiro de Elite 💎🛡️

O **Finora** é um ecossistema de gestão financeira nativo em IA, projetado para oferecer controle total, proatividade e segurança extrema sobre o seu patrimônio. Mais do que um organizador de gastos, o Finora atua como um **Silo de Inteligência Financeira**, protegendo seus dados e antecipando suas necessidades com uma experiência mobile-first de alto luxo.

---

## 🌟 Funcionalidades de Elite

### 1. 🤖 IA Ativa & Omnichannel
*   **Chat Inteligente**: Inteligência financeira no site e no **WhatsApp** via Evolution API.
*   **Self-Silo (WPP)**: Mande mensagens para você mesmo e a IA registra gastos, faz análises e gera relatórios instantaneamente.
*   **Boas-vindas Proativas**: Varredura automática de contas, metas e saúde financeira ao iniciar o sistema.
*   **Exportação Via Chat**: Peça relatórios à IA e receba links de download seguros e autenticados.
*   **Proatividade Master (Fim do Teórico)**: O Finora nunca dará conselhos rasos como "use uma planilha". Como co-piloto ativo, ele se oferece para programar orçamentos (`set_budget_tool`), criar metas (`manage_goals_tool`) e corrigir saldos (`adjust_account_balance_tool`) diretamente no banco de dados de verdade! 100% de todas as 20 ferramentas de IA estão integradas ao Postgres.

### 2. 📲 Experiência Mobile Nativa (PWA)
*   **Finora App**: Transforme o Silo em um aplicativo nativo no seu celular (Progressive Web App).
*   **Notificações Push**: Receba alertas em tempo real via **Server-Sent Events (SSE)** e **Redis Pub/Sub**.
*   **Atalhos Rápidos de Chat**: Pílulas de "Perguntas Frequentes" deslizantes integradas ao chat, permitindo disparar análises complexas de caixa e patrimônio líquido com um único toque.

### 3. 🛡️ Segurança, Blindagem e Privacidade
*   **Download Seguro**: Links de exportação protegidos por **Cookies HttpOnly de 24 horas** e Tickets de uso único.
*   **Privacidade UUID**: Isolamento total de dados e arquivos usando identificadores não sequenciais.
*   **Perfil de Investidor (Profiling Ativo)**: Questionário inteligente integrado ao painel de configurações para traçar o perfil de investimentos (Conservador, Moderado, Arrojado) e sincronizá-lo de forma bidirecional com as memórias de longo prazo da rede neural.

### 4. 🏢 Módulo de Negócios e Projetos (Silos)
*   **Silos Independentes**: Gestão separada para suas Unidades de Negócio e Projetos Pessoais.
*   **Faturamento Corporativo (DRE)**: Análise de margem de lucro, faturamento e custos automatizada pela IA.
*   **Diferenciação Semântica (Rule 9)**: A IA distingue perfeitamente marcas/lojas corporativas (salvas como projetos ativos de faturamento) de categorias de despesa, garantindo conformidade contábil absoluta.

### 🏆 5. O Ritual de Fechamento de Mês (Modo Fechamento)
*   **Fluxo Guiado de 6 Passos**: Um assistente interativo para encerrar o caixa do mês:
    1.  *Categorização:* Classifique saídas pendentes com dropdowns em lote.
    2.  *Duplicatas:* Identifique e mescle registros idênticos repetidos acidentalmente.
    3.  *Comprovantes:* Envie imagens de comprovantes em lote diretamente para o MinIO.
    4.  *Metas:* Monitore a evolução real dos seus objetivos de poupança.
    5.  *Relatórios:* Emita o relatório oficial PDF de fechamento.
    6.  *Veredito:* Receba a análise macro executiva da IA formatada em Markdown limpo.
*   **Discussão Integrada**: Ao concluir, exporte o veredito para a memória de longo prazo da IA e inicie uma conversa guiada no Chat com contexto absoluto sobre o fechamento.

### 🎙️ 6. Simulação Humana Premium (WhatsApp & Voz)
*   **Status "Digitando..." no Zap**: O Finora simula digitação humana real acionando o status de presença `composing` no seu WhatsApp por 1.5 segundos antes de entregar as análises financeiras.
*   **Voz Dinâmica e Limpa**: A síntese de voz (TTS) do chat roda de forma acelerada (ritmo 1.45 de alta energia) e conta com um **filtro antimarkdown e antiextrato** implacável que remove asteriscos, quebras de linha artificiais e emojis, evitando pronúncias robóticas horríveis.

### 🤝 7. Conciliação Interativa Inteligente
*   **Proteção Contra Duplicados**: Ao registrar despesas, a IA busca contas pendentes com valores similares (margem de 5%) e datas próximas no Postgres. 
*   **Confirmação Humana**: Em vez de duplicar e poluir os relatórios, a IA paralisa a ação e pergunta se você deseja reconciliar e dar baixa na conta pendente existente ou criar uma nova do zero.

---

## 🛠️ Stack Tecnológica de Alta Performance

### Backend (The Brain)
*   **Core**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13)
*   **IA Stack**: OpenAI GPT-4o-Mini, Whisper, LangChain Tools.
*   **Database**: PostgreSQL + PgVector (Busca Semântica).
*   **Real-Time**: Redis Pub/Sub + SSE Reativo.
*   **WhatsApp**: Evolution API v1.8.2 (Stable).

### Frontend (The Interface)
*   **Core**: [Next.js 16](https://nextjs.org/) (TypeScript) + Tailwind CSS.
*   **PWA**: Service Workers e Manifest customizado.
*   **Rich Text**: Renderização nativa de Markdown no Chat e no Fechamento.

---

## 🚀 Como Ativar seu Silo

1.  **Configuração**: Copie o `.env` e insira sua `OPENAI_API_KEY` e `CLOUDFLARE_TUNNEL_TOKEN`.
2.  **Deploy**: Execute `docker-compose up -d --build`.
3.  **Acesso**:
    *   Web: `http://localhost:3000`
    *   WhatsApp: Conecte via `https://evo.gestaofinora.com.br`
    *   Mobile: Abra no navegador do celular e selecione "Instalar Aplicativo".

---
*Finora: Inteligência que protege e multiplica.* 💎🚀
