const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// A ação mais usada ("+ Lançar") fica sempre no mesmo canto, ao alcance do polegar,
// em qualquer aba e em qualquer ponto da rolagem. Só não aparece em Lançamentos (decisão do
// Isaac, 01/10/2026): o formulário já está ali, então o botão não faria sentido.

const ABAS = ['Painel', 'Orçamento', 'Metas', 'Método'];

async function caixaDoBotao(page) {
  return page.getByRole('button', { name: '+ Lançar' }).boundingBox();
}

for (const largura of [320, 390, 1280]) {
  test(`o "+ Lançar" fica no canto inferior direito, nas abas em que aparece, em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto(APP);
    let primeira;
    for (const aba of ABAS) {
      await page.getByRole('tab', { name: aba }).click();
      const caixa = await caixaDoBotao(page);
      primeira = primeira || caixa;
      expect(800 - (caixa.y + caixa.height), `${aba}: perto do rodapé`).toBeLessThanOrEqual(32);
      expect(800 - (caixa.y + caixa.height), `${aba}: não cola na borda`).toBeGreaterThanOrEqual(8);
      expect(largura - (caixa.x + caixa.width), `${aba}: perto da borda direita`).toBeLessThanOrEqual(32);
      expect(caixa.height, `${aba}: alvo de toque`).toBeGreaterThanOrEqual(44);
      expect(Math.abs(caixa.x - primeira.x) + Math.abs(caixa.y - primeira.y), `${aba}: mesmo lugar nas abas`).toBeLessThanOrEqual(1);
    }
  });
}

test('o "+ Lançar" não sai do lugar quando a página rola', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  const antes = await caixaDoBotao(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const depois = await caixaDoBotao(page);
  expect(depois.y).toBeCloseTo(antes.y, 0);
  expect(depois.x).toBeCloseTo(antes.x, 0);
});

test('o "+ Lançar" não esconde o fim do conteúdo: dá para rolar até ele ficar livre', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const botao = await caixaDoBotao(page);
  const fimDoConteudo = await page.evaluate(() => {
    const filhos = [...document.querySelectorAll('main > section:not([hidden]) > *')];
    return Math.max(...filhos.map((f) => f.getBoundingClientRect().bottom));
  });
  expect(fimDoConteudo, 'o último bloco termina acima do botão').toBeLessThanOrEqual(botao.y);
});

test('o topo não tem mais o "+ Lançar": só o título e o mês', async ({ page }) => {
  await page.goto(APP);
  await expect(page.locator('header.topbar').getByRole('button', { name: '+ Lançar' })).toHaveCount(0);
});

test('tocar no "+ Lançar" de qualquer aba abre o formulário em Despesa', async ({ page }) => {
  await page.goto(APP);
  await irParaAba(page, 'Metas');
  await page.getByRole('button', { name: '+ Lançar' }).click();
  await expect(page.locator('#tx-form')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Despesa' })).toBeChecked();
});

test('na aba Lançamentos o "+ Lançar" não aparece, porque o formulário já está ali', async ({ page }) => {
  await page.goto(APP);
  const botao = page.getByRole('button', { name: '+ Lançar' });
  await expect(botao).toBeVisible();
  await page.getByRole('tab', { name: 'Lançamentos' }).click();
  await expect(botao).toBeHidden();
  await page.getByRole('tab', { name: 'Orçamento' }).click();
  await expect(botao).toBeVisible();
  // tocar nele em outra aba leva ao formulário, onde ele some
  await botao.click();
  await expect(page.locator('#tx-form').getByLabel('Valor (R$)')).toBeFocused();
  await expect(botao).toBeHidden();
});

test('a mensagem de confirmação aparece acima do "+ Lançar", sem cobri-lo', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: 'Ver com dados de exemplo' }).click();
  const aviso = page.locator('#toast.show');
  await expect(aviso).toBeVisible();
  const botao = await caixaDoBotao(page);
  const caixaAviso = await aviso.boundingBox();
  expect(caixaAviso.y + caixaAviso.height, 'o aviso termina acima do botão').toBeLessThanOrEqual(botao.y);
});
