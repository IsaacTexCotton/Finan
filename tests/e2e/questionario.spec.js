const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Quem ainda não tem gastos de meses anteriores responde um questionário simples (valores aproximados
// por mês) em vez de receber números inventados. Essenciais e Estilo de vida vêm das respostas;
// o Futuro vem da parte do plano. Hoje fixo em 20/09/2026; renda de setembro R$ 3.000.

const SEM_HISTORICO = {
  version: 1,
  transactions: [{ id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' }],
};

async function abrir(page, dados = SEM_HISTORICO) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((d) => localStorage.setItem('finan:data', JSON.stringify(d)), dados);
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
}

const questionario = (page) => page.locator('#budget-quiz');
const sugerir = (page) => page.getByRole('button', { name: 'Sugerir pelos meus gastos' });

test('sem histórico, "Sugerir" abre o questionário com o foco no título, e não inventa números', async ({ page }) => {
  await abrir(page);
  await expect(questionario(page)).toBeHidden();
  await sugerir(page).click();
  await expect(questionario(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conte quanto você gasta por mês' })).toBeFocused();
  await expect(questionario(page)).toContainText('Deixe em branco o que você não gasta');
  await expect(questionario(page).getByLabel('Moradia')).toBeVisible();
  await expect(questionario(page).getByLabel('Mercado')).toBeVisible();
  await expect(questionario(page).getByLabel('Lazer')).toBeVisible();
  await expect(questionario(page).getByLabel('Reserva de emergência')).toHaveCount(0); // o Futuro vem do plano
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue(''); // nada foi preenchido sozinho
});

test('responder cria os limites: os valores informados e o Futuro pelo plano', async ({ page }) => {
  await abrir(page);
  await sugerir(page).click();
  await questionario(page).getByLabel('Moradia').fill('1.200,00');
  await questionario(page).getByLabel('Mercado').fill('600');
  await questionario(page).getByRole('button', { name: 'Criar meu orçamento' }).click();

  await expect(page.getByRole('status')).toContainText('Orçamento criado com os valores que você informou');
  await expect(questionario(page)).toBeHidden();
  await expect(page.getByLabel('Limite para Moradia')).toHaveValue('1200,00');
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('600,00');
  await expect(page.getByLabel('Limite para Lazer')).toHaveCount(0); // em branco: sem limite, e o Lazer nem aparece na lista
  await expect(page.getByLabel('Limite para Reserva de emergência')).toHaveValue('200,00'); // 20% de R$ 3.000 ÷ 3 (a dívida saiu do Futuro)
});

test('valor inválido mostra o erro no lugar, leva o foco ao campo e não salva nada', async ({ page }) => {
  await abrir(page);
  await sugerir(page).click();
  await questionario(page).getByLabel('Mercado').fill('abc');
  await questionario(page).getByRole('button', { name: 'Criar meu orçamento' }).click();
  await expect(page.locator('#quiz-error')).toContainText('Valor inválido em Mercado');
  await expect(questionario(page).getByLabel('Mercado')).toBeFocused();
  await expect(questionario(page)).toBeVisible();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('');
});

test('sem nenhuma resposta, pede pelo menos um valor', async ({ page }) => {
  await abrir(page);
  await sugerir(page).click();
  await questionario(page).getByRole('button', { name: 'Criar meu orçamento' }).click();
  await expect(page.locator('#quiz-error')).toContainText('Informe o valor de pelo menos uma categoria');
  await expect(questionario(page)).toBeVisible();
});

test('"Agora não" fecha o questionário, devolve o foco ao botão e não muda o orçamento', async ({ page }) => {
  await abrir(page);
  await sugerir(page).click();
  await questionario(page).getByLabel('Mercado').fill('600');
  await questionario(page).getByRole('button', { name: 'Agora não' }).click();
  await expect(questionario(page)).toBeHidden();
  await expect(sugerir(page)).toBeFocused();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('');
});

test('com limites já definidos, pergunta antes de substituir', async ({ page }) => {
  await abrir(page, { ...SEM_HISTORICO, budgets: { mercado: 99000 } });
  let pergunta = '';
  page.on('dialog', (d) => { pergunta = d.message(); d.dismiss(); });
  await sugerir(page).click();
  await questionario(page).getByLabel('Mercado').fill('600');
  await questionario(page).getByRole('button', { name: 'Criar meu orçamento' }).click();
  await expect.poll(() => pergunta).toContain('Substituir os limites atuais pelos valores que você informou');
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('990,00'); // recusou: nada mudou
  await expect(questionario(page)).toBeVisible(); // e pode corrigir as respostas
});

test('sem renda não abre o questionário: pede a renda primeiro', async ({ page }) => {
  await abrir(page, { version: 1 });
  await sugerir(page).click();
  await expect(page.getByRole('status')).toContainText('Lance sua renda primeiro');
  await expect(questionario(page)).toBeHidden();
});

test('com histórico de meses anteriores a sugestão vem direto, sem questionário', async ({ page }) => {
  await abrir(page, { ...SEM_HISTORICO, transactions: [...SEM_HISTORICO.transactions, { id: 'a1', type: 'expense', categoryId: 'mercado', amount: 60000, date: '2026-08-10', description: '' }] });
  await sugerir(page).click();
  await expect(questionario(page)).toBeHidden();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('600,00');
});

test('no celular o questionário não rola para o lado e os campos têm alvo de toque', async ({ page }) => {
  await abrir(page);
  await sugerir(page).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const campo = await questionario(page).getByLabel('Mercado').boundingBox();
  expect(campo.height).toBeGreaterThanOrEqual(44);
});
