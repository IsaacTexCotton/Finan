const { test, expect } = require('@playwright/test');
const { APP, lancar } = require('./ajuda');

test('os lançamentos continuam lá depois de recarregar a página', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));

  const cartao = (nome) => page.locator('#summary-cards .card').filter({ hasText: nome });
  const conferirPainel = async () => {
    await page.getByRole('tab', { name: 'Painel' }).click();
    await expect(cartao('Receitas')).toContainText(/R\$\s3\.000,00/);
    await expect(cartao('Despesas')).toContainText(/R\$\s25,90/);
    await expect(cartao('Saldo')).toContainText(/R\$\s2\.974,10/);
    await expect(page.locator('#onboarding')).not.toContainText('Bem-vindo');
  };

  // 1. Lança uma receita e uma despesa
  await page.goto(APP);
  await lancar(page, { tipo: 'Receita', valor: '3.000,00', categoria: 'salario', descricao: 'Salário de teste' });
  await expect(page.getByRole('status')).toContainText(/Receita de R\$\s3\.000,00 lançada/);
  await lancar(page, { tipo: 'Despesa', valor: '25,90', categoria: 'mercado', descricao: 'Padaria do bairro' });
  await expect(page.getByRole('status')).toContainText(/Despesa de R\$\s25,90 lançada/);
  await conferirPainel(); // antes de recarregar, para saber que o problema não é o lançamento

  // 2. Recarrega a página, como o usuário faz ao fechar e abrir o app
  await page.reload();

  // 3. Tudo continua no Painel e na lista de lançamentos
  await conferirPainel();
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(page.locator('.tx').filter({ hasText: 'Salário de teste' })).toContainText(/R\$\s3\.000,00/);
  await expect(page.locator('.tx').filter({ hasText: 'Padaria do bairro' })).toContainText(/R\$\s25,90/);

  expect(erros, 'o app não deve gerar erros de JavaScript').toEqual([]);
});
