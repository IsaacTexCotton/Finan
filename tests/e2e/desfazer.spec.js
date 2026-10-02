const { test, expect } = require('@playwright/test');
const { APP, irParaAba, lancar } = require('./ajuda');

// "Desfazer ao excluir" (decisão do Isaac, 01/10/2026): depois de excluir, a mensagem ganha um botão
// "Desfazer" por 10 segundos. Antes de excluir o app guarda uma cópia dos dados; desfazer devolve essa
// cópia. O botão some assim que qualquer outra coisa muda nos dados. Foco: celular (sem atalho de teclado).
// Hoje fixo em 20/09/2026.

const MESES = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08'];

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-20T12:00:00') });
  await page.addInitScript((meses) => {
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      transactions: [
        { id: 'p1', type: 'expense', categoryId: 'mercado', amount: 2590, date: '2026-09-02', description: 'Padaria' },
        { id: 'p2', type: 'expense', categoryId: 'mercado', amount: 5000, date: '2026-09-03', description: 'Feira' },
        ...meses.map((m, i) => ({ id: `tv${i + 1}`, type: 'expense', categoryId: 'compras', amount: 20000, date: `${m}-10`, description: 'Geladeira', installment: { group: 'gtv', n: i + 1, of: 12 } })),
      ],
      budgets: { mercado: 50000 },
      goals: [
        { id: 'm1', name: 'Reserva de emergência', target: 100000, saved: 0, deadline: '' },
        { id: 'm2', name: 'Viagem', target: 600000, saved: 0, deadline: '' },
        { id: 'm3', name: 'Notebook', target: 500000, saved: 0, deadline: '' },
      ],
    }));
  }, MESES);
  await page.goto(APP);
  page.on('dialog', (d) => d.accept());
});

const desfazer = (page) => page.getByRole('button', { name: 'Desfazer' });
const aviso = (page) => page.getByRole('status');
const item = (page, texto) => page.locator('.tx').filter({ hasText: texto });
const dadosSalvos = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('finan:data')));

test('depois de excluir um lançamento, "Desfazer" devolve o lançamento e o botão some', async ({ page }) => {
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir.*Padaria/ }).click();
  await expect(aviso(page)).toContainText('Lançamento excluído.');
  await expect(desfazer(page)).toBeVisible();
  await expect(item(page, 'Padaria')).toHaveCount(0);

  await desfazer(page).click();
  await expect(aviso(page)).toContainText('Exclusão desfeita.');
  await expect(item(page, 'Padaria')).toContainText(/R\$\s25,90/);
  await expect(desfazer(page)).toHaveCount(0);
  expect((await dadosSalvos(page)).transactions.map((t) => t.id)).toContain('p1'); // e volta a ficar salvo
});

test('excluir todas as parcelas de uma compra e desfazer devolve as 12 parcelas', async ({ page }) => {
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir.*Geladeira/ }).click(); // o app pergunta "todas as parcelas?" e a janela aceita
  await expect(aviso(page)).toContainText('12 parcelas excluídas.');
  expect((await dadosSalvos(page)).transactions.filter((t) => t.installment)).toHaveLength(0);

  await desfazer(page).click();
  expect((await dadosSalvos(page)).transactions.filter((t) => t.installment)).toHaveLength(12);
  await expect(item(page, 'Geladeira')).toHaveCount(1); // em setembro aparece a 1ª parcela
});

test('excluir uma meta e desfazer devolve a meta no mesmo lugar da lista', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await page.getByRole('button', { name: 'Excluir meta Viagem' }).click();
  await expect(aviso(page)).toContainText('Meta excluída.');
  await expect(page.locator('#goal-list .goal').filter({ hasText: 'Viagem' })).toHaveCount(0);

  await desfazer(page).click();
  await expect(page.locator('#goal-list .goal').filter({ hasText: 'Viagem' })).toHaveCount(1);
  expect((await dadosSalvos(page)).goals.map((g) => g.id)).toEqual(['m1', 'm2', 'm3']);
});

test('o botão "Desfazer" some quando outra coisa muda nos dados, e o que mudou não é desfeito', async ({ page }) => {
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir.*Padaria/ }).click();
  await expect(desfazer(page)).toBeVisible();

  await lancar(page, { tipo: 'Despesa', valor: '10', categoria: 'lazer', descricao: 'Cinema' });
  await expect(page.getByRole('status')).toContainText('lançada');
  await expect(desfazer(page)).toHaveCount(0);
  await expect(item(page, 'Cinema')).toHaveCount(1);
  await expect(item(page, 'Padaria')).toHaveCount(0); // continua excluída: já não há como desfazer às cegas
});

test('o botão "Desfazer" fica 10 segundos e depois some, e a exclusão fica valendo', async ({ page }) => {
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir.*Padaria/ }).click();
  await expect(desfazer(page)).toBeVisible();
  await page.clock.fastForward(5000);
  await expect(desfazer(page)).toBeVisible(); // ainda dá tempo
  await page.clock.fastForward(5500);
  await expect(desfazer(page)).toHaveCount(0);
  await expect(item(page, 'Padaria')).toHaveCount(0);
});

test('no celular o botão "Desfazer" é fácil de tocar e fica acima do "+ Lançar"', async ({ page }) => {
  await irParaAba(page, 'Metas');
  await page.getByRole('button', { name: 'Excluir meta Viagem' }).click();
  const botao = desfazer(page);
  await expect(botao).toBeVisible();
  await page.locator('#toast').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished))); // espera a mensagem parar de subir
  const caixaBotao = await botao.boundingBox();
  const caixaAviso = await page.locator('#toast').boundingBox();
  const caixaFab = await page.getByRole('button', { name: '+ Lançar' }).boundingBox();
  expect(caixaBotao.height, 'alvo de toque de 44px').toBeGreaterThanOrEqual(44);
  expect(caixaBotao.width).toBeGreaterThanOrEqual(44);
  expect(caixaAviso.y + caixaAviso.height, 'a mensagem termina acima do + Lançar').toBeLessThanOrEqual(caixaFab.y);
  expect(caixaBotao.x + caixaBotao.width).toBeLessThanOrEqual(page.viewportSize().width);
});

test('uma mudança silenciosa nos dados (marcar a revisão semanal) também tira o botão "Desfazer"', async ({ page }) => {
  // Sem mensagem nova para trocar a antiga, o botão ficaria na tela e desfazer apagaria também a marcação.
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir.*Padaria/ }).click();
  await expect(desfazer(page)).toBeVisible();

  await irParaAba(page, 'Método');
  await page.locator('#review-list').getByLabel(/Conferi se todos os gastos da semana/).check();
  await expect(desfazer(page)).toHaveCount(0);
  await irParaAba(page, 'Lançamentos');
  await expect(item(page, 'Padaria')).toHaveCount(0);
});

test('o texto do botão "Desfazer" tem contraste de pelo menos 4,5:1 com a mensagem (o axe não confere esta mensagem)', async ({ page }) => {
  await irParaAba(page, 'Lançamentos');
  await page.getByRole('button', { name: /Excluir.*Padaria/ }).click();
  await expect(desfazer(page)).toBeVisible();
  const razao = await page.evaluate(() => {
    const canal = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const luz = (css) => { const [r, g, b] = css.match(/\d+(\.\d+)?/g).map(Number); return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b); };
    const texto = luz(getComputedStyle(document.querySelector('#toast .toast-btn')).color);
    const fundo = luz(getComputedStyle(document.querySelector('#toast')).backgroundColor);
    return (Math.max(texto, fundo) + 0.05) / (Math.min(texto, fundo) + 0.05);
  });
  expect(razao).toBeGreaterThanOrEqual(4.5);
});
