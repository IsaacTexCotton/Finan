const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// Visual da tela Metas: reserva de emergência legível e cada meta num cartão.

test.use({ viewport: { width: 320, height: 800 } });

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  await irParaAba(page, 'Metas');
});

test('cada meta é um cartão, separado das outras', async ({ page }) => {
  const metas = page.locator('#goal-list .goal');
  expect(await metas.count()).toBeGreaterThanOrEqual(2);
  const estilo = await metas.first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { borda: parseFloat(s.borderTopWidth), raio: parseFloat(s.borderTopLeftRadius), recuo: parseFloat(s.paddingTop) };
  });
  expect(estilo.borda, 'tem borda').toBeGreaterThanOrEqual(1);
  expect(estilo.raio, 'cantos arredondados').toBeGreaterThan(0);
  expect(estilo.recuo, 'respiro por dentro').toBeGreaterThanOrEqual(8);
  const a = await metas.nth(0).boundingBox();
  const b = await metas.nth(1).boundingBox();
  expect(b.y - (a.y + a.height), 'espaço entre os cartões').toBeGreaterThanOrEqual(8);
});

test('no cartão, o nome vem em cima, os valores logo abaixo e as ações numa linha própria', async ({ page }) => {
  const meta = page.locator('#goal-list .goal').filter({ hasText: 'Viagem de férias' });
  const nome = await meta.locator('strong').boundingBox();
  const valores = await meta.locator('.goal-head span').boundingBox();
  const progresso = await meta.locator('.goal-foot > span').first().boundingBox();
  const acoes = await meta.locator('.goal-foot .actions').boundingBox();
  expect(nome.y + nome.height, 'valores abaixo do nome').toBeLessThanOrEqual(valores.y + 1);
  expect(acoes.y, 'ações abaixo do texto de progresso').toBeGreaterThanOrEqual(progresso.y + progresso.height - 1);
});

test('a barra de progresso da meta é grossa o bastante para ver', async ({ page }) => {
  const altura = (await page.locator('#goal-list .goal .bar').first().boundingBox()).height;
  expect(altura).toBeGreaterThanOrEqual(10);
});

test('as listas da reserva mostram o texto das opções inteiro, sem cortar, em 320px', async ({ page }) => {
  for (const id of ['#income-profile', '#payday']) {
    const sobra = await page.locator(id).evaluate((sel) => {
      const s = getComputedStyle(sel);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const util = sel.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - 28; // 28px = seta da lista
      return [...sel.options].map((o) => ({ texto: o.text, largura: ctx.measureText(o.text).width, util })).filter((o) => o.largura > o.util).map((o) => o.texto);
    });
    expect(sobra, `${id}: opções cortadas`).toEqual([]);
  }
});

test('a reserva ideal aparece em destaque e o botão ocupa a largura toda', async ({ page }) => {
  const valor = page.locator('.emergency .reserve-ideal strong');
  const tamanho = await valor.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(tamanho, 'valor grande').toBeGreaterThanOrEqual(24);
  const botao = await page.locator('.emergency').getByRole('button', { name: /Atualizar minha meta/ }).boundingBox();
  const bloco = await page.locator('.emergency .reserve-ideal').boundingBox();
  expect(botao.width, 'botão de largura total (dentro do respiro do bloco)').toBeGreaterThanOrEqual(bloco.width - 24 - 1);
});

test('cada tipo de renda mostra os exemplos embaixo da lista', async ({ page }) => {
  await expect(page.locator('.emergency')).toContainText('CLT, servidor público, aposentadoria');
  await page.locator('#income-profile').selectOption('variavel');
  await expect(page.locator('.emergency')).toContainText('autônomo, freelancer, empresário');
});
