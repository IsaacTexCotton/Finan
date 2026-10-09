const { test, expect } = require('@playwright/test');
const { APP, carregarExemplo } = require('./ajuda');

// Quem digita um limite precisa saber que ele foi salvo (e quem usa leitor de tela, ouvir isso).

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await carregarExemplo(page);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
});

test('salvar um limite avisa qual categoria e quanto', async ({ page }) => {
  await page.getByLabel('Limite para Mercado').fill('500');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('status')).toContainText(/Limite de Mercado salvo: R\$\s500,00/);
});

test('apagar um limite avisa que ele foi removido', async ({ page }) => {
  await page.getByLabel('Limite para Mercado').fill('');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('status')).toContainText('Limite de Mercado removido');
});

test('valor inválido avisa e não altera o limite', async ({ page }) => {
  const antes = await page.getByLabel('Limite para Mercado').inputValue();
  await page.getByLabel('Limite para Mercado').fill('abc');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('status')).toContainText('Limite inválido');
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue(antes);
});
