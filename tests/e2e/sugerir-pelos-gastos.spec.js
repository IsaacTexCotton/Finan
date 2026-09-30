const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// "Sugerir pelos meus gastos": a sugestão parte do que a pessoa realmente gastou nos meses anteriores
// (média das variáveis, valor pago nas fixas) e, para o Futuro, da parte do plano. Sem histórico de
// meses anteriores ou sem renda, não inventa números.
// Hoje fixo em 20/09/2026. Renda de setembro R$ 3.000; junho e julho têm gastos.

const HISTORICO = {
  version: 1,
  transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
    { id: 'a1', type: 'expense', categoryId: 'mercado', amount: 55000, date: '2026-06-10', description: '' },
    { id: 'a2', type: 'expense', categoryId: 'mercado', amount: 60000, date: '2026-07-10', description: '' },
    { id: 'a3', type: 'expense', categoryId: 'moradia', amount: 100000, date: '2026-06-05', description: '' },
    { id: 'a4', type: 'expense', categoryId: 'moradia', amount: 120000, date: '2026-07-05', description: '' },
  ],
};

async function abrir(page, dados) {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((d) => localStorage.setItem('finan:data', JSON.stringify(d)), dados);
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
}

test('sugere a média das variáveis, o valor das fixas e o Futuro pelo plano', async ({ page }) => {
  await abrir(page, HISTORICO);
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await expect(page.getByRole('status')).toContainText('Orçamento sugerido pela média dos últimos 2 meses');

  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('580,00'); // média de 550 e 600, arredondada para cima
  await expect(page.getByLabel('Limite para Moradia')).toHaveValue('1200,00'); // fixa: o valor mais recente
  await expect(page.getByLabel('Limite para Lazer')).toHaveValue(''); // nunca gastou: sem limite inventado
  await expect(page.getByLabel('Limite para Reserva de emergência')).toHaveValue('150,00'); // Futuro: 20% de R$ 3.000 ÷ 4
});

test('com limites já definidos, pergunta antes de substituir', async ({ page }) => {
  await abrir(page, { ...HISTORICO, budgets: { mercado: 99000 } });
  let pergunta = '';
  page.on('dialog', (d) => { pergunta = d.message(); d.dismiss(); });
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await expect.poll(() => pergunta).toContain('Substituir os limites atuais pela sugestão baseada nos seus gastos');
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('990,00'); // recusou: nada mudou
});

test('sem gastos de meses anteriores, pergunta em vez de inventar números', async ({ page }) => {
  await abrir(page, { version: 1, transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
    { id: 'a1', type: 'expense', categoryId: 'mercado', amount: 50000, date: '2026-09-08', description: '' },
  ] });
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await expect(page.getByRole('heading', { name: 'Conte quanto você gasta por mês' })).toBeVisible();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue(''); // nenhum número foi inventado
});

test('sem renda, pede a renda primeiro', async ({ page }) => {
  await abrir(page, { version: 1, transactions: [{ id: 'a1', type: 'expense', categoryId: 'mercado', amount: 50000, date: '2026-08-08', description: '' }] });
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await expect(page.getByRole('status')).toContainText('Lance sua renda primeiro');
});

test('a tela explica de onde vêm os valores sugeridos', async ({ page }) => {
  await abrir(page, HISTORICO);
  await expect(page.locator('#tab-orcamento')).toContainText('usa a média dos seus últimos 3 meses');
  await expect(page.locator('#tab-orcamento')).toContainText('nas categorias fixas, o valor que você pagou');
});
