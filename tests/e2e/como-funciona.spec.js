const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Os textos longos do Orçamento ficam recolhidos em "Como funciona" (abre ao tocar), para a pessoa
// chegar logo aos envelopes. Continuam visíveis só as definições curtas: o que é envelope e o que
// são fixa e variável, que explicam as etiquetas de cada linha.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
});

const painel = (page) => page.getByRole('tabpanel', { name: 'Orçamento' });
const como = (page) => painel(page).locator('details.how');

test('os textos longos ficam recolhidos e as definições curtas continuam visíveis', async ({ page }) => {
  await expect(como(page).locator('summary')).toHaveText('Como funciona');
  await expect(como(page)).not.toHaveAttribute('open', /.*/);
  await expect(painel(page).getByText('Cada balde tem um teto')).toBeHidden();
  await expect(painel(page).getByText('O botão Sugerir pelos meus gastos')).toBeHidden();

  await expect(painel(page).getByText('Cada categoria pode ter um envelope')).toBeVisible();
  await expect(painel(page).getByText('Fixa: valor que quase não muda')).toBeVisible();
});

test('tocar em "Como funciona" abre os textos, e tocar de novo recolhe', async ({ page }) => {
  await como(page).locator('summary').click();
  await expect(painel(page).getByText('Cada balde tem um teto')).toBeVisible();
  await expect(painel(page).getByText('O botão Sugerir pelos meus gastos')).toBeVisible();
  await como(page).locator('summary').click();
  await expect(painel(page).getByText('Cada balde tem um teto')).toBeHidden();
});

test('abre e fecha pelo teclado (Enter) e o alvo de toque tem pelo menos 44px', async ({ page }) => {
  const resumo = como(page).locator('summary');
  await resumo.focus();
  await page.keyboard.press('Enter');
  await expect(painel(page).getByText('Cada balde tem um teto')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(painel(page).getByText('Cada balde tem um teto')).toBeHidden();
  expect((await resumo.boundingBox()).height).toBeGreaterThanOrEqual(44);
});

test('com os textos recolhidos, o primeiro balde aparece na primeira tela, sem rolar', async ({ page }) => {
  const titulo = await page.locator('.budget-group h3').first().boundingBox();
  expect(titulo.y + titulo.height, 'o título do primeiro balde cabe na tela de 844px de altura').toBeLessThan(844);
});
