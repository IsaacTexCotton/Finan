const { test, expect } = require('@playwright/test');
const { APP, irParaAba, carregarExemplo } = require('./ajuda');

// "Desfazer" também para "Restaurar backup" e "Carregar exemplo" (decisão tomada pela IA com o Isaac
// ausente, 02/10/2026): os dois trocam todos os dados, então guardam uma cópia e a mensagem ganha o
// botão "Desfazer" por 10 segundos. Só quando havia dados a perder: na tela vazia não há o que desfazer.
// Hoje fixo em 20/09/2026.

const ATUAIS = {
  version: 1,
  transactions: [
    { id: 'p1', type: 'expense', categoryId: 'mercado', amount: 2590, date: '2026-09-02', description: 'Padaria' },
    { id: 'p2', type: 'expense', categoryId: 'mercado', amount: 5000, date: '2026-09-03', description: 'Feira' },
  ],
  goals: [{ id: 'm1', name: 'Viagem', target: 600000, saved: 0, deadline: '' }],
};
const BACKUP = {
  version: 1,
  transactions: [{ id: 'b1', type: 'expense', categoryId: 'moradia', amount: 90000, date: '2026-09-05', description: 'Aluguel' }],
};

async function abrir(page, dados) {
  await page.clock.install({ time: new Date('2026-09-20T12:00:00') });
  if (dados) await page.addInitScript((d) => localStorage.setItem('finan:data', JSON.stringify(d)), dados);
  await page.goto(APP);
  page.on('dialog', (d) => d.accept());
}

const desfazer = (page) => page.getByRole('button', { name: 'Desfazer' });
const aviso = (page) => page.getByRole('status');
const dadosSalvos = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('finan:data')));
const restaurar = (page, backup) => page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });

test('restaurar um backup pode ser desfeito: voltam os dados de antes', async ({ page }) => {
  await abrir(page, ATUAIS);
  await irParaAba(page, 'Método');
  await restaurar(page, BACKUP);
  await expect(aviso(page)).toContainText('Backup restaurado.');
  expect((await dadosSalvos(page)).transactions.map((t) => t.id)).toEqual(['b1']);

  await desfazer(page).click();
  await expect(aviso(page)).toContainText('Restauração do backup desfeita.');
  const depois = await dadosSalvos(page);
  expect(depois.transactions.map((t) => t.id)).toEqual(['p1', 'p2']);
  expect(depois.goals.map((g) => g.id)).toEqual(['m1']);
});

test('carregar o exemplo por cima de dados pode ser desfeito', async ({ page }) => {
  await abrir(page, ATUAIS);
  await irParaAba(page, 'Método');
  await page.getByRole('button', { name: 'Carregar exemplo' }).click();
  await expect(aviso(page)).toContainText('Dados de exemplo carregados.');
  expect((await dadosSalvos(page)).transactions.length).toBeGreaterThan(2);

  await desfazer(page).click();
  await expect(aviso(page)).toContainText('Dados de exemplo desfeitos.');
  const depois = await dadosSalvos(page);
  expect(depois.transactions.map((t) => t.id)).toEqual(['p1', 'p2']);
  expect(depois.goals.map((g) => g.id)).toEqual(['m1']);
});

test('na tela vazia, "Ver com dados de exemplo" não traz botão Desfazer (não havia nada a perder)', async ({ page }) => {
  await abrir(page);
  await carregarExemplo(page);
  await expect(aviso(page)).toContainText('Dados de exemplo carregados.');
  await expect(desfazer(page)).toHaveCount(0);
});

test('depois de desfazer uma exclusão, a mensagem continua sendo "Exclusão desfeita."', async ({ page }) => {
  await abrir(page, ATUAIS);
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir Padaria/ }).click();
  await desfazer(page).click();
  await expect(aviso(page)).toContainText('Exclusão desfeita.');
});

test('um arquivo de backup inválido não traz botão Desfazer nem muda nada', async ({ page }) => {
  await abrir(page, ATUAIS);
  await irParaAba(page, 'Método');
  await page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from('isto não é json') });
  await expect(aviso(page)).toContainText('Arquivo de backup inválido.');
  await expect(desfazer(page)).toHaveCount(0);
  expect((await dadosSalvos(page)).transactions.map((t) => t.id)).toEqual(['p1', 'p2']);
});

test('quem só tem metas e limites (sem lançamentos) também pode desfazer ao carregar o exemplo', async ({ page }) => {
  // O exemplo não pergunta nada nesse caso, e as metas e os limites seriam perdidos sem aviso.
  await abrir(page, { version: 1, transactions: [], goals: ATUAIS.goals, budgets: { mercado: 50000 } });
  await irParaAba(page, 'Método');
  await page.getByRole('button', { name: 'Carregar exemplo' }).click();
  await desfazer(page).click();
  const depois = await dadosSalvos(page);
  expect(depois.goals.map((g) => g.id)).toEqual(['m1']);
  expect(depois.budgets).toEqual({ mercado: 50000 });
  expect(depois.transactions).toEqual([]);
});
