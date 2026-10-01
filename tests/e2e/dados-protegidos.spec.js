const { test, expect } = require('@playwright/test');
const { APP, lancar, irParaAba } = require('./ajuda');

// O app pede ao navegador para não apagar os dados sozinho e diz a verdade, em "Seus dados",
// sobre o que conseguiu. A API do navegador é simulada para o teste ser sempre igual.

/** Simula navigator.storage: `ja` = já protegido; `concede` = o que persist() responde; null = sem a API. */
async function simular(page, { ja = false, concede = true, semApi = false } = {}) {
  await page.addInitScript(({ ja, concede, semApi }) => {
    window.__persist = 0;
    const estado = { protegido: ja };
    const armazenamento = semApi ? undefined : {
      persisted: async () => estado.protegido,
      persist: async () => { window.__persist += 1; estado.protegido = concede; return concede; },
    };
    Object.defineProperty(navigator, 'storage', { value: armazenamento, configurable: true });
  }, { ja, concede, semApi });
}

const status = (page) => page.locator('#storage-status');
const pedidos = (page) => page.evaluate(() => window.__persist);

test('já protegido: o app diz que está protegido e não pede de novo', async ({ page }) => {
  await simular(page, { ja: true });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Seus dados estão protegidos');
  expect(await pedidos(page)).toBe(0);
});

test('sem lançamentos ainda, não pede nada e avisa que vai pedir', async ({ page }) => {
  await simular(page, { concede: true });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Assim que você lançar algo');
  expect(await pedidos(page)).toBe(0);
});

test('no primeiro lançamento o app pede ao navegador e, concedido, mostra protegido', async ({ page }) => {
  await simular(page, { concede: true });
  await page.goto(APP);
  await lancar(page, { tipo: 'Despesa', valor: '10', categoria: 'mercado', descricao: 'pão' });
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Seus dados estão protegidos');
  expect(await pedidos(page)).toBe(1);
});

test('se o navegador recusa, o app diz a verdade e manda fazer backup, e não insiste', async ({ page }) => {
  await simular(page, { concede: false });
  await page.goto(APP);
  await lancar(page, { tipo: 'Despesa', valor: '10', categoria: 'mercado', descricao: 'pão' });
  await lancar(page, { tipo: 'Despesa', valor: '20', categoria: 'mercado', descricao: 'leite' });
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('ainda pode apagar estes dados');
  await expect(status(page)).toContainText('Baixe um backup');
  expect(await pedidos(page), 'pede uma vez só por visita').toBe(1);
});

test('com dados já salvos, pede ao abrir o app', async ({ page }) => {
  await simular(page, { concede: true });
  await page.goto(APP);
  await lancar(page, { tipo: 'Despesa', valor: '10', categoria: 'mercado', descricao: 'pão' });
  await page.reload(); // nova visita: o simulador volta a "não protegido", e o app tem dados
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Seus dados estão protegidos');
  expect(await pedidos(page)).toBe(1);
});

test('navegador sem a função: o app não garante nada e manda fazer backup', async ({ page }) => {
  await simular(page, { semApi: true });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('não garante a proteção dos dados');
  await expect(status(page)).toContainText('Baixe um backup');
});
