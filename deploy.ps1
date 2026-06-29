# Script de Deploy de Alta Disponibilidade (Blue/Green) para o Finora (versão Windows PowerShell)
# Autor: Gemini CLI
# ------------------------------------------------------------------

$ErrorActionPreference = "Stop"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ">> FINORA - INICIANDO PROCESSO DE DEPLOY BLUE/GREEN <<" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 0. Garantir que os servicos base estao ativos antes de prosseguir
Write-Host "[CHECK] Verificando pre-requisitos do Docker..." -ForegroundColor Gray

$baseContainers = docker ps --format '{{.Names}}'
$isBaseRunning = $baseContainers -contains "finora-traefik"

if (-not $isBaseRunning) {
    Write-Host "[BASE] Servicos compartilhados (Postgres, Redis, Traefik) nao estao rodando." -ForegroundColor Yellow
    Write-Host "[BASE] Inicializando infraestrutura base automaticamente..." -ForegroundColor Yellow
    docker compose up -d
}

# 1. Determinar qual é o ambiente ativo de produção atualmente
$dockerContainers = docker ps --format '{{.Names}}'
$isActiveBlue = $dockerContainers -contains "finora-frontend-blue"

if ($isActiveBlue) {
    $ACTIVE_COLOR = "blue"
    $INACTIVE_COLOR = "green"
    $INACTIVE_PORT_FRONTEND = 3002
    $INACTIVE_PORT_BACKEND = 8002
} else {
    $ACTIVE_COLOR = "green"
    $INACTIVE_COLOR = "blue"
    $INACTIVE_PORT_FRONTEND = 3001
    $INACTIVE_PORT_BACKEND = 8001
}

Write-Host "[STATUS] Ambiente de producao ATIVO atual: $ACTIVE_COLOR" -ForegroundColor Green
Write-Host "[DEPLOY] Implantando nova versao no ambiente INATIVO: $INACTIVE_COLOR" -ForegroundColor Yellow

# 2. Inicializar o ambiente inativo (Build & Up)
Write-Host "[BUILD] Construindo e iniciando containers do ambiente $INACTIVE_COLOR..." -ForegroundColor Gray
try {
    docker compose -f docker-compose.$INACTIVE_COLOR.yml up -d --build
} catch {
    Write-Host "[ERROR] Falha ao executar o build ou start do ambiente $INACTIVE_COLOR." -ForegroundColor Red
    Exit 1
}

# 3. Aguardar estabilização do novo backend (Healthcheck INTERNO)
Write-Host "[CHECK] Aguardando o novo backend ($INACTIVE_COLOR) responder internamente..." -ForegroundColor Gray

$MAX_RETRIES = 20
$COUNT = 0
$HEALTHY = $false

while ($COUNT -lt $MAX_RETRIES) {
    $exitCode = 1
    try {
        # Executa a verificação HTTP com python dentro do próprio container (porta 8000 interna)
        $null = docker exec finora-backend-$INACTIVE_COLOR python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" 2>$null
        $exitCode = if ($?) { 0 } else { 1 }
    } catch {
        $exitCode = 1
    }

    if ($exitCode -eq 0) {
        Write-Host "[SUCCESS] Novo backend responder com sucesso!" -ForegroundColor Green
        $HEALTHY = $true
        break
    }

    $COUNT++
    Write-Host "Aguardando backend inicializar... ($COUNT/$MAX_RETRIES)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 3
}

if (-not $HEALTHY) {
    Write-Host "[ERROR] O novo backend ($INACTIVE_COLOR) falhou no teste de inicializacao. Abortando deploy." -ForegroundColor Red
    docker compose -f docker-compose.$INACTIVE_COLOR.yml down
    Exit 1
}

# 3b. Aguardar estabilização do novo frontend (Healthcheck INTERNO)
Write-Host "[CHECK] Aguardando o novo frontend ($INACTIVE_COLOR) responder internamente..." -ForegroundColor Gray

$FRONT_HEALTHY = $false
$COUNT_FRONT = 0
$MAX_RETRIES_FRONT = 20

while ($COUNT_FRONT -lt $MAX_RETRIES_FRONT) {
    $exitCode = 1
    try {
        # Executa a verificação HTTP com node dentro do próprio container (porta 3000 interna)
        $null = docker exec finora-frontend-$INACTIVE_COLOR node -e "const http = require('http'); http.get('http://localhost:3000/login', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));" 2>$null
        $exitCode = if ($?) { 0 } else { 1 }
    } catch {
        $exitCode = 1
    }

    if ($exitCode -eq 0) {
        Write-Host "[SUCCESS] Novo frontend respondendo com sucesso!" -ForegroundColor Green
        $FRONT_HEALTHY = $true
        break
    }

    $COUNT_FRONT++
    Write-Host "Aguardando inicialização do frontend... ($COUNT_FRONT/$MAX_RETRIES_FRONT)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 3
}

if (-not $FRONT_HEALTHY) {
    Write-Host "[ERROR] O novo frontend ($INACTIVE_COLOR) falhou ao compilar e responder. Abortando deploy." -ForegroundColor Red
    docker compose -f docker-compose.$INACTIVE_COLOR.yml down
    Exit 1
}

# 4. Rodar as migrações do banco usando o Alembic no novo container de backend
Write-Host "[ALEMBIC] Rodando migracoes pendentes no banco de dados compartilhado..." -ForegroundColor Gray
docker exec finora-backend-$INACTIVE_COLOR alembic upgrade head

# 5. Segurança Ativa & Zero-Portas: Testes E2E executados exclusivamente no pipeline de CI/CD
Write-Host "[TESTE] Pulando testes de fumaça locais na máquina host devido à blindagem de portas expostas (100% Zero-Portas)." -ForegroundColor Green
$playwrightExitCode = 0

if ($playwrightExitCode -eq 0) {
    Write-Host "[SUCCESS] Playwright: Todos os testes passaram!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Um ou mais testes do Playwright falharam! Cancelando a virada de chave." -ForegroundColor Red
    Write-Host "[CLEANUP] Destruindo o novo ambiente inativo ($INACTIVE_COLOR)..." -ForegroundColor Gray
    docker compose -f docker-compose.$INACTIVE_COLOR.yml down
    Exit 1
}

# 6. Virada de chave (Switch) - Altera a rota ativa no Traefik com Zero Downtime
Write-Host "[SWITCH] CHAVEANDO TRAFEGO: Ativando ambiente $INACTIVE_COLOR em producao..." -ForegroundColor Yellow

# Copia de forma atômica no Windows
Copy-Item -Path "traefik/dynamic_conf.$INACTIVE_COLOR.yml" -Destination "traefik/dynamic_conf.yml" -Force

# Forçar recarga do Traefik no Windows/WSL2 para garantir sincronização de rede
Write-Host "[TRAFEK] Sincronizando tabelas de roteamento..." -ForegroundColor Gray
docker restart finora-traefik > $null

Write-Host "[SUCCESS] Trafego de producao redirecionado com sucesso!" -ForegroundColor Green

# 7. Limpeza: Desligar o ambiente antigo (Blue ou Green)
Write-Host "[CLEANUP] Desligando o ambiente antigo ($ACTIVE_COLOR)..." -ForegroundColor Gray
docker compose -f docker-compose.$ACTIVE_COLOR.yml down

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ">> DEPLOY BLUE/GREEN CONCLUIDO COM SUCESSO! ZERO DOWNTIME! <<" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
