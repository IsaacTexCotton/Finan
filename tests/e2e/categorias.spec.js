const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Quem escolhe a categoria pelo teclado digita o começo do nome. Isso só funciona se o texto
// de cada opção começar pelo nome (e não por um emoji).

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
});

test('digitar o começo do nome escolhe a categoria de despesa', async ({ page }) => {
  const categoria = page.locator('#tx-form').getByLabel('Categoria');
  await categoria.focus();
  await page.keyboard.type('Mer');
  await expect(categoria).toHaveValue('mercado');
});

test('digitar o começo do nome escolhe a categoria de receita', async ({ page }) => {
  await page.locator('#tx-form').getByRole('radio', { name: 'Receita' }).check();
  const categoria = page.locator('#tx-form').getByLabel('Categoria');
  await categoria.focus();
  await page.keyboard.type('Renda');
  await expect(categoria).toHaveValue('renda-extra');
});

test('o filtro da lista também aceita o começo do nome', async ({ page }) => {
  const filtro = page.getByLabel('Filtrar por categoria');
  await filtro.focus();
  await page.keyboard.type('Laz');
  await expect(filtro).toHaveValue('lazer');
});

test('o nome da categoria continua completo e o emoji aparece depois dele', async ({ page }) => {
  const opcoes = await page.locator('#tx-form').getByLabel('Categoria').locator('option').allInnerTexts();
  expect(opcoes).toContain('Mercado 🛒');
  expect(opcoes.every((o) => /^\p{L}/u.test(o)), `opções que não começam por letra: ${opcoes.filter((o) => !/^\p{L}/u.test(o)).join(' | ')}`).toBe(true);
});
