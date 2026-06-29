import { defineConfig, devices } from '@playwright/test';

export const authFile = 'playwright/.auth/user.json';

/**
 * Playwright configuration for Finora End-to-End testing.
 * Supports dynamic port selection and correct global auth setup lifecycle.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // 1. Etapa de configuração: Realiza login automático inicial (NÃO lê o storageState)
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    // 2. Testes de interface (Lê o storageState gerado pela dependência 'setup')
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],
});
