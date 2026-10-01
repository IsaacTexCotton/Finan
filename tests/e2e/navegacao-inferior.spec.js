const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Navegação no polegar: barra fixa embaixo com Painel, Lançamentos, Orçamento e "Mais".
// Metas e Método ficam dentro do "Mais" (decisão do Isaac, 01/10/2026).

const ITENS = ['Painel', 'Lançamentos', 'Orçamento', 'Mais'];
const barra = (page) => page.getByRole('navigation', { name: 'Seções do app' });
const item = (page, nome) => (nome === 'Mais' ? page.getByRole('button', { name: 'Mais' }) : page.getByRole('tab', { name: nome }));

for (const largura of [320, 390, 1280]) {
  test(`a barra fica fixa colada no fim da tela e ocupa a largura toda, em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 700 });
    await page.goto(APP);
    const caixaBarra = await barra(page).boundingBox();
    expect(Math.round(caixaBarra.y + caixaBarra.height), 'cola no fim da tela').toBe(700);
    expect(Math.round(caixaBarra.width), 'ocupa a largura toda').toBe(largura);
  });
}

test('a barra continua no mesmo lugar e do mesmo tamanho quando a página rola e quando se troca de aba', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(APP);
  const antes = await Promise.all(ITENS.map((n) => item(page, n).boundingBox()));
  await item(page, 'Orçamento').click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const depois = await Promise.all(ITENS.map((n) => item(page, n).boundingBox()));
  depois.forEach((c, i) => {
    expect(Math.round(c.x), ITENS[i]).toBe(Math.round(antes[i].x));
    expect(Math.round(c.y), ITENS[i]).toBe(Math.round(antes[i].y));
    expect(Math.round(c.width), ITENS[i]).toBe(Math.round(antes[i].width));
  });
});

test('as abas não ficam mais no topo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(APP);
  const topo = await page.locator('header.topbar').boundingBox();
  const caixaBarra = await barra(page).boundingBox();
  expect(caixaBarra.y).toBeGreaterThan(topo.y + topo.height + 100);
});

test('Metas e Método ficam dentro do "Mais": só aparecem depois de tocar nele', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(APP);
  const mais = item(page, 'Mais');
  await expect(mais).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('tab', { name: 'Metas' })).toBeHidden();
  await expect(page.getByRole('tab', { name: 'Método' })).toBeHidden();
  await mais.click();
  await expect(mais).toHaveAttribute('aria-expanded', 'true');
  const metas = await page.getByRole('tab', { name: 'Metas' }).boundingBox();
  const caixaBarra = await barra(page).boundingBox();
  expect(metas.y + metas.height, 'a lista abre acima da barra').toBeLessThanOrEqual(caixaBarra.y);
  expect(metas.height, 'alvo de toque').toBeGreaterThanOrEqual(44);
  await expect(page.getByRole('tab', { name: 'Método' })).toBeVisible();
});

test('escolher Metas mostra a tela, fecha a lista e deixa o "Mais" como item atual', async ({ page }) => {
  await page.goto(APP);
  await item(page, 'Mais').click();
  await page.getByRole('tab', { name: 'Metas' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Metas' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Metas' })).toBeHidden();
  await expect(item(page, 'Mais')).toHaveAttribute('aria-expanded', 'false');
  await expect(item(page, 'Mais')).toHaveAttribute('aria-current', 'true');
  await expect(item(page, 'Mais')).toBeFocused();
  await item(page, 'Painel').click();
  await expect(item(page, 'Mais')).not.toHaveAttribute('aria-current', 'true');
});

test('Esc fecha a lista e devolve o foco ao "Mais"; tocar fora também fecha', async ({ page }) => {
  await page.goto(APP);
  await item(page, 'Mais').click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tab', { name: 'Metas' })).toBeHidden();
  await expect(item(page, 'Mais')).toBeFocused();
  await item(page, 'Mais').click();
  await page.locator('main').click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('tab', { name: 'Metas' })).toBeHidden();
});

test('teclado: setas percorrem Painel, Lançamentos, Orçamento e Mais; Enter no Mais abre a lista', async ({ page }) => {
  await page.goto(APP);
  await item(page, 'Painel').focus();
  await page.keyboard.press('ArrowRight');
  await expect(item(page, 'Lançamentos')).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Lançamentos' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(item(page, 'Orçamento')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(item(page, 'Mais')).toBeFocused();
  await page.keyboard.press('ArrowRight'); // depois do último, volta ao primeiro
  await expect(item(page, 'Painel')).toBeFocused();
  await page.keyboard.press('End');
  await expect(item(page, 'Mais')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'Metas' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Método' })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Método' })).toBeVisible();
});

test('o botão "+ Lançar" e o fim do conteúdo ficam livres da barra', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(APP);
  const caixaBarra = await barra(page).boundingBox();
  const botao = await page.getByRole('button', { name: '+ Lançar' }).boundingBox();
  expect(botao.y + botao.height, 'o botão fica acima da barra').toBeLessThanOrEqual(caixaBarra.y);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const fim = await page.evaluate(() => Math.max(...[...document.querySelectorAll('main > section:not([hidden]) > *')].map((f) => f.getBoundingClientRect().bottom)));
  expect(fim, 'o último bloco termina acima do botão').toBeLessThanOrEqual(botao.y);
});
