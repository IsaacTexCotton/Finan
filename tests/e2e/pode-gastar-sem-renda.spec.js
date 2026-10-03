const { test, expect } = require('@playwright/test');
const { APP, lancar } = require('./ajuda');

// Sem renda lançada no período, o cartão "Você pode gastar hoje" não promete número (decisão do Isaac,
// 03/10/2026): "Lance sua renda para ver quanto pode gastar." e um botão para lançar. Antes dizia "R$ 46"
// com o salário ainda no dia 7, sem dinheiro nenhum recebido. Hoje fixo em 03/10/2026; pagamento no 5º dia útil (07/10).

const MERCADO = { id: 'g1', type: 'expense', categoryId: 'mercado', amount: 37000, date: '2026-10-02', description: '' };
const SALARIO = (data) => ({ id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: data, description: '' });
const COM_PAGAMENTO = { incomeProfile: 'estavel', paydayBusinessDay: 5 };

async function abrir(page, dados) {
  await page.clock.setFixedTime(new Date('2026-10-03T12:00:00'));
  await page.addInitScript((d) => { if (!localStorage.getItem('finan:data')) localStorage.setItem('finan:data', JSON.stringify(d)); }, dados);
  await page.goto(APP);
}

const cartao = (page) => page.locator('#allowance');

test('com o salário no dia 7 (ainda não recebido), o cartão não promete número e pede a renda', async ({ page }) => {
  await abrir(page, { version: 1, settings: COM_PAGAMENTO, budgets: { mercado: 60000 }, transactions: [SALARIO('2026-10-07'), MERCADO] });
  await expect(cartao(page).locator('.card-label')).toHaveText('Você pode gastar hoje');
  await expect(cartao(page).locator('.allowance-value')).toHaveCount(0);
  await expect(cartao(page)).toContainText('Lance sua renda para ver quanto pode gastar.');
  await expect(cartao(page)).not.toContainText(/R\$\s/);
  await expect(cartao(page).getByRole('button', { name: 'Lançar renda' })).toBeVisible();
});

test('sem o dia de pagamento, um mês sem nenhuma renda também não promete número', async ({ page }) => {
  await abrir(page, { version: 1, budgets: { mercado: 60000 }, transactions: [MERCADO] });
  await expect(cartao(page).locator('.allowance-value')).toHaveCount(0);
  await expect(cartao(page)).toContainText('Lance sua renda para ver quanto pode gastar.');
});

test('com renda no período, o cartão continua mostrando o número', async ({ page }) => {
  await abrir(page, { version: 1, settings: COM_PAGAMENTO, budgets: { mercado: 60000 }, transactions: [SALARIO('2026-10-03'), MERCADO] });
  await expect(cartao(page).locator('.allowance-value')).toHaveText(/R\$\s57,50/); // R$ 230 ÷ 4 dias
  await expect(cartao(page)).not.toContainText('Lance sua renda');
});

test('"Lançar renda" abre o formulário já como Receita', async ({ page }) => {
  await abrir(page, { version: 1, settings: COM_PAGAMENTO, budgets: { mercado: 60000 }, transactions: [SALARIO('2026-10-07'), MERCADO] });
  await cartao(page).getByRole('button', { name: 'Lançar renda' }).click();
  await expect(page.locator('#tx-form').getByRole('radio', { name: 'Receita' })).toBeChecked();
});

test('editar a data do salário de hoje para o dia 7, pela tela, tira o número do cartão', async ({ page }) => {
  await abrir(page, { version: 1, settings: COM_PAGAMENTO, budgets: { mercado: 60000 }, transactions: [SALARIO('2026-10-03'), MERCADO] });
  await expect(cartao(page).locator('.allowance-value')).toBeVisible();
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await page.getByRole('button', { name: /Editar.*Salário/ }).click();
  const formulario = page.locator('#tx-form');
  await expect(formulario.locator('details.more')).toHaveJSProperty('open', true);
  await formulario.getByLabel('Data').fill('2026-10-07');
  await formulario.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(cartao(page).locator('.allowance-value')).toHaveCount(0);
  await expect(cartao(page)).toContainText('Lance sua renda para ver quanto pode gastar.');
});

test('ao salvar um gasto sem renda no período, a mensagem não diz quanto ainda pode gastar', async ({ page }) => {
  await abrir(page, { version: 1, settings: COM_PAGAMENTO, budgets: { mercado: 60000 }, transactions: [SALARIO('2026-10-07')] });
  await lancar(page, { tipo: 'Despesa', valor: '20', categoria: 'mercado', descricao: 'Pão' });
  await expect(page.getByRole('status')).toHaveText(/^Despesa de R\$\s20,00 lançada\.$/);
});
