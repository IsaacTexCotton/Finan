const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// Topo do Painel (Painel enxuto, fase 2, primeiro passo; plano aprovado pelo Isaac em 09/10/2026): o "Você pode
// gastar hoje" é a primeira coisa do Painel, numa faixa verde-escura que continua a barra do topo; o resumo do mês
// (Receitas, Gastos, Guardado, Sobrou) vira um bloco só, em linhas, logo abaixo. Hoje fixo em 20/09/2026.

const dados = ({ semRenda = false } = {}) => ({
  version: 1,
  transactions: [
    ...(semRenda ? [] : [{ id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' }]),
    { id: 'g1', type: 'expense', categoryId: 'mercado', amount: 10000, date: '2026-09-10', description: '' },
  ],
  budgets: { mercado: 60000 },
});

async function abrir(page, d, largura = 360) {
  await page.setViewportSize({ width: largura, height: 740 });
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((x) => localStorage.setItem('finan:data', JSON.stringify(x)), d);
  await page.goto(APP);
}

const faixa = (page) => page.locator('#allowance .allowance');
const linhas = (page) => page.locator('#summary-cards .card');
const estilo = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);

test('o "pode gastar hoje" vem antes do resumo do mês', async ({ page }) => {
  await abrir(page, dados());
  const antes = await page.evaluate(() => {
    const a = document.querySelector('#allowance');
    const r = document.querySelector('#summary-cards');
    return Boolean(a.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(antes).toBe(true);
  const caixaFaixa = await faixa(page).boundingBox();
  const caixaResumo = await page.locator('#summary-cards').boundingBox();
  expect(caixaFaixa.y + caixaFaixa.height).toBeLessThanOrEqual(caixaResumo.y);
});

test('no celular, a faixa é verde-escura como o topo, encosta nele e vai de uma borda à outra; o número é branco', async ({ page }) => {
  await abrir(page, dados());
  expect(await estilo(faixa(page), 'backgroundColor')).toBe('rgb(8, 76, 69)'); // --primary-strong, a cor do topo
  expect(await estilo(faixa(page).locator('.allowance-value'), 'color')).toBe('rgb(255, 255, 255)');
  const topo = await page.locator('.topbar').boundingBox();
  const caixa = await faixa(page).boundingBox();
  expect(Math.abs(caixa.y - (topo.y + topo.height))).toBeLessThanOrEqual(1);
  expect(caixa.x).toBe(0);
  expect(caixa.width).toBe(360);
});

test('os textos da faixa são brancos e o contorno do foco em "Ver detalhes" também (visível sobre o verde)', async ({ page }) => {
  await abrir(page, dados());
  expect(await estilo(faixa(page).locator('.card-label'), 'color')).toBe('rgb(255, 255, 255)');
  expect(await estilo(faixa(page).locator('.allowance-resumo'), 'color')).toBe('rgb(255, 255, 255)');
  const resumo = faixa(page).locator('summary');
  expect(await estilo(resumo, 'color')).toBe('rgb(255, 255, 255)');
  await resumo.focus();
  expect(await estilo(resumo, 'outlineColor')).toBe('rgb(255, 255, 255)');
});

test('sem renda no mês, o botão "Lançar renda" da faixa é branco, com o texto verde', async ({ page }) => {
  await abrir(page, dados({ semRenda: true }));
  const botao = faixa(page).getByRole('button', { name: 'Lançar renda' });
  expect(await estilo(botao, 'backgroundColor')).toBe('rgb(255, 255, 255)');
  expect(await estilo(botao, 'color')).toBe('rgb(8, 76, 69)');
});

test('o resumo do mês é um bloco só: as 4 linhas uma embaixo da outra, com o valor na mesma linha do nome', async ({ page }) => {
  await abrir(page, dados());
  await expect(linhas(page)).toHaveCount(4);
  await expect(linhas(page).locator('.card-label')).toHaveText(['Receitas', 'Gastos', 'Guardado', 'Sobrou']);
  const caixas = [];
  for (let i = 0; i < 4; i++) {
    const linha = linhas(page).nth(i);
    const nome = await linha.locator('.card-label').boundingBox();
    const valor = await linha.locator('.card-value').boundingBox();
    expect(Math.abs(nome.y - valor.y), `linha ${i + 1}`).toBeLessThanOrEqual(8); // mesma altura
    expect(valor.x, `linha ${i + 1}`).toBeGreaterThan(nome.x + nome.width); // valor à direita do nome
    caixas.push(await linha.boundingBox());
  }
  for (let i = 1; i < 4; i++) {
    expect(caixas[i].x).toBe(caixas[0].x);
    expect(caixas[i].width).toBe(caixas[0].width);
    expect(caixas[i].y).toBeGreaterThanOrEqual(caixas[i - 1].y + caixas[i - 1].height);
  }
  expect(await estilo(page.locator('#summary-cards'), 'borderTopWidth')).toBe('1px'); // a borda é do bloco
  expect(await estilo(linhas(page).first(), 'borderTopWidth')).toBe('0px'); // não de cada linha
});

test('sem limites (sem o "pode gastar"), o resumo fica no topo e não aparece faixa vazia', async ({ page }) => {
  await abrir(page, { ...dados(), budgets: {} });
  await expect(page.locator('#allowance')).toBeEmpty();
  await expect(linhas(page)).toHaveCount(4);
});

for (const largura of [320, 1280]) {
  test(`em ${largura}px nada passa para o lado e a faixa continua encostada no topo`, async ({ page }) => {
    await abrir(page, dados(), largura);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const topo = await page.locator('.topbar').boundingBox();
    const caixa = await faixa(page).boundingBox();
    expect(Math.abs(caixa.y - (topo.y + topo.height))).toBeLessThanOrEqual(1);
  });
}

test('com o onboarding na tela (limites definidos, nenhum lançamento), a faixa vem depois dele, separada e com os cantos redondos', async ({ page }) => {
  await abrir(page, { version: 1, transactions: [], budgets: { mercado: 60000 } });
  await expect(page.locator('#onboarding')).toContainText('Passo 1 de 3');
  await expect(faixa(page)).toContainText('Lance sua renda'); // a faixa aparece junto com o onboarding
  const onboarding = await page.locator('#onboarding').boundingBox();
  const caixa = await faixa(page).boundingBox();
  expect(caixa.y).toBeGreaterThanOrEqual(onboarding.y + onboarding.height + 8); // não cola no onboarding
  expect(await estilo(faixa(page), 'borderTopLeftRadius')).not.toBe('0px');
});

test('no computador (1280px), os 4 números do resumo ficam lado a lado, um ao lado do outro numa linha só', async ({ page }) => {
  await abrir(page, dados(), 1280);
  const caixas = [];
  for (let i = 0; i < 4; i++) caixas.push(await linhas(page).nth(i).locator('.card-value').boundingBox());
  for (let i = 1; i < 4; i++) {
    expect(Math.abs(caixas[i].y - caixas[0].y), `número ${i + 1}`).toBeLessThanOrEqual(2); // mesma linha
    expect(caixas[i].x).toBeGreaterThan(caixas[i - 1].x + caixas[i - 1].width); // da esquerda para a direita
  }
});
