const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Lançar um gasto tem que levar poucos segundos: valor, categoria e Salvar, tudo na mesma
// tela do celular. O resto (data, descrição, parcelas, fixo) fica em "Mais detalhes".

const DETALHES = '#tx-form details.more';

// Celular pequeno (360×640): é onde o formulário cheio de campos não cabia na tela.
test.use({ viewport: { width: 360, height: 640 } });

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: '+ Lançar' }).click();
});

test('valor, categoria e Salvar aparecem juntos na primeira tela, sem rolar', async ({ page }) => {
  const altura = page.viewportSize().height;
  const formulario = page.locator('#tx-form');
  await expect(async () => {
    for (const campo of [formulario.getByLabel('Valor (R$)'), formulario.getByLabel('Categoria'), formulario.getByRole('button', { name: 'Salvar' })]) {
      const caixa = await campo.boundingBox();
      expect(caixa.y, 'começa abaixo do topo').toBeGreaterThanOrEqual(0);
      expect(caixa.y + caixa.height, 'termina antes do fim da tela').toBeLessThanOrEqual(altura);
    }
  }).toPass({ timeout: 4000 });
});

test('o título "Novo lançamento" não fica escondido atrás do topo', async ({ page }) => {
  await expect(async () => {
    const titulo = await page.locator('#form-title').boundingBox();
    const topo = await page.locator('header.topbar').boundingBox();
    expect(titulo.y).toBeGreaterThanOrEqual(topo.y + topo.height);
  }).toPass({ timeout: 4000 });
});

test('data, descrição, parcelas e lançamento fixo ficam recolhidos em "Mais detalhes"', async ({ page }) => {
  const formulario = page.locator('#tx-form');
  for (const nome of ['Data', 'Descrição', 'Parcelas']) await expect(formulario.getByLabel(nome)).toBeHidden();
  await expect(formulario.getByLabel('Lançamento fixo')).toBeHidden();
  await formulario.getByText('Mais detalhes').click();
  for (const nome of ['Data', 'Descrição', 'Parcelas']) await expect(formulario.getByLabel(nome)).toBeVisible();
  await expect(formulario.getByLabel('Lançamento fixo')).toBeVisible();
});

test('dá para salvar só com valor e categoria: a data vira hoje', async ({ page }) => {
  const formulario = page.locator('#tx-form');
  await formulario.getByLabel('Valor (R$)').fill('12,50');
  await formulario.getByLabel('Categoria').selectOption('mercado');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  const hoje = await page.evaluate(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  const item = page.locator('#tx-list').getByText('R$ 12,50');
  await expect(item).toBeVisible();
  await expect(page.locator('#tx-list')).toContainText(hoje.split('/')[0]);
});

test('ao editar um lançamento, os detalhes já aparecem abertos', async ({ page }) => {
  const formulario = page.locator('#tx-form');
  await formulario.getByLabel('Valor (R$)').fill('30');
  await formulario.getByLabel('Categoria').selectOption('mercado');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  await page.locator('#tx-list').getByRole('button', { name: /^Editar/ }).first().click();
  await expect(formulario.getByLabel('Descrição')).toBeVisible();
  await expect(page.locator(DETALHES)).toHaveJSProperty('open', true);
});

test('depois de salvar, os detalhes voltam a ficar recolhidos', async ({ page }) => {
  const formulario = page.locator('#tx-form');
  await formulario.getByText('Mais detalhes').click();
  await formulario.getByLabel('Valor (R$)').fill('8');
  await formulario.getByLabel('Categoria').selectOption('mercado');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  await expect(formulario.getByLabel('Descrição')).toBeHidden();
});

test('sem data, Salvar abre o "Mais detalhes" e leva o foco ao campo (e não fica mudo)', async ({ page }) => {
  const formulario = page.locator('#tx-form');
  await formulario.getByText('Mais detalhes').click();
  await formulario.getByLabel('Data').fill('');
  await formulario.getByText('Mais detalhes').click(); // recolhe de novo
  await formulario.getByLabel('Valor (R$)').fill('10');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator(DETALHES)).toHaveJSProperty('open', true);
  await expect(formulario.getByLabel('Data')).toBeFocused();
});
