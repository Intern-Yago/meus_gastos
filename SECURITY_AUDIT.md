# Relatório de Auditoria de Segurança - Finora

## Vulnerabilidades Encontradas e Corrigidas

### 1. Injeção de Comando (Potencial) e Má Prática
- **Local:** `backend/app/utils/security_utils.py`
- **Descrição:** O uso de `os.popen('date /t')` era vulnerável e ineficiente.
- **Impacto:** Dependência de plataforma (Windows) e risco de execução de código arbitrário se a string de comando fosse manipulada.
- **Correção:** Substituído pelo módulo nativo `datetime` do Python.

### 2. Vazamento de Informações Sensíveis em Logs
- **Local:** `backend/app/auth/router.py` e `backend/app/routers/notifications.py`
- **Descrição:** O token JWT era impresso no console ou exposto na URL da conexão SSE.
- **Impacto:** Tokens poderiam ser expostos em logs de servidor ou proxies reversos.
- **Correção:** 
    1. Removidos todos os `print` de depuração que exibiam partes do token.
    2. Implementado sistema de **Ticket de Acesso de Uso Único** para SSE. O frontend solicita um ticket temporário via rota autenticada e o utiliza na URL, evitando a exposição do JWT nos logs de acesso.

### 3. Exposição Pública da Pasta de Uploads
- **Local:** `backend/app/main.py`
- **Descrição:** A pasta `/uploads` estava montada como um diretório estático público.
- **Impacto:** Qualquer pessoa poderia acessar arquivos temporários ou relatórios gerados se soubesse o nome do arquivo (ex: IDs UUID ou nomes previsíveis).
- **Correção:** 
    1. Removido o `app.mount("/uploads", ...)` do FastAPI.
    2. Refatorado o sistema para que arquivos sensíveis sejam servidos apenas via MinIO com URLs pré-assinadas (Presigned URLs) com tempo de expiração curto, garantindo que o acesso seja sempre autenticado e autorizado.
    3. Implementada rotina rigorosa de limpeza de arquivos temporários em blocos `finally`.

### 4. IDOR (Insecure Direct Object Reference) em Transações e Orçamentos
- **Local:** `backend/app/crud.py` e `backend/app/routers/transactions.py`
- **Descrição:** O sistema permitia associar transações a contas, categorias ou projetos de outros usuários simplesmente fornecendo o ID numérico.
- **Impacto:** Manipulação de dados de terceiros e vazamento indireto de nomes de recursos.
- **Correção:** Implementada validação rigorosa de propriedade para todos os IDs de recursos relacionados em operações de criação e atualização.

### 5. Atribuição em Massa (Mass Assignment)
- **Local:** `backend/app/routers/transactions.py`
- **Descrição:** O endpoint de atualização aceitava qualquer campo do dicionário e aplicava diretamente ao modelo do banco de dados.
- **Impacto:** Possibilidade de alterar campos protegidos como `user_id`, mudando a titularidade da transação.
- **Correção:** Implementada uma lista branca (`allowed_fields`) de campos que podem ser editados pelo usuário.

### 6. Acesso Não Autorizado a Arquivos via IA
- **Local:** `backend/app/routers/ai.py`
- **Descrição:** A ferramenta de processamento de extratos aceitava qualquer caminho de arquivo no MinIO.
- **Impacto:** Um usuário mal-intencionado poderia processar (e assim importar/visualizar) extratos de outros usuários se soubesse o caminho do arquivo.
- **Correção:** Adicionada verificação de prefixo (`user_id`) para garantir que a IA só processe arquivos do próprio usuário.

### 8. Injeção de Prompt (AI Prompt Injection)
- **Local:** `backend/app/routers/dashboard.py`
- **Descrição:** Nomes de categorias ou do usuário podiam conter instruções para manipular o conselheiro de IA.
- **Impacto:** Manipulação do comportamento da IA para fornecer conselhos falsos ou maliciosos.
- **Correção:** Implementada sanitização de dados (`sanitize`) antes de enviar o contexto para a OpenAI.

### 9. Injeção de CSV (Formula Injection)
- **Local:** `backend/app/routers/reports.py`
- **Descrição:** Descrições de transações começando com `=`, `+`, `-` ou `@` eram interpretadas como fórmulas pelo Excel.
- **Impacto:** Execução de comandos locais no computador do usuário ao abrir o CSV.
- **Correção:** Adicionado um apóstrofo `'` antes de caracteres suspeitos para forçar o Excel a ler como texto puro.

### 10. Injeção de Estilo em PDF
- **Local:** `backend/app/routers/reports.py`
- **Descrição:** O gerador de PDF (ReportLab) aceitava tags XML que podiam ser injetadas via nome do usuário ou descrição.
- **Impacto:** Quebra de layout ou injeção visual no relatório oficial.
- **Correção:** Utilizado `xml.sax.saxutils.escape` para neutralizar tags em todos os campos dinâmicos do PDF.

### 11. IDOR em Filtros de Dashboard
- **Local:** `backend/app/routers/dashboard.py`
- **Descrição:** O parâmetro `account_id` não era validado contra o proprietário.
- **Impacto:** Vazamento de existência de IDs de contas de outros usuários.
- **Correção:** Adicionada verificação de propriedade obrigatória para o `account_id`.

### 12. Condições de Corrida (Race Conditions) em Saldos e Metas
- **Local:** `backend/app/crud.py` e `backend/app/routers/ai.py`
- **Descrição:** Operações de incremento de saldo e metas eram feitas em nível de aplicação (leitura -> soma -> escrita), permitindo que atualizações concorrentes fossem perdidas.
- **Impacto:** Inconsistência financeira e erro no cálculo de patrimônio.
- **Correção:** Implementados incrementos atômicos via SQL (`F-expressions` equivalentes no SQLAlchemy) e bloqueio de linha (`with_for_update()`) para garantir que apenas uma transação altere o estado por vez.

## Recomendações Adicionais

### 1. Configuração de CORS
- **Local:** `backend/app/main.py`
- **Situação:** Atualmente permite todas as origens (`*`).
- **Recomendação:** Em produção, restringir `allow_origins` apenas ao domínio oficial do frontend.

### 2. Segurança de Uploads
- **Situação:** Arquivos são servidos estaticamente.
- **Recomendação:** Implementar headers de segurança como `X-Content-Type-Options: nosniff` e garantir que arquivos executáveis ou HTML maliciosos não possam ser disparados pelo navegador.

### 3. Gestão de Segredos
- **Recomendação:** Garantir que o arquivo `.env` nunca seja versionado e que as chaves de API tenham escopos limitados.
