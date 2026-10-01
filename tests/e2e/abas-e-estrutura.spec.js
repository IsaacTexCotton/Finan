const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// As abas seguem o padrão que teclado e leitor de tela conhecem: setas trocam de aba, só a
// aba atual é parada do Tab, cada aba controla um painel com nome. A página tem título
// principal e um atalho para pular direto ao conteúdo. Metas e Método ficam dentro do "Mais"
// (a navegação inferior é testada em navegacao-inferior.spec.js).

const ABAS = ['Painel', 'Lançamentos', 'Orçamento', 'Metas', 'Método'];

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
});

test('as setas, Home e End percorrem a barra: as abas trocam, o "Mais" só recebe o foco', async ({ page }) => {
  const aba = (nome) => page.getByRole('tab', { name: nome });
  const mais = page.getByRole('button', { name: 'Mais' });
  await aba('Painel').focus();

  await page.keyboard.press('ArrowRight');
  await expect(aba('Lançamentos')).toBeFocused();
  await expect(aba('Lançamentos')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Lançamentos' })).toBeVisible();

  await page.keyboard.press('End');
  await expect(mais).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Lançamentos' })).toBeVisible(); // o foco no "Mais" não troca de tela
  await page.keyboard.press('ArrowRight'); // depois do último, volta ao primeiro
  await expect(aba('Painel')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); // antes do primeiro, vai ao último
  await expect(mais).toBeFocused();
  await page.keyboard.press('Home');
  await expect(aba('Painel')).toBeFocused();
});

test('só a aba atual é parada do Tab: o Tab vai direto ao conteúdo', async ({ page }) => {
  await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Painel' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[role="tab"]:focus')).toHaveCount(0);
  await expect(page.locator('main :focus')).toHaveCount(1);
});

test('cada aba controla um painel que tem o nome da aba', async ({ page }) => {
  for (const nome of ABAS) {
    await irParaAba(page, nome);
    await expect(page.getByRole('tabpanel', { name: nome })).toBeVisible();
    const controla = await page.locator('[role="tab"]').filter({ hasText: nome }).getAttribute('aria-controls');
    await expect(page.locator(`#${controla}`)).toBeVisible();
  }
});

test('a página tem um título principal e as abas ficam numa região de navegação', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Finan');
  await expect(page.getByRole('navigation', { name: 'Seções do app' })).toBeVisible();
});

test('o primeiro Tab leva ao "Pular para o conteúdo", que move o foco para o conteúdo', async ({ page }) => {
  await page.keyboard.press('Tab');
  const pular = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(pular).toBeFocused();
  await expect(pular).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('main :focus')).toHaveCount(1); // seguiu para dentro do conteúdo
});
