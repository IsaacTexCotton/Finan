const { test, expect } = require('@playwright/test');
const { APP, lancar, irParaAba, carregarExemplo } = require('./ajuda');

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
    await irParaAba(page, aba);
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
  await carregarExemplo(page);
  for (const aba of ['Painel', 'Lançamentos', 'Orçamento', 'Metas', 'Método']) {
    await irParaAba(page, aba);
  }
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar backup' }).click()]);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()]);

  expect(externas, 'os dados nunca podem sair do navegador').toEqual([]);
});

test('dados salvos com nomes especiais do JavaScript não quebram os textos nem os totais', async ({ page }) => {
  // Antes do conserto: tipo de renda "constructor" mostrava "Reserva de undefined meses" em Metas, e uma
  // categoria com balde "constructor" fazia o gasto sumir do Painel (Gastos R$ 0,00 com R$ 50 lançados).
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      settings: { incomeProfile: 'constructor' },
      categories: [{ id: 'mercado', name: 'Mercado', type: 'expense', bucket: 'constructor', kind: 'variavel' }],
      transactions: [
        { id: 'r', type: 'income', amount: 300000, date: '2026-09-02', categoryId: 'salario', description: '' },
        { id: 'g', type: 'expense', amount: 5000, date: '2026-09-05', categoryId: 'mercado', description: 'Feira' },
      ],
    }));
  });
  await page.goto(APP);
  await expect(page.locator('#summary-cards .card').filter({ hasText: 'Gastos' })).toContainText(/R\$\s50,00/);
  await irParaAba(page, 'Metas');
  await expect(page.locator('#emergency')).toContainText('Reserva de 6 meses de gastos essenciais');
  await expect(page.locator('#emergency')).not.toContainText('undefined');
});

test('nomes de categoria e de meta com HTML aparecem como texto na sugestão de limites e não executam', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript(({ img, script }) => {
    const gasto = (id, categoryId, mes, amount) => ({ id, type: 'expense', categoryId, amount, date: `${mes}-10`, description: '' });
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      categories: [
        { id: 'mercado', name: 'Mercado', type: 'expense', bucket: 'essencial', kind: 'variavel' },
        { id: 'x1', name: img, type: 'expense', bucket: 'estilo', kind: 'variavel' },
        { id: 'x2', name: script, type: 'expense', bucket: 'estilo', kind: 'fixa' },
      ],
      goals: [{ id: 'g1', name: img, target: 500000, saved: 0, deadline: '2027-06-01' }],
      transactions: [
        { id: 'r', type: 'income', amount: 500000, date: '2026-09-02', categoryId: 'salario', description: '' },
        ...['2026-04', '2026-05', '2026-06', '2026-07'].flatMap((m, i) => [gasto(`a${i}`, 'mercado', m, 50000), gasto(`b${i}`, 'x1', m, i === 0 ? 90000 : 10000), gasto(`c${i}`, 'x2', m, 5000)]), // x1 tem um mês fora do comum
      ],
    }));
  }, { img: IMG, script: SCRIPT });
  await page.goto(APP);
  await irParaAba(page, 'Orçamento');
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  const painel = page.locator('#sugestao');
  await expect(painel).toContainText('<img src=x onerror');
  await expect(painel).toContainText('num mês fora do comum'); // a mensagem de gasto atípico também mostra o nome
  await expect(painel.locator('img, script')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss), 'nenhum nome de categoria ou de meta pode executar código').toBe(0);
});

test('nome de categoria com HTML também é só texto na mensagem "Para rever primeiro" do déficit', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((nome) => {
    const gasto = (id, categoryId, mes, amount) => ({ id, type: 'expense', categoryId, amount, date: `${mes}-10`, description: '' });
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      categories: [{ id: 'x2', name: nome, type: 'expense', bucket: 'estilo', kind: 'fixa' }],
      transactions: [
        { id: 'r', type: 'income', amount: 100000, date: '2026-09-02', categoryId: 'salario', description: '' },
        ...['2026-06', '2026-07'].flatMap((m, i) => [gasto(`a${i}`, 'moradia', m, 120000), gasto(`b${i}`, 'x2', m, 10000)]),
      ],
    }));
  }, IMG);
  await page.goto(APP);
  await irParaAba(page, 'Orçamento');
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await expect(page.locator('#sugestao')).toContainText('Para rever primeiro');
  await expect(page.locator('#sugestao img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss)).toBe(0);
});

test('nome de meta com HTML aparece como texto no painel "Movimentar" e nas mensagens, e não executa', async ({ page }) => {
  const malicioso = '<img src=x onerror="window.__invadido=1"><b>Viagem</b>';
  await page.goto(APP);
  await irParaAba(page, 'Metas');
  await page.locator('#goal-form').getByLabel('Nome').fill(malicioso);
  await page.locator('#goal-form').getByLabel('Valor total (R$)').fill('1000');
  await page.locator('#goal-form').getByLabel('Já guardado (R$)').fill('500');
  await page.locator('#goal-form').getByRole('button', { name: 'Criar meta' }).click();

  await page.locator('#goal-list .goal').getByRole('button', { name: /Movimentar/ }).click();
  const painel = page.getByRole('dialog', { name: /Movimentar/ });
  await expect(painel.getByRole('heading')).toContainText(malicioso); // o texto digitado, literal
  await painel.getByLabel('Valor a guardar').fill('10');
  await painel.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('status')).toContainText('R$ 10,00 adicionados à meta');

  await page.locator('#goal-list .goal').getByRole('button', { name: /Movimentar/ }).click();
  await page.locator('label.pilula', { hasText: 'Tirar' }).click();
  await painel.getByLabel('Valor a tirar').fill('99999');
  await expect(painel).toContainText(`"${malicioso}" só tem`); // mensagem de erro também como texto

  expect(await page.evaluate(() => window.__invadido)).toBeUndefined();
  await expect(painel.locator('img, b')).toHaveCount(0);
});
