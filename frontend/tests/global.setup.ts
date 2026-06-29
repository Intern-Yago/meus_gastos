import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page, request }) => {
  const email = process.env.PLAYWRIGHT_USER || 'playwright@gestaofinora.com.br';
  const password = process.env.PLAYWRIGHT_PASSWORD || 'Playwright123!';

  console.log(`\n🔑 [PLAYWRIGHT] Iniciando autenticação E2E com o usuário: ${email}`);

  // Determina a URL correta do backend baseado na URL do frontend de teste
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  let backendURL = 'http://localhost:8000';
  if (baseURL.includes(':3001')) {
    backendURL = 'http://localhost:8001';
  } else if (baseURL.includes(':3002')) {
    backendURL = 'http://localhost:8002';
  }

  // Tenta registrar o usuário de teste de forma proativa para garantir que ele exista no banco
  try {
    const registerResponse = await request.post(`${backendURL}/auth/register`, {
      data: {
        email: email,
        name: 'Playwright Test User',
        password: password
      }
    });
    if (registerResponse.status() === 200) {
      console.log(`👤 [PLAYWRIGHT] Novo usuário de teste registrado: ${email}`);
    } else if (registerResponse.status() === 400) {
      console.log(`👤 [PLAYWRIGHT] Usuário de teste já cadastrado: ${email}`);
    } else {
      console.log(`⚠️ [PLAYWRIGHT] Status inesperado ao registrar usuário de teste: ${registerResponse.status()}`);
    }
  } catch (error) {
    console.warn(`⚠️ [PLAYWRIGHT] Erro ao tentar cadastrar usuário via API:`, error);
  }

  // Garante de forma proativa que o diretório de destino do token exista antes de tentar salvar
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 [PLAYWRIGHT] Diretório de autenticação criado: ${dir}`);
  }

  await page.goto('/login');

  // Preenche o formulário de login
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Submete o formulário
  await page.click('button[type="submit"]');

  // Aguarda o login e redirecionamento seguro para o Dashboard (até 15 segundos)
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Salva o cookie e localStorage no arquivo de autenticação global
  await page.context().storageState({ path: authFile });
  
  console.log('✅ [PLAYWRIGHT] Autenticação realizada e sessão persistida com sucesso.\n');
});
