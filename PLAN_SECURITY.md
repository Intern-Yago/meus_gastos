# Plano de Segurança Avançada - Finora (SecOps & Anti-Fraud)

Este documento detalha o planejamento estratégico para transformar o Finora em uma plataforma de segurança bancária proativa.

## 1. Sistema de Score de Risco do Usuário (User Risk Scoring)
Implementar um motor que monitora o comportamento em tempo real e atribui uma pontuação de risco.

### Gatilhos de Pontuação:
- **Tentativa de IDOR (+30 pts):** Acesso a recursos (arquivos/IDs) de terceiros.
- **Prompt Injection (+20 pts):** Tentativa de manipular as diretrizes da IA.
- **Brute Force (+40 pts):** Falhas consecutivas de login (3+ em 1 min).
- **Injeção de Código (+50 pts):** Envio de payloads SQL, XSS ou HTML em inputs.
- **Viagem Impossível (+15 pts):** Login em localizações geograficamente distantes em tempo curto.

### Níveis de Resposta:
- **Verde (0-30):** Operação normal.
- **Amarelo (31-60):** IA exige confirmação extra; logs detalhados ativados.
- **Laranja (61-80):** MFA obrigatório para qualquer deleção; IA entra em modo "Formal".
- **Vermelho (81+):** Modo Honeypot ativado ou bloqueio temporário de IP.

## 2. Estratégia de Honeypot (Contra-Inteligência)
Em vez de apenas bloquear o atacante (o que ensina a ele que a tentativa falhou), o sistema irá enganá-lo.

### Honeypot na IA:
- Se o usuário for de Alto Risco, a IA fornecerá dados financeiros falsos (gerados aleatoriamente) mas convincentes.
- O atacante perde tempo analisando dados inúteis enquanto o sistema real está seguro.

### Honeypot no Sistema:
- Rotas como `/admin` ou `/config-secret` que não existem mas parecem vulneráveis.
- Se acessadas, o IP é imediatamente marcado como "Vermelho".

## 3. Autenticação de Dois Fatores (2FA/MFA)
Implementação técnica para a aba de Configurações.

### Fluxo de Ativação:
1. Usuário solicita ativação em `/settings`.
2. Backend gera um segredo TOTP e um QR Code.
3. Usuário escaneia com Google Authenticator/Authy.
4. Usuário confirma com o primeiro código de 6 dígitos.
5. Backup codes de emergência são gerados.

### Impacto no Login:
- O token JWT só será emitido após a verificação do segundo fator se o MFA estiver ativo.

## 4. Próximos Passos (Roadmap):
1. Criar tabela `user_risk_scores` e `security_events`.
2. Implementar middleware de monitoramento de rotas.
3. Desenvolver o módulo TOTP no backend.
4. Interface de usuário para gerenciamento de MFA no Frontend.
