const { defineConfig, devices } = require('@playwright/test');

// Testes de ponta a ponta: abrem o app de verdade num navegador de celular.
module.exports = defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0, // teste instável é defeito a corrigir, não a repetir
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Pixel 7'],
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
});
