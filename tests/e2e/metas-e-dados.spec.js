const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { APP, irParaAba } = require('./ajuda');

// Ações que mexem em metas e nos dados e que nenhum teste percebia se quebrassem: atualizar a meta de
// reserva, excluir uma meta, "Apagar tudo" e o conteúdo do CSV exportado. Provado por sabotagem na
// varredura da refatoração do `handleAction` (desligar a ação não derrubava nenhum teste).
// Hoje fixo em 20/09/2026.

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T12:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('finan:data', JSON.stringify({
      version: 1,
      transactions: [
        { id: 'r1', type: 'income', categoryId: 'salario', amount: 300000, date: '2026-08-05', description: 'Salário' },
        { id: 'e1', type: 'expense', categoryId: 'moradia', amount: 100000, date: '2026-08-10', description: 'Aluguel' },
        { id: 'e2', type: 'expense', categoryId: 'mercado', amount: 50000, date: '2026-08-12', description: 'Feira de São João' },
        { id: 'e3', type: 'expense', categoryId: 'mercado', amount: 2590, date: '2026-09-02', description: 'Padaria' },
      ],
      goals: [
        { id: 'm1', name: 'Reserva de emergência', target: 100000, saved: 0, deadline: '' },
        { id: 'm2', name: 'Viagem', target: 600000, saved: 0, deadline: '' },
      ],
    }));
  });
  await page.goto(APP);
});

const meta = (page, nome) => page.locator('#goal-list .goal').filter({ hasText: nome });
const dadosSalvos = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('finan:data')));

test('"Atualizar minha meta" põe o valor ideal na reserva e o botão some', async ({ page }) => {
  await irParaAba(page, 'Metas');
  const atualizar = page.getByRole('button', { name: /Atualizar minha meta para R\$\s9\.000,00/ });
  await expect(meta(page, 'Reserva de emergência')).toContainText(/de R\$\s1\.000,00/);
  await atualizar.click();
  await expect(page.getByRole('status')).toContainText('Meta de reserva atualizada.');
  await expect(meta(page, 'Reserva de emergência')).toContainText(/de R\$\s9\.000,00/);
  await expect(atualizar).toHaveCount(0);
  expect((await dadosSalvos(page)).goals.find((g) => g.id === 'm1').target).toBe(900000);
});

test('"Excluir meta" pergunta antes, apaga só a meta escolhida e respeita o "cancelar"', async ({ page }) => {
  await irParaAba(page, 'Metas');
  const excluir = page.getByRole('button', { name: 'Excluir meta Viagem' });

  const perguntas = [];
  page.once('dialog', (d) => { perguntas.push(d.message()); d.dismiss(); });
  await excluir.click();
  expect(perguntas).toEqual(['Excluir esta meta?']);
  await expect(meta(page, 'Viagem')).toHaveCount(1); // cancelou: continua lá

  page.once('dialog', (d) => d.accept());
  await excluir.click();
  await expect(page.getByRole('status')).toContainText('Meta excluída.');
  await expect(meta(page, 'Viagem')).toHaveCount(0);
  await expect(meta(page, 'Reserva de emergência')).toHaveCount(1); // as outras ficam
  expect((await dadosSalvos(page)).goals.map((g) => g.id)).toEqual(['m1']);
});

test('"Apagar tudo" pergunta antes, apaga lançamentos e metas, e volta às boas-vindas', async ({ page }) => {
  await irParaAba(page, 'Método');
  const apagar = page.getByRole('button', { name: 'Apagar tudo' });

  const perguntas = [];
  page.once('dialog', (d) => { perguntas.push(d.message()); d.dismiss(); });
  await apagar.click();
  expect(perguntas[0]).toContain('Apagar TODOS os lançamentos');
  expect((await dadosSalvos(page)).transactions).toHaveLength(4); // cancelou: nada mudou

  page.once('dialog', (d) => d.accept());
  await apagar.click();
  await expect(page.getByRole('status')).toContainText('Dados apagados.');
  const dados = await dadosSalvos(page);
  expect(dados.transactions).toEqual([]);
  expect(dados.goals).toEqual([]);
  await irParaAba(page, 'Painel');
  await expect(page.locator('#onboarding')).toContainText('Bem-vindo ao Finan');
});

test('o CSV exportado começa com o marcador que o Excel precisa para acentos e separa por ponto e vírgula', async ({ page }) => {
  await irParaAba(page, 'Lançamentos');
  const [baixado] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ]);
  expect(baixado.suggestedFilename()).toBe('finan-2026-09.csv');
  const texto = fs.readFileSync(await baixado.path(), 'utf8');
  expect(texto.startsWith('﻿')).toBe(true); // sem ele o Excel mostra "SÃ£o" no lugar de "São"
  expect(texto).toContain('Padaria');
  expect(texto).toContain(';');
  expect(texto).not.toContain('Feira de São João'); // é de agosto: o CSV é só do mês aberto
});
