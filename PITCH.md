# 💎 Finora: O Silo de Inteligência Financeira Definitivo

O **Finora** é o hub central da sua vida financeira. Não é apenas uma ferramenta de controle, mas um **Silo de Inteligência** sofisticado, projetado para transformar dados brutos em decisões estratégicas. Através de uma plataforma PWA de alto desempenho, uma rede neural dedicada e caching sub-milissegundo em Redis, o Finora oferece o controle absoluto que o mercado tradicional não consegue entregar.

---

## 🌐 A Experiência PWA: Seu Centro de Comando
O coração do Finora é a nossa **Plataforma Web de Próxima Geração**.
*   **Performance Nativa:** Instalável como um aplicativo (PWA), oferece fluidez absoluta, animações refinadas e acesso instantâneo em qualquer dispositivo (iOS, Android, Desktop).
*   **Interface High-End:** Design minimalista e profissional, com uma **Sidebar Redesenhada em Seções de Elite** (Visão Geral, Financeiro, Gestão & Crescimento, e Barra de Ferramentas no rodapé) focada na clareza de dados. Possui acesso administrativo expresso através de um atalho de Coroa Amarela (`Crown`) premium no cabeçalho.
*   **Dashboard Executivo:** Visualize seu patrimônio líquido, orçamentos, faturas de múltiplos cartões e metas em um painel unificado que respira inteligência.

## 📈 Carteira de Investimentos ao Vivo (B3 & Renda Internacional)
Esqueça as planilhas estáticas ou atualizações manuais cansativas.
*   **Caching de Alta Performance (Redis):** Caching sub-milissegundo para cotações atuais (cache de 5 minutos) e históricos de gráficos (cache de 24 horas), proporcionando carregamento instantâneo da sua carteira em menos de 2ms!
*   **Classificação Dinâmica por Metadados:** Algoritmo sofisticado que identifica e classifica seus ativos em tempo real na Bolsa de Valores, separando de forma limpa **FIIs, ETFs, Ações, Renda Fixa** ou **Criptoativos** com base nos metadados globais da B3/Nasdaq.
*   **Conversão Multimoeda ao Vivo (Dólar para Real):** Se você comprar ativos em bolsas internacionais (como Apple `AAPL` ou Tesla `TSLA` em dólares), o sistema detecta a moeda do ativo, consulta o câmbio spot do Dólar (`USDBRL=X`) em tempo real e calcula todo o seu patrimônio, gráficos de tendência e lucros convertidos em Reais de forma automática!
*   **Gráficos Intradiários (1d por Horas):** Acompanhe a oscilação de hoje das suas ações e FIIs em intervalos de 15 minutos, gerando gráficos de linha ricos em detalhes por horas, além de escalas de 1s (semana), 1m (mês) e 1a (ano).
*   **Marcação à Curva para Renda Fixa:** Títulos de renda fixa (como CDBs ou IPCA+ 2032) herdam o seu preço médio por padrão, protegendo seu patrimônio de flutuações e perdas fictícias de -100%.

## 🤖 O Cérebro: IA Financeira Proativa & Mentoria
A inteligência artificial não é um acessório; é o motor do sistema.
*   **Proatividade Master (Fim do Teórico):** O Finora tem **100% de suas 20 ferramentas integradas de verdade ao banco de dados Postgres**. Ela toma a iniciativa, oferecendo-se para criar metas (`manage_goals_tool`), definir tetos de gastos (`set_budget_tool`), cadastrar contas (`update_account_tool`) ou ajustar saldos se o caixa estiver no vermelho!
*   **Auto-Correção de Tickers:** A IA detecta e autocorrige erros de digitação comuns em tickers de mercado (ex: se você digitar `mxfr11` ou `petr-4`, ela corrige e normaliza automaticamente para os tickers corretos da B3: `MXRF11` e `PETR4`) antes de salvar no banco!
*   **Perfil de Investidor (Profiling Ativo):** Um questionário de elite integrado para traçar o perfil de risco (Conservador, Moderado, Arrojado) do usuário, integrado de forma bidirecional com as memórias da rede neural.
*   **Simulador de Decisão:** Diga *"Posso comprar um notebook de R$ 4.000?"* e a IA simula o impacto matemático exato de pagar à vista ou parcelado no seu fluxo de caixa mensal.

## 💳 Inteligência Contábil de Cartões de Crédito
*   **Ciclo de Faturas Fiel à Realidade:** Compras feitas no crédito no mês $N$ (Junho) são registradas no histórico do mês corrente, mas a obrigação financeira (Passivos/Dívidas Pendentes) e o bloqueio do seu **Dinheiro Livre Real** são empurrados automaticamente para o mês de vencimento $N+1$ (Julho), exatamente como funciona a fatura de um cartão de crédito real.
*   **Visão Geral de Limites:** Acompanhe o uso de limites de múltiplos cartões ativos ao mesmo tempo com barras de progresso dinâmicas diretamente no Dashboard.

## 🏢 Gestão de Múltiplos Silos (Negócios e Projetos)
Projetado para quem gerencia mais do que apenas contas pessoais.
*   **Business Intelligence:** Separe o pessoal do profissional com rigor bancário. Gerencie múltiplos negócios e marcas com orçamentos e identidades visuais independentes.
*   **Silos de Projetos:** Crie ambientes isolados para metas específicas (Investimentos, Viagens, Reformas) e acompanhe a saúde de cada iniciativa de forma isolada.

## 🛡️ Segurança de Fortaleza & Privacidade Absoluta
Sua liberdade financeira exige sigilo total.
*   **Arquitetura de Silo Privado:** Seus dados e comprovantes são armazenados em um storage privado (MinIO) e servidos via proxy autenticado. Nada fica público ou exposto.
*   **Criptografia UUID:** Toda a sua identidade é referenciada por chaves criptográficas únicas (UUIDv4) para blindar seu silo.
*   **Consentimento Open Finance:** Escolha o nível de privacidade dos seus cookies (Essenciais, Funcionais ou Inteligência) a qualquer momento.

## 🏆 O Ritual de Fechamento de Mês (Modo Fechamento)
Um fluxo guiado de 6 passos no fim do mês para sanear suas finanças:
1.  *Categorização:* Classifique despesas pendentes em lote.
2.  *Duplicatas:* Identifique e remova lançamentos duplicados acidentalmente.
3.  *Comprovantes:* Envie imagens de comprovantes em lote diretamente para o MinIO.
4.  *Metas:* Acompanhe o progresso das suas metas de poupança.
5.  *Relatórios:* Emita o relatório oficial PDF de fechamento.
6.  *Veredito IA:* Receba a análise executiva da IA e transicione a discussão diretamente para o chat com a IA lembrando do seu veredito.

## 💳 Modelo de Assinaturas SaaS Inteligente (Anti-Pirataria)
O Finora foi projetado com um modelo de monetização robusto que atrai novos usuários via degustação do Oráculo, protege suas margens de custo de API e impede o compartilhamento não autorizado de contas:
*   **⚪ Plano Standard (Degustação - 7 Dias):** Acesso total para novos usuários testarem o sistema livremente. Limitado a no máximo 10 lançamentos por dia e memória de conversa curta (últimas 5 mensagens) no Oráculo, com expiração em 7 dias.
*   **🔵 Plano Executivo Elite (R$ 29,90/mês):** Nosso plano principal. Oferece lançamentos ilimitados, memória de conversa estendida (últimas 15 mensagens) e **Bloqueio de Sessão Única via Redis** (impede o compartilhamento de senhas, deslogando aparelhos antigos na hora!).
*   **👑 Plano Enterprise (R$ 59,90/mês):** A fortaleza máxima. Oferece multi-sessões simultâneas livres, multiusuários para sócios ou contadores, memória de conversa ultra-longa (últimas 30 mensagens) e notificações de mercado financeiro ao vivo.

---

**Finora: Tecnologia de elite para quem domina o próprio patrimônio.** 🛡️💼📈
