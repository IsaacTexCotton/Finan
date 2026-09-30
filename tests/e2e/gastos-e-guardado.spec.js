const { test, expect } = require('@playwright/test');
const { APP, lancar } = require('./ajuda');

// Gastar e guardar são coisas diferentes: o Painel mostra quatro números que somam a renda.
//   Receitas = Gastos (essenciais + estilo de vida) + Guardado (futuro) + Sobrou

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
});

const cartao = (page, nome) => page.locator('#summary-cards .card').filter({ hasText: nome });

test('o Painel separa Gastos, Guardado e Sobrou, e os três somam a renda', async ({ page }) => {
  await lancar(page, { tipo: 'Receita', valor: '5000', categoria: 'salario', descricao: 'Salário' });
  await lancar(page, { tipo: 'Despesa', valor: '1500', categoria: 'moradia', descricao: 'Aluguel' });
  await lancar(page, { tipo: 'Despesa', valor: '800', categoria: 'mercado', descricao: 'Mercado' });
  await lancar(page, { tipo: 'Despesa', valor: '400', categoria: 'lazer', descricao: 'Cinema' });
  await lancar(page, { tipo: 'Despesa', valor: '600', categoria: 'investimentos', descricao: 'Aporte' });
  await lancar(page, { tipo: 'Despesa', valor: '300', categoria: 'reserva', descricao: 'Reserva' });
  await page.getByRole('tab', { name: 'Painel' }).click();

  await expect(cartao(page, 'Receitas')).toContainText(/R\$\s5\.000,00/);
  await expect(cartao(page, 'Gastos')).toContainText(/R\$\s2\.700,00/); // não inclui os R$ 900 guardados
  await expect(cartao(page, 'Guardado')).toContainText(/R\$\s900,00/);
  await expect(cartao(page, 'Guardado')).toContainText('18% da renda');
  await expect(cartao(page, 'Sobrou')).toContainText(/R\$\s1\.400,00/);

  // quatro cartões, e os nomes antigos (que misturavam gasto e guardado) não existem mais
  await expect(page.locator('#summary-cards .card')).toHaveCount(4);
  await expect(page.locator('#summary-cards')).not.toContainText(/Despesas|Saldo|Taxa de poupança/);
});

test('sobrar dinheiro na conta não conta como guardado e não recebe elogio', async ({ page }) => {
  await lancar(page, { tipo: 'Receita', valor: '2800', categoria: 'salario', descricao: 'Salário' });
  await lancar(page, { tipo: 'Despesa', valor: '350', categoria: 'mercado', descricao: 'Mercado' });
  await page.getByRole('tab', { name: 'Painel' }).click();

  await expect(cartao(page, 'Guardado')).toContainText(/R\$\s0,00/);
  await expect(cartao(page, 'Guardado')).toContainText('0% da renda');
  await expect(cartao(page, 'Sobrou')).toContainText(/R\$\s2\.450,00/);
  await expect(page.locator('#insights')).not.toContainText('Excelente'); // antes dizia "Excelente!" com R$ 0 guardados
  await expect(page.locator('#insights')).toContainText(/Você guardou R\$\s0,00/);
});

test('cada cartão explica o que conta, em linguagem simples', async ({ page }) => {
  await expect(cartao(page, 'Gastos')).toContainText('essenciais + estilo de vida');
  await expect(cartao(page, 'Guardado')).toContainText('meta: 20% ou mais');
  await expect(cartao(page, 'Sobrou')).toContainText('renda menos o que gastou e guardou');
});
