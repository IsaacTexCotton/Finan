const { test, expect } = require('@playwright/test');
const { APP, lancar } = require('./ajuda');

// Ao salvar um gasto, a mensagem diz quanto a pessoa ainda pode gastar hoje (decisão tomada com o
// Isaac ausente, 02/10/2026): o mesmo número do cartão "Você pode gastar hoje" do Painel, já com o
// gasto novo. Só para despesas que não são guardar, e só se o cartão existe.
// Hoje fixo em 20/09/2026 (11 dias até o fim do mês). Salário R$ 3.000, envelope de mercado de
// R$ 600 com R$ 100 gastos: os envelopes têm R$ 500 livres (R$ 45,45 por dia).

const BASE = {
  version: 1,
  transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
    { id: 'g1', type: 'expense', categoryId: 'mercado', amount: 10000, date: '2026-09-10', description: 'Feira' },
  ],
  budgets: { mercado: 60000 },
};

async function abrir(page, dados = BASE) {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((d) => { if (!localStorage.getItem('finan:data')) localStorage.setItem('finan:data', JSON.stringify(d)); }, dados);
  await page.goto(APP);
}

const aviso = (page) => page.getByRole('status');

test('salvar um gasto diz quanto ainda pode gastar hoje', async ({ page }) => {
  await abrir(page);
  await lancar(page, { tipo: 'Despesa', valor: '55', categoria: 'mercado', descricao: 'Padaria' });
  // sobram R$ 445 nos envelopes: 445 ÷ 11 dias
  await expect(aviso(page)).toHaveText(/^Despesa de R\$\s55,00 lançada\. Você ainda pode gastar R\$\s40,45 hoje\.$/);
});

test('o valor da mensagem é o mesmo do cartão "Você pode gastar hoje" do Painel', async ({ page }) => {
  await abrir(page);
  await lancar(page, { tipo: 'Despesa', valor: '55', categoria: 'mercado', descricao: 'Padaria' });
  const mensagem = await aviso(page).textContent();
  await page.getByRole('tab', { name: 'Painel' }).click();
  const valorDoCartao = (await page.locator('#allowance .allowance-value').textContent()).trim();
  expect(mensagem).toContain(`Você ainda pode gastar ${valorDoCartao} hoje.`);
});

test('gastar tudo o que havia nos envelopes mostra R$ 0,00, sem número negativo', async ({ page }) => {
  await abrir(page);
  await lancar(page, { tipo: 'Despesa', valor: '800', categoria: 'mercado', descricao: 'Churrasco' });
  await expect(aviso(page)).toHaveText(/Você ainda pode gastar R\$\s0,00 hoje\.$/);
});

test('compra parcelada também diz quanto ainda pode gastar hoje', async ({ page }) => {
  await abrir(page);
  const formulario = page.locator('#tx-form');
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await formulario.getByLabel('Valor (R$)').fill('300');
  await formulario.getByLabel('Categoria').selectOption('mercado');
  await formulario.locator('details.more summary').click();
  await formulario.getByLabel('Parcelas').fill('3');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  await expect(aviso(page)).toHaveText(/Compra de R\$\s300,00 em 3x de R\$\s100,00 lançada\. Você ainda pode gastar R\$\s36,36 hoje\.$/); // R$ 400 ÷ 11
});

test('receita não diz nada sobre quanto pode gastar', async ({ page }) => {
  await abrir(page);
  await lancar(page, { tipo: 'Receita', valor: '100', categoria: 'renda-extra', descricao: 'Bico' });
  await expect(aviso(page)).toHaveText(/^Receita de R\$\s100,00 lançada\.$/);
});

test('guardar dinheiro (balde Futuro) não diz quanto pode gastar', async ({ page }) => {
  await abrir(page);
  page.on('dialog', (d) => d.accept());
  await lancar(page, { tipo: 'Despesa', valor: '100', categoria: 'reserva', descricao: 'Reserva' });
  await expect(aviso(page)).toHaveText(/^Despesa de R\$\s100,00 lançada\.$/);
});

test('sem envelopes variáveis (nenhum limite) não há cartão, então a mensagem não promete nada', async ({ page }) => {
  await abrir(page, { version: 1, transactions: BASE.transactions });
  await lancar(page, { tipo: 'Despesa', valor: '55', categoria: 'mercado', descricao: 'Padaria' });
  await expect(aviso(page)).toHaveText(/^Despesa de R\$\s55,00 lançada\.$/);
});

test('editar um lançamento não repete o número', async ({ page }) => {
  await abrir(page);
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await page.getByRole('button', { name: /Editar.*Feira/ }).click();
  await page.locator('#tx-form').getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(aviso(page)).toHaveText('Lançamento atualizado.');
});

test('gasto de outro mês não diz nada sobre hoje', async ({ page }) => {
  await abrir(page);
  const formulario = page.locator('#tx-form');
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await formulario.getByLabel('Valor (R$)').fill('55');
  await formulario.getByLabel('Categoria').selectOption('mercado');
  await formulario.locator('details.more summary').click();
  await formulario.getByLabel('Data').fill('2026-08-15');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  await expect(aviso(page)).toHaveText(/^Despesa de R\$\s55,00 lançada\.$/);
});
