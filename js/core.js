/*
 * Finan — núcleo de regras do Método Finan.
 * Funções puras (sem DOM, sem armazenamento), usadas pelo app e pelos testes.
 * Valores monetários são sempre inteiros em centavos para evitar erros de arredondamento.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FinanCore = api;
  // eslint-disable-next-line max-lines-per-function -- invólucro do módulo, não é uma função de negócio
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DATA_VERSION = 1;

  // Os três baldes do 50/30/20.
  const BUCKETS = {
    essencial: { label: 'Essenciais', target: 0.5, description: 'O que você precisa para viver: moradia, mercado, contas, transporte, saúde.' },
    estilo: { label: 'Estilo de vida', target: 0.3, description: 'O que deixa a vida boa, mas é opcional: lazer, delivery, compras, assinaturas.' },
    futuro: { label: 'Futuro', target: 0.2, description: 'Pague-se primeiro: reserva de emergência, investimentos e quitação de dívidas.' },
  };

  // Metas padrão dos baldes, em pontos percentuais da renda.
  const DEFAULT_TARGETS = { essencial: 50, estilo: 30, futuro: 20 };

  const PLAN_PROFILES = {
    'sem-historico': { label: 'Começando', description: 'Ainda sem histórico: o plano começa no 50/30/20, ou seja, até 50% da renda para Essenciais, até 30% para Estilo de vida e pelo menos 20% para o Futuro.' },
    confortavel: { label: 'Confortável', description: 'Os essenciais cabem em até 50% da renda: siga o 50/30/20.' },
    ajustando: { label: 'Ajustando', description: 'Os essenciais passam de 50% da renda: o plano se adapta e volta ao 50/30/20 conforme eles caem.' },
    critico: { label: 'Crítico', description: 'Os essenciais passam de 80% da renda: o foco é cortar custos fixos ou aumentar a renda.' },
  };

  // kind: 'fixa' (valor previsível, pago de uma vez) ou 'variavel' (gasto ao longo do mês).
  const DEFAULT_CATEGORIES = [
    { id: 'salario', name: 'Salário', type: 'income', icon: '💼' },
    { id: 'renda-extra', name: 'Renda extra', type: 'income', icon: '✨' },
    { id: 'outras-receitas', name: 'Outras receitas', type: 'income', icon: '➕' },

    { id: 'moradia', name: 'Moradia', type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '🏠' },
    { id: 'contas', name: 'Contas da casa', type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '💡' },
    { id: 'mercado', name: 'Mercado', type: 'expense', bucket: 'essencial', kind: 'variavel', icon: '🛒' },
    { id: 'transporte', name: 'Transporte', type: 'expense', bucket: 'essencial', kind: 'variavel', icon: '🚌' },
    { id: 'saude', name: 'Saúde', type: 'expense', bucket: 'essencial', kind: 'variavel', icon: '🩺' },
    { id: 'educacao', name: 'Educação', type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '📚' },
    { id: 'impostos', name: 'Impostos e taxas', type: 'expense', bucket: 'essencial', kind: 'fixa', icon: '🧾' },

    { id: 'restaurantes', name: 'Restaurantes e delivery', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🍔' },
    { id: 'lazer', name: 'Lazer', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🎬' },
    { id: 'compras', name: 'Compras', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🛍️' },
    { id: 'assinaturas', name: 'Assinaturas', type: 'expense', bucket: 'estilo', kind: 'fixa', icon: '📺' },
    { id: 'cuidados', name: 'Cuidados pessoais', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '💇' },
    { id: 'presentes', name: 'Presentes e doações', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '🎁' },
    { id: 'outros', name: 'Outros gastos', type: 'expense', bucket: 'estilo', kind: 'variavel', icon: '📦' },

    { id: 'reserva', name: 'Reserva de emergência', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '🛟' },
    { id: 'investimentos', name: 'Investimentos', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '📈' },
    { id: 'metas', name: 'Metas', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '🎯' },
    { id: 'dividas', name: 'Quitação de dívidas', type: 'expense', bucket: 'futuro', kind: 'fixa', icon: '⛓️' },
  ];

  // Itens que o Orçamento mostra na primeira abertura: só o essencial para viver, mais a reserva
  // ("pague-se primeiro"). Os demais entram pelo botão "Adicionar". Ajuste a lista aqui.
  const DEFAULT_BUDGET_ITEMS = ['moradia', 'contas', 'mercado', 'transporte', 'saude', 'reserva'];

  const MAX_CATEGORY_NAME = 60;
  const NEW_CATEGORY_ICON = '🏷️';

  // Meses de gastos essenciais que a reserva de emergência deve cobrir, por tipo de renda.
  const INCOME_PROFILES = {
    estavel: { name: 'Renda estável', examples: 'CLT, servidor público, aposentadoria', months: 6 },
    variavel: { name: 'Renda variável', examples: 'autônomo, freelancer, empresário', months: 12 },
  };

  const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // ---------- Dinheiro ----------

  /**
   * Converte texto digitado ("1.234,56", "R$ 12,5", "1234.56", 10) em centavos.
   * Retorna NaN quando o texto não é um valor válido.
   */
  function parseAmount(input) {
    if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : NaN;
    let s = String(input == null ? '' : input).replace(/R\$|\s/g, '');
    if (!s) return NaN;
    let negative = false;
    if (s[0] === '-') {
      negative = true;
      s = s.slice(1);
    }
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > -1 && lastDot > -1) {
      // O separador que aparece por último é o decimal.
      s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (lastComma > -1) {
      const parts = s.split(',');
      s = parts.length > 2 ? parts.join('') : s.replace(',', '.');
    } else if (lastDot > -1) {
      const parts = s.split('.');
      // Padrão brasileiro: "1.234" e "1.234.567" são separadores de milhar.
      if (parts.length > 2 || parts[1].length === 3) s = parts.join('');
    }
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    const [intPart, decPart = ''] = s.split('.');
    let cents = Number(intPart) * 100 + Number((decPart + '00').slice(0, 2));
    if (decPart.length > 2 && Number(decPart[2]) >= 5) cents += 1;
    return negative ? -cents : cents;
  }

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function formatBRL(cents) {
    return brl.format((cents || 0) / 100);
  }

  function formatPercent(ratio, digits = 0) {
    if (!Number.isFinite(ratio)) return '—';
    return (ratio * 100).toFixed(digits).replace('.', ',') + '%';
  }

  // ---------- Datas (sempre strings locais AAAA-MM-DD, sem fuso) ----------

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function todayISO(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function monthKey(isoDate) {
    return String(isoDate).slice(0, 7);
  }

  function shiftMonth(key, delta) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }

  function daysInMonth(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} de ${y}`;
  }

  /** Dias do mês já "vividos" em relação a hoje: 0 (futuro), dia atual, ou o mês todo (passado). */
  function elapsedDays(key, today) {
    const current = monthKey(today);
    if (key < current) return daysInMonth(key);
    if (key > current) return 0;
    return Number(today.slice(8, 10));
  }

  /** Dia da semana ISO: segunda = 1 … domingo = 7. */
  function isoWeekday(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay() || 7;
  }

  /** Chave da semana ISO 8601, ex.: "2026-W40". */
  function weekKey(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${pad(week)}`;
  }

  // ---------- Consultas ----------

  function indexCategories(categories) {
    const map = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }

  function transactionsOfMonth(transactions, key) {
    return transactions.filter((t) => monthKey(t.date) === key);
  }

  function sortTransactions(transactions) {
    return [...transactions].sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1));
  }

  /** Totais do conjunto de lançamentos (normalmente de um mês). */
  function summarize(transactions, categories) {
    const cats = indexCategories(categories);
    const byCategory = {};
    const byBucket = { essencial: 0, estilo: 0, futuro: 0 };
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === 'income') {
        income += t.amount;
        continue;
      }
      expense += t.amount;
      byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
      const bucket = (cats[t.categoryId] && cats[t.categoryId].bucket) || 'estilo';
      byBucket[bucket] += t.amount;
    }
    const consumption = byBucket.essencial + byBucket.estilo; // Gastos: o que foi consumido
    const saved = byBucket.futuro; // Guardado: reserva, investimentos e dívidas
    const balance = income - expense;
    // Taxa de poupança: só o que foi guardado (Futuro) sobre a renda. A sobra do mês não conta:
    // dinheiro parado na conta ainda não foi guardado.
    const savingsRate = income > 0 ? saved / income : 0;
    return { income, expense, balance, consumption, saved, savingsRate, byCategory, byBucket };
  }

  /**
   * Parcela da renda gasta com essenciais nos meses anteriores (padrão: 3), sem contar o mês
   * corrente, que ainda está incompleto. Retorna null quando não há renda registrada.
   */
  function essentialShare(transactions, categories, key, months = 3) {
    let income = 0;
    let essential = 0;
    for (let i = 1; i <= months; i++) {
      const s = summarize(transactionsOfMonth(transactions, shiftMonth(key, -i)), categories);
      if (s.income <= 0) continue;
      income += s.income;
      essential += s.byBucket.essencial;
    }
    return income > 0 ? essential / income : null;
  }

  /**
   * Plano adaptativo dos baldes, conforme a situação da pessoa:
   *  - até 50% em essenciais → 50/30/20;
   *  - de 50% a 80% → essenciais reais (arredondados para cima de 5 em 5), e do resto
   *    40% vai para o Futuro (mínimo 5%) e 60% para o Estilo de vida;
   *  - acima de 80% → Futuro de 5% e foco em reduzir custos.
   */
  function adaptivePlan(share) {
    if (share == null) return { profile: 'sem-historico', essentialShare: null, ...DEFAULT_TARGETS };
    const essencial = Math.min(Math.ceil((share * 100) / 5 - 1e-9) * 5, 100);
    if (essencial <= 50) return { profile: 'confortavel', essentialShare: share, ...DEFAULT_TARGETS };
    const rest = 100 - essencial;
    if (essencial <= 80) {
      const futuro = Math.max(5, Math.floor((rest * 2) / 25) * 5);
      return { profile: 'ajustando', essentialShare: share, essencial, estilo: rest - futuro, futuro };
    }
    const futuro = Math.min(5, rest);
    return { profile: 'critico', essentialShare: share, essencial, estilo: rest - futuro, futuro };
  }

  /**
   * Quanto sobraria do mês depois de guardar mais `amount`. Null quando não há renda registrada,
   * porque sem renda não há o que comparar. Negativo = guardar passaria do que sobrou.
   */
  function leftAfterSaving(summary, amount) {
    return summary.income > 0 ? summary.balance - amount : null;
  }

  /** Compara o realizado de cada balde com a meta do plano (padrão 50/30/20). */
  function bucketAnalysis(summary, targets = DEFAULT_TARGETS) {
    return Object.keys(BUCKETS).map((id) => {
      const b = { label: BUCKETS[id].label, target: targets[id] / 100 };
      const actual = summary.byBucket[id] || 0;
      const target = Math.round(summary.income * b.target);
      const share = summary.income > 0 ? actual / summary.income : 0;
      let status;
      if (summary.income <= 0) status = 'sem-renda';
      else if (id === 'futuro') status = actual >= target ? 'ok' : actual >= target / 2 ? 'atencao' : 'abaixo';
      else status = actual <= target ? 'ok' : actual <= target * 1.1 ? 'atencao' : 'acima';
      return { id, label: b.label, targetRatio: b.target, target, actual, share, status };
    });
  }

  // Primeiro dia do mês em que a previsão de fim de mês passa a valer (decisão do Isaac,
  // 01/10/2026): com poucos dias, um único gasto multiplicado pelo mês inteiro dava alarme falso.
  const FIRST_PROJECTION_DAY = 7;

  /**
   * Situação de cada envelope (limite por categoria) no mês.
   * Categorias variáveis ganham projeção de fim de mês pelo ritmo atual de gasto,
   * a partir do 7º dia do mês.
   */
  function budgetStatus(budgets, summary, categories, key, today) {
    const days = daysInMonth(key);
    const elapsed = elapsedDays(key, today);
    return categories
      .filter((c) => c.type === 'expense' && (budgets[c.id] || 0) > 0)
      .map((c) => {
        const limit = budgets[c.id];
        const spent = summary.byCategory[c.id] || 0;
        const remaining = limit - spent;
        const ratio = spent / limit;
        let projected = spent;
        if (c.kind === 'variavel' && elapsed >= FIRST_PROJECTION_DAY && elapsed < days) projected = Math.round((spent / elapsed) * days);
        let status = 'ok';
        if (spent > limit) status = 'estourado';
        else if (projected > limit) status = 'risco';
        else if (ratio >= 0.8 && c.kind === 'variavel') status = 'atencao';
        return { categoryId: c.id, name: c.name, icon: c.icon, bucket: c.bucket, kind: c.kind, limit, spent, remaining, ratio, projected, status };
      });
  }

  /** Soma dos limites (envelopes) definidos nas categorias de despesa, em centavos. */
  function budgetTotal(budgets, categories) {
    return categories.filter((c) => c.type === 'expense').reduce((sum, c) => sum + (budgets[c.id] || 0), 0);
  }

  /**
   * Quanto dá para gastar por dia, até o fim do mês, nas categorias variáveis
   * sem estourar nenhum envelope nem passar do que sobrou (`summary` do mês).
   * Retorna null fora do mês corrente.
   */
  function dailyAllowance(budgetRows, key, today, summary = null) {
    if (monthKey(today) !== key) return null;
    const variable = budgetRows.filter((r) => r.kind === 'variavel');
    if (!variable.length) return null;
    const daysLeft = daysInMonth(key) - Number(today.slice(8, 10)) + 1;
    return spendingPace(variable, daysLeft, today, summary);
  }

  /**
   * Quanto dá para gastar por dia e até domingo (nunca além de `daysLeft`). Vale o menor entre o que
   * resta nos envelopes variáveis e o que sobrou no período (`summary`): o app não promete dinheiro
   * que já foi gasto ou guardado. Sem renda no período (`left` nulo) só valem os envelopes.
   */
  function spendingPace(variableRows, daysLeft, today, summary = null) {
    const envelopeRemaining = variableRows.reduce((sum, r) => sum + Math.max(r.remaining, 0), 0);
    const left = summary ? leftAfterSaving(summary, 0) : null;
    const capped = left !== null && Math.max(left, 0) < envelopeRemaining;
    const remaining = capped ? Math.max(left, 0) : envelopeRemaining;
    const weekDays = Math.min(8 - isoWeekday(today), daysLeft);
    return {
      perDay: Math.floor(remaining / daysLeft),
      perWeek: Math.floor((remaining * weekDays) / daysLeft),
      weekDays, remaining, envelopeRemaining, capped, left, saved: summary ? summary.saved : 0, daysLeft,
    };
  }

  /** N-ésimo dia útil do mês (segunda a sexta; feriados não entram na conta). */
  function nthBusinessDay(key, n) {
    const [y, m] = key.split('-').map(Number);
    let count = 0;
    for (let day = 1; day <= daysInMonth(key); day++) {
      const weekday = new Date(y, m - 1, day).getDay();
      if (weekday !== 0 && weekday !== 6) count++;
      if (count === n) return `${key}-${pad(day)}`;
    }
    return `${key}-${pad(daysInMonth(key))}`;
  }

  function daysBetween(fromISO, toISO) {
    const utc = (iso) => Date.UTC(...iso.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))));
    return Math.round((utc(toISO) - utc(fromISO)) / 86400000);
  }

  /**
   * Ciclo do salário que contém `today`: começa no último pagamento (inclusive) e termina
   * no próximo (exclusive). `daysLeft` conta hoje e não conta o dia do próximo pagamento.
   */
  function paydayCycle(today, businessDay) {
    const key = monthKey(today);
    const thisPayday = nthBusinessDay(key, businessDay);
    const startKey = today >= thisPayday ? key : shiftMonth(key, -1);
    const start = nthBusinessDay(startKey, businessDay);
    const end = nthBusinessDay(shiftMonth(startKey, 1), businessDay);
    return { start, end, daysLeft: daysBetween(today, end) };
  }

  /**
   * Quanto dá para gastar por dia, nas categorias variáveis, até o próximo pagamento.
   * Os limites são mensais; o gasto considerado é só o do ciclo do salário atual.
   */
  function allowanceUntilPayday(transactions, categories, budgets, today, businessDay) {
    const { start, end, daysLeft } = paydayCycle(today, businessDay);
    const cycleTx = transactions.filter((t) => t.date >= start && t.date < end);
    const summary = summarize(cycleTx, categories);
    const rows = budgetStatus(budgets, summary, categories, monthKey(today), today);
    const variable = rows.filter((r) => r.kind === 'variavel');
    if (!variable.length) return null;
    return { ...spendingPace(variable, daysLeft, today, summary), nextPayday: end };
  }

  /**
   * Lembrete da revisão semanal: 'hoje' no dia escolhido, 'atrasada' nos dias seguintes da semana
   * e null antes do dia ou quando a revisão da semana já está completa.
   */
  function reviewReminder(today, reviewDay, doneCount, total) {
    if (doneCount >= total) return null;
    const weekday = isoWeekday(today);
    if (weekday === reviewDay) return 'hoje';
    return weekday > reviewDay ? 'atrasada' : null;
  }

  /** Arredonda centavos para múltiplos de R$ step (padrão R$ 10). */
  function roundTo(cents, step = 1000) {
    return Math.round(cents / step) * step;
  }

  // ---------- Itens do orçamento: começa enxuto e a pessoa monta o resto ----------

  /** Aparece no Orçamento: a lista essencial, o que a pessoa adicionou e tudo o que já tem limite. */
  function isBudgetItem(category, budgets, added) {
    return category.type === 'expense' && (DEFAULT_BUDGET_ITEMS.includes(category.id) || added.includes(category.id) || budgets[category.id] > 0);
  }

  /** Despesas do catálogo de um balde, filtradas por `wanted(category)`, na ordem do catálogo. */
  function categoriesOfBucket(categories, bucketId, wanted) {
    return categories.filter((c) => c.type === 'expense' && c.bucket === bucketId && wanted(c));
  }

  /** Categorias que o Orçamento mostra, por balde (os três baldes sempre existem, mesmo vazios). */
  function budgetVisibleCategories(categories, budgets, added = []) {
    return Object.fromEntries(Object.keys(BUCKETS).map((bucketId) => [bucketId, categoriesOfBucket(categories, bucketId, (c) => isBudgetItem(c, budgets, added))]));
  }

  /** O que o botão "Adicionar" oferece num balde: as categorias do catálogo que ainda não estão no orçamento. */
  function budgetAddable(categories, bucketId, budgets, added = []) {
    return categoriesOfBucket(categories, bucketId, (c) => !isBudgetItem(c, budgets, added));
  }

  /** Nome para comparar: sem acento, sem maiúsculas e com espaços normalizados. */
  function nameKey(name) {
    return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /** Valida o nome de um item novo: não pode ser vazio, longo demais nem repetido em nenhum lugar do catálogo. */
  function validateCategoryName(categories, rawName) {
    const name = String(rawName == null ? '' : rawName).replace(/\s+/g, ' ').trim();
    if (!name) return { ok: false, error: 'Dê um nome ao item.' };
    if (name.length > MAX_CATEGORY_NAME) return { ok: false, error: `O nome pode ter no máximo ${MAX_CATEGORY_NAME} letras.` };
    const repeated = categories.find((c) => nameKey(c.name) === nameKey(name));
    if (repeated) return { ok: false, error: `Já existe um item chamado "${repeated.name}". Procure na lista ou use outro nome.` };
    return { ok: true, name };
  }

  /** Item novo do catálogo: despesa do balde escolhido (fixa no Futuro, variável nos outros). */
  function createCategory(bucketId, name, id) {
    return { id, name, type: 'expense', bucket: bucketId, kind: bucketId === 'futuro' ? 'fixa' : 'variavel', icon: NEW_CATEGORY_ICON };
  }

  /** Teto de cada balde: a parte da renda que o plano reserva para ele, em múltiplos de R$ 10. */
  function bucketCeilings(income, plan) {
    const ids = Object.keys(BUCKETS);
    if (!(income > 0)) return Object.fromEntries(ids.map((id) => [id, 0]));
    const values = allocate(roundTo(income), ids.map((id) => plan[id] / 100));
    return Object.fromEntries(ids.map((id, i) => [id, values[i]]));
  }

  /**
   * Por balde: teto, quanto já foi distribuído em limites por categoria e o que sobra do teto.
   * As categorias sem limite gastam do que sobra (`spentWithoutLimit` é o que elas já gastaram).
   * Sem renda no mês não há teto (`ceiling` e `left` nulos).
   */
  function bucketBudgetStatus(budgets, categories, summary, plan) {
    const ceilings = summary.income > 0 ? bucketCeilings(summary.income, plan) : null;
    return Object.keys(BUCKETS).map((id) => {
      const cats = categories.filter((c) => c.type === 'expense' && c.bucket === id);
      const distributed = cats.reduce((sum, c) => sum + (budgets[c.id] || 0), 0);
      const spentWithoutLimit = cats.filter((c) => !(budgets[c.id] > 0)).reduce((sum, c) => sum + (summary.byCategory[c.id] || 0), 0);
      const ceiling = ceilings ? ceilings[id] : null;
      const left = ceiling === null ? null : ceiling - distributed;
      let status = 'sem-renda';
      if (left !== null) status = 'cabe';
      if (left === 0) status = 'justo';
      if (left !== null && left < 0) status = 'passou';
      return { id, label: BUCKETS[id].label, share: plan[id], ceiling, distributed, left, spentWithoutLimit, status };
    });
  }

  /**
   * Sugere limites por categoria distribuindo a renda pelo 50/30/20.
   * Dentro de cada balde, o peso de cada categoria segue o histórico (ou divide igualmente).
   */
  function suggestBudgets(income, categories, history = {}, targets = DEFAULT_TARGETS) {
    const result = {};
    if (!(income > 0)) return result;
    const bucketTotals = bucketCeilings(income, targets);
    Object.keys(BUCKETS).forEach((bucketId) => {
      const cats = categories.filter((c) => c.type === 'expense' && c.bucket === bucketId);
      if (!cats.length) return;
      const weights = cats.map((c) => history[c.id] || 0);
      const weightSum = weights.reduce((a, b) => a + b, 0);
      const shares = cats.map((c, i) => (weightSum > 0 ? weights[i] / weightSum : 1 / cats.length));
      const values = allocate(bucketTotals[bucketId], shares);
      cats.forEach((c, i) => {
        if (values[i] > 0) result[c.id] = values[i];
      });
    });
    return result;
  }

  /** Meses anteriores ao informado (do mais recente ao mais antigo) que têm lançamentos, até `count`. */
  function historyMonths(transactions, key, count = 3) {
    const months = [];
    for (let i = 1; i <= count; i++) {
      const month = shiftMonth(key, -i);
      if (transactionsOfMonth(transactions, month).length) months.push(month);
    }
    return months;
  }

  /** Limite de uma categoria a partir do que foi gasto: valor pago (fixa) ou média dos meses (variável), em múltiplos de R$ 10 para cima. */
  function realSpending(category, valuesByRecentMonth) {
    const real = category.kind === 'fixa'
      ? valuesByRecentMonth.find((v) => v > 0) || 0
      : valuesByRecentMonth.reduce((a, b) => a + b, 0) / valuesByRecentMonth.length;
    return Math.ceil(real / 1000) * 1000;
  }

  /**
   * Sugestão de limites a partir do que a pessoa realmente gasta (nunca inventa números):
   * - Essenciais e Estilo de vida: média dos últimos 3 meses com lançamentos (nas fixas, o valor
   *   mais recente que foi pago), só para categorias com gasto;
   * - Futuro: a parte do plano sobre a renda, repartida pelo histórico do próprio Futuro.
   * O mês informado não entra no histórico. A renda é a do mês ou, sem ela, a do mês anterior.
   * Devolve { status: 'ok' | 'sem-renda' | 'sem-historico', budgets, months, income }.
   */
  function suggestFromHistory(transactions, categories, key, plan) {
    const income = referenceIncome(transactions, categories, key);
    if (!(income > 0)) return { status: 'sem-renda', budgets: {} };
    const months = historyMonths(transactions, key);
    if (!months.length) return { status: 'sem-historico', budgets: {} };

    const spent = months.map((m) => summarize(transactionsOfMonth(transactions, m), categories).byCategory);
    const expenses = categories.filter((c) => c.type === 'expense');
    const budgets = {};
    const futureHistory = {};
    for (const c of expenses) {
      const values = spent.map((byCategory) => byCategory[c.id] || 0);
      if (c.bucket === 'futuro') futureHistory[c.id] = values.reduce((a, b) => a + b, 0) / values.length;
      else if (values.some((v) => v > 0)) budgets[c.id] = realSpending(c, values);
    }
    Object.assign(budgets, futureBudgets(income, categories, futureHistory, plan));
    return { status: 'ok', budgets, months: months.length, income };
  }

  /** Renda de referência do mês: a do próprio mês ou, sem ela, a do mês anterior (0 se não houver). */
  function referenceIncome(transactions, categories, key) {
    const monthIncome = summarize(transactionsOfMonth(transactions, key), categories).income;
    if (monthIncome > 0) return monthIncome;
    return summarize(transactionsOfMonth(transactions, shiftMonth(key, -1)), categories).income;
  }

  /** Limites do balde Futuro: a parte do plano sobre a renda, repartida pelo histórico (igual se não houver). */
  function futureBudgets(income, categories, history, plan) {
    const all = suggestBudgets(income, categories, history, plan);
    const result = {};
    for (const c of categories) if (c.type === 'expense' && c.bucket === 'futuro' && all[c.id]) result[c.id] = all[c.id];
    return result;
  }

  /**
   * Limites a partir das respostas do questionário (para quem ainda não tem histórico): o valor que a
   * pessoa informou (centavos inteiros positivos) em Essenciais e Estilo de vida, e o Futuro pelo plano.
   * Respostas inválidas, em branco ou de categorias desconhecidas são ignoradas.
   */
  function budgetsFromAnswers(answers, categories, income, plan) {
    const budgets = {};
    for (const c of categories) {
      const value = answers[c.id];
      if (c.type === 'expense' && c.bucket !== 'futuro' && Number.isInteger(value) && value > 0) budgets[c.id] = value;
    }
    return { ...budgets, ...futureBudgets(income, categories, {}, plan) };
  }

  /**
   * Divide um total (múltiplo de step) entre partes proporcionais, em múltiplos de step,
   * garantindo que a soma bata exatamente com o total (método do maior resto).
   */
  function allocate(total, shares, step = 1000) {
    const units = Math.round(total / step);
    const raw = shares.map((s) => s * units);
    const result = raw.map(Math.floor);
    let left = units - result.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; left > 0; k++, left--) result[order[k % order.length][1]] += 1;
    return result.map((u) => u * step);
  }

  /** Média mensal de gastos essenciais nos últimos meses com registros (antes do mês informado). */
  function averageEssential(transactions, categories, key, months = 3) {
    const totals = [];
    for (let i = 1; i <= months; i++) {
      const monthTx = transactionsOfMonth(transactions, shiftMonth(key, -i));
      if (!monthTx.length) continue;
      totals.push(summarize(monthTx, categories).byBucket.essencial);
    }
    if (!totals.length) {
      const current = summarize(transactionsOfMonth(transactions, key), categories).byBucket.essencial;
      return current;
    }
    return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  }

  /** Reserva de emergência recomendada: 6 (renda estável) ou 12 (renda variável) meses de custos essenciais. */
  function emergencyFundTarget(transactions, categories, key, incomeProfile = 'estavel') {
    const profile = INCOME_PROFILES[incomeProfile] || INCOME_PROFILES.estavel;
    return averageEssential(transactions, categories, key) * profile.months;
  }

  function monthsBetween(fromISO, toISO) {
    const [fy, fm] = fromISO.split('-').map(Number);
    const [ty, tm] = toISO.split('-').map(Number);
    return (ty - fy) * 12 + (tm - fm);
  }

  /**
   * Quanto já foi guardado numa meta: o valor inicial (o que a pessoa já tinha ao criá-la)
   * mais os depósitos, que são lançamentos do Futuro ligados à meta por goalId.
   * Assim o valor da meta e o "Guardado" do Painel vêm dos mesmos lançamentos.
   */
  function goalSaved(goal, transactions = []) {
    return goal.saved + transactions.filter((t) => t.goalId === goal.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }

  // Categoria do balde Futuro em que se lança direto numa meta (a reserva usa "Reserva de emergência").
  const GOALS_CATEGORY = 'metas';

  /**
   * Monta o lançamento a partir do que a pessoa preencheu: descrição aparada em 120 letras e, só
   * para despesa na categoria Metas com uma meta que existe, ligado a ela por goalId. Sem descrição,
   * o lançamento da meta vira "Meta: <nome>".
   */
  function buildEntry(fields, goals) {
    const entry = {
      type: fields.type,
      amount: fields.amount,
      date: fields.date,
      categoryId: fields.categoryId,
      description: String(fields.description || '').trim().slice(0, 120),
      recurring: Boolean(fields.recurring),
    };
    const goal = entry.type === 'expense' && entry.categoryId === GOALS_CATEGORY && goals.find((g) => g.id === fields.goalId);
    if (goal) {
      entry.goalId = goal.id;
      if (!entry.description) entry.description = `Meta: ${goal.name}`.slice(0, 120);
    }
    return entry;
  }

  /** Quantas parcelas pedir: só despesa que não é de meta se parcela; o resto é à vista. */
  function requestedInstallments(entry, raw) {
    return entry.type === 'expense' && !entry.goalId ? Number(raw) || 1 : 1;
  }

  /** Lançamento depois de editado: troca os campos e mantém a identidade. Parcela nunca é fixo, e sair da categoria Metas desliga a meta. */
  function applyEdit(current, entry) {
    const updated = { ...current, ...entry, recurring: current.installment ? false : entry.recurring };
    if (!entry.goalId && current.categoryId === GOALS_CATEGORY) delete updated.goalId;
    return updated;
  }

  /** A meta de reserva de emergência é reconhecida pelo nome ("reserva"). */
  function isReserveGoal(goal) {
    return /reserva/i.test(goal.name);
  }

  /** Meta nova a partir do formulário: nome aparado em 60 letras ("Meta" se vier vazio) e prazo (mês) como data do dia 1. */
  function createGoal(fields, id) {
    return {
      id,
      name: String(fields.name || '').trim().slice(0, 60) || 'Meta',
      target: fields.target,
      saved: fields.saved,
      deadline: fields.deadline ? `${fields.deadline}-01` : '',
    };
  }

  /** Meta de reserva de emergência, com o valor ideal calculado e nada guardado ainda. */
  function createEmergencyGoal(target, id) {
    return { id, name: 'Reserva de emergência', target, saved: 0, deadline: '' };
  }

  /** Depósito numa meta = lançamento do balde Futuro ligado a ela (a reserva vai para "Reserva de emergência"). */
  function createGoalDeposit(goal, amount, date, id) {
    return {
      id,
      type: 'expense',
      categoryId: isReserveGoal(goal) ? 'reserva' : GOALS_CATEGORY,
      amount,
      date,
      description: `Meta: ${goal.name}`.slice(0, 120),
      recurring: false,
      goalId: goal.id,
      createdAt: Date.now(),
    };
  }

  /** Progresso de uma meta e o aporte mensal necessário para cumprir o prazo. */
  function goalProgress(goal, today, transactions = []) {
    const saved = goalSaved(goal, transactions);
    const remaining = Math.max(goal.target - saved, 0);
    const ratio = goal.target > 0 ? Math.min(saved / goal.target, 1) : 0;
    let monthsLeft = null;
    let monthly = null;
    if (goal.deadline) {
      monthsLeft = Math.max(monthsBetween(today, goal.deadline), 1);
      monthly = Math.ceil(remaining / monthsLeft);
    }
    return { remaining, ratio, monthsLeft, monthly, done: remaining === 0 };
  }

  /**
   * Gera cópias dos lançamentos fixos (recurring) de um mês para outro,
   * ignorando os que já existem no mês de destino.
   */
  function recurringForMonth(transactions, fromKey, toKey, makeId) {
    const target = transactionsOfMonth(transactions, toKey);
    const signature = (t) => `${t.type}|${t.categoryId}|${t.amount}|${(t.description || '').trim().toLowerCase()}`;
    const existing = new Set(target.map(signature));
    const lastDay = daysInMonth(toKey);
    return transactionsOfMonth(transactions, fromKey)
      .filter((t) => t.recurring && !existing.has(signature(t)))
      .map((t) => ({
        ...t,
        id: makeId(),
        date: `${toKey}-${pad(Math.min(Number(t.date.slice(8, 10)), lastDay))}`,
        createdAt: Date.now(),
      }));
  }

  const MAX_INSTALLMENTS = 48;

  /**
   * Valor de cada parcela, em centavos inteiros (de 1 a 48 parcelas). Os centavos que sobram da
   * divisão vão para as primeiras parcelas, então a soma bate com o total. Regra única: a criação
   * das parcelas e o "quanto cai no mês da compra" usam esta função.
   */
  function installmentAmounts(total, count) {
    const n = Math.max(1, Math.min(Math.floor(count) || 1, MAX_INSTALLMENTS));
    const base = Math.floor(total / n);
    const remainder = total - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
  }

  /**
   * Ids a apagar ao excluir o lançamento `id`: só ele ou, se for uma parcela e `allInstallments`,
   * todas as parcelas da mesma compra. Id desconhecido não apaga nada.
   */
  function idsToDelete(transactions, id, allInstallments) {
    const t = transactions.find((x) => x.id === id);
    if (!t) return [];
    if (!allInstallments || !t.installment) return [id];
    return transactions.filter((x) => x.installment && x.installment.group === t.installment.group).map((x) => x.id);
  }

  /**
   * Divide uma compra parcelada em um lançamento por mês, começando no mês da compra.
   * Centavos que sobram da divisão vão para as primeiras parcelas (a soma bate com o total).
   */
  function createInstallments(entry, count, makeId) {
    const amounts = installmentAmounts(entry.amount, count);
    const group = makeId();
    const day = Number(entry.date.slice(8, 10));
    const firstMonth = monthKey(entry.date);
    return amounts.map((amount, i) => {
      const key = shiftMonth(firstMonth, i);
      return {
        ...entry,
        id: makeId(),
        amount,
        date: `${key}-${pad(Math.min(day, daysInMonth(key)))}`,
        recurring: false,
        installment: { group, n: i + 1, of: amounts.length },
        createdAt: Date.now(),
      };
    });
  }

  /** Parcelas já assumidas para depois do mês informado: o futuro que já está comprometido. */
  function installmentCommitments(transactions, key) {
    const byMonth = {};
    let total = 0;
    for (const t of transactions) {
      if (!t.installment || t.type !== 'expense' || monthKey(t.date) <= key) continue;
      const m = monthKey(t.date);
      byMonth[m] = (byMonth[m] || 0) + t.amount;
      total += t.amount;
    }
    const months = Object.keys(byMonth).sort();
    return { total, byMonth, months: months.length, lastMonth: months[months.length - 1] || null };
  }

  function installmentLabel(t) {
    return t.installment ? `${t.installment.n}/${t.installment.of}` : '';
  }

  /** Mensagens práticas sobre o mês, da mais urgente para a mais positiva. */
  /** Explica por que o plano não está no 50/30/20 (só quando ele se adaptou). */
  function planInsight(plan) {
    if (!plan || (plan.profile !== 'ajustando' && plan.profile !== 'critico')) return null;
    const pct = formatPercent(plan.essentialShare);
    const split = `${plan.essencial}/${plan.estilo}/${plan.futuro}`;
    if (plan.profile === 'critico') {
      return { level: 'alerta', text: `Os essenciais consomem ${pct} da sua renda. Prioridade: reduzir custos fixos (moradia, contas, transporte) ou aumentar a renda. Seu plano agora é ${split}.` };
    }
    return { level: 'info', text: `Seu plano está em ${split} porque os essenciais somaram ${pct} da renda nos últimos meses. Conforme eles caírem, o plano volta sozinho para 50/30/20.` };
  }

  /** Bateu a meta de guardar: tem renda e a taxa de poupança chegou à parte do Futuro do plano (20% sem plano). */
  function savingsGoalReached(summary, plan) {
    const goal = (plan ? plan.futuro : DEFAULT_TARGETS.futuro) / 100;
    return summary.income > 0 && summary.savingsRate >= goal;
  }

  function insights({ summary, buckets, budgetRows, previousSummary, categories, commitments, plan }) {
    const list = [];
    const cats = indexCategories(categories);
    if (summary.income <= 0) {
      list.push({ level: 'info', text: 'Registre sua renda do mês para ativar a análise dos baldes.' });
    }
    if (summary.income > 0 && summary.consumption > summary.income) {
      list.push({ level: 'perigo', text: `Você gastou ${formatBRL(summary.consumption - summary.income)} a mais do que ganhou este mês. Corte primeiro no balde Estilo de vida.` });
    } else if (summary.income > 0 && summary.balance < 0) {
      list.push({ level: 'alerta', text: `Gastos mais o que você guardou passam da renda em ${formatBRL(-summary.balance)}. Reveja quanto guardar neste mês.` });
    }
    for (const row of budgetRows) {
      if (row.status === 'estourado') list.push({ level: 'perigo', text: `${row.name}: envelope estourado em ${formatBRL(-row.remaining)}.` });
    }
    for (const row of budgetRows) {
      if (row.status === 'risco') list.push({ level: 'alerta', text: `${row.name}: no ritmo atual você vai gastar ${formatBRL(row.projected)} (limite ${formatBRL(row.limit)}). Desacelere.` });
    }
    for (const b of buckets) {
      if (b.status === 'acima') list.push({ level: 'alerta', text: `${b.label} consomem ${formatPercent(b.share)} da renda (meta: até ${formatPercent(b.targetRatio)}).` });
      if (b.status === 'abaixo' || b.status === 'atencao') {
        if (b.id === 'futuro') list.push({ level: 'alerta', text: `Você guardou ${formatBRL(b.actual)} para o futuro. A meta é ${formatBRL(b.target)} — faça o aporte logo que a renda cair.` });
      }
    }
    if (previousSummary && previousSummary.expense > 0) {
      let worst = null;
      for (const id of Object.keys(summary.byCategory)) {
        const cat = cats[id];
        if (!cat || cat.bucket === 'futuro') continue;
        const diff = summary.byCategory[id] - (previousSummary.byCategory[id] || 0);
        const base = previousSummary.byCategory[id] || 0;
        if (diff > 5000 && (base === 0 || diff / base > 0.2) && (!worst || diff > worst.diff)) worst = { id, diff };
      }
      if (worst) list.push({ level: 'info', text: `${cats[worst.id].name} subiu ${formatBRL(worst.diff)} em relação ao mês passado.` });
    }
    if (commitments && commitments.total > 0) {
      list.push({ level: 'info', text: `Você já tem ${formatBRL(commitments.total)} em parcelas nos próximos ${commitments.months} ${commitments.months === 1 ? 'mês' : 'meses'} (até ${monthLabel(commitments.lastMonth)}).` });
    }
    const planMessage = planInsight(plan);
    if (planMessage) list.push(planMessage);
    if (savingsGoalReached(summary, plan)) {
      list.push({ level: 'bom', text: `Excelente! Você guardou ${formatPercent(summary.savingsRate)} da renda.` });
    }
    if (!list.length) list.push({ level: 'bom', text: 'Tudo dentro do plano. Continue registrando cada gasto.' });
    return list;
  }

  // ---------- Importação / exportação ----------

  function emptyData() {
    return { version: DATA_VERSION, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), transactions: [], budgets: {}, goals: [], reviews: {}, settings: { incomeProfile: 'estavel', paydayBusinessDay: 0, reviewDay: 7, budgetItems: [] } };
  }

  function isISODate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  /** Valida e limpa dados vindos do armazenamento ou de um backup importado. */
  function normalizeData(raw) {
    const data = emptyData();
    if (!raw || typeof raw !== 'object') return data;
    if (Array.isArray(raw.categories) && raw.categories.length) {
      data.categories = raw.categories
        .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && (c.type === 'income' || c.type === 'expense'))
        .map((c) => ({
          id: c.id,
          name: c.name.slice(0, 60),
          type: c.type,
          icon: typeof c.icon === 'string' ? c.icon.slice(0, 4) : '•',
          ...(c.type === 'expense' ? { bucket: BUCKETS[c.bucket] ? c.bucket : 'estilo', kind: c.kind === 'fixa' ? 'fixa' : 'variavel' } : {}),
        }));
      // Categorias padrão criadas depois do backup também passam a existir.
      const known = new Set(data.categories.map((c) => c.id));
      for (const c of DEFAULT_CATEGORIES) if (!known.has(c.id)) data.categories.push({ ...c });
    }
    const catIds = new Set(data.categories.map((c) => c.id));
    if (Array.isArray(raw.transactions)) {
      data.transactions = raw.transactions
        .filter((t) => t && typeof t.id === 'string' && (t.type === 'income' || t.type === 'expense') && Number.isInteger(t.amount) && t.amount > 0 && isISODate(t.date) && catIds.has(t.categoryId))
        .map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          date: t.date,
          categoryId: t.categoryId,
          description: typeof t.description === 'string' ? t.description.slice(0, 120) : '',
          recurring: Boolean(t.recurring),
          createdAt: Number.isFinite(t.createdAt) ? t.createdAt : 0,
          ...(typeof t.goalId === 'string' && t.goalId ? { goalId: t.goalId.slice(0, 80) } : {}),
          ...(validInstallment(t.installment) ? { installment: { group: t.installment.group, n: t.installment.n, of: t.installment.of } } : {}),
        }));
    }
    if (raw.budgets && typeof raw.budgets === 'object') {
      for (const [id, value] of Object.entries(raw.budgets)) {
        if (catIds.has(id) && Number.isInteger(value) && value > 0) data.budgets[id] = value;
      }
    }
    if (Array.isArray(raw.goals)) {
      data.goals = raw.goals
        .filter((g) => g && typeof g.id === 'string' && typeof g.name === 'string' && Number.isInteger(g.target) && g.target > 0)
        .map((g) => ({
          id: g.id,
          name: g.name.slice(0, 60),
          target: g.target,
          saved: Number.isInteger(g.saved) && g.saved > 0 ? g.saved : 0,
          deadline: isISODate(g.deadline) ? g.deadline : '',
        }));
    }
    if (raw.reviews && typeof raw.reviews === 'object') {
      for (const [week, items] of Object.entries(raw.reviews)) {
        if (/^\d{4}-W\d{2}$/.test(week) && Array.isArray(items)) data.reviews[week] = items.filter((i) => typeof i === 'string');
      }
    }
    if (raw.settings && INCOME_PROFILES[raw.settings.incomeProfile]) data.settings.incomeProfile = raw.settings.incomeProfile;
    const reviewDay = raw.settings && raw.settings.reviewDay;
    if (Number.isInteger(reviewDay) && reviewDay >= 1 && reviewDay <= 7) data.settings.reviewDay = reviewDay;
    const expenseIds = new Set(data.categories.filter((c) => c.type === 'expense').map((c) => c.id));
    const items = raw.settings && raw.settings.budgetItems;
    if (Array.isArray(items)) data.settings.budgetItems = [...new Set(items.filter((id) => typeof id === 'string' && expenseIds.has(id)))];
    const payday = raw.settings && raw.settings.paydayBusinessDay;
    if (Number.isInteger(payday) && payday >= 1 && payday <= 10) data.settings.paydayBusinessDay = payday;
    return data;
  }

  function validInstallment(i) {
    return Boolean(i) && typeof i.group === 'string' && Number.isInteger(i.of) && i.of >= 2 && i.of <= MAX_INSTALLMENTS && Number.isInteger(i.n) && i.n >= 1 && i.n <= i.of;
  }

  function csvCell(value) {
    let s = String(value == null ? '' : value);
    // Evita injeção de fórmulas ao abrir no Excel/Planilhas.
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s = `'${s}`;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  /** CSV com ";" e vírgula decimal, compatível com Excel em português. */
  function toCSV(transactions, categories) {
    const cats = indexCategories(categories);
    const rows = [['Data', 'Tipo', 'Categoria', 'Balde', 'Descrição', 'Valor', 'Fixo']];
    for (const t of sortTransactions(transactions)) {
      const cat = cats[t.categoryId] || {};
      rows.push([
        t.date,
        t.type === 'income' ? 'Receita' : 'Despesa',
        cat.name || t.categoryId,
        cat.bucket ? BUCKETS[cat.bucket].label : '',
        t.installment ? `${t.description} (${installmentLabel(t)})`.trim() : t.description,
        ((t.type === 'income' ? 1 : -1) * t.amount / 100).toFixed(2).replace('.', ','),
        t.recurring ? 'Sim' : 'Não',
      ]);
    }
    return rows.map((r) => r.map(csvCell).join(';')).join('\n');
  }

  return {
    DATA_VERSION,
    BUCKETS,
    DEFAULT_TARGETS,
    PLAN_PROFILES,
    essentialShare,
    adaptivePlan,
    INCOME_PROFILES,
    DEFAULT_CATEGORIES,
    parseAmount,
    formatBRL,
    formatPercent,
    todayISO,
    monthKey,
    shiftMonth,
    daysInMonth,
    monthLabel,
    elapsedDays,
    weekKey,
    indexCategories,
    transactionsOfMonth,
    sortTransactions,
    summarize,
    leftAfterSaving,
    bucketAnalysis,
    budgetStatus,
    dailyAllowance,
    isoWeekday,
    reviewReminder,
    nthBusinessDay,
    paydayCycle,
    allowanceUntilPayday,
    suggestBudgets,
    bucketCeilings,
    bucketBudgetStatus,
    suggestFromHistory,
    referenceIncome,
    budgetsFromAnswers,
    DEFAULT_BUDGET_ITEMS,
    budgetVisibleCategories,
    budgetAddable,
    validateCategoryName,
    createCategory,
    averageEssential,
    emergencyFundTarget,
    goalSaved,
    createGoalDeposit,
    goalProgress,
    recurringForMonth,
    MAX_INSTALLMENTS,
    GOALS_CATEGORY,
    isReserveGoal,
    createGoal,
    createEmergencyGoal,
    budgetTotal,
    savingsGoalReached,
    isISODate,
    buildEntry,
    requestedInstallments,
    applyEdit,
    installmentAmounts,
    idsToDelete,
    createInstallments,
    installmentCommitments,
    installmentLabel,
    insights,
    emptyData,
    normalizeData,
    toCSV,
  };
});
