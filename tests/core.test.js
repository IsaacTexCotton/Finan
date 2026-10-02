const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/core.js');

const cats = F.DEFAULT_CATEGORIES;
let seq = 0;
const tx = (type, categoryId, amount, date, extra = {}) => ({ id: `t${++seq}`, type, categoryId, amount, date, description: '', recurring: false, createdAt: seq, ...extra });

test('parseAmount entende formatos brasileiros e internacionais', () => {
  assert.equal(F.parseAmount('1.234,56'), 123456);
  assert.equal(F.parseAmount('R$ 12,5'), 1250);
  assert.equal(F.parseAmount('1234.56'), 123456);
  assert.equal(F.parseAmount('1,234.56'), 123456);
  assert.equal(F.parseAmount('1.234'), 123400);
  assert.equal(F.parseAmount('1.234.567'), 123456700);
  assert.equal(F.parseAmount('0,29'), 29);
  assert.equal(F.parseAmount('10,005'), 1001);
  assert.equal(F.parseAmount(10), 1000);
  assert.equal(F.parseAmount('-5'), -500);
  assert.ok(Number.isNaN(F.parseAmount('')));
  assert.ok(Number.isNaN(F.parseAmount('abc')));
  assert.ok(Number.isNaN(F.parseAmount('1,2,3a')));
});

test('formatBRL formata em reais', () => {
  assert.equal(F.formatBRL(123456).replace(/\s/g, ' '), 'R$ 1.234,56');
});

test('datas: meses, dias e semanas', () => {
  assert.equal(F.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(F.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(F.daysInMonth('2028-02'), 29);
  assert.equal(F.monthLabel('2026-09'), 'setembro de 2026');
  assert.equal(F.elapsedDays('2026-09', '2026-09-15'), 15);
  assert.equal(F.elapsedDays('2026-08', '2026-09-15'), 31);
  assert.equal(F.elapsedDays('2026-10', '2026-09-15'), 0);
  assert.equal(F.weekKey('2026-09-29'), '2026-W40');
  assert.equal(F.weekKey('2027-01-01'), '2026-W53');
});

test('summarize separa receitas, despesas e baldes', () => {
  const list = [
    tx('income', 'salario', 500000, '2026-09-05'),
    tx('expense', 'moradia', 150000, '2026-09-05'),
    tx('expense', 'mercado', 80000, '2026-09-10'),
    tx('expense', 'lazer', 50000, '2026-09-12'),
    tx('expense', 'investimentos', 100000, '2026-09-06'),
  ];
  const s = F.summarize(list, cats);
  assert.equal(s.income, 500000);
  assert.equal(s.expense, 380000);
  assert.equal(s.balance, 120000);
  assert.deepEqual(s.byBucket, { essencial: 230000, estilo: 50000, futuro: 100000 });
  // Decisão do Isaac (30/09/2026): a taxa de poupança conta só o que foi guardado (balde Futuro),
  // não a sobra do mês. Antes era (renda - gastos) / renda = 0,44.
  assert.equal(s.savingsRate, 0.2);
  assert.equal(s.saved, 100000);

  const b = F.bucketAnalysis(s);
  assert.deepEqual(b.map((x) => x.status), ['ok', 'ok', 'ok']);
  assert.equal(b[0].target, 250000);
});

test('bucketAnalysis sinaliza baldes acima da meta e futuro abaixo', () => {
  const s = F.summarize([
    tx('income', 'salario', 100000, '2026-09-01'),
    tx('expense', 'moradia', 60000, '2026-09-01'),
    tx('expense', 'lazer', 31000, '2026-09-01'),
  ], cats);
  const byId = Object.fromEntries(F.bucketAnalysis(s).map((b) => [b.id, b.status]));
  assert.equal(byId.essencial, 'acima');
  assert.equal(byId.estilo, 'atencao');
  assert.equal(byId.futuro, 'abaixo');
});

test('budgetStatus projeta só categorias variáveis e calcula o gasto diário', () => {
  const list = [
    tx('expense', 'moradia', 150000, '2026-09-05'),
    tx('expense', 'restaurantes', 30000, '2026-09-08'),
    tx('expense', 'mercado', 20000, '2026-09-08'),
  ];
  const s = F.summarize(list, cats);
  const budgets = { moradia: 150000, restaurantes: 60000, mercado: 100000 };
  const rows = F.budgetStatus(budgets, s, cats, '2026-09', '2026-09-10');
  const byId = Object.fromEntries(rows.map((r) => [r.categoryId, r]));
  assert.equal(byId.moradia.status, 'ok'); // fixa: pagar o aluguel não é "risco"
  assert.equal(byId.restaurantes.projected, 90000);
  assert.equal(byId.restaurantes.status, 'risco');
  assert.equal(byId.mercado.status, 'ok');

  const daily = F.dailyAllowance(rows, '2026-09', '2026-09-10');
  assert.equal(daily.daysLeft, 21);
  assert.equal(daily.remaining, 110000);
  assert.equal(daily.perDay, Math.floor(110000 / 21));
  assert.equal(F.dailyAllowance(rows, '2026-08', '2026-09-10'), null);
});

test('budgetStatus marca envelope estourado', () => {
  const s = F.summarize([tx('expense', 'lazer', 70000, '2026-09-02')], cats);
  const [row] = F.budgetStatus({ lazer: 50000 }, s, cats, '2026-09', '2026-09-30');
  assert.equal(row.status, 'estourado');
  assert.equal(row.remaining, -20000);
});

// Decisão do Isaac (01/10/2026): a previsão de fim de mês só vale a partir do 7º dia. Antes disso,
// R$ 80 gastos no dia 2 viravam "vai gastar R$ 1.240" (alarme falso no começo de todo mês).
test('budgetStatus não prevê o fim do mês nos 6 primeiros dias', () => {
  const s = F.summarize([tx('expense', 'restaurantes', 8000, '2026-10-02')], cats);
  const [row] = F.budgetStatus({ restaurantes: 38000 }, s, cats, '2026-10', '2026-10-02');
  assert.equal(row.projected, 8000); // sem previsão: fica no que já gastou
  assert.equal(row.status, 'ok');
});

test('budgetStatus volta a prever o fim do mês a partir do 7º dia', () => {
  const s = F.summarize([tx('expense', 'restaurantes', 20000, '2026-10-06')], cats);
  const dia6 = F.budgetStatus({ restaurantes: 38000 }, s, cats, '2026-10', '2026-10-06')[0];
  assert.equal(dia6.status, 'ok');
  const dia7 = F.budgetStatus({ restaurantes: 38000 }, s, cats, '2026-10', '2026-10-07')[0];
  assert.equal(dia7.projected, Math.round((20000 / 7) * 31));
  assert.equal(dia7.status, 'risco');
});

test('budgetStatus avisa envelope estourado mesmo nos primeiros dias, porque não é previsão', () => {
  const s = F.summarize([tx('expense', 'restaurantes', 40000, '2026-10-02')], cats);
  const [row] = F.budgetStatus({ restaurantes: 38000 }, s, cats, '2026-10', '2026-10-02');
  assert.equal(row.status, 'estourado');
});

test('suggestBudgets distribui a renda pelo 50/30/20 respeitando o histórico', () => {
  const sug = F.suggestBudgets(1000000, cats, { moradia: 300000, mercado: 100000 });
  assert.equal(sug.moradia, 375000);
  assert.equal(sug.mercado, 125000);
  assert.equal(sug.transporte, undefined);
  const estilo = cats.filter((c) => c.bucket === 'estilo').reduce((sum, c) => sum + (sug[c.id] || 0), 0);
  assert.equal(estilo, 300000);
  assert.deepEqual(F.suggestBudgets(0, cats), {});
});

test('reserva de emergência usa a média dos meses anteriores', () => {
  const list = [
    tx('expense', 'moradia', 100000, '2026-07-05'),
    tx('expense', 'moradia', 200000, '2026-08-05'),
    tx('expense', 'lazer', 999999, '2026-08-06'),
  ];
  assert.equal(F.averageEssential(list, cats, '2026-09'), 150000);
  assert.equal(F.emergencyFundTarget(list, cats, '2026-09'), 900000);
  assert.equal(F.emergencyFundTarget(list, cats, '2026-09', 'estavel'), 900000);
  assert.equal(F.emergencyFundTarget(list, cats, '2026-09', 'variavel'), 1800000);
  assert.equal(F.emergencyFundTarget(list, cats, '2026-09', 'invalido'), 900000);
});

test('goalProgress calcula aporte mensal', () => {
  const p = F.goalProgress({ target: 1200000, saved: 200000, deadline: '2027-07-01' }, '2026-09-29');
  assert.equal(p.monthsLeft, 10);
  assert.equal(p.monthly, 100000);
  assert.equal(p.ratio, 200000 / 1200000);
  assert.equal(F.goalProgress({ target: 100, saved: 150 }, '2026-09-29').done, true);
});

test('recurringForMonth copia fixos sem duplicar e ajusta o dia', () => {
  const list = [
    tx('expense', 'moradia', 150000, '2026-01-31', { recurring: true, description: 'Aluguel' }),
    tx('expense', 'assinaturas', 3990, '2026-01-10', { recurring: true, description: 'Streaming' }),
    tx('expense', 'lazer', 5000, '2026-01-10'),
    tx('expense', 'assinaturas', 3990, '2026-02-10', { recurring: true, description: 'streaming ' }),
  ];
  let n = 0;
  const copies = F.recurringForMonth(list, '2026-01', '2026-02', () => `new${++n}`);
  assert.equal(copies.length, 1);
  assert.equal(copies[0].date, '2026-02-28');
  assert.equal(copies[0].id, 'new1');
});

test('insights priorizam problemas e elogiam boa poupança', () => {
  const s = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'lazer', 120000, '2026-09-02')], cats);
  const list = F.insights({ summary: s, buckets: F.bucketAnalysis(s), budgetRows: [], previousSummary: null, categories: cats });
  assert.equal(list[0].level, 'perigo');

  const good = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'investimentos', 30000, '2026-09-02')], cats);
  const ok = F.insights({ summary: good, buckets: F.bucketAnalysis(good), budgetRows: [], previousSummary: null, categories: cats });
  assert.ok(ok.some((i) => i.level === 'bom'));
});

test('normalizeData descarta dados inválidos de um backup', () => {
  const data = F.normalizeData({
    transactions: [
      tx('expense', 'mercado', 1000, '2026-09-01'),
      tx('expense', 'inexistente', 1000, '2026-09-01'),
      tx('expense', 'mercado', -5, '2026-09-01'),
      tx('expense', 'mercado', 10.5, '2026-09-01'),
      { id: 'x', type: 'expense', categoryId: 'mercado', amount: 100, date: '01/09/2026' },
    ],
    budgets: { mercado: 50000, lazer: 'muito', fantasma: 100 },
    goals: [{ id: 'g', name: 'Viagem', target: 500000, saved: 1000 }, { id: 'h', name: 'x', target: 0 }],
    reviews: { '2026-W40': ['registrar', 3], bad: [] },
  });
  assert.equal(data.transactions.length, 1);
  assert.deepEqual(data.budgets, { mercado: 50000 });
  assert.equal(data.goals.length, 1);
  assert.deepEqual(data.reviews, { '2026-W40': ['registrar'] });
  assert.equal(F.normalizeData(null).categories.length, cats.length);
});

test('toCSV usa ponto e vírgula e neutraliza fórmulas', () => {
  const csv = F.toCSV([tx('expense', 'mercado', 12345, '2026-09-01', { description: '=HYPERLINK("x")' })], cats);
  const [header, line] = csv.split('\n');
  assert.equal(header, 'Data;Tipo;Categoria;Balde;Descrição;Valor;Fixo');
  assert.equal(line, '2026-09-01;Despesa;Mercado;Essenciais;"\'=HYPERLINK(""x"")";-123,45;Não');
});

test('categorias padrão incluem as novas e chegam a quem já tem dados salvos', () => {
  const ids = cats.map((c) => c.id);
  for (const id of ['impostos', 'cuidados', 'presentes']) assert.ok(ids.includes(id), id);
  const byId = F.indexCategories(cats);
  assert.equal(byId.impostos.bucket, 'essencial');
  assert.equal(byId.cuidados.bucket, 'estilo');
  assert.equal(byId.presentes.bucket, 'estilo');

  const antigo = F.normalizeData({ categories: [{ id: 'mercado', name: 'Supermercado', type: 'expense', bucket: 'essencial', kind: 'variavel' }] });
  const nomes = F.indexCategories(antigo.categories);
  assert.equal(nomes.mercado.name, 'Supermercado'); // personalização preservada
  assert.ok(nomes.impostos && nomes.presentes && nomes.salario);
});

test('suggestBudgets: soma dos envelopes bate exatamente com a renda (sem sobra de arredondamento)', () => {
  for (const income of [1000000, 333300, 517000]) {
    const sug = F.suggestBudgets(income, cats);
    const total = Object.values(sug).reduce((a, b) => a + b, 0);
    assert.equal(total, Math.round(income / 1000) * 1000, `renda ${income}`);
  }
});

test('perfil de renda é salvo e validado', () => {
  assert.equal(F.emptyData().settings.incomeProfile, 'estavel');
  assert.equal(F.normalizeData({ settings: { incomeProfile: 'variavel' } }).settings.incomeProfile, 'variavel');
  assert.equal(F.normalizeData({ settings: { incomeProfile: 'hacker' } }).settings.incomeProfile, 'estavel');
});

test('createInstallments divide a compra mês a mês, somando o total exato', () => {
  let n = 0;
  const parcelas = F.createInstallments({ type: 'expense', categoryId: 'compras', amount: 100000, date: '2026-01-31', description: 'Notebook' }, 3, () => `id${++n}`);
  assert.equal(parcelas.length, 3);
  assert.deepEqual(parcelas.map((p) => p.amount), [33334, 33333, 33333]);
  assert.equal(parcelas.reduce((a, p) => a + p.amount, 0), 100000);
  assert.deepEqual(parcelas.map((p) => p.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.deepEqual(parcelas.map((p) => F.installmentLabel(p)), ['1/3', '2/3', '3/3']);
  assert.ok(parcelas.every((p) => p.installment.group === parcelas[0].installment.group && !p.recurring));
  assert.equal(new Set(parcelas.map((p) => p.id)).size, 3);
  assert.equal(F.createInstallments({ amount: 100, date: '2026-01-01' }, 999, () => 'x').length, F.MAX_INSTALLMENTS);
});

test('installmentCommitments soma só parcelas dos meses seguintes', () => {
  let n = 0;
  const parcelas = F.createInstallments({ type: 'expense', categoryId: 'compras', amount: 120000, date: '2026-09-10', description: 'TV' }, 4, () => `p${++n}`);
  const list = [...parcelas, tx('expense', 'mercado', 5000, '2026-10-01')];
  const c = F.installmentCommitments(list, '2026-09');
  assert.equal(c.total, 90000);
  assert.equal(c.months, 3);
  assert.equal(c.lastMonth, '2026-12');
  assert.equal(F.installmentCommitments(list, '2026-12').total, 0);

  const s = F.summarize([], cats);
  const msgs = F.insights({ summary: s, buckets: F.bucketAnalysis(s), budgetRows: [], previousSummary: null, categories: cats, commitments: c });
  assert.ok(msgs.some((m) => m.text.includes('parcelas') && m.text.includes('dezembro de 2026')));
});

test('normalizeData preserva parcelas válidas e descarta inválidas', () => {
  const base = tx('expense', 'compras', 1000, '2026-09-01');
  const data = F.normalizeData({ transactions: [
    { ...base, id: 'a', installment: { group: 'g', n: 2, of: 5 } },
    { ...base, id: 'b', installment: { group: 'g', n: 6, of: 5 } },
  ] });
  assert.deepEqual(data.transactions[0].installment, { group: 'g', n: 2, of: 5 });
  assert.equal(data.transactions[1].installment, undefined);
});

test('adaptivePlan segue a regra aprovada (exemplos da Parte 3)', () => {
  const split = (p) => `${p.essencial}/${p.estilo}/${p.futuro}`;
  assert.equal(split(F.adaptivePlan(null)), '50/30/20');
  assert.equal(F.adaptivePlan(null).profile, 'sem-historico');
  assert.equal(split(F.adaptivePlan(0.45)), '50/30/20');
  assert.equal(F.adaptivePlan(0.45).profile, 'confortavel');
  assert.equal(split(F.adaptivePlan(0.50)), '50/30/20');
  assert.equal(split(F.adaptivePlan(0.55)), '55/30/15');
  assert.equal(split(F.adaptivePlan(0.6)), '60/25/15'); // 0.6 * 100 não pode virar 65 por erro de ponto flutuante
  assert.equal(split(F.adaptivePlan(0.57)), '60/25/15');
  assert.equal(split(F.adaptivePlan(0.70)), '70/20/10');
  assert.equal(split(F.adaptivePlan(0.80)), '80/15/5');
  assert.equal(F.adaptivePlan(0.80).profile, 'ajustando');
  assert.equal(split(F.adaptivePlan(0.85)), '85/10/5');
  assert.equal(F.adaptivePlan(0.85).profile, 'critico');
  assert.equal(split(F.adaptivePlan(0.97)), '100/0/0');
  assert.equal(split(F.adaptivePlan(1.3)), '100/0/0');
  for (let s = 0; s <= 1.2; s += 0.01) {
    const p = F.adaptivePlan(s);
    assert.equal(p.essencial + p.estilo + p.futuro, 100, `share ${s}`);
  }
});

test('essentialShare usa os 3 meses anteriores com renda, sem o mês corrente', () => {
  const list = [
    tx('income', 'salario', 100000, '2026-05-01'),
    tx('expense', 'moradia', 90000, '2026-05-02'), // 4 meses atrás: fora da janela
    tx('income', 'salario', 100000, '2026-07-01'),
    tx('expense', 'moradia', 60000, '2026-07-02'),
    tx('income', 'salario', 100000, '2026-08-01'),
    tx('expense', 'moradia', 70000, '2026-08-02'),
    tx('expense', 'lazer', 20000, '2026-08-03'),
    tx('expense', 'moradia', 100000, '2026-09-02'), // mês corrente: ignorado
  ];
  assert.equal(F.essentialShare(list, cats, '2026-09'), 0.65);
  assert.equal(F.essentialShare([], cats, '2026-09'), null);
});

test('plano adaptativo muda as metas dos baldes, os envelopes sugeridos e as mensagens', () => {
  const plan = F.adaptivePlan(0.6);
  const s = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'moradia', 58000, '2026-09-02'), tx('expense', 'investimentos', 15000, '2026-09-02')], cats);
  const byId = Object.fromEntries(F.bucketAnalysis(s, plan).map((b) => [b.id, b]));
  assert.equal(byId.essencial.target, 60000);
  assert.equal(byId.essencial.status, 'ok'); // acima de 50%, mas dentro do plano adaptado
  assert.equal(byId.futuro.target, 15000);
  assert.equal(byId.futuro.status, 'ok');

  const sug = F.suggestBudgets(100000, cats, {}, plan);
  const futuro = cats.filter((c) => c.bucket === 'futuro').reduce((a, c) => a + (sug[c.id] || 0), 0);
  assert.equal(futuro, 15000);

  const msgs = F.insights({ summary: s, buckets: F.bucketAnalysis(s, plan), budgetRows: [], previousSummary: null, categories: cats, plan });
  assert.ok(msgs.some((m) => m.text.includes('60/25/15')));
  assert.ok(msgs.some((m) => m.level === 'bom')); // poupou 42% ≥ meta de 15%

  const critico = F.insights({ summary: s, buckets: [], budgetRows: [], previousSummary: null, categories: cats, plan: F.adaptivePlan(0.9) });
  assert.ok(critico.some((m) => m.level === 'alerta' && m.text.includes('reduzir custos fixos')));
});

test('gastos, guardado e sobrou separam o que foi consumido do que foi guardado', () => {
  const s = F.summarize([
    tx('income', 'salario', 500000, '2026-09-05'),
    tx('expense', 'moradia', 150000, '2026-09-05'),
    tx('expense', 'mercado', 80000, '2026-09-10'),
    tx('expense', 'lazer', 40000, '2026-09-12'),
    tx('expense', 'investimentos', 60000, '2026-09-06'),
    tx('expense', 'reserva', 30000, '2026-09-06'),
  ], cats);
  assert.equal(s.consumption, 270000); // Gastos: essenciais + estilo de vida
  assert.equal(s.saved, 90000); // Guardado: balde Futuro
  assert.equal(s.balance, 140000); // Sobrou: renda - gastos - guardado
  assert.equal(s.consumption + s.saved + s.balance, s.income, 'os três somam exatamente a renda');
  assert.equal(s.savingsRate, 0.18);
});

test('a sobra do mês não conta como poupança: sem guardar nada, a taxa é zero', () => {
  const s = F.summarize([tx('income', 'salario', 280000, '2026-09-01'), tx('expense', 'mercado', 35000, '2026-09-02')], cats);
  assert.equal(s.saved, 0);
  assert.equal(s.savingsRate, 0);
  assert.equal(s.balance, 245000); // sobrou bastante, mas nada foi guardado
});

test('insights não elogiam a poupança de quem não guardou nada, mesmo sobrando dinheiro', () => {
  const s = F.summarize([tx('income', 'salario', 280000, '2026-09-01'), tx('expense', 'moradia', 90000, '2026-09-02')], cats);
  const list = F.insights({ summary: s, buckets: F.bucketAnalysis(s), budgetRows: [], previousSummary: null, categories: cats });
  assert.ok(!list.some((i) => /Excelente/.test(i.text)), 'não pode haver "Excelente" com R$ 0,00 guardados');
  assert.ok(list.some((i) => /Você guardou R\$\s0,00/.test(i.text)));
});

test('insights elogiam quem guardou a meta, dizendo quanto da renda foi guardado', () => {
  const s = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'investimentos', 25000, '2026-09-02')], cats);
  const list = F.insights({ summary: s, buckets: F.bucketAnalysis(s), budgetRows: [], previousSummary: null, categories: cats });
  const elogio = list.find((i) => i.level === 'bom');
  assert.ok(elogio && elogio.text.includes('Você guardou 25% da renda'), elogio && elogio.text);
});

test('insights distinguem gastar mais do que ganhou de guardar mais do que sobrou', () => {
  const gastou = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'lazer', 120000, '2026-09-02')], cats);
  const a = F.insights({ summary: gastou, buckets: F.bucketAnalysis(gastou), budgetRows: [], previousSummary: null, categories: cats });
  assert.equal(a[0].level, 'perigo');
  assert.match(a[0].text, /Você gastou R\$\s200,00 a mais do que ganhou/);

  const guardou = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'moradia', 50000, '2026-09-02'), tx('expense', 'investimentos', 60000, '2026-09-02')], cats);
  const b = F.insights({ summary: guardou, buckets: F.bucketAnalysis(guardou), budgetRows: [], previousSummary: null, categories: cats });
  assert.equal(b[0].level, 'alerta');
  assert.match(b[0].text, /Gastos mais o que você guardou passam da renda em R\$\s100,00/);
});

// ---------- Guardado nas metas entra no Painel (decisão do Isaac, 30/09/2026) ----------

test('"Metas" é uma categoria do balde Futuro, para o que se guarda nas metas', () => {
  const metas = F.indexCategories(cats).metas;
  assert.ok(metas, 'falta a categoria metas');
  assert.equal(metas.bucket, 'futuro');
  assert.equal(metas.type, 'expense');
});

test('goalSaved soma o valor inicial da meta e os depósitos ligados a ela', () => {
  const meta = { id: 'g1', name: 'Viagem', target: 600000, saved: 120000, deadline: '' };
  const lista = [
    tx('expense', 'metas', 30000, '2026-09-10', { goalId: 'g1' }),
    tx('expense', 'metas', 10000, '2026-09-20', { goalId: 'g1' }),
    tx('expense', 'metas', 99999, '2026-09-20', { goalId: 'outra' }),
    tx('expense', 'mercado', 5000, '2026-09-21'),
  ];
  assert.equal(F.goalSaved(meta, lista), 160000);
  assert.equal(F.goalSaved(meta, []), 120000);
  assert.equal(F.goalSaved(meta), 120000);
});

test('createGoalDeposit cria um lançamento do Futuro ligado à meta', () => {
  const viagem = { id: 'g1', name: 'Viagem de férias', target: 600000, saved: 0, deadline: '' };
  const dep = F.createGoalDeposit(viagem, 30000, '2026-09-15', 'novo-id');
  assert.equal(dep.id, 'novo-id');
  assert.equal(dep.type, 'expense');
  assert.equal(dep.amount, 30000);
  assert.equal(dep.date, '2026-09-15');
  assert.equal(dep.goalId, 'g1');
  assert.equal(dep.categoryId, 'metas');
  assert.equal(dep.description, 'Meta: Viagem de férias');
  assert.equal(dep.recurring, false);

  const reserva = { id: 'g2', name: 'Reserva de emergência', target: 1800000, saved: 0, deadline: '' };
  assert.equal(F.createGoalDeposit(reserva, 10000, '2026-09-15', 'x').categoryId, 'reserva');

  // e ele conta como Guardado, não como Gasto
  const s = F.summarize([tx('income', 'salario', 500000, '2026-09-01'), dep], cats);
  assert.equal(s.saved, 30000);
  assert.equal(s.consumption, 0);
  assert.equal(s.balance, 470000);
});

test('goalProgress usa os depósitos ligados à meta', () => {
  const meta = { id: 'g1', name: 'Viagem', target: 1000000, saved: 200000, deadline: '' };
  const lista = [tx('expense', 'metas', 300000, '2026-09-10', { goalId: 'g1' })];
  const p = F.goalProgress(meta, '2026-09-29', lista);
  assert.equal(p.remaining, 500000);
  assert.equal(p.ratio, 0.5);
  assert.equal(F.goalProgress(meta, '2026-09-29').remaining, 800000); // sem a lista, como antes
});

test('normalizeData preserva o vínculo do lançamento com a meta', () => {
  const base = tx('expense', 'metas', 1000, '2026-09-01');
  const data = F.normalizeData({ transactions: [{ ...base, id: 'a', goalId: 'g1' }, { ...base, id: 'b', goalId: 42 }, { ...base, id: 'c' }] });
  assert.equal(data.transactions[0].goalId, 'g1');
  assert.equal(data.transactions[1].goalId, undefined);
  assert.equal(data.transactions[2].goalId, undefined);
});

test('leftAfterSaving diz quanto sobraria do mês depois de guardar mais um valor', () => {
  const s = F.summarize([
    tx('income', 'salario', 100000, '2026-09-01'),
    tx('expense', 'moradia', 50000, '2026-09-02'),
    tx('expense', 'investimentos', 40000, '2026-09-03'),
  ], cats); // sobrou 10.000
  assert.equal(F.leftAfterSaving(s, 5000), 5000);
  assert.equal(F.leftAfterSaving(s, 10000), 0);
  assert.equal(F.leftAfterSaving(s, 20000), -10000); // passaria do que sobrou
});

test('leftAfterSaving não julga quando não há renda registrada', () => {
  const semRenda = F.summarize([tx('expense', 'moradia', 50000, '2026-09-02')], cats);
  assert.equal(F.leftAfterSaving(semRenda, 10000), null);
});

test('leftAfterSaving continua negativo se o mês já estava no vermelho', () => {
  const vermelho = F.summarize([tx('income', 'salario', 100000, '2026-09-01'), tx('expense', 'lazer', 130000, '2026-09-02')], cats);
  assert.equal(F.leftAfterSaving(vermelho, 1000), -31000);
});

test('nthBusinessDay acha o N-ésimo dia útil (segunda a sexta, sem feriados)', () => {
  assert.equal(F.nthBusinessDay('2026-09', 5), '2026-09-07'); // 1 é terça
  assert.equal(F.nthBusinessDay('2026-10', 5), '2026-10-07');
  assert.equal(F.nthBusinessDay('2026-08', 1), '2026-08-03'); // 1º de agosto é sábado
  assert.equal(F.nthBusinessDay('2026-08', 5), '2026-08-07');
});

test('paydayCycle: o ciclo vai de um pagamento ao próximo', () => {
  assert.deepEqual(F.paydayCycle('2026-09-20', 5), { start: '2026-09-07', end: '2026-10-07', daysLeft: 17 });
  // antes do pagamento do mês, ainda vale o ciclo do mês anterior
  assert.deepEqual(F.paydayCycle('2026-09-04', 5), { start: '2026-08-07', end: '2026-09-07', daysLeft: 3 });
  // no dia do pagamento, um ciclo novo começa
  assert.deepEqual(F.paydayCycle('2026-09-07', 5), { start: '2026-09-07', end: '2026-10-07', daysLeft: 30 });
  // virada de ano
  assert.deepEqual(F.paydayCycle('2026-12-30', 5), { start: '2026-12-07', end: '2027-01-07', daysLeft: 8 });
});

test('allowanceUntilPayday divide o que sobra nos envelopes variáveis até o próximo pagamento', () => {
  const list = [
    tx('expense', 'mercado', 5000, '2026-09-02'), // ciclo anterior: não conta
    tx('expense', 'mercado', 10000, '2026-09-10'),
    tx('expense', 'moradia', 150000, '2026-09-08'), // fixa: não entra
  ];
  const budgets = { mercado: 60000, moradia: 150000 };
  const r = F.allowanceUntilPayday(list, cats, budgets, '2026-09-20', 5);
  assert.equal(r.remaining, 50000);
  assert.equal(r.daysLeft, 17);
  assert.equal(r.perDay, Math.floor(50000 / 17));
  assert.equal(r.nextPayday, '2026-10-07');
  assert.equal(F.allowanceUntilPayday(list, cats, { moradia: 150000 }, '2026-09-20', 5), null);
});

test('dia de pagamento nos ajustes: só 1 a 10, senão 0 (não informado)', () => {
  assert.equal(F.emptyData().settings.paydayBusinessDay, 0);
  assert.equal(F.normalizeData({ settings: { paydayBusinessDay: 5 } }).settings.paydayBusinessDay, 5);
  assert.equal(F.normalizeData({ settings: { paydayBusinessDay: 11 } }).settings.paydayBusinessDay, 0);
  assert.equal(F.normalizeData({ settings: { paydayBusinessDay: 2.5 } }).settings.paydayBusinessDay, 0);
  assert.equal(F.normalizeData({ settings: { paydayBusinessDay: '5' } }).settings.paydayBusinessDay, 0);
});

test('dailyAllowance também diz quanto dá para gastar até domingo', () => {
  const s = F.summarize([tx('expense', 'mercado', 20000, '2026-09-08')], cats);
  const rows = F.budgetStatus({ mercado: 100000 }, s, cats, '2026-09', '2026-09-10');
  // quinta-feira 10/09: hoje, sexta, sábado e domingo = 4 dos 21 dias que faltam
  const quinta = F.dailyAllowance(rows, '2026-09', '2026-09-10');
  assert.equal(quinta.weekDays, 4);
  assert.equal(quinta.perWeek, Math.floor((80000 * 4) / 21));
  // domingo 13/09: só o próprio dia
  assert.equal(F.dailyAllowance(rows, '2026-09', '2026-09-13').weekDays, 1);
  // segunda 28/09: faltam só 3 dias no mês, menos que os 7 da semana; vale o que sobra do mês
  const fim = F.dailyAllowance(rows, '2026-09', '2026-09-28');
  assert.equal(fim.weekDays, 3);
  assert.equal(fim.perWeek, 80000);
});

test('allowanceUntilPayday também diz quanto dá para gastar até domingo', () => {
  const list = [tx('expense', 'mercado', 10000, '2026-09-10')];
  // segunda 14/09: 7 dias de semana, 23 dias até o pagamento de 07/10
  const r = F.allowanceUntilPayday(list, cats, { mercado: 60000 }, '2026-09-14', 5);
  assert.equal(r.daysLeft, 23);
  assert.equal(r.weekDays, 7);
  assert.equal(r.perWeek, Math.floor((50000 * 7) / 23));
  // sexta 04/09, pagamento na segunda 07/09: faltam 3 dias (sexta a domingo)
  const antes = F.allowanceUntilPayday(list, cats, { mercado: 60000 }, '2026-09-04', 5);
  assert.equal(antes.daysLeft, 3);
  assert.equal(antes.weekDays, 3);
});

test('isoWeekday: segunda = 1 … domingo = 7', () => {
  assert.equal(F.isoWeekday('2026-09-28'), 1);
  assert.equal(F.isoWeekday('2026-09-30'), 3);
  assert.equal(F.isoWeekday('2026-09-27'), 7);
});

test('reviewReminder lembra no dia escolhido e depois dele, até a revisão da semana ficar completa', () => {
  // semana de 21 a 27/09/2026 (segunda a domingo); revisão com 6 itens
  assert.equal(F.reviewReminder('2026-09-27', 7, 0, 6), 'hoje');
  assert.equal(F.reviewReminder('2026-09-26', 7, 0, 6), null); // ainda não chegou o dia
  assert.equal(F.reviewReminder('2026-09-25', 5, 0, 6), 'hoje'); // sexta escolhida
  assert.equal(F.reviewReminder('2026-09-26', 5, 0, 6), 'atrasada'); // passou e não fez
  assert.equal(F.reviewReminder('2026-09-26', 5, 3, 6), 'atrasada'); // revisão pela metade
  assert.equal(F.reviewReminder('2026-09-25', 5, 6, 6), null); // completa: sem lembrete
  assert.equal(F.reviewReminder('2026-09-28', 7, 0, 6), null); // nova semana, o dia ainda não chegou
});

test('dia da revisão nos ajustes: 1 a 7, senão domingo (7)', () => {
  assert.equal(F.emptyData().settings.reviewDay, 7);
  assert.equal(F.normalizeData({ settings: { reviewDay: 3 } }).settings.reviewDay, 3);
  for (const invalido of [0, 8, 2.5, '3', null]) {
    assert.equal(F.normalizeData({ settings: { reviewDay: invalido } }).settings.reviewDay, 7);
  }
});

test('o "pode gastar" nunca passa do que sobrou no mês (teto pelo Sobrou)', () => {
  const hoje = '2026-09-20'; // faltam 11 dias
  const budgets = { mercado: 60000 };
  const base = [tx('income', 'salario', 300000, '2026-09-07'), tx('expense', 'mercado', 10000, '2026-09-10')];
  const pace = (extra = [], lista = base) => {
    const s = F.summarize([...lista, ...extra], cats);
    return F.dailyAllowance(F.budgetStatus(budgets, s, cats, '2026-09', hoje), '2026-09', hoje, s);
  };
  const guardar = (centavos) => [tx('expense', 'metas', centavos, '2026-09-12', { goalId: 'g1' })];

  // sobra mais do que os envelopes têm: vale o envelope
  const folga = pace(guardar(200000)); // sobrou R$ 900
  assert.equal(folga.remaining, 50000);
  assert.equal(folga.capped, false);
  assert.equal(folga.saved, 200000);

  // guardou tanto que sobrou menos do que os envelopes prometem: vale o que sobrou
  const justo = pace(guardar(270000)); // sobrou R$ 200
  assert.equal(justo.remaining, 20000);
  assert.equal(justo.envelopeRemaining, 50000);
  assert.equal(justo.left, 20000);
  assert.equal(justo.capped, true);
  assert.equal(justo.perDay, Math.floor(20000 / 11));

  // sobra negativa não vira valor negativo
  const vermelho = pace(guardar(400000));
  assert.equal(vermelho.remaining, 0);
  assert.equal(vermelho.perDay, 0);
  assert.equal(vermelho.capped, true);

  // sem renda registrada não há o que comparar: não limita
  const semRenda = pace(guardar(270000), [base[1]]);
  assert.equal(semRenda.remaining, 50000);
  assert.equal(semRenda.capped, false);
});

test('allowanceUntilPayday também limita pelo que sobrou no ciclo do salário', () => {
  const budgets = { mercado: 60000 };
  const ciclo = [
    tx('income', 'salario', 300000, '2026-09-07'),
    tx('expense', 'mercado', 10000, '2026-09-10'),
    tx('expense', 'metas', 270000, '2026-09-12', { goalId: 'g1' }),
  ];
  const r = F.allowanceUntilPayday(ciclo, cats, budgets, '2026-09-20', 5);
  assert.equal(r.remaining, 20000); // sobrou R$ 200 no ciclo
  assert.equal(r.envelopeRemaining, 50000);
  assert.equal(r.capped, true);
  assert.equal(r.saved, 270000);
  assert.equal(r.perDay, Math.floor(20000 / 17));

  // antes do pagamento do mês, vale o ciclo anterior: o salário de setembro ainda não entrou
  const antes = F.allowanceUntilPayday([tx('income', 'salario', 300000, '2026-08-07'), tx('expense', 'mercado', 10000, '2026-08-20')], cats, budgets, '2026-09-04', 5);
  assert.equal(antes.capped, false);
  assert.equal(antes.remaining, 50000);
  // sem renda dentro do ciclo, não limita
  const semRenda = F.allowanceUntilPayday([tx('expense', 'mercado', 10000, '2026-09-10')], cats, budgets, '2026-09-20', 5);
  assert.equal(semRenda.capped, false);
});

test('bucketCeilings divide a renda pelo plano em múltiplos de R$ 10, somando a renda arredondada', () => {
  assert.deepEqual(F.bucketCeilings(300000, { essencial: 50, estilo: 30, futuro: 20 }), { essencial: 150000, estilo: 90000, futuro: 60000 });
  assert.deepEqual(F.bucketCeilings(0, { essencial: 50, estilo: 30, futuro: 20 }), { essencial: 0, estilo: 0, futuro: 0 });
  for (const income of [333300, 517000, 280500]) {
    for (const plan of [{ essencial: 50, estilo: 30, futuro: 20 }, { essencial: 60, estilo: 25, futuro: 15 }]) {
      const teto = F.bucketCeilings(income, plan);
      assert.equal(teto.essencial + teto.estilo + teto.futuro, Math.round(income / 1000) * 1000, `renda ${income}`);
      for (const v of Object.values(teto)) assert.equal(v % 1000, 0);
    }
  }
});

test('bucketBudgetStatus mostra teto, distribuído e o que sobra em cada balde', () => {
  const plan = { essencial: 50, estilo: 30, futuro: 20 };
  const list = [
    tx('income', 'salario', 300000, '2026-09-07'),
    tx('expense', 'compras', 12000, '2026-09-10'), // estilo, sem limite
    tx('expense', 'lazer', 20000, '2026-09-11'), // estilo, com limite
  ];
  const summary = F.summarize(list, cats);
  const budgets = { moradia: 100000, mercado: 60000, lazer: 30000 };
  const [essencial, estilo, futuro] = F.bucketBudgetStatus(budgets, cats, summary, plan);

  assert.equal(essencial.id, 'essencial');
  assert.equal(essencial.ceiling, 150000);
  assert.equal(essencial.distributed, 160000);
  assert.equal(essencial.left, -10000);
  assert.equal(essencial.status, 'passou');

  assert.equal(estilo.ceiling, 90000);
  assert.equal(estilo.distributed, 30000);
  assert.equal(estilo.left, 60000);
  assert.equal(estilo.spentWithoutLimit, 12000); // só compras; lazer tem limite
  assert.equal(estilo.status, 'cabe');

  assert.equal(futuro.distributed, 0);
  assert.equal(futuro.left, 60000);
  assert.equal(futuro.status, 'cabe');
});

test('bucketBudgetStatus: teto todo distribuído é "justo" e sem renda não há teto', () => {
  const plan = { essencial: 50, estilo: 30, futuro: 20 };
  const comRenda = F.summarize([tx('income', 'salario', 300000, '2026-09-07')], cats);
  const [, estilo] = F.bucketBudgetStatus({ lazer: 90000 }, cats, comRenda, plan);
  assert.equal(estilo.left, 0);
  assert.equal(estilo.status, 'justo');

  const semRenda = F.summarize([], cats);
  const [essencial] = F.bucketBudgetStatus({ moradia: 100000 }, cats, semRenda, plan);
  assert.equal(essencial.ceiling, null);
  assert.equal(essencial.left, null);
  assert.equal(essencial.status, 'sem-renda');
  assert.equal(essencial.distributed, 100000); // o que foi distribuído continua visível
});

// ---- Sugestão de orçamento pelo que a pessoa realmente gasta (Parte 2 da reformulação) ----

const PLANO = { essencial: 50, estilo: 30, futuro: 20 };

test('suggestFromHistory sugere a média dos meses anteriores e, nas fixas, o valor que a pessoa paga', () => {
  const list = [
    tx('income', 'salario', 300000, '2026-09-07'),
    tx('expense', 'mercado', 999999, '2026-09-08'), // mês corrente: não conta como histórico
    tx('expense', 'mercado', 55000, '2026-06-10'),
    tx('expense', 'mercado', 60000, '2026-07-10'),
    tx('expense', 'moradia', 100000, '2026-06-05'),
    tx('expense', 'moradia', 120000, '2026-07-05'), // a fixa usa o valor mais recente
    tx('expense', 'contas', 30000, '2026-06-06'), // não houve em julho: vale o último pago
    tx('expense', 'lazer', 20000, '2026-07-12'),
    tx('expense', 'investimentos', 20000, '2026-06-15'),
    tx('expense', 'reserva', 20000, '2026-07-15'),
  ];
  const r = F.suggestFromHistory(list, cats, '2026-09', PLANO);
  assert.equal(r.status, 'ok');
  assert.equal(r.months, 2); // junho e julho têm lançamentos; agosto não
  assert.equal(r.budgets.mercado, 58000); // média 575, arredondada para cima de R$ 10
  assert.equal(r.budgets.moradia, 120000);
  assert.equal(r.budgets.contas, 30000);
  assert.equal(r.budgets.lazer, 10000); // média de 2 meses: 200 e 0
  assert.equal(r.budgets.educacao, undefined); // nunca gastou: sem limite inventado
  // Futuro vem do percentual do plano (20% de R$ 3.000 = R$ 600), repartido pelo histórico do Futuro
  assert.equal(r.budgets.reserva, 30000);
  assert.equal(r.budgets.investimentos, 30000);
  assert.equal(r.budgets.metas, undefined);
});

test('suggestFromHistory: sem histórico de gastos, ou sem renda, não inventa nada', () => {
  const soMesCorrente = [tx('income', 'salario', 300000, '2026-09-07'), tx('expense', 'mercado', 50000, '2026-09-08')];
  assert.deepEqual(F.suggestFromHistory(soMesCorrente, cats, '2026-09', PLANO), { status: 'sem-historico', budgets: {} });

  const semRenda = [tx('expense', 'mercado', 50000, '2026-08-08')];
  assert.deepEqual(F.suggestFromHistory(semRenda, cats, '2026-09', PLANO), { status: 'sem-renda', budgets: {} });
});

test('suggestFromHistory usa a renda do mês anterior quando o mês ainda não tem renda', () => {
  const list = [tx('income', 'salario', 400000, '2026-08-07'), tx('expense', 'mercado', 50000, '2026-08-10')];
  const r = F.suggestFromHistory(list, cats, '2026-09', PLANO);
  assert.equal(r.status, 'ok');
  assert.equal(r.income, 400000);
  const futuro = cats.filter((c) => c.bucket === 'futuro').reduce((sum, c) => sum + (r.budgets[c.id] || 0), 0);
  assert.equal(futuro, 80000); // 20% de R$ 4.000, dividido igualmente entre as categorias do Futuro
});

test('suggestFromHistory: o Futuro segue o plano adaptado e a soma bate com o teto do balde', () => {
  const list = [tx('income', 'salario', 333300, '2026-09-07'), tx('expense', 'mercado', 50000, '2026-08-10')];
  for (const plano of [PLANO, { essencial: 60, estilo: 25, futuro: 15 }]) {
    const r = F.suggestFromHistory(list, cats, '2026-09', plano);
    const futuro = cats.filter((c) => c.bucket === 'futuro').reduce((sum, c) => sum + (r.budgets[c.id] || 0), 0);
    assert.equal(futuro, F.bucketCeilings(333300, plano).futuro);
  }
});

// ---- Questionário para quem ainda não tem histórico (Parte 3 da reformulação) ----

test('referenceIncome usa a renda do mês ou, sem ela, a do mês anterior', () => {
  const list = [tx('income', 'salario', 300000, '2026-09-07'), tx('income', 'salario', 250000, '2026-08-07')];
  assert.equal(F.referenceIncome(list, cats, '2026-09'), 300000);
  assert.equal(F.referenceIncome(list, cats, '2026-10'), 300000); // outubro sem renda: vale a de setembro
  assert.equal(F.referenceIncome(list, cats, '2026-12'), 0); // sem renda no mês nem no anterior
  assert.equal(F.referenceIncome([], cats, '2026-09'), 0);
});

test('budgetsFromAnswers monta os limites com o que a pessoa informou e o Futuro pelo plano', () => {
  const answers = {
    moradia: 120000,
    mercado: 60000,
    lazer: 0, // em branco ou zero: sem limite
    compras: -500, // inválido: ignorado
    educacao: 1000.5, // centavos quebrados: ignorado
    reserva: 99999, // o Futuro não é perguntado: vem do plano
    categoriaQueNaoExiste: 5000,
  };
  const r = F.budgetsFromAnswers(answers, cats, 300000, PLANO);
  assert.equal(r.moradia, 120000);
  assert.equal(r.mercado, 60000);
  for (const id of ['lazer', 'compras', 'educacao', 'categoriaQueNaoExiste']) assert.equal(r[id], undefined, id);
  const futuras = cats.filter((c) => c.type === 'expense' && c.bucket === 'futuro');
  assert.equal(futuras.reduce((sum, c) => sum + (r[c.id] || 0), 0), 60000); // 20% de R$ 3.000
  assert.equal(r.reserva, 15000); // dividido igualmente entre as 4 categorias do Futuro
});

test('budgetsFromAnswers sem nenhuma resposta ainda devolve só o Futuro, e sem renda devolve nada do Futuro', () => {
  const soFuturo = F.budgetsFromAnswers({}, cats, 300000, PLANO);
  assert.ok(Object.keys(soFuturo).length > 0);
  assert.ok(Object.keys(soFuturo).every((id) => cats.find((c) => c.id === id).bucket === 'futuro'));
  assert.deepEqual(F.budgetsFromAnswers({ mercado: 60000 }, cats, 0, PLANO), { mercado: 60000 });
});

// ---- Adicionar item ao orçamento: começa enxuto e a pessoa monta o resto aos poucos ----

const ids = (lista) => lista.map((c) => c.id);

test('DEFAULT_BUDGET_ITEMS é a lista essencial e só aponta para despesas que existem no catálogo', () => {
  assert.deepEqual(F.DEFAULT_BUDGET_ITEMS, ['moradia', 'contas', 'mercado', 'transporte', 'saude', 'reserva']);
  for (const id of F.DEFAULT_BUDGET_ITEMS) assert.ok(cats.some((c) => c.id === id && c.type === 'expense'), id);
});

test('budgetVisibleCategories na primeira abertura mostra só o essencial, com os três baldes presentes', () => {
  const v = F.budgetVisibleCategories(cats, {}, []);
  assert.deepEqual(Object.keys(v), ['essencial', 'estilo', 'futuro']);
  assert.deepEqual(ids(v.essencial), ['moradia', 'contas', 'mercado', 'transporte', 'saude']);
  assert.deepEqual(ids(v.estilo), []);
  assert.deepEqual(ids(v.futuro), ['reserva']);
});

test('budgetVisibleCategories acrescenta o que a pessoa adicionou e o que já tem limite, na ordem do catálogo', () => {
  const v = F.budgetVisibleCategories(cats, { lazer: 25000, investimentos: 0 }, ['impostos', 'compras']);
  assert.deepEqual(ids(v.essencial), ['moradia', 'contas', 'mercado', 'transporte', 'saude', 'impostos']);
  assert.deepEqual(ids(v.estilo), ['lazer', 'compras']); // lazer pelo limite, compras por ter sido adicionada
  assert.deepEqual(ids(v.futuro), ['reserva']); // limite zero não conta como limite
});

test('budgetAddable lista só o que ainda não está no orçamento, do balde tocado', () => {
  assert.deepEqual(ids(F.budgetAddable(cats, 'essencial', {}, [])), ['educacao', 'impostos']);
  assert.deepEqual(ids(F.budgetAddable(cats, 'estilo', {}, [])), ['restaurantes', 'lazer', 'compras', 'assinaturas', 'cuidados', 'presentes', 'outros']);
  assert.deepEqual(ids(F.budgetAddable(cats, 'futuro', {}, [])), ['investimentos', 'metas', 'dividas']);
  // depois de adicionar, sai da lista
  assert.ok(!ids(F.budgetAddable(cats, 'estilo', {}, ['lazer'])).includes('lazer'));
  // quem já tem limite também não volta para a lista
  assert.ok(!ids(F.budgetAddable(cats, 'estilo', { compras: 10000 }, [])).includes('compras'));
  // receitas nunca entram
  assert.ok(ids(F.budgetAddable(cats, 'estilo', {}, [])).every((id) => cats.find((c) => c.id === id).type === 'expense'));
});

test('validateCategoryName bloqueia nome vazio, longo demais e repetido em qualquer lugar do catálogo', () => {
  assert.deepEqual(F.validateCategoryName(cats, '  Pets  '), { ok: true, name: 'Pets' });
  assert.deepEqual(F.validateCategoryName(cats, 'Cuidados   com   o jardim'), { ok: true, name: 'Cuidados com o jardim' }); // espaços repetidos viram um só
  assert.match(F.validateCategoryName(cats, '').error, /Dê um nome/);
  assert.match(F.validateCategoryName(cats, '    ').error, /Dê um nome/);
  assert.match(F.validateCategoryName(cats, undefined).error, /Dê um nome/);
  assert.match(F.validateCategoryName(cats, 'x'.repeat(61)).error, /no máximo 60/);
  // repetido: sem diferenciar maiúsculas nem acentos, e em qualquer balde ou tipo
  for (const nome of ['Lazer', 'lazer', ' LAZER ', 'saude', 'SAÚDE', 'Mercado', 'salario']) {
    const r = F.validateCategoryName(cats, nome);
    assert.equal(r.ok, false, nome);
    assert.match(r.error, /Já existe um item chamado/);
  }
});

test('createCategory cria uma despesa do balde escolhido, variável ou fixa conforme o balde', () => {
  const nova = F.createCategory('estilo', 'Pets', 'id-1');
  assert.deepEqual(nova, { id: 'id-1', name: 'Pets', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🏷️' });
  assert.equal(F.createCategory('essencial', 'Farmácia', 'id-2').kind, 'variavel');
  assert.equal(F.createCategory('futuro', 'Previdência', 'id-3').kind, 'fixa');
});

test('os itens adicionados ao orçamento são salvos e validados', () => {
  assert.deepEqual(F.emptyData().settings.budgetItems, []);
  const data = F.normalizeData({
    categories: [...cats, { id: 'pets', name: 'Pets', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🏷️' }],
    settings: { budgetItems: ['lazer', 'pets', 'lazer', 'salario', 'nao-existe', 42, 'x'.repeat(200)] },
  });
  assert.deepEqual(data.settings.budgetItems, ['lazer', 'pets']); // sem repetidos, sem receita, sem id desconhecido
  assert.deepEqual(F.normalizeData({ settings: { budgetItems: 'lazer' } }).settings.budgetItems, []);
  assert.deepEqual(F.normalizeData({}).settings.budgetItems, []);
  // a categoria criada pela pessoa sobrevive a um backup e continua no catálogo
  assert.ok(data.categories.some((c) => c.id === 'pets' && c.bucket === 'estilo' && c.name === 'Pets'));
});

test('cada tipo de renda tem um nome curto e os exemplos separados', () => {
  for (const [id, perfil] of Object.entries(F.INCOME_PROFILES)) {
    assert.ok(perfil.name && perfil.name.length <= 20, `${id}: nome curto (até 20 letras)`);
    assert.ok(perfil.examples && perfil.examples.includes(','), `${id}: exemplos`);
    assert.ok(!('label' in perfil), `${id}: o texto longo duplicado (label) foi removido: vale name + examples`);
  }
});

// Refatoração (decisão do Isaac, 01/10/2026): a regra da divisão em parcelas e a de "quais lançamentos
// apagar" moravam na tela (app.js); agora têm um lugar só, no núcleo.
test('installmentAmounts divide em centavos inteiros: as primeiras parcelas levam o que sobra', () => {
  assert.deepEqual(F.installmentAmounts(100000, 3), [33334, 33333, 33333]);
  assert.deepEqual(F.installmentAmounts(10000, 4), [2500, 2500, 2500, 2500]);
  assert.deepEqual(F.installmentAmounts(1000, 1), [1000]);
  assert.equal(F.installmentAmounts(99999, 7).reduce((a, v) => a + v, 0), 99999);
});

test('installmentAmounts usa o mesmo limite do núcleo: no mínimo 1 e no máximo 48 parcelas', () => {
  assert.equal(F.installmentAmounts(10000, 999).length, F.MAX_INSTALLMENTS);
  assert.deepEqual(F.installmentAmounts(10000, 0), [10000]);
  assert.deepEqual(F.installmentAmounts(10000, NaN), [10000]);
  assert.deepEqual(F.installmentAmounts(10000, 2.9), [5000, 5000]);
});

test('createInstallments e installmentAmounts nunca discordam sobre o valor de cada parcela', () => {
  for (const [total, count] of [[100000, 3], [99999, 7], [1, 5], [250, 48], [250, 60]]) {
    let n = 0;
    const parcelas = F.createInstallments({ amount: total, date: '2026-01-10' }, count, () => `i${++n}`);
    assert.deepEqual(parcelas.map((p) => p.amount), F.installmentAmounts(total, count));
  }
});

test('idsToDelete: um lançamento comum, uma parcela só ou todas as parcelas da mesma compra', () => {
  let n = 0;
  const compra = F.createInstallments({ type: 'expense', categoryId: 'compras', amount: 30000, date: '2026-01-10' }, 3, () => `c${++n}`);
  const outraCompra = F.createInstallments({ type: 'expense', categoryId: 'compras', amount: 20000, date: '2026-01-10' }, 2, () => `d${++n}`);
  const comum = tx('expense', 'mercado', 5000, '2026-01-12');
  const lista = [...compra, comum, ...outraCompra];
  const idsDaCompra = compra.map((p) => p.id);

  assert.deepEqual(F.idsToDelete(lista, comum.id, false), [comum.id]);
  assert.deepEqual(F.idsToDelete(lista, comum.id, true), [comum.id]); // não é parcela: "todas" não muda nada
  assert.deepEqual(F.idsToDelete(lista, compra[1].id, false), [compra[1].id]);
  assert.deepEqual(F.idsToDelete(lista, compra[1].id, true), idsDaCompra); // só as da mesma compra
  assert.deepEqual(F.idsToDelete(lista, 'nao-existe', true), []);
});

// Refatoração, passo 2: montar e editar um lançamento também moravam na tela.
test('GOALS_CATEGORY é o id da categoria "Metas", do balde Futuro, e isISODate aceita só AAAA-MM-DD', () => {
  const metas = cats.find((c) => c.id === F.GOALS_CATEGORY);
  assert.equal(metas.name, 'Metas');
  assert.equal(metas.bucket, 'futuro');
  assert.equal(F.isISODate('2026-10-01'), true);
  for (const ruim of ['', '2026-1-01', '01/10/2026', null, 20261001]) assert.equal(F.isISODate(ruim), false);
});

test('buildEntry limpa a descrição e só liga o lançamento a uma meta quando faz sentido', () => {
  const metas = [{ id: 'g1', name: 'Viagem' }];
  const base = { type: 'expense', amount: 5000, date: '2026-10-01', categoryId: 'mercado', description: '  padaria  ', recurring: 1, goalId: 'g1' };

  const comum = F.buildEntry(base, metas);
  assert.deepEqual(comum, { type: 'expense', amount: 5000, date: '2026-10-01', categoryId: 'mercado', description: 'padaria', recurring: true });
  assert.equal(F.buildEntry({ ...base, description: 'x'.repeat(130) }, metas).description.length, 120);

  const naMeta = F.buildEntry({ ...base, categoryId: 'metas', description: '' }, metas);
  assert.equal(naMeta.goalId, 'g1');
  assert.equal(naMeta.description, 'Meta: Viagem'); // sem descrição, vira "Meta: <nome>"
  assert.equal(F.buildEntry({ ...base, categoryId: 'metas', description: 'Adiantei' }, metas).description, 'Adiantei');
  assert.equal(F.buildEntry({ ...base, categoryId: 'metas', description: '' }, [{ id: 'g1', name: 'N'.repeat(200) }]).description.length, 120);

  assert.equal('goalId' in F.buildEntry({ ...base, type: 'income', categoryId: 'metas' }, metas), false); // receita não vai para meta
  assert.equal('goalId' in F.buildEntry({ ...base, categoryId: 'metas', goalId: 'nao-existe' }, metas), false);
  assert.equal('goalId' in F.buildEntry({ ...base, categoryId: 'metas' }, []), false);
});

test('requestedInstallments: só despesa que não é de meta se parcela', () => {
  assert.equal(F.requestedInstallments({ type: 'expense' }, '3'), 3);
  assert.equal(F.requestedInstallments({ type: 'expense' }, ''), 1);
  assert.equal(F.requestedInstallments({ type: 'expense' }, 'abc'), 1);
  assert.equal(F.requestedInstallments({ type: 'income' }, '3'), 1);
  assert.equal(F.requestedInstallments({ type: 'expense', goalId: 'g1' }, '3'), 1);
});

test('applyEdit troca os campos, mantém a identidade e cuida do vínculo com a meta', () => {
  const atual = { id: 'a', createdAt: 7, type: 'expense', amount: 1000, date: '2026-10-01', categoryId: 'mercado', description: 'x', recurring: false };
  const novo = { type: 'expense', amount: 2000, date: '2026-10-02', categoryId: 'lazer', description: 'y', recurring: true };
  const editado = F.applyEdit(atual, novo);
  assert.deepEqual(editado, { ...atual, ...novo });
  assert.equal(atual.amount, 1000); // não altera o original

  const parcela = { ...atual, installment: { group: 'g', n: 2, of: 3 }, recurring: false };
  const editadaParcela = F.applyEdit(parcela, novo);
  assert.equal(editadaParcela.recurring, false); // parcela nunca é lançamento fixo
  assert.deepEqual(editadaParcela.installment, { group: 'g', n: 2, of: 3 });

  const naMeta = { ...atual, categoryId: 'metas', goalId: 'g1' };
  assert.equal('goalId' in F.applyEdit(naMeta, novo), false); // saiu da categoria Metas: sai da meta
  assert.equal(F.applyEdit(naMeta, { ...novo, categoryId: 'metas', goalId: 'g2' }).goalId, 'g2');

  const depositoReserva = { ...atual, categoryId: 'reserva', goalId: 'g1' };
  assert.equal(F.applyEdit(depositoReserva, { ...novo, categoryId: 'reserva' }).goalId, 'g1'); // reserva continua ligada
});

// Refatoração, passo 3: metas e duas contas que a tela repetia.
test('isReserveGoal reconhece a meta de reserva pelo nome, e o depósito usa a mesma regra', () => {
  assert.equal(F.isReserveGoal({ name: 'Reserva de emergência' }), true);
  assert.equal(F.isReserveGoal({ name: 'Minha RESERVA' }), true);
  assert.equal(F.isReserveGoal({ name: 'Viagem' }), false);
  assert.equal(F.createGoalDeposit({ id: 'g1', name: 'Minha reserva' }, 1000, '2026-10-01', 'd1').categoryId, 'reserva');
  assert.equal(F.createGoalDeposit({ id: 'g2', name: 'Viagem' }, 1000, '2026-10-01', 'd2').categoryId, F.GOALS_CATEGORY);
});

test('createEmergencyGoal cria a meta de reserva com o valor ideal', () => {
  const meta = F.createEmergencyGoal(1570002, 'g9');
  assert.deepEqual(meta, { id: 'g9', name: 'Reserva de emergência', target: 1570002, saved: 0, deadline: '' });
  assert.equal(F.isReserveGoal(meta), true);
});

test('createGoal limpa o nome, usa "Meta" se vier vazio e converte o prazo (mês) em data', () => {
  assert.deepEqual(F.createGoal({ name: '  Viagem  ', target: 600000, saved: 1000, deadline: '2027-05' }, 'g1'), { id: 'g1', name: 'Viagem', target: 600000, saved: 1000, deadline: '2027-05-01' });
  assert.equal(F.createGoal({ name: '   ', target: 100, saved: 0, deadline: '' }, 'g2').name, 'Meta');
  assert.equal(F.createGoal({ name: 'N'.repeat(80), target: 100, saved: 0, deadline: '' }, 'g3').name.length, 60);
  assert.equal(F.createGoal({ name: 'x', target: 100, saved: 0, deadline: '' }, 'g4').deadline, '');
});

test('budgetTotal soma só os limites das categorias de despesa', () => {
  assert.equal(F.budgetTotal({ mercado: 50000, lazer: 20000, salario: 99999 }, cats), 70000); // salário é receita: não entra
  assert.equal(F.budgetTotal({}, cats), 0);
  assert.equal(F.budgetTotal({ naoExiste: 500 }, cats), 0);
});

test('savingsGoalReached: bateu a meta de guardar só com renda e com taxa igual ou maior que a do plano', () => {
  const plano = { futuro: 20 };
  assert.equal(F.savingsGoalReached({ income: 100000, savingsRate: 0.2 }, plano), true);
  assert.equal(F.savingsGoalReached({ income: 100000, savingsRate: 0.19 }, plano), false);
  assert.equal(F.savingsGoalReached({ income: 0, savingsRate: 0.5 }, plano), false); // sem renda não há o que comparar
  assert.equal(F.savingsGoalReached({ income: 100000, savingsRate: 0.2 }, undefined), true); // sem plano, vale o 20% padrão
  assert.equal(F.savingsGoalReached({ income: 100000, savingsRate: 0.1 }, { futuro: 5 }), true);
});

// Refatoração do `insights` (item 3): estes testes descrevem os avisos do Painel como são hoje, para
// proteger a troca da função grande por uma lista de regras. Cada aviso e a ORDEM entre eles (que é a
// prioridade para a pessoa) ficam fixados aqui.
const resumo = (...lancamentos) => F.summarize(lancamentos, cats);
const avisos = (s, extra = {}) => F.insights({ summary: s, buckets: F.bucketAnalysis(s), budgetRows: [], previousSummary: null, categories: cats, ...extra });

test('insights sem renda no mês só pede para registrar a renda', () => {
  assert.deepEqual(avisos(resumo()), [{ level: 'info', text: 'Registre sua renda do mês para ativar a análise dos baldes.' }]);
});

test('insights avisa envelope estourado (perigo) antes do envelope que vai estourar (alerta)', () => {
  const s = resumo(tx('income', 'salario', 300000, '2026-09-05'), tx('expense', 'lazer', 70000, '2026-09-08'), tx('expense', 'restaurantes', 40000, '2026-09-08'));
  const rows = F.budgetStatus({ lazer: 50000, restaurantes: 60000 }, s, cats, '2026-09', '2026-09-10');
  const lista = avisos(s, { budgetRows: rows });
  assert.equal(lista[0].level, 'perigo');
  assert.match(lista[0].text, /^Lazer: envelope estourado em R\$\s200,00\.$/);
  assert.equal(lista[1].level, 'alerta');
  assert.match(lista[1].text, /^Restaurantes e delivery: no ritmo atual você vai gastar R\$\s1\.200,00 \(limite R\$\s600,00\)\. Desacelere\.$/);
  assert.equal(avisos(s).some((m) => /envelope|ritmo atual/.test(m.text)), false); // sem envelopes, sem esses avisos
});

test('insights aponta a categoria que mais subiu: só acima de R$ 50 e de 20%, e nunca do balde Futuro', () => {
  const anterior = resumo(tx('expense', 'lazer', 10000, '2026-08-05'), tx('expense', 'mercado', 20000, '2026-08-06'), tx('expense', 'reserva', 10000, '2026-08-07'));
  const s = resumo(tx('income', 'salario', 900000, '2026-09-05'), tx('expense', 'lazer', 30000, '2026-09-08'), tx('expense', 'mercado', 25000, '2026-09-09'),
    tx('expense', 'restaurantes', 40000, '2026-09-09'), tx('expense', 'reserva', 60000, '2026-09-10'));
  const subiu = (atual, antes) => avisos(atual, { previousSummary: antes }).filter((m) => /subiu/.test(m.text));
  // Restaurantes (novo, +R$ 400) ganha de Lazer (+R$ 200), de Mercado (+R$ 50 exatos: não passa) e da Reserva (Futuro: ignorada, +R$ 500).
  const principal = subiu(s, anterior);
  assert.equal(principal.length, 1);
  assert.equal(principal[0].level, 'info');
  assert.match(principal[0].text, /^Restaurantes e delivery subiu R\$\s400,00 em relação ao mês passado\.$/);

  const pouco = resumo(tx('income', 'salario', 900000, '2026-09-05'), tx('expense', 'lazer', 15000, '2026-09-08'), tx('expense', 'mercado', 105000, '2026-09-09'));
  const antes = resumo(tx('expense', 'lazer', 10000, '2026-08-05'), tx('expense', 'mercado', 100000, '2026-08-06'));
  assert.deepEqual(subiu(pouco, antes), []); // lazer +R$ 50 exatos; mercado +R$ 50 (5%)
  const proporcional = resumo(tx('income', 'salario', 900000, '2026-09-05'), tx('expense', 'mercado', 115000, '2026-09-09'));
  assert.deepEqual(subiu(proporcional, antes), []); // +R$ 150, mas só 15%: abaixo de 20%
  assert.deepEqual(subiu(s, resumo()), []); // mês passado sem nenhuma despesa: não há com o que comparar
});

test('insights avisa balde acima da meta e Futuro abaixo (ou quase lá) da meta, em ordem de balde', () => {
  const alto = resumo(tx('income', 'salario', 100000, '2026-09-05'), tx('expense', 'moradia', 60000, '2026-09-06'));
  assert.deepEqual(avisos(alto).map((m) => m.level), ['alerta', 'alerta']);
  assert.match(avisos(alto)[0].text, /^Essenciais consomem 60% da renda \(meta: até 50%\)\.$/);
  assert.match(avisos(alto)[1].text, /^Você guardou R\$\s0,00 para o futuro\. A meta é R\$\s200,00 — faça o aporte logo que a renda cair\.$/);

  const quase = resumo(tx('income', 'salario', 100000, '2026-09-05'), tx('expense', 'reserva', 15000, '2026-09-06'));
  assert.equal(avisos(quase).length, 1);
  assert.match(avisos(quase)[0].text, /^Você guardou R\$\s150,00 para o futuro\. A meta é R\$\s200,00/);
});

test('insights junta tudo na ordem de prioridade: gastou demais, envelopes, baldes, categoria, parcelas, plano', () => {
  const plano = F.adaptivePlan(0.6);
  const s = resumo(tx('income', 'salario', 200000, '2026-09-05'), tx('expense', 'moradia', 150000, '2026-09-06'),
    tx('expense', 'lazer', 90000, '2026-09-08'), tx('expense', 'restaurantes', 60000, '2026-09-08'));
  const rows = F.budgetStatus({ lazer: 50000, restaurantes: 100000 }, s, cats, '2026-09', '2026-09-10');
  const anterior = resumo(tx('expense', 'moradia', 150000, '2026-08-06'), tx('expense', 'lazer', 10000, '2026-08-08'));
  const lista = F.insights({ summary: s, buckets: F.bucketAnalysis(s, plano), budgetRows: rows, previousSummary: anterior, categories: cats,
    commitments: { total: 90000, months: 3, lastMonth: '2026-12' }, plan: plano });
  const ordem = [/^Você gastou R\$\s1\.000,00 a mais do que ganhou/, /Lazer: envelope estourado/, /no ritmo atual/, /consomem/, /Você guardou R\$\s0,00 para o futuro/,
    /Lazer subiu R\$\s800,00/, /Você já tem R\$\s900,00 em parcelas/, /60\/25\/15/];
  const posicoes = ordem.map((re) => lista.findIndex((m) => re.test(m.text)));
  assert.ok(posicoes.every((p) => p >= 0), `faltou algum aviso: ${JSON.stringify(posicoes)} em ${JSON.stringify(lista.map((m) => m.text))}`);
  assert.deepEqual(posicoes, [...posicoes].sort((a, b) => a - b), 'os avisos mudaram de ordem');
});

test('insights diz "Tudo dentro do plano" quando nenhuma regra se aplica (rede de segurança)', () => {
  // Na tela os baldes e o plano combinam e o elogio aparece; só com um plano diferente do usado nos baldes a lista fica vazia.
  const s = resumo(tx('income', 'salario', 100000, '2026-09-05'), tx('expense', 'reserva', 22000, '2026-09-06'));
  assert.deepEqual(avisos(s, { plan: { futuro: 25 } }), [{ level: 'bom', text: 'Tudo dentro do plano. Continue registrando cada gasto.' }]);
});

// Refatoração da `normalizeData` (item 4): ela é a barreira dos backups ("descarta o que for inválido").
// Uma varredura que desligava cada regra mostrou que 28 de 51 não tinham teste que percebesse. Estes
// testes fixam as regras como são hoje, para a troca por um normalizador por tipo de dado.
test('normalizeData (categorias): descarta o inválido, apara os textos e completa o que falta', () => {
  const data = F.normalizeData({ categories: [
    null, 7,
    { id: 1, name: 'id numérico', type: 'expense' },
    { id: 'c2', name: 42, type: 'expense' },
    { id: 'c3', name: 'tipo errado', type: 'transfer' },
    { id: 'longa', name: 'N'.repeat(80), type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '12345678' },
    { id: 'estranha', name: 'Estranha', type: 'expense', bucket: 'inventado', kind: 'qualquer', icon: 42 },
    { id: 'entrada', name: 'Entrada', type: 'income', bucket: 'essencial', kind: 'fixa' },
  ] });
  const por = (id) => data.categories.find((c) => c.id === id);
  for (const nome of ['id numérico', 'tipo errado']) assert.equal(data.categories.some((c) => c.name === nome), false, nome);
  assert.equal(data.categories.some((c) => c.name === 42), false);
  assert.equal(por('longa').name.length, 60);
  assert.equal(por('longa').icon, '1234'); // ícone: até 4 caracteres
  assert.deepEqual([por('longa').bucket, por('longa').kind], ['essencial', 'fixa']);
  assert.deepEqual([por('estranha').bucket, por('estranha').kind, por('estranha').icon], ['estilo', 'variavel', '•']);
  assert.equal('bucket' in por('entrada'), false); // receita não tem balde nem tipo fixa/variável
  assert.equal('kind' in por('entrada'), false);
  assert.ok(por('mercado'), 'as categorias padrão que faltam voltam');
});

test('normalizeData (lançamentos): descarta o inválido e limpa os campos', () => {
  const base = { id: 'ok', type: 'expense', amount: 100, date: '2026-09-01', categoryId: 'mercado' };
  const data = F.normalizeData({ transactions: [
    null, 7,
    { ...base, id: 5 },
    { ...base, id: 'tipo', type: 'transfer' },
    { ...base, id: 'longa', description: 'D'.repeat(200), recurring: 'sim', createdAt: 'ontem', goalId: 'G'.repeat(200) },
    { ...base, id: 'simples', description: 42, recurring: 0, createdAt: 123 },
  ] });
  assert.deepEqual(data.transactions.map((t) => t.id), ['longa', 'simples']);
  const [longa, simples] = data.transactions;
  assert.equal(longa.description.length, 120);
  assert.equal(longa.recurring, true); // sempre verdadeiro ou falso
  assert.equal(longa.createdAt, 0); // não é número: vira 0
  assert.equal(longa.goalId.length, 80);
  assert.deepEqual([simples.description, simples.recurring, simples.createdAt], ['', false, 123]);
});

test('normalizeData (limites): só valores inteiros e maiores que zero, de categorias que existem', () => {
  const data = F.normalizeData({ budgets: { mercado: 50000, lazer: 12.5, moradia: '300', transporte: 0, saude: -5, naoExiste: 100 } });
  assert.deepEqual(data.budgets, { mercado: 50000 });
});

test('normalizeData (metas): descarta o inválido, apara o nome e limpa valor guardado e prazo', () => {
  const data = F.normalizeData({ goals: [
    null, 8,
    { id: 5, name: 'id numérico', target: 1000 },
    { id: 'g2', name: 42, target: 1000 },
    { id: 'g3', name: 'valor quebrado', target: 10.5 },
    { id: 'g4', name: 'valor zero', target: 0 },
    { id: 'g5', name: 'N'.repeat(80), target: 5000, saved: 1.5, deadline: '31/12/2026' },
    { id: 'g6', name: 'Boa', target: 5000, saved: 1200, deadline: '2026-12-31' },
    { id: 'g7', name: 'Sem guardado', target: 5000, saved: -50 },
  ] });
  assert.deepEqual(data.goals.map((g) => g.id), ['g5', 'g6', 'g7']);
  const [g5, g6, g7] = data.goals;
  assert.deepEqual([g5.name.length, g5.saved, g5.deadline], [60, 0, '']); // nome até 60; guardado quebrado vira 0; prazo fora do formato some
  assert.deepEqual([g6.saved, g6.deadline], [1200, '2026-12-31']);
  assert.equal(g7.saved, 0);
});

test('normalizeData (revisões): só semanas AAAA-Www, com a lista de itens de texto', () => {
  const data = F.normalizeData({ reviews: { '2026-W01': 'texto solto', '2026-W02': ['a', 7, 'b'], 'semana-invalida': ['x'] } });
  assert.deepEqual(data.reviews, { '2026-W02': ['a', 'b'] });
});

// Defeito achado ao ler a normalizeData (item 4 da refatoração): nomes que o próprio JavaScript já tem,
// como "constructor" e "__proto__", passavam por "este nome existe na lista?". Um backup com tipo de renda
// "constructor" fazia a tela Metas mostrar "Reserva de undefined meses", e uma categoria com balde
// "constructor" fazia o gasto sumir dos totais.
test('normalizeData não aceita como tipo de renda um nome que o JavaScript já tem', () => {
  for (const nome of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.equal(F.normalizeData({ settings: { incomeProfile: nome } }).settings.incomeProfile, 'estavel', nome);
  }
  assert.equal(F.normalizeData({ settings: { incomeProfile: 'variavel' } }).settings.incomeProfile, 'variavel');
});

test('normalizeData não aceita como balde um nome que o JavaScript já tem', () => {
  for (const nome of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    const data = F.normalizeData({ categories: [{ id: 'mercado', name: 'Mercado', type: 'expense', bucket: nome, kind: 'variavel' }] });
    assert.equal(data.categories.find((c) => c.id === 'mercado').bucket, 'estilo', nome);
  }
  for (const balde of ['essencial', 'estilo', 'futuro']) {
    assert.equal(F.normalizeData({ categories: [{ id: 'x', name: 'X', type: 'expense', bucket: balde }] }).categories.find((c) => c.id === 'x').bucket, balde);
  }
});

// ---------- Lembrete de backup ----------

test('backupReminder: lembra quem tem lançamentos e nunca baixou um backup, ou baixou há 30 dias ou mais', () => {
  assert.equal(F.backupReminder('2026-09-20', '', 5), 'nunca'); // nunca baixou
  assert.equal(F.backupReminder('2026-09-20', '2026-08-21', 5), 'antigo'); // 30 dias
  assert.equal(F.backupReminder('2026-09-20', '2026-08-22', 5), null); // 29 dias: ainda vale
  assert.equal(F.backupReminder('2026-09-20', '2026-09-20', 50), null); // baixou hoje
  assert.equal(F.backupReminder('2026-09-20', '2026-12-01', 50), null); // data futura (relógio atrasado): não lembra
});

test('backupReminder: não lembra quem tem poucos lançamentos (não há o que perder)', () => {
  assert.equal(F.backupReminder('2026-09-20', '', 0), null);
  assert.equal(F.backupReminder('2026-09-20', '', 4), null);
  assert.equal(F.backupReminder('2026-09-20', '', 5), 'nunca');
});

test('settings.lastBackup só aceita data AAAA-MM-DD válida; o resto vira vazio', () => {
  assert.equal(F.emptyData().settings.lastBackup, '');
  assert.equal(F.normalizeData({ settings: { lastBackup: '2026-09-20' } }).settings.lastBackup, '2026-09-20');
  for (const invalido of ['20/09/2026', '2026-13-45', 20260920, null, {}, '__proto__', '<img src=x onerror=alert(1)>']) {
    assert.equal(F.normalizeData({ settings: { lastBackup: invalido } }).settings.lastBackup, '', String(invalido));
  }
});

// ---------- No máximo 3 avisos por vez ----------

test('splitInsights mostra os 3 primeiros avisos (os mais importantes) e separa o resto, sem perder nenhum', () => {
  const lista = ['a', 'b', 'c', 'd', 'e'].map((text) => ({ level: 'alerta', text }));
  const { shown, rest } = F.splitInsights(lista);
  assert.deepEqual(shown.map((m) => m.text), ['a', 'b', 'c']);
  assert.deepEqual(rest.map((m) => m.text), ['d', 'e']);
  assert.equal(lista.length, 5); // não mexe na lista original
});

test('splitInsights com 3 avisos ou menos mostra todos e não sobra nada', () => {
  for (const n of [0, 1, 2, 3]) {
    const lista = Array.from({ length: n }, (_, i) => ({ level: 'bom', text: String(i) }));
    const { shown, rest } = F.splitInsights(lista);
    assert.equal(shown.length, n);
    assert.equal(rest.length, 0);
  }
});
