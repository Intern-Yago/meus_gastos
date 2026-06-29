import { test, expect } from '@playwright/test';

test.describe('Dashboard Financeiro - Finora E2E', () => {
  test('deve carregar o Dashboard e validar os controles principais', async ({ page }) => {
    console.log('🚀 Iniciando teste de fumaça E2E no Dashboard');

    // Navega para o Dashboard (a autenticação já deve estar injetada)
    await page.goto('/dashboard');

    // Espera o loading desaparecer e os botões principais de ação aparecerem
    // O botão de "Insights IA" é uma marca registrada do Dashboard do Finora
    await page.waitForSelector('text=Insights IA', { timeout: 10000 });

    // Verifica se os botões de ação do topo estão renderizados
    const exportBtn = page.locator('text=Exportar');
    await expect(exportBtn).toBeVisible();

    const aiBtn = page.locator('text=Insights IA');
    await expect(aiBtn).toBeVisible();

    // Verifica se o seletor de contas está presente
    const accountSelect = page.locator('select').first();
    await expect(accountSelect).toBeVisible();

    console.log('✅ Dashboard carregado com sucesso!');
  });
});
