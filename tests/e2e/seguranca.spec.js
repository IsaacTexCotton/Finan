const { test, expect } = require('@playwright/test');
const { APP, lancar, irParaAba } = require('./ajuda');

// Se algum destes textos virar HTML de verdade, o navegador executa o código
// e a variável window.__xss deixa de ser 0.
const IMG = '<img src=x onerror="window.__xss=1">';
const SCRIPT = '"><script>window.__xss=2</script>';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.__xss = 0; });
});

test('texto digitado com HTML aparece como texto e não executa', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto(APP);

  await lancar(page, { tipo: 'Despesa', valor: '10', categoria: 'lazer', descricao: IMG });
  await lancar(page, { tipo: 'Despesa', valor: '20', categoria: 'lazer', descricao: SCRIPT });
  const lista = page.locator('#tx-list');
  await expect(lista.locator('.tx').filter({ hasText: '<img src=x onerror' })).toBeVisible();
  await expect(lista.locator('img, script')).toHaveCount(0);

  await irParaAba(page, 'Metas');
  await page.locator('#goal-form').getByLabel('Nome').fill('<b>Viagem</b>');
  await page.locator('#goal-form').getByLabel('Valor total (R$)').fill('1000');
  await page.getByRole('button', { name: 'Criar meta' }).click();
  await expect(page.locator('#goal-list .goal strong')).toHaveText('<b>Viagem</b>');
  await expect(page.locator('#goal-list b')).toHaveCount(0);

  expect(await page.evaluate(() => window.__xss), 'nenhum código digitado pode ser executado').toBe(0);
});

test('backup com texto malicioso é importado como texto e não executa', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto(APP);
  const hoje = await page.evaluate(() => window.FinanCore.todayISO());

  const backup = {
    version: 1,
    categories: [
      { id: 'salario', name: 'Salário', type: 'income', icon: '💼' },
      { id: 'x"><img src=x onerror=window.__xss=1>', name: IMG, type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '<b>' },
    ],
    transactions: [
      { id: 't1', type: 'income', categoryId: 'salario', amount: 500000, date: hoje, description: SCRIPT },
      { id: 't2', type: 'expense', categoryId: 'x"><img src=x onerror=window.__xss=1>', amount: 12345, date: hoje, description: IMG },
    ],
    budgets: { 'x"><img src=x onerror=window.__xss=1>': 20000 },
    goals: [{ id: 'g1', name: IMG, target: 100000, saved: 1000, deadline: '' }],
    settings: { incomeProfile: '<script>window.__xss=3</script>' },
  };

  await irParaAba(page, 'Método');
  await page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole('status')).toContainText('Backup restaurado');

  // Percorre todas as telas que desenham os dados importados
  for (const aba of ['Painel', 'Lançamentos', 'Orçamento', 'Metas']) {
    await page.getByRole('tab', { name: aba }).click();
    await expect(page.locator('main img, main script')).toHaveCount(0);
  }
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(page.locator('#top-categories .cat-row').filter({ hasText: '<img src=x onerror' })).toBeVisible();

  expect(await page.evaluate(() => window.__xss), 'nenhum código do backup pode ser executado').toBe(0);
});

test('o app não faz nenhuma requisição de rede, nem ao exportar os dados', async ({ page }) => {
  const externas = [];
  page.on('request', (r) => { if (/^(https?|wss?):/.test(r.url())) externas.push(r.url()); });
  page.on('dialog', (d) => d.accept());

  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  for (const aba of ['Painel', 'Lançamentos', 'Orçamento', 'Metas', 'Método']) {
    await page.getByRole('tab', { name: aba }).click();
  }
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar backup' }).click()]);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()]);

  expect(externas, 'os dados nunca podem sair do navegador').toEqual([]);
});
