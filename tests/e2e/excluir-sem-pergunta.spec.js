const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// Excluir um lançamento ou uma meta não pergunta "tem certeza?" (decisão tomada pela IA com o Isaac
// ausente, 02/10/2026, a partir do item do BACKLOG): o botão "Desfazer" (10 segundos) cobre o engano e
// poupa um toque no dia a dia. Continuam perguntando: a compra parcelada (é uma escolha: todas as
// parcelas ou só esta), "Apagar tudo" e "Restaurar backup". Hoje fixo em 20/09/2026.

let perguntas;

test.beforeEach(async ({ page }) => {
  perguntas = [];
  page.on('dialog', (d) => { perguntas.push(d.message()); d.dismiss(); }); // se alguma janela abrir, o teste registra
  await page.clock.install({ time: new Date('2026-09-20T12:00:00') });
  await page.addInitScript(() => {
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      transactions: [
        { id: 'p1', type: 'expense', categoryId: 'mercado', amount: 2590, date: '2026-09-02', description: 'Padaria' },
        { id: 'tv1', type: 'expense', categoryId: 'compras', amount: 20000, date: '2026-09-10', description: 'Geladeira', installment: { group: 'gtv', n: 1, of: 3 } },
        { id: 'tv2', type: 'expense', categoryId: 'compras', amount: 20000, date: '2026-10-10', description: 'Geladeira', installment: { group: 'gtv', n: 2, of: 3 } },
        { id: 'tv3', type: 'expense', categoryId: 'compras', amount: 20000, date: '2026-11-10', description: 'Geladeira', installment: { group: 'gtv', n: 3, of: 3 } },
      ],
      goals: [{ id: 'm1', name: 'Viagem', target: 600000, saved: 0, deadline: '' }],
    }));
  });
  await page.goto(APP);
});

const desfazer = (page) => page.getByRole('button', { name: 'Desfazer' });
const dadosSalvos = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('finan:data')));

test('excluir um lançamento simples apaga na hora, sem janela de pergunta, e dá para desfazer', async ({ page }) => {
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir Padaria/ }).click();
  await expect(page.getByRole('status')).toContainText('Lançamento excluído.');
  expect(perguntas).toEqual([]);
  expect((await dadosSalvos(page)).transactions.map((t) => t.id)).not.toContain('p1');
  await expect(desfazer(page)).toBeVisible();
  await desfazer(page).click();
  expect((await dadosSalvos(page)).transactions.map((t) => t.id)).toContain('p1');
});

test('excluir uma meta apaga na hora, sem janela de pergunta, e dá para desfazer', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await page.getByRole('button', { name: 'Excluir meta Viagem' }).click();
  await expect(page.getByRole('status')).toContainText('Meta excluída.');
  expect(perguntas).toEqual([]);
  expect((await dadosSalvos(page)).goals).toEqual([]);
  await desfazer(page).click();
  expect((await dadosSalvos(page)).goals.map((g) => g.id)).toEqual(['m1']);
});

test('compra parcelada continua perguntando (é uma escolha: todas as parcelas ou só esta)', async ({ page }) => {
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir Geladeira/ }).click();
  expect(perguntas[0]).toContain('Excluir todas as parcelas?');
  expect((await dadosSalvos(page)).transactions.filter((t) => t.installment)).toHaveLength(3); // dispensou: nada mudou
});

test('"Apagar tudo" continua perguntando antes', async ({ page }) => {
  await irParaAba(page, 'Método');
  await page.getByRole('button', { name: 'Apagar tudo' }).click();
  expect(perguntas[0]).toContain('Apagar TODOS os lançamentos');
  expect((await dadosSalvos(page)).transactions).toHaveLength(4);
});
