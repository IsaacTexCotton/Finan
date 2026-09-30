const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// A pessoa escolhe o dia da revisão semanal (padrão: domingo). No dia, e depois dele, o Painel
// lembra enquanto a revisão da semana não estiver completa. Qualquer dia continua valendo para fazê-la.
// Semana de teste: segunda 21/09 a domingo 27/09/2026.

const DADOS = {
  version: 1,
  transactions: [{ id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' }],
};

async function abrir(page, dia, dados = DADOS) {
  await page.clock.setFixedTime(new Date(`2026-09-${dia}T12:00:00`));
  await page.addInitScript((d) => { if (!localStorage.getItem('finan:data')) localStorage.setItem('finan:data', JSON.stringify(d)); }, dados);
  await page.goto(APP);
}

const lembrete = (page) => page.locator('#review-reminder');

test('no domingo (padrão) o Painel lembra e o botão leva à revisão', async ({ page }) => {
  await abrir(page, '27');
  await expect(lembrete(page)).toContainText('Hoje é o seu dia de revisão semanal');
  await lembrete(page).getByRole('button', { name: 'Fazer a revisão' }).click();
  await expect(page.getByRole('tab', { name: 'Método' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: /Revisão semanal/ })).toBeFocused();
});

test('completar a revisão tira o lembrete', async ({ page }) => {
  await abrir(page, '27');
  await page.getByRole('tab', { name: 'Método' }).click();
  for (const caixa of await page.locator('#review-list input[type=checkbox]').all()) await caixa.check();
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(lembrete(page)).toBeEmpty();
});

test('antes do dia escolhido não lembra; depois dele, avisa que está atrasada', async ({ page }) => {
  await abrir(page, '26'); // sábado, com o domingo de padrão
  await expect(lembrete(page)).toBeEmpty();

  await page.getByRole('tab', { name: 'Método' }).click();
  await page.getByLabel('Meu dia de revisão').selectOption({ label: 'Sexta-feira' });
  await expect(page.getByRole('status')).toContainText('Dia da revisão atualizado');
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(lembrete(page)).toContainText('Sua revisão semanal desta semana ainda não foi feita');
});

test('escolher o próprio dia de hoje faz o lembrete aparecer', async ({ page }) => {
  await abrir(page, '26');
  await page.getByRole('tab', { name: 'Método' }).click();
  await page.getByLabel('Meu dia de revisão').selectOption({ label: 'Sábado' });
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(lembrete(page)).toContainText('Hoje é o seu dia de revisão semanal');
});

test('sem nenhum lançamento ainda, não lembra (quem chega agora vê as boas-vindas)', async ({ page }) => {
  await abrir(page, '27', { version: 1 });
  await expect(lembrete(page)).toBeEmpty();
});
