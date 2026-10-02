const { test, expect } = require('@playwright/test');
const { APP } = require('./ajuda');

// "Sugerir pelos meus gastos" (decisão do Isaac, 02/10/2026): a sugestão parte do que a pessoa realmente
// gasta e paga todo mês. Primeiro o que ela precisa pagar, depois a margem, e só da margem saem os
// objetivos e os gastos para gastar à vontade, sempre "até" um valor. Sem porcentagem fixa da renda,
// sem número para o que ela não usa. Sem renda ou sem gastos de meses anteriores, não inventa números.
// Hoje fixo em 20/09/2026. Renda de setembro R$ 3.000; junho e julho têm gastos.

const HISTORICO = {
  version: 1,
  transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
    { id: 'a1', type: 'expense', categoryId: 'mercado', amount: 55000, date: '2026-06-10', description: '' },
    { id: 'a2', type: 'expense', categoryId: 'mercado', amount: 60000, date: '2026-07-10', description: '' },
    { id: 'a3', type: 'expense', categoryId: 'moradia', amount: 100000, date: '2026-06-05', description: '' },
    { id: 'a4', type: 'expense', categoryId: 'moradia', amount: 120000, date: '2026-07-05', description: '' },
  ],
};

async function abrir(page, dados) {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript((d) => localStorage.setItem('finan:data', JSON.stringify(d)), dados);
  await page.goto(APP);
  await page.getByRole('tab', { name: 'Orçamento' }).click();
}

const painel = (page) => page.locator('#sugestao');
const sugerir = (page) => page.getByRole('button', { name: 'Sugerir pelos meus gastos' });
const aplicar = (page) => painel(page).getByRole('button', { name: 'Aplicar como limites' });

test('mostra a conta: renda, o que precisa pagar, a margem e quanto pode gastar em cada coisa que a pessoa usa', async ({ page }) => {
  await abrir(page, HISTORICO);
  await sugerir(page).click();
  await expect(painel(page).getByRole('heading', { name: 'Sugestão para este mês' })).toBeFocused();
  await expect(painel(page)).toContainText(/Renda prevista\s*R\$\s3\.000,00/);
  await expect(painel(page)).toContainText(/O que você precisa pagar\s*R\$\s1\.775,00/); // moradia 1.200 (último valor pago) + mercado 575 (mediana)
  await expect(painel(page)).toContainText(/Margem\s*R\$\s1\.225,00/);
  await expect(painel(page)).toContainText(/Mercado\s*até R\$\s587,00/); // o topo da faixa dele, não a média
  await expect(painel(page)).toContainText(/Moradia\s*R\$\s1\.200,00/);
  await expect(painel(page)).not.toContainText('Lazer'); // nunca gastou: nada é sugerido
});

test('"Aplicar como limites" grava a sugestão no Orçamento e a pessoa continua podendo ajustar', async ({ page }) => {
  await abrir(page, HISTORICO);
  await sugerir(page).click();
  await aplicar(page).click();
  await expect(page.getByRole('status')).toContainText('Limites aplicados');
  await expect(painel(page)).toBeHidden();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('587,00');
  await expect(page.getByLabel('Limite para Moradia')).toHaveValue('1200,00');
  await expect(page.getByLabel('Limite para Lazer')).toHaveCount(0); // sem limite inventado, e o Lazer nem aparece na lista
  await expect(page.getByRole('heading', { name: 'Envelopes do mês' })).toBeFocused();
});

test('aplicar por cima de limites antigos pode ser desfeito', async ({ page }) => {
  await abrir(page, { ...HISTORICO, budgets: { mercado: 99000 } });
  page.on('dialog', (d) => d.accept());
  await sugerir(page).click();
  await aplicar(page).click();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('587,00');
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('990,00');
});

test('"Agora não" fecha a sugestão sem mudar nada', async ({ page }) => {
  await abrir(page, { ...HISTORICO, budgets: { mercado: 99000 } });
  await sugerir(page).click();
  await painel(page).getByRole('button', { name: 'Agora não' }).click();
  await expect(painel(page)).toBeHidden();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('990,00');
  await expect(sugerir(page)).toBeFocused();
});

test('sobra sem destino aparece como sobra: o app não decide sozinho o que fazer com ela', async ({ page }) => {
  await abrir(page, HISTORICO);
  await sugerir(page).click();
  await expect(painel(page)).toContainText(/Sobram R\$\s1\.225,00 sem destino/);
  await expect(painel(page)).toContainText('Você ainda não tem uma meta de reserva de emergência');
  await painel(page).getByRole('button', { name: 'Ir para Metas' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Metas' })).toBeVisible();
});

test('com metas, mostra quanto vai para cada uma e, se não couber, quanto a meta demora', async ({ page }) => {
  await abrir(page, { ...HISTORICO, goals: [
    { id: 'g1', name: 'Reserva de emergência', target: 1200000, saved: 0, deadline: '' },
    { id: 'g2', name: 'Viagem', target: 600000, saved: 0, deadline: '2027-03-01' },
  ] });
  await sugerir(page).click();
  await expect(painel(page)).toContainText(/Reserva de emergência\s*R\$\s1\.000,00 por mês/);
  await expect(painel(page)).toContainText(/Viagem\s*R\$\s225,00 por mês, de R\$\s1\.000,00 que ela precisa/); // sobrou só isso depois da reserva
  await expect(painel(page)).toContainText('Nesse ritmo, leva 27 meses');
  await aplicar(page).click();
  await expect(page.getByLabel('Limite para Reserva de emergência')).toHaveValue('1000,00');
});

test('renda que não cobre o básico: mostra o buraco e o que rever primeiro, sem sugerir gasto de estilo de vida', async ({ page }) => {
  await abrir(page, { version: 1, transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 150000, date: '2026-09-07', description: '' },
    ...['2026-06', '2026-07'].flatMap((m, i) => [
      { id: `d${i}a`, type: 'expense', categoryId: 'moradia', amount: 120000, date: `${m}-05`, description: '' },
      { id: `d${i}b`, type: 'expense', categoryId: 'mercado', amount: 50000, date: `${m}-10`, description: '' },
      { id: `d${i}c`, type: 'expense', categoryId: 'assinaturas', amount: 10000, date: `${m}-12`, description: '' },
      { id: `d${i}d`, type: 'expense', categoryId: 'lazer', amount: 8000, date: `${m}-15`, description: '' },
    ]),
  ] });
  await sugerir(page).click();
  await expect(painel(page)).toContainText(/faltam R\$\s300,00/);
  await expect(painel(page)).toContainText(/Para rever primeiro:.*Assinaturas/);
  await expect(painel(page)).not.toContainText('Para gastar, até');
  await expect(painel(page)).not.toContainText('Sobram');
});

test('um gasto fora do comum aparece na tela, mas não entra na conta', async ({ page }) => {
  const compras = (id, mes, valor) => ({ id, type: 'expense', categoryId: 'compras', amount: valor, date: `${mes}-10`, description: '' });
  await abrir(page, { ...HISTORICO, transactions: [...HISTORICO.transactions, compras('c1', '2026-05', 250000), compras('c2', '2026-06', 10000), compras('c3', '2026-07', 10000), compras('c4', '2026-08', 12000)] });
  await sugerir(page).click();
  await expect(painel(page)).toContainText(/Não entrou na conta: Compras teve R\$\s2\.500,00 num mês fora do comum/);
  await expect(painel(page)).toContainText(/Compras\s*até R\$\s110,00/);
});

test('com pouco histórico, a tela avisa que a sugestão é só um ponto de partida', async ({ page }) => {
  await abrir(page, { version: 1, transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
    { id: 'a1', type: 'expense', categoryId: 'moradia', amount: 100000, date: '2026-07-05', description: '' },
  ] });
  await sugerir(page).click();
  await expect(painel(page)).toContainText('Baseada em só 1 mês de histórico');
});

test('"Como calculamos" fica recolhido e explica a conta em palavras simples', async ({ page }) => {
  await abrir(page, HISTORICO);
  await sugerir(page).click();
  const texto = painel(page).getByText(/O app não usa porcentagens fixas/);
  await expect(texto).toBeHidden();
  await painel(page).locator('summary', { hasText: 'Como calculamos' }).click();
  await expect(texto).toBeVisible();
});

test('com limites já definidos, pergunta antes de substituir', async ({ page }) => {
  await abrir(page, { ...HISTORICO, budgets: { mercado: 99000 } });
  let pergunta = '';
  page.on('dialog', (d) => { pergunta = d.message(); d.dismiss(); });
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await aplicar(page).click(); // a pergunta vem ao aplicar, não ao abrir a sugestão
  await expect.poll(() => pergunta).toContain('Substituir os limites atuais pela sugestão baseada nos seus gastos');
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue('990,00'); // recusou: nada mudou
});

test('sem gastos de meses anteriores, pergunta em vez de inventar números', async ({ page }) => {
  await abrir(page, { version: 1, transactions: [
    { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-09-07', description: '' },
    { id: 'a1', type: 'expense', categoryId: 'mercado', amount: 50000, date: '2026-09-08', description: '' },
  ] });
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await expect(page.getByRole('heading', { name: 'Conte quanto você gasta por mês' })).toBeVisible();
  await expect(page.getByLabel('Limite para Mercado')).toHaveValue(''); // nenhum número foi inventado
});

test('sem renda, pede a renda primeiro', async ({ page }) => {
  await abrir(page, { version: 1, transactions: [{ id: 'a1', type: 'expense', categoryId: 'mercado', amount: 50000, date: '2026-08-08', description: '' }] });
  await page.getByRole('button', { name: 'Sugerir pelos meus gastos' }).click();
  await expect(page.getByRole('status')).toContainText('Lance sua renda primeiro');
});

test('a tela explica de onde vêm os valores sugeridos', async ({ page }) => {
  await abrir(page, HISTORICO);
  await expect(page.locator('#tab-orcamento')).toContainText('olha o que você realmente gastou nos últimos meses');
  await expect(page.locator('#tab-orcamento')).toContainText('só sugere limite para o que você usa');
});
