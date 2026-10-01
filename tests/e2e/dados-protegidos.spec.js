const { test, expect } = require('@playwright/test');
const { APP, lancar, irParaAba } = require('./ajuda');

// O app pede ao navegador para não apagar os dados sozinho e diz a verdade, em "Seus dados",
// sobre o que conseguiu. A API do navegador é simulada para o teste ser sempre igual.

/**
 * Simula navigator.storage.
 *  ja: já protegido · concede: o que persist() responde · semApi: navegador sem a função
 *  persistFalha: persist() dá erro · primeiraConsultaLenta: a consulta feita ao abrir o app demora
 *  e responde por último, com o que havia quando começou (respostas fora de ordem).
 */
async function simular(page, { ja = false, concede = true, semApi = false, persistFalha = false, primeiraConsultaLenta = false } = {}) {
  await page.addInitScript((o) => {
    window.__persist = 0;
    let consultas = 0;
    const estado = { protegido: o.ja };
    const armazenamento = o.semApi ? undefined : {
      persisted: async () => {
        consultas += 1;
        const valor = estado.protegido;
        if (o.primeiraConsultaLenta && consultas === 1) await new Promise((r) => setTimeout(r, 1200));
        return valor;
      },
      persist: async () => {
        window.__persist += 1;
        if (o.persistFalha) throw new Error('recusado de forma estranha');
        estado.protegido = o.concede;
        return o.concede;
      },
    };
    Object.defineProperty(navigator, 'storage', { value: armazenamento, configurable: true });
  }, { ja, concede, semApi, persistFalha, primeiraConsultaLenta });
}

const status = (page) => page.locator('#storage-status');
const pedidos = (page) => page.evaluate(() => window.__persist);
const despesa = (page, valor, descricao = 'item') => lancar(page, { tipo: 'Despesa', valor, categoria: 'mercado', descricao });

test('já protegido: o app diz que a proteção está ativada e não pede de novo', async ({ page }) => {
  await simular(page, { ja: true });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Proteção ativada');
  expect(await pedidos(page)).toBe(0);
});

test('a proteção ativada não promete mais do que dá: limpar os dados do navegador ainda apaga', async ({ page }) => {
  await simular(page, { ja: true });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('quando falta espaço');
  await expect(status(page)).toContainText('Limpar os dados do navegador ainda os apaga');
  await expect(status(page)).toContainText('baixe um backup');
});

test('sem lançamentos ainda, não pede nada e avisa que vai pedir', async ({ page }) => {
  await simular(page, { concede: true });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Assim que você lançar algo');
  expect(await pedidos(page)).toBe(0);
});

test('no primeiro lançamento o app pede ao navegador e, concedido, mostra a proteção ativada', async ({ page }) => {
  await simular(page, { concede: true });
  await page.goto(APP);
  await despesa(page, '10');
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Proteção ativada');
  expect(await pedidos(page)).toBe(1);
});

test('se o navegador recusa, o app diz a verdade e manda fazer backup, e não insiste', async ({ page }) => {
  await simular(page, { concede: false });
  await page.goto(APP);
  await despesa(page, '10');
  await despesa(page, '20');
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('ainda pode apagar estes dados');
  await expect(status(page)).toContainText('Baixe um backup');
  expect(await pedidos(page), 'pede uma vez só por visita').toBe(1);
});

test('ao reabrir com dados salvos, só consulta: o pedido (que em alguns navegadores abre um aviso) fica para o primeiro salvamento', async ({ page }) => {
  await simular(page, { concede: true });
  await page.goto(APP);
  await despesa(page, '10');
  await page.reload();
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('ainda pode apagar estes dados');
  expect(await pedidos(page), 'não pede ao abrir').toBe(0);
  await despesa(page, '5', 'outro');
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Proteção ativada');
  expect(await pedidos(page)).toBe(1);
});

test('navegador sem a função: o app não garante nada e manda fazer backup', async ({ page }) => {
  await simular(page, { semApi: true });
  await page.goto(APP);
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('não garante a proteção dos dados');
  await expect(status(page)).toContainText('Baixe um backup');
});

test('se o pedido dá erro, o app diz que ainda pode apagar (e não que o navegador não tem a função)', async ({ page }) => {
  await simular(page, { persistFalha: true });
  await page.goto(APP);
  await despesa(page, '10');
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('ainda pode apagar estes dados');
  await expect(status(page)).not.toContainText('não garante');
  expect(await pedidos(page)).toBe(1);
});

test('se não deu para salvar, o app não diz que está protegido: manda baixar o backup', async ({ page }) => {
  await simular(page, { ja: true });
  await page.goto(APP);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('sem espaço'); }; });
  await despesa(page, '10');
  await irParaAba(page, 'Método');
  await expect(status(page)).toContainText('Não foi possível salvar os seus dados');
  await expect(status(page)).toContainText('Baixe um backup agora');
  await expect(status(page)).not.toContainText('Proteção ativada');
});

test('respostas fora de ordem não deixam um resultado antigo na tela', async ({ page }) => {
  await simular(page, { concede: true, primeiraConsultaLenta: true });
  await page.goto(APP);
  await despesa(page, '10'); // a consulta lenta do início ainda não respondeu
  await irParaAba(page, 'Método');
  await page.waitForTimeout(1800); // dá tempo de a resposta atrasada chegar
  await expect(status(page)).toContainText('Proteção ativada');
});

test('depois de "Apagar tudo" com o pedido recusado, não diz que vai pedir de novo', async ({ page }) => {
  await simular(page, { concede: false });
  await page.goto(APP);
  await despesa(page, '10');
  await irParaAba(page, 'Método');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Apagar tudo' }).click();
  await expect(status(page)).toContainText('ainda pode apagar estes dados');
  await expect(status(page)).not.toContainText('Assim que você lançar algo');
});
