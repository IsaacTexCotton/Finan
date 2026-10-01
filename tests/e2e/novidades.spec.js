const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { converter } = require('../../tools/gerar-novidades');
const { APP } = require('./ajuda');
const { version } = require('../../package.json');

// Histórico de atualizações escondido (decisão do Isaac, 01/10/2026): sem botão à vista, abre com
// 5 toques seguidos na barra verde do topo (fora das setinhas de mês). No celular o nome "Finan"
// fica escondido da vista, então ali se toca no mês; no PC vale também tocar no nome.

const entradas = converter(fs.readFileSync(path.join(__dirname, '..', '..', 'CHANGELOG.md'), 'utf8'));
const primeiroItem = entradas.find((e) => e.versao).secoes[0].itens[0];

const janela = (page) => page.getByRole('dialog', { name: 'Novidades' });
async function tocar(alvo, vezes) {
  for (let i = 0; i < vezes; i++) await alvo.click();
}

test('no celular, 5 toques no topo abrem as novidades, com a versão do app e o histórico', async ({ page }) => {
  await page.goto(APP);
  await tocar(page.locator('#month-label'), 5);
  await expect(janela(page)).toBeVisible();
  await expect(janela(page)).toContainText(`Versão ${version}`);
  await expect(janela(page)).toContainText(primeiroItem);
  await expect(janela(page)).toContainText('Antes da versão 0.1.0');
});

test('no PC, 5 toques no nome Finan também abrem as novidades', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(APP);
  await tocar(page.locator('.brand'), 5);
  await expect(janela(page)).toBeVisible();
});

test('fica escondido: sem botão ou link à vista e com menos de 5 toques não abre', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByRole('button', { name: /novidades|atualiza/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /novidades|atualiza/i })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await tocar(page.locator('#month-label'), 4);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('toques com mais de 1,5 s entre eles não somam', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-01T12:00:00') });
  await page.goto(APP);
  await tocar(page.locator('#month-label'), 3);
  await page.clock.fastForward(2000);
  await tocar(page.locator('#month-label'), 2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('tocar nas setinhas de mês não abre as novidades e continua trocando o mês', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-01T12:00:00'));
  await page.goto(APP);
  const anterior = page.getByRole('button', { name: 'Mês anterior' });
  await tocar(anterior, 5);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#month-label')).toHaveText(/maio de 2026/i);
});

test('Esc e o botão Fechar fecham a janela, que abre de novo com mais 5 toques', async ({ page }) => {
  await page.goto(APP);
  await tocar(page.locator('#month-label'), 5);
  await expect(janela(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await tocar(page.locator('#month-label'), 5);
  await janela(page).getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await tocar(page.locator('#month-label'), 5);
  await expect(janela(page)).toBeVisible();
});

test('a janela cabe na tela do celular e rola por dentro, sem rolar de lado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(APP);
  await tocar(page.locator('#month-label'), 5);
  const caixa = await janela(page).boundingBox();
  expect(caixa.x).toBeGreaterThanOrEqual(0);
  expect(caixa.x + caixa.width).toBeLessThanOrEqual(320);
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(568);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(janela(page).getByRole('button', { name: 'Fechar' })).toBeInViewport();
});

test('o texto do histórico nunca vira HTML (passa por esc)', async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => {
    window.FINAN_NOVIDADES = [{ versao: '9.9.9', rotulo: null, data: '2030-01-01', secoes: [{ nome: 'Adicionado', itens: ['<img src=x onerror="window.__xss=1"> e <b>negrito</b>'] }] }];
  });
  await tocar(page.locator('#month-label'), 5);
  await expect(janela(page)).toContainText('<img src=x onerror="window.__xss=1"> e <b>negrito</b>');
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await expect(janela(page).locator('img, b')).toHaveCount(0);
});
