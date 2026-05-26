@echo off
setlocal

:: Define o caminho do script PowerShell temporário
set PS_SCRIPT=%TEMP%\run_finora.ps1

:: Cria o script PowerShell que vai gerenciar os processos e o menu
echo function Start-Servers { > "%PS_SCRIPT%"
echo     $b = Start-Process powershell -ArgumentList '-NoProfile', '-Command', 'cd backend; .\venv\Scripts\activate; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000' -PassThru -WindowStyle Normal >> "%PS_SCRIPT%"
echo     $f = Start-Process powershell -ArgumentList '-NoProfile', '-Command', 'cd frontend; npm run dev' -PassThru -WindowStyle Normal >> "%PS_SCRIPT%"
echo     return $b, $f >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo function Stop-Servers($b, $f) { >> "%PS_SCRIPT%"
echo     Write-Host 'Encerrando processos...' -ForegroundColor Red >> "%PS_SCRIPT%"
echo     if ($b) { taskkill /F /T /PID $b.Id ^> $null 2^>^&1 } >> "%PS_SCRIPT%"
echo     if ($f) { taskkill /F /T /PID $f.Id ^> $null 2^>^&1 } >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo $servers = Start-Servers >> "%PS_SCRIPT%"
echo $backend = $servers[0] >> "%PS_SCRIPT%"
echo $frontend = $servers[1] >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo while ($true) { >> "%PS_SCRIPT%"
echo     Clear-Host >> "%PS_SCRIPT%"
echo     Write-Host '======================================================' -ForegroundColor Green >> "%PS_SCRIPT%"
echo     Write-Host '          SERVIDORES FINORA EM EXECUCAO' -ForegroundColor Green >> "%PS_SCRIPT%"
echo     Write-Host "  Backend PID: $($backend.Id)" >> "%PS_SCRIPT%"
echo     Write-Host "  Frontend PID: $($frontend.Id)" >> "%PS_SCRIPT%"
echo     Write-Host '======================================================' >> "%PS_SCRIPT%"
echo     Write-Host ' [1] Reiniciar Servicos' -ForegroundColor Yellow >> "%PS_SCRIPT%"
echo     Write-Host ' [0] Encerrar Tudo' -ForegroundColor Yellow >> "%PS_SCRIPT%"
echo     Write-Host '======================================================' >> "%PS_SCRIPT%"
echo     Write-Host 'Escolha uma opcao: ' -NoNewline >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo     $key = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown') >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo     if ($key.Character -eq '1') { >> "%PS_SCRIPT%"
echo         Write-Host 'Reiniciando servidores...' -ForegroundColor Cyan >> "%PS_SCRIPT%"
echo         Stop-Servers $backend $frontend >> "%PS_SCRIPT%"
echo         Start-Sleep -Seconds 2 >> "%PS_SCRIPT%"
echo         $servers = Start-Servers >> "%PS_SCRIPT%"
echo         $backend = $servers[0] >> "%PS_SCRIPT%"
echo         $frontend = $servers[1] >> "%PS_SCRIPT%"
echo     } >> "%PS_SCRIPT%"
echo     elseif ($key.Character -eq '0') { >> "%PS_SCRIPT%"
echo         Stop-Servers $backend $frontend >> "%PS_SCRIPT%"
echo         Write-Host 'Servidores encerrados!' -ForegroundColor Cyan >> "%PS_SCRIPT%"
echo         Start-Sleep -Seconds 2 >> "%PS_SCRIPT%"
echo         break >> "%PS_SCRIPT%"
echo     } >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"

:: Executa o script PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

:: Limpa o arquivo temporário
if exist "%PS_SCRIPT%" del "%PS_SCRIPT%"
