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
