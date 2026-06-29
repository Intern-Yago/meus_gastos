# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: global.setup.ts >> authenticate
- Location: tests\global.setup.ts:7:6

# Error details

```
Error: page.goto: net::ERR_SOCKET_NOT_CONNECTED at http://localhost:3001/login
Call log:
  - navigating to "http://localhost:3001/login", waiting until "load"

```

# Test source

```ts
  1  | import { test as setup, expect } from '@playwright/test';
  2  | import fs from 'fs';
  3  | import path from 'path';
  4  | 
  5  | const authFile = 'playwright/.auth/user.json';
  6  | 
  7  | setup('authenticate', async ({ page, request }) => {
  8  |   const email = process.env.PLAYWRIGHT_USER || 'playwright@gestaofinora.com.br';
  9  |   const password = process.env.PLAYWRIGHT_PASSWORD || 'Playwright123!';
  10 | 
  11 |   console.log(`\n🔑 [PLAYWRIGHT] Iniciando autenticação E2E com o usuário: ${email}`);
  12 | 
  13 |   // Determina a URL correta do backend baseado na URL do frontend de teste
  14 |   const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  15 |   let backendURL = 'http://localhost:8000';
  16 |   if (baseURL.includes(':3001')) {
  17 |     backendURL = 'http://localhost:8001';
  18 |   } else if (baseURL.includes(':3002')) {
  19 |     backendURL = 'http://localhost:8002';
  20 |   }
  21 | 
  22 |   // Tenta registrar o usuário de teste de forma proativa para garantir que ele exista no banco
  23 |   try {
  24 |     const registerResponse = await request.post(`${backendURL}/auth/register`, {
  25 |       data: {
  26 |         email: email,
  27 |         name: 'Playwright Test User',
  28 |         password: password
  29 |       }
  30 |     });
  31 |     if (registerResponse.status() === 200) {
  32 |       console.log(`👤 [PLAYWRIGHT] Novo usuário de teste registrado: ${email}`);
  33 |     } else if (registerResponse.status() === 400) {
  34 |       console.log(`👤 [PLAYWRIGHT] Usuário de teste já cadastrado: ${email}`);
  35 |     } else {
  36 |       console.log(`⚠️ [PLAYWRIGHT] Status inesperado ao registrar usuário de teste: ${registerResponse.status()}`);
  37 |     }
  38 |   } catch (error) {
  39 |     console.warn(`⚠️ [PLAYWRIGHT] Erro ao tentar cadastrar usuário via API:`, error);
  40 |   }
  41 | 
  42 |   // Garante de forma proativa que o diretório de destino do token exista antes de tentar salvar
  43 |   const dir = path.dirname(authFile);
  44 |   if (!fs.existsSync(dir)) {
  45 |     fs.mkdirSync(dir, { recursive: true });
  46 |     console.log(`📁 [PLAYWRIGHT] Diretório de autenticação criado: ${dir}`);
  47 |   }
  48 | 
> 49 |   await page.goto('/login');
     |              ^ Error: page.goto: net::ERR_SOCKET_NOT_CONNECTED at http://localhost:3001/login
  50 | 
  51 |   // Preenche o formulário de login
  52 |   await page.locator('input[type="email"]').fill(email);
  53 |   await page.locator('input[type="password"]').fill(password);
  54 | 
  55 |   // Submete o formulário
  56 |   await page.click('button[type="submit"]');
  57 | 
  58 |   // Aguarda o login e redirecionamento seguro para o Dashboard (até 15 segundos)
  59 |   await page.waitForURL('**/dashboard', { timeout: 15000 });
  60 | 
  61 |   // Salva o cookie e localStorage no arquivo de autenticação global
  62 |   await page.context().storageState({ path: authFile });
  63 |   
  64 |   console.log('✅ [PLAYWRIGHT] Autenticação realizada e sessão persistida com sucesso.\n');
  65 | });
  66 | 
```