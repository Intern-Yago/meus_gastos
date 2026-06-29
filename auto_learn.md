# Arquitetura de Aprendizado Automático (Auto-Learn) do Finora

O Finora possui uma arquitetura de classificação de transações projetada para se tornar mais inteligente a cada uso, combinando privacidade rigorosa (LGPD), escalabilidade estatística e transparência. Em vez de treinar modelos de linguagem (LLMs) diretamente com dados brutos, utilizamos uma abordagem de 3 camadas suportada por embeddings vetoriais (`pgvector`).

## O Fluxo de Dados (Pipeline)

A jornada de uma transação bruta (ex: vinda de um extrato ou integração bancária) até a sua classificação correta segue esta arquitetura:

```text
Transação bruta (ex: "MERCADOPAGO*IFOOD*SAOPAULO")
  ↓
Sanitizador LGPD (Remove CPFs, nomes, datas, cartões)
  ↓
Normalizador de Merchant (Limpa para "iFood")
  ↓
Classificador Local do Usuário (Consulta regras específicas do usuário)
  ↓
Classificador Global Anonimizado (Consulta a "Inteligência Coletiva Financeira" via pgvector)
  ↓
Score de Confiança (Cálculo estatístico ponderado)
  ↓
Categoria Sugerida ou Aplicada Automaticamente
```

---

## Pilares do Sistema

### 1. Aprendizado Local (Por Usuário)
Cada usuário possui sua própria base de inteligência privada. As regras ensinadas pelo usuário no chat (ex: "AWS → Infraestrutura", "PIX Maria → Salário Babá") são soberanas e se aplicam apenas ao ecossistema (Silo) dele, garantindo personalização absoluta.

### 2. Aprendizado Global Anonimizado
O sistema aprende os padrões gerais de mercado a partir das interações anonimizadas de todos os usuários.
*   "Netflix" no domingo à noite costuma ser Assinatura de Lazer.
*   "Uber" na sexta-feira às 2h costuma ser Lazer/Transporte de final de semana.
*   "Posto de Gasolina" na segunda-feira às 8h costuma ser Transporte de Rotina.
*O global recebe apenas sinais limpos: `merchant_normalizado`, `contexto_temporal_dia_hora`, `categoria_final`, `tipo_transacao`, `faixa_de_valor`, e `nível_de_confiança`.*

### 3. Confiança por Score (Auto-categorização vs. Revisão)
O motor não aplica as descobertas cegamente. Ele opera baseado em níveis de confiança (Confidence Score):
*   **95%+**: Categoriza e aprova a transação automaticamente (ex: "IFOOD" = Alimentação com 98% de confiança).
*   **70% a 95%**: Sugere a categoria, mas sinaliza para o usuário revisar.
*   **Abaixo de 70%**: Deixa sem categoria e envia automaticamente para o **Passo 1 do Ritual de Fechamento de Mês** para o usuário classificar manualmente.

### 4. Ciclo de Feedback Explícito
Toda vez que o usuário corrige uma sugestão (ex: alterando "Alimentação" para "Reembolso Corporativo"), o sistema aprende instantaneamente para aquele usuário (Local) e ajusta a ponderação estatística no motor de inteligência coletiva (Global), se for um padrão genérico seguro.

### 5. Privacidade e Consentimento (Opt-in/Opt-out)
Alinhado aos princípios do Open Finance, a colaboração com o modelo global não é impositiva.
*   Os usuários terão a opção explícita no onboarding e nas configurações: **"Ajudar a melhorar sugestões anônimas para todos os usuários [Ativado/Desativado]"**.
*   **NENHUM dado sensível bruto** (nome, CPF, conta, chave PIX, endereço, comprovante real) será jamais enviado à camada global de aprendizado. O sanitizador LGPD age como um firewall absoluto entre a transação bruta e a mente coletiva.