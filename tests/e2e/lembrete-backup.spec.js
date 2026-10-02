const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// Lembrete de backup (decisão tomada com o Isaac ausente, 02/10/2026, a partir do item "Backup" do
// BACKLOG): o Painel lembra de baixar um backup quando há 5 lançamentos ou mais e nunca se baixou um
// backup, ou o último tem 30 dias ou mais. Baixar o backup (aqui ou em "Seus dados") guarda a data.
// Hoje fixo em 20/09/2026.

function lancamentos(quantos) {
  return Array.from({ length: quantos }, (_, i) => ({ id: `t${i}`, type: 'expense', categoryId: 'mercado', amount: 1000 + i, date: '2026-09-05', description: `Compra ${i}` }));
}

async function abrir(page, { quantos = 5, lastBackup } = {}) {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  const dados = { version: 1, transactions: lancamentos(quantos), ...(lastBackup ? { settings: { lastBackup } } : {}) };
  await page.addInitScript((d) => { if (!localStorage.getItem('finan:data')) localStorage.setItem('finan:data', JSON.stringify(d)); }, dados);
  await page.goto(APP);
}

const lembrete = (page) => page.locator('#backup-reminder');
const dadosSalvos = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('finan:data')));

test('quem nunca baixou um backup é lembrado no Painel, com o motivo em palavras', async ({ page }) => {
  await abrir(page);
  await expect(lembrete(page)).toContainText('Você ainda não baixou nenhum backup');
  await expect(lembrete(page)).toContainText('só neste aparelho');
  await expect(lembrete(page).getByRole('button', { name: 'Baixar backup' })).toBeVisible();
});

test('baixar o backup pelo lembrete entrega o arquivo, guarda a data e tira o lembrete', async ({ page }) => {
  await abrir(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    lembrete(page).getByRole('button', { name: 'Baixar backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('finan-backup-2026-09-20.json');
  await expect(lembrete(page)).toBeEmpty();
  expect((await dadosSalvos(page)).settings.lastBackup).toBe('2026-09-20');
});

test('o arquivo baixado já leva a data do backup, e baixar em "Seus dados" também tira o lembrete', async ({ page }) => {
  await abrir(page);
  await irParaAba(page, 'Método');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar backup' }).click(),
  ]);
  const conteudo = JSON.parse(await (await import('node:fs/promises')).readFile(await download.path(), 'utf8'));
  expect(conteudo.settings.lastBackup).toBe('2026-09-20');
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(lembrete(page)).toBeEmpty();
});

test('backup de 29 dias atrás ainda vale: não lembra', async ({ page }) => {
  await abrir(page, { lastBackup: '2026-08-22' });
  await expect(lembrete(page)).toBeEmpty();
});

test('backup de 30 dias atrás já está velho: lembra, e o texto diz isso', async ({ page }) => {
  await abrir(page, { lastBackup: '2026-08-21' });
  await expect(lembrete(page)).toContainText('Faz 30 dias ou mais que você baixou o último backup');
});

test('com poucos lançamentos (menos de 5) não há lembrete', async ({ page }) => {
  await abrir(page, { quantos: 4 });
  await expect(lembrete(page)).toBeEmpty();
});
