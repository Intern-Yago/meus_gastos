# Finora - Plano de Evolução (Roadmap)

## ✅ Concluído (Fase 1 - 5)
- [x] **Segurança de Elite**: Migração UUID, blindagem de `/uploads` e Cookies de Download de 24h.
- [x] **Integração WhatsApp**: Evolution API v1.8 estável integrada ao 'Self-Silo' da IA.
- [x] **Transformação PWA**: Manifesto, Service Workers e botão de instalação nativa no mobile.
- [x] **Real-Time Push**: Notificações instantâneas via SSE e Redis Pub/Sub.
- [x] **Paginação Profissional**: Navegação fluida de 30 registros por página no backend e frontend.
- [x] **Markdown no Chat**: Renderização rica de mensagens e botões de exportação automáticos.
- [x] **Branding Unificado**: Emails profissionais e relatórios PDF com logo e identidade visual.
- [x] **Responsividade Total**: Fim do 'Hover' obrigatório; ações sempre visíveis no mobile.
- [x] **Travas de Integridade**: Bloqueio de lançamentos em Silos e Projetos desativados/concluídos.
- [x] **Reconciliação com OCR**: Processamento de imagens de notas/comprovantes via Zap/Chat e conciliação sugerida inteligente.
- [x] **Docker Healthchecks**: Sincronização robusta e monitoramento de saúde entre Postgres, Redis, MinIO e Uvicorn no startup.

## 🚀 Em Execução (Fase 6: Experiência & Segurança Proativa)
- [ ] **Fechamento Automático de Modal e Toast do WhatsApp**: Ajustar poller de frontend para garantir que o modal de ativação do WhatsApp feche e exiba o toast de sucesso ao concluir o vínculo de celular.
- [ ] **Onboarding Ativo do WhatsApp no Chat**: Implementar um banner inteligente e moderno de onboarding no topo da tela do Chat IA (`/chat`) que aparece somente se o usuário não tiver o WhatsApp verificado (`phone_verified == false`), ensinando as grandes vantagens de usabilidade (processar áudios de 3s de gastos, comprovantes e receber alertas proativos de caixa/mercado) e guiando-o passo a passo para a tela de vínculo em Configurações.
- [ ] **Customização de Splash Screen**: Implementar carregamento de elite com fundo personalizado e logo animada para Android/iOS.
- [ ] **Haptic Feedback**: Pequenas vibrações táteis no mobile para ações de sucesso/erro.
- [ ] **Social Login (Google)**: Login simplificado via OAuth2 integrado ao perfil.
- [ ] **Autenticação de Dois Fatores (MFA)**: Suporte a TOTP (Google Authenticator).

## 📅 Próximos Passos (Backlog Estratégico)
### 💼 Finanças & IA Avançada
- [ ] **Configuração do Número Oficial (Chip Secundário)**: Adquirir e configurar um chip pré-pago dedicado (WhatsApp Business) para a instância oficial de produção do Bot no Evolution API, separando-o definitivamente do número pessoal e evitando bloqueios de Auto-Mensagem (Self-Messaging) na rede local.
- [ ] **Motor de Categorização Global (Auto-Learn)**: Implementar inteligência estatística de categorização com pgvector, Sanitizador LGPD e Score de Confiança (ver detalhes completos da arquitetura em `auto_learn.md`).
- [ ] **Integração API Oficial Meta**: Migração para infraestrutura oficial do WhatsApp Cloud API.
- [ ] **Alocação de Ativos Inteligente**: IA sugerindo rebalanceamento de carteira baseado em objetivos.
- [ ] **Open Banking Webhooks**: Integração direta com bancos para extratos em tempo real.

### 🛠️ Engenharia e DX
- [ ] **Chaveador de Temas (Dark/Light Mode) Interno**: Implementar o seletor de modo claro/escuro no painel de configurações para o software interno (Dashboard, Transações, Investimentos, Configurações), salvando as preferências do usuário localmente.
- [ ] **Painel de Controle Evolution**: Interface para gerenciar instâncias de WhatsApp diretamente no Silo.
- [ ] **Documentação OpenAPI (Redoc)**: Refinamento completo da doc para futuras integrações de terceiros.

### 🌐 Infraestrutura, CI/CD & Deploy de Alta Disponibilidade (Zero Downtime)
- [ ] **Fase 1: Testes E2E Automatizados (Playwright)**
  - [x] Instalação e configuração do Playwright no `frontend`.
  - [x] Criação do mecanismo de autenticação global integrada para otimizar sessões de teste (`global.setup.ts`).
  - [x] Desenvolvimento de cenários de teste E2E críticos (Login, Dashboard de Investimentos, lançamentos via Chat e Fluxo de Fechamento de Mês).
- [ ] **Fase 2: Pipeline Robusto de CI/CD**
  - [ ] Criação de GitHub Actions (`ci.yml`) para testes automáticos de backend (`pytest`) e frontend (`playwright`).
  - [ ] Implementação de Docker Compose de teste (`docker-compose.test.yml`) isolado no runner do CI para validação E2E com Postgres/Redis temporários.
  - [ ] Configuração de travas de branch protection impedindo merge na `main` sem validação verde do pipeline.
- [ ] **Fase 3: Infraestrutura Blue/Green Deployment**
  - [x] Configuração do Nginx/Traefik Reverso local (`finora-traefik`) para orquestrar o tráfego de entrada da aplicação.
  - [x] Duplicação dos ambientes sem estado em sub-redes independentes do Docker (`docker-compose.blue.yml` nas portas 3001/8001 e `docker-compose.green.yml` nas portas 3002/8002).
  - [x] Adaptação do Cloudflare Tunnel para apontar para o Traefik Central em vez dos containers individuais.
  - [x] Script de deploy de alta disponibilidade (`deploy.sh` e `deploy.ps1`) com detecção de cor ativa, teste de fumaça automático (Smoke Test), atualização segura de migrações (`Alembic`) e rollback instantâneo via `Traefik File Provider`.
  - [x] Adoção da política de migração de banco "Expand and Contract" para manter retrocompatibilidade entre versões de deploy.

---
*Finora Roadmap: Rumo ao Silo Definitivo.* 🚀
