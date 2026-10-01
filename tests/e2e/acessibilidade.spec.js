const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { APP } = require('./ajuda');

// Verificador automático de acessibilidade (axe-core) em todas as telas, celular e PC.
// Pega contraste, nomes que faltam, títulos, regiões e outros problemas conhecidos.

const ABAS = ['Painel', 'Lançamentos', 'Orçamento', 'Metas', 'Método'];
const REGRAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

for (const largura of [390, 1280]) {
  test(`nenhuma violação do axe em nenhuma tela (${largura}px)`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto(APP);
    await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
    for (const aba of ABAS) {
      await page.getByRole('tab', { name: aba }).click();
      const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
      const resumo = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0].target.join(' ')}`);
      expect(resumo, `tela ${aba} a ${largura}px`).toEqual([]);
    }
  });
}

test('o campo "Para qual meta?" do formulário não tem violações do axe', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await page.locator('#tx-form').getByLabel('Categoria').selectOption('metas');
  await expect(page.locator('#tx-form').getByLabel('Para qual meta?')).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
  expect(violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0].target.join(' ')}`)).toEqual([]);
});

test('o lembrete da revisão semanal e o seletor do dia não têm violações do axe', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-27T12:00:00')); // domingo: dia padrão da revisão
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await expect(page.locator('#review-reminder')).toContainText('Hoje é o seu dia de revisão semanal');
  for (const aba of ['Painel', 'Método']) {
    await page.getByRole('tab', { name: aba }).click();
    const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
    expect(violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0].target.join(' ')}`), `tela ${aba}`).toEqual([]);
  }
});

test('o "Como funciona" do Orçamento, fechado e aberto, não tem violações do axe', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  for (const aberto of [false, true]) {
    if (aberto) await page.getByRole('tabpanel', { name: 'Orçamento' }).locator('details.how summary').click();
    const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
    expect(violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0].target.join(' ')}`), aberto ? 'aberto' : 'fechado').toEqual([]);
  }
});

test('o questionário do Orçamento aberto não tem violações do axe', async ({ page }) => {
  await page.goto(APP);
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.evaluate(() => localStorage.setItem('finan:data', JSON.stringify({ version: 1, transactions: [{ id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' }] })));
  await page.reload();
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await expect(page.locator('#budget-quiz')).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
  expect(violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0].target.join(' ')}`)).toEqual([]);
});

test('a lista "Adicionar" e o formulário "Criar" do Orçamento não têm violações do axe', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  await page.getByRole('button', { name: 'Adicionar item em Estilo de vida' }).click();
  for (const etapa of ['lista', 'criar']) {
    if (etapa === 'criar') await page.getByRole('button', { name: 'Criar', exact: true }).click();
    const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
    expect(violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0].target.join(' ')}`), etapa).toEqual([]);
  }
});

test('o formulário com "Mais detalhes" aberto não tem violações do axe', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await page.locator('#tx-form').getByText('Mais detalhes').click();
  await expect(page.locator('#tx-form').getByLabel('Descrição')).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
  expect(violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0].target.join(' ')}`)).toEqual([]);
});
