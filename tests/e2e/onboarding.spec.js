const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { APP } = require('./ajuda');

// Onboarding da primeira abertura: 3 passos (baldes, privacidade, primeiro lançamento), só enquanto
// não há lançamentos. "Pular" sempre à vista. Os botões de lançar e de dados de exemplo ficam no passo 3.
// Especificação: docs/ux-estrategia.md (telas "Onboarding 1/3 a 3/3").

const onb = (page) => page.locator('#onboarding');
const dadosSalvos = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('finan:data') || 'null'));

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
});

test('abre no passo 1, com "Passo 1 de 3" escrito, "Bem-vindo ao Finan" e sem botões de lançar ou de exemplo', async ({ page }) => {
  await expect(onb(page).getByRole('heading', { name: 'Seu dinheiro em três baldes simples' })).toBeVisible();
  await expect(onb(page)).toContainText('Passo 1 de 3');
  await expect(onb(page)).toContainText('Bem-vindo ao Finan');
  await expect(onb(page).getByRole('button', { name: 'Próximo' })).toBeVisible();
  await expect(onb(page).getByRole('button', { name: 'Pular' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver com dados de exemplo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lançar minha renda' })).toHaveCount(0);
});

test('Próximo leva do passo 1 ao 3, o foco vai ao título de cada passo e o passo 3 não tem Próximo', async ({ page }) => {
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await expect(onb(page)).toContainText('Passo 2 de 3');
  const titulo2 = onb(page).getByRole('heading', { name: 'Seus dados nunca saem do seu celular' });
  await expect(titulo2).toBeFocused();
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await expect(onb(page)).toContainText('Passo 3 de 3');
  await expect(onb(page).getByRole('heading', { name: 'Vamos fazer seu primeiro lançamento?' })).toBeFocused();
  await expect(onb(page).getByRole('button', { name: 'Próximo' })).toHaveCount(0);
  await expect(onb(page).getByRole('button', { name: 'Lançar um gasto' })).toBeVisible();
  await expect(onb(page).getByRole('button', { name: 'Lançar minha renda' })).toBeVisible();
  await expect(onb(page).getByRole('button', { name: 'Ver com dados de exemplo' })).toBeVisible();
});

test('Pular some com o onboarding, mostra a tela de boas-vindas de sempre, grava que já foi visto e não volta ao recarregar', async ({ page }) => {
  await onb(page).getByRole('button', { name: 'Pular' }).click();
  await expect(onb(page)).not.toContainText('Passo');
  await expect(onb(page)).toContainText('Comece em 3 minutos');
  await expect(page.getByRole('button', { name: 'Ver com dados de exemplo' })).toBeVisible();
  expect((await dadosSalvos(page)).settings.onboardingVisto).toBe(true);
  await page.reload();
  await expect(onb(page)).not.toContainText('Passo');
  await expect(onb(page)).toContainText('Comece em 3 minutos');
});

test('"Lançar um gasto" do passo 3 abre o formulário como Despesa e marca o onboarding como visto', async ({ page }) => {
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await onb(page).getByRole('button', { name: 'Lançar um gasto' }).click();
  const formulario = page.locator('#tx-form');
  await expect(formulario.getByRole('radio', { name: 'Despesa' })).toBeChecked();
  await expect(formulario.getByLabel('Valor (R$)')).toBeFocused();
  expect((await dadosSalvos(page)).settings.onboardingVisto).toBe(true);
});

test('"Lançar minha renda" do passo 3 abre o formulário como Receita (Salário)', async ({ page }) => {
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await onb(page).getByRole('button', { name: 'Lançar minha renda' }).click();
  const formulario = page.locator('#tx-form');
  await expect(formulario.getByRole('radio', { name: 'Receita' })).toBeChecked();
  await expect(formulario.getByLabel('Categoria')).toHaveValue('salario');
});

test('"ou veja com dados de exemplo" do passo 3 carrega o exemplo e o onboarding some', async ({ page }) => {
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await onb(page).getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await expect(page.locator('#summary-cards .card').filter({ hasText: 'Receitas' })).toContainText(/R\$/);
  await expect(onb(page)).toBeEmpty();
});

test('quem já tem lançamentos não vê o onboarding, mesmo sem nunca ter tocado em Pular', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('finan:data', JSON.stringify({ version: 1, transactions: [{ id: 'a', type: 'income', amount: 100000, date: '2026-09-02', categoryId: 'salario', description: '' }] }));
  });
  await page.reload();
  await expect(onb(page)).toBeEmpty();
});

test('"Apagar tudo" faz o onboarding voltar do passo 1', async ({ page }) => {
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await onb(page).getByRole('button', { name: 'Próximo' }).click();
  await onb(page).getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await page.getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('tab', { name: 'Método' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Apagar tudo' }).click();
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(onb(page)).toContainText('Passo 1 de 3');
});

test.describe('acessibilidade e tela estreita', () => {
  for (const passo of [1, 2, 3]) {
    test(`o passo ${passo} não tem violações do axe`, async ({ page }) => {
      for (let i = 1; i < passo; i++) await onb(page).getByRole('button', { name: 'Próximo' }).click();
      await expect(onb(page)).toContainText(`Passo ${passo} de 3`);
      const resultado = await new AxeBuilder({ page }).include('#onboarding').analyze();
      expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
    });
  }

  test('em 320px o passo 3 cabe sem rolagem para o lado e os alvos de toque têm 44px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await onb(page).getByRole('button', { name: 'Próximo' }).click();
    await onb(page).getByRole('button', { name: 'Próximo' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const nome of ['Lançar um gasto', 'Lançar minha renda', 'Ver com dados de exemplo', 'Pular']) {
      const caixa = await onb(page).getByRole('button', { name: nome }).boundingBox();
      expect(caixa.height, nome).toBeGreaterThanOrEqual(44);
    }
  });
});
