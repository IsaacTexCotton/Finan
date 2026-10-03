const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// Painel enxuto, fase 1 (consenso de UX, finanças e usuário, decisão do Isaac, 02/10/2026): "uma pergunta,
// um número, um aviso". O cartão "Você pode gastar hoje" mostra o número e uma linha; o resto vai para
// "Ver detalhes". O texto longo dos baldes vai para "Como funciona", e cada barra tem uma linha só.
// Nada some: tudo continua a um toque. Hoje fixo em 20/09/2026 (11 dias até o fim do mês).

const sem = (extra = {}) => ({
  version: 1,
  transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
    { id: 'g1', type: 'expense', categoryId: 'mercado', amount: 10000, date: '2026-09-10', description: '' },
    ...(extra.guardado ? [{ id: 'g2', type: 'expense', categoryId: 'reserva', amount: extra.guardado, date: '2026-09-12', description: '' }] : []),
  ],
  budgets: { mercado: 60000 },
  ...(extra.settings ? { settings: extra.settings } : {}),
});

async function abrir(page, dados) {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((d) => localStorage.setItem('finan:data', JSON.stringify(d)), dados);
  await page.goto(APP);
}

const cartao = (page) => page.locator('#allowance');
const detalhes = (page) => cartao(page).locator('details');

test('o cartão do "pode gastar" mostra o número e uma linha que diz que é o máximo de hoje, não uma permissão', async ({ page }) => {
  await abrir(page, sem());
  await expect(cartao(page).locator('.card-label')).toHaveText('Você pode gastar hoje');
  await expect(cartao(page).locator('.allowance-value')).toHaveText(/R\$\s45,45/); // R$ 500 ÷ 11 dias
  await expect(cartao(page).locator('.allowance-resumo')).toHaveText('Esse é o máximo para hoje, contando até o fim do mês.');
});

test('com o dia de pagamento informado, a linha diz até quando vale', async ({ page }) => {
  await abrir(page, sem({ settings: { incomeProfile: 'estavel', paydayBusinessDay: 5 } }));
  await expect(cartao(page).locator('.allowance-resumo')).toContainText('contando até o próximo pagamento (07/10)');
});

test('o resto fica em "Ver detalhes", recolhido, e abre ao tocar', async ({ page }) => {
  await abrir(page, sem());
  const semana = cartao(page).getByText(/Nesta semana, até domingo/);
  await expect(semana).toBeHidden();
  await expect(cartao(page).getByText(/livres nos envelopes variáveis para os próximos 11 dias/)).toBeHidden();
  await detalhes(page).locator('summary').click();
  await expect(semana).toBeVisible();
  await expect(cartao(page).getByText(/livres nos envelopes variáveis para os próximos 11 dias/)).toBeVisible();
});

test('"Ver detalhes" tem alvo de toque de pelo menos 44px', async ({ page }) => {
  await abrir(page, sem());
  const caixa = await detalhes(page).locator('summary').boundingBox();
  expect(caixa.height).toBeGreaterThanOrEqual(44);
});

test('o "já guardou" não repete o cartão Guardado: só aparece dentro de "Ver detalhes"', async ({ page }) => {
  await abrir(page, sem({ guardado: 200000 }));
  const guardou = cartao(page).getByText(/Você já guardou R\$\s2\.000,00 neste mês/);
  await expect(guardou).toBeHidden();
  await detalhes(page).locator('summary').click();
  await expect(guardou).toBeVisible();
});

test('quando o valor é limitado ao que sobrou, isso aparece na linha principal, sem abrir nada', async ({ page }) => {
  await abrir(page, sem({ guardado: 270000 })); // sobrou R$ 200, e os envelopes têm R$ 500
  await expect(cartao(page).locator('.allowance-value')).toHaveText(/R\$\s18,18/);
  await expect(cartao(page).locator('.allowance-resumo')).toContainText('Limitado ao que sobrou.');
  await expect(detalhes(page).getByText(/Os envelopes ainda têm R\$\s500,00/)).toBeHidden(); // a explicação completa fica nos detalhes
});

test('sem limitação, a linha principal não fala em "limitado"', async ({ page }) => {
  await abrir(page, sem());
  await expect(cartao(page).locator('.allowance-resumo')).not.toContainText('Limitado');
});

test('"Ver detalhes" aberto continua aberto ao trocar de aba e voltar', async ({ page }) => {
  await abrir(page, sem());
  await detalhes(page).locator('summary').click();
  await irParaAba(page, 'Orçamento');
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(detalhes(page)).toHaveJSProperty('open', true);
});

test('os baldes ganham uma frase curta e o resto vai para "Como funciona"', async ({ page }) => {
  await abrir(page, sem());
  const painel = page.locator('#tab-painel .panel').filter({ hasText: 'Seus baldes' });
  await expect(painel.getByText(/Seu dinheiro é dividido em 3 baldes/)).toBeVisible();
  await expect(painel.getByText(/Cada barra mostra quanto da sua renda foi para o balde/)).toBeHidden();
  await expect(painel.getByText(/Pagar dívida conta como Essencial/)).toBeHidden();
  await expect(painel.getByText(/Ainda sem histórico: o plano começa no 50\/30\/20/)).toBeHidden();
  await painel.locator('summary', { hasText: 'Como funciona' }).click();
  await expect(painel.getByText(/Cada barra mostra quanto da sua renda foi para o balde/)).toBeVisible();
  await expect(painel.getByText(/Pagar dívida conta como Essencial/)).toBeVisible();
  await expect(painel.getByText(/Ainda sem histórico: o plano começa no 50\/30\/20/)).toBeVisible();
});

test('o plano mostra só o selo e a divisão; a explicação dele fica em "Como funciona"', async ({ page }) => {
  await abrir(page, sem());
  await expect(page.locator('#plan-info')).toContainText('Começando');
  await expect(page.locator('#plan-info')).toContainText('50/30/20');
  await expect(page.locator('#plan-info')).not.toContainText('Ainda sem histórico');
});

test('cada barra tem uma linha de texto, com o valor, a parte da renda e o limite do plano', async ({ page }) => {
  await abrir(page, sem());
  const linhas = page.locator('#buckets .bucket-foot');
  await expect(linhas).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(linhas.nth(i).locator('span')).toHaveCount(1);
  await expect(linhas.nth(0)).toHaveText(/R\$\s100,00 \(3% da renda\) · máx\. 50%/); // Essenciais: o mercado de R$ 100
  await expect(linhas.nth(2)).toContainText('mín. 20%'); // Futuro
});

// ---------- Achados da revisão de código (02/10/2026) ----------

test('a barra continua mostrando quanto é o limite do plano em reais, não só em porcentagem', async ({ page }) => {
  await abrir(page, sem());
  await expect(page.locator('#buckets .bucket-foot').nth(0)).toHaveText(/máx\. 50% \(R\$\s1\.500,00\)/); // 50% de R$ 3.000
  await expect(page.locator('#buckets .bucket-foot').nth(2)).toHaveText(/mín\. 20% \(R\$\s600,00\)/);
});

test('quando o plano pede atenção (essenciais pesados), a explicação dele fica à vista, no lugar', async ({ page }) => {
  const mes = (m) => [
    { id: `i${m}`, type: 'income', categoryId: 'salario', amount: 100000, date: `2026-${m}-05`, description: '' },
    { id: `m${m}`, type: 'expense', categoryId: 'mercado', amount: 90000, date: `2026-${m}-10`, description: '' },
  ];
  await abrir(page, { version: 1, transactions: [...mes('06'), ...mes('07'), ...mes('08'), { id: 'a', type: 'income', categoryId: 'salario', amount: 100000, date: '2026-09-05', description: '' }] });
  await expect(page.locator('#plan-info')).toContainText('Crítico');
  await expect(page.locator('#plan-info').getByText(/o foco é cortar custos fixos ou aumentar a renda/)).toBeVisible();
  await expect(page.locator('#plan-info').getByText(/Essenciais nos últimos 3 meses: 90% da renda/)).toBeVisible();
});

test('quando não sobra nada para hoje, a linha principal diz isso em vez de chamar R$ 0 de "máximo"', async ({ page }) => {
  await abrir(page, { ...sem(), transactions: [...sem().transactions, { id: 'g9', type: 'expense', categoryId: 'mercado', amount: 50000, date: '2026-09-15', description: '' }] }); // o envelope de R$ 600 acabou
  await expect(cartao(page).locator('.allowance-value')).toHaveText(/R\$\s0,00/);
  await expect(cartao(page).locator('.allowance-resumo')).toContainText('Hoje não sobra nada para gastar, contando até o fim do mês.');
  await expect(cartao(page).locator('.allowance-resumo')).not.toContainText('máximo');
});

test('"Ver detalhes" aberto continua aberto mesmo se o cartão sumir por um redesenho (ao passar por outro mês)', async ({ page }) => {
  await abrir(page, sem());
  await detalhes(page).locator('summary').click();
  await page.evaluate(() => { document.querySelector('[data-action="prev-month"]').click(); document.querySelector('[data-action="next-month"]').click(); });
  await expect(cartao(page).locator('.allowance-value')).toBeVisible();
  await expect(detalhes(page)).toHaveJSProperty('open', true);
});

test('fechar o "Ver detalhes" também vale depois de redesenhar', async ({ page }) => {
  await abrir(page, sem());
  await detalhes(page).locator('summary').click();
  await detalhes(page).locator('summary').click();
  await irParaAba(page, 'Orçamento');
  await page.getByRole('tab', { name: 'Painel' }).click();
  await expect(detalhes(page)).toHaveJSProperty('open', false);
});

test('se um redesenho acontece com o foco em "Ver detalhes", o foco continua lá e o botão continua na ordem do Tab', async ({ page }) => {
  await abrir(page, sem());
  await detalhes(page).locator('summary').focus();
  // "Baixar backup" (escondido na aba Método) salva e redesenha a tela, como qualquer ação que muda dados
  await page.evaluate(() => document.querySelector('[data-action="export-json"]').click());
  await expect(page.getByRole('status')).toContainText('Backup baixado');
  await expect(detalhes(page).locator('summary')).toBeFocused();
  expect(await detalhes(page).locator('summary').evaluate((el) => el.tabIndex)).toBe(0); // não virou tabindex -1
});
