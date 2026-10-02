/*
 * Finan — "Sugerir pelos meus gastos", guiado pelos dados da própria pessoa.
 * Funções puras (sem DOM, sem armazenamento). Depende de FinanCore (js/core.js). Dinheiro em centavos inteiros.
 *
 * A conta: renda esperada − necessários − comprometidos = margem. Da margem saem, nesta ordem, o piso de
 * vida (o quartil baixo do que a pessoa já gasta), os objetivos e, por fim, os gastos flexíveis. Nada é
 * sugerido para categoria que a pessoa não usa, e nenhuma porcentagem fixa da renda entra na conta.
 */
(function (root, factory) {
  // eslint-disable-next-line no-undef -- `require` só é chamado nos testes (Node); no navegador vale FinanCore
  const core = typeof module === 'object' && module.exports ? require('./core.js') : root.FinanCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FinanSugestao = api;
  // eslint-disable-next-line max-lines-per-function -- invólucro do módulo, não é uma função de negócio
})(typeof self !== 'undefined' ? self : this, function (F) {
  'use strict';

  // Política: poucos números, nomeados e num lugar só. Mudou a regra, muda aqui (e o texto "Como calculamos").
  const POLITICA = {
    janelaMeses: 6, // quanto histórico olhar (sem o mês corrente)
    horizonteReservaMeses: 12, // em quantos meses a reserva chega ao valor ideal, se a meta não tem prazo
    atipicoVezesMediana: 2, // um mês com mais de 2× a mediana fica fora da conta
    usoMinimo: 0.5, // gastou em menos da metade dos meses: vira provisão mensal, não hábito
    mesesConfiancaAlta: 4,
    arredondamento: 100, // limites em reais inteiros
  };

  // ---------- estatística robusta, em centavos inteiros ----------
  function quantil(valores, q) {
    if (!valores.length) return 0;
    const ordenados = [...valores].sort((a, b) => a - b);
    const posicao = (ordenados.length - 1) * q;
    const baixo = Math.floor(posicao);
    const alto = Math.ceil(posicao);
    return Math.round(ordenados[baixo] + (ordenados[alto] - ordenados[baixo]) * (posicao - baixo));
  }

  const mediana = (valores) => quantil(valores, 0.5);
  const soma = (valores) => valores.reduce((a, b) => a + b, 0);
  const paraBaixo = (cents) => Math.floor(cents / POLITICA.arredondamento) * POLITICA.arredondamento;

  // ---------- 1. o que a pessoa realmente gastou, categoria por categoria ----------

  /** Meses anteriores com lançamentos e, por categoria de despesa, o total de cada mês (do mais recente ao mais antigo, sem parcelas). */
  function coletar(transactions, categories, key) {
    const meses = [];
    for (let i = 1; i <= POLITICA.janelaMeses; i++) {
      const doMes = F.transactionsOfMonth(transactions, F.shiftMonth(key, -i));
      if (doMes.length) meses.push(doMes);
    }
    const valores = {};
    for (const c of categories.filter((x) => x.type === 'expense')) {
      valores[c.id] = meses.map((doMes) => soma(doMes.filter((t) => t.type === 'expense' && t.categoryId === c.id && !t.installment).map((t) => t.amount)));
    }
    return { meses: meses.length, valores };
  }

  /**
   * Típico, piso (quartil baixo) e topo (quartil alto) de uma categoria, ou null se a pessoa nunca a usou.
   * Fixa: o último valor pago. Variável: a mediana. Gastou em menos da metade dos meses: provisão mensal.
   * Meses com mais de 2× a mediana são "atípicos": ficam fora da conta, mas voltam para a tela.
   */
  function perfil(categoria, valores) {
    const usados = valores.filter((v) => v > 0);
    if (!usados.length) return null;
    const referencia = mediana(usados);
    const normais = usados.length >= 3 ? usados.filter((v) => v <= POLITICA.atipicoVezesMediana * referencia) : usados;
    const uso = usados.length / valores.length;
    const esporadico = uso < POLITICA.usoMinimo;
    let tipico = categoria.kind === 'fixa' ? valores.find((v) => v > 0) : mediana(normais);
    if (esporadico) tipico = Math.round(soma(normais) / valores.length);
    return {
      tipico,
      piso: Math.min(quantil(normais, 0.25), tipico),
      topo: Math.max(quantil(normais, 0.75), tipico),
      esporadico,
      atipicos: usados.filter((v) => !normais.includes(v)),
    };
  }

  // ---------- 2. renda esperada ----------

  /** Renda estável: a do mês (ou a do anterior). Variável: a metade mais baixa dos últimos meses, e o que entrar acima disso é extra. */
  function rendaEsperada(transactions, categories, key, incomeProfile) {
    const atual = F.referenceIncome(transactions, categories, key);
    const rendas = [];
    for (let i = 1; i <= POLITICA.janelaMeses; i++) {
      const renda = F.summarize(F.transactionsOfMonth(transactions, F.shiftMonth(key, -i)), categories).income;
      if (renda > 0) rendas.push(renda);
    }
    if (incomeProfile !== 'variavel' || !rendas.length) return { base: atual, extra: 0, variavel: incomeProfile === 'variavel' };
    const menores = rendas.sort((a, b) => a - b).slice(0, Math.ceil(rendas.length / 2));
    const base = Math.round(soma(menores) / menores.length);
    const recebido = F.summarize(F.transactionsOfMonth(transactions, key), categories).income;
    return { base, extra: Math.max(recebido - base, 0), variavel: true };
  }

  // ---------- 3. parcelas já agendadas para o mês ----------

  function parcelasDoMes(transactions, key) {
    const porCategoria = {};
    for (const t of F.transactionsOfMonth(transactions, key)) {
      if (t.installment && t.type === 'expense') porCategoria[t.categoryId] = (porCategoria[t.categoryId] || 0) + t.amount;
    }
    return { total: soma(Object.values(porCategoria)), porCategoria };
  }

  // ---------- 4. objetivos ----------

  /** O que cada meta precisa por mês: o aporte do prazo; a reserva sem prazo usa o horizonte da política. Reserva primeiro, depois por prazo. */
  function demandas(goals, transactions, today) {
    const lista = [];
    for (const g of goals) {
      const p = F.goalProgress(g, today, transactions);
      const reserva = F.isReserveGoal(g);
      const precisa = p.monthly || (reserva ? Math.ceil(p.remaining / POLITICA.horizonteReservaMeses) : 0);
      if (precisa > 0) lista.push({ id: g.id, nome: g.name, reserva, precisa, falta: p.remaining, prazo: g.deadline || '9999-12' });
    }
    return lista.sort((a, b) => Number(b.reserva) - Number(a.reserva) || a.prazo.localeCompare(b.prazo));
  }

  /** Reparte o disponível entre as metas, na ordem, cada uma até o que precisa. `meses` = quanto demora nesse ritmo. */
  function repartir(lista, disponivel) {
    let resto = disponivel;
    return lista.map((d) => {
      const destinado = Math.min(d.precisa, resto);
      resto -= destinado;
      return { id: d.id, nome: d.nome, reserva: d.reserva, precisa: d.precisa, destinado, meses: destinado > 0 ? Math.ceil(d.falta / destinado) : null };
    });
  }

  // ---------- 5. gastos flexíveis: a faixa da pessoa, encaixada no que sobrou ----------

  /**
   * Cabe tudo: cada um no topo da faixa. Cabe o típico: entre o típico e o topo. Cabe o piso: entre o piso
   * e o típico. Não cabe nem o piso: proporcional ao piso. Nunca passa do topo, mesmo sobrando dinheiro.
   */
  function encaixar(itens, pote) {
    const [piso, tipico, topo] = ['piso', 'tipico', 'topo'].map((k) => soma(itens.map((i) => i[k])));
    const entre = (a, b, valor) => (b > a ? (valor - a) / (b - a) : 1);
    let escolher = (i) => i.piso * (piso ? Math.max(pote, 0) / piso : 0);
    if (pote >= topo) escolher = (i) => i.topo;
    else if (pote >= tipico) escolher = (i) => i.tipico + (i.topo - i.tipico) * entre(tipico, topo, pote);
    else if (pote >= piso) escolher = (i) => i.piso + (i.tipico - i.piso) * entre(piso, tipico, pote);
    return itens.map((i) => ({ ...i, limite: paraBaixo(escolher(i)), abaixoDoHabito: pote < tipico }));
  }

  // ---------- montagem ----------

  const grupoDe = (categoria) => (categoria.bucket === 'essencial' ? 'necessario' : categoria.kind === 'fixa' ? 'comprometido' : 'flexivel');

  function montarLinhas(categories, valores) {
    const linhas = [];
    for (const c of categories.filter((x) => x.type === 'expense' && x.bucket !== 'futuro')) {
      const p = perfil(c, valores[c.id] || []);
      if (p) linhas.push({ id: c.id, nome: c.name, grupo: grupoDe(c), fixa: c.kind === 'fixa', ...p });
    }
    return linhas;
  }

  /** Necessários e comprometidos não são cortados: limite = o valor pago (fixa) ou o topo da faixa (variável). */
  const comLimiteFixo = (l) => ({ ...l, limite: paraBaixo(l.fixa ? l.tipico : l.topo), abaixoDoHabito: false });

  function limitesDe(linhas, objetivos, parcelas) {
    const limites = {};
    for (const l of linhas) if (l.limite > 0) limites[l.id] = l.limite;
    for (const [id, valor] of Object.entries(parcelas)) limites[id] = (limites[id] || 0) + valor;
    const reserva = soma(objetivos.filter((o) => o.reserva).map((o) => o.destinado));
    const outras = soma(objetivos.filter((o) => !o.reserva).map((o) => o.destinado));
    if (reserva > 0) limites.reserva = paraBaixo(reserva);
    if (outras > 0) limites.metas = paraBaixo(outras);
    return limites;
  }

  function confiancaDe(meses) {
    if (meses >= POLITICA.mesesConfiancaAlta) return 'alta';
    return meses >= 2 ? 'media' : 'baixa';
  }

  /**
   * Sugestão de limites para o mês `key`, a partir do que a pessoa já fez. `data` = { transactions, categories, goals, settings }.
   * status: 'sem-renda' | 'sem-historico' | 'deficit' | 'ok'. Ver os testes para o formato completo.
   */
  function sugerirGastos(data, key, today) {
    const { transactions, categories, goals = [], settings = {} } = data;
    const renda = rendaEsperada(transactions, categories, key, settings.incomeProfile);
    if (!(renda.base > 0)) return { status: 'sem-renda' };
    const { meses, valores } = coletar(transactions, categories, key);
    const brutas = montarLinhas(categories, valores);
    const parcelas = parcelasDoMes(transactions, key);
    if (!meses || (!brutas.length && !parcelas.total)) return { status: 'sem-historico' };

    const fixos = brutas.filter((l) => l.grupo !== 'flexivel').map(comLimiteFixo);
    const necessarios = soma(fixos.filter((l) => l.grupo === 'necessario').map((l) => l.tipico));
    const comprometidos = soma(fixos.filter((l) => l.grupo === 'comprometido').map((l) => l.tipico)) + parcelas.total;
    const margem = renda.base - necessarios - comprometidos;
    const base = { confianca: confiancaDe(meses), meses, renda, necessarios, comprometidos, parcelas: parcelas.total, margem };
    const flexiveis = brutas.filter((l) => l.grupo === 'flexivel');
    const avisos = goals.some(F.isReserveGoal) ? [] : ['sem-meta-de-reserva'];

    if (margem < 0) {
      const linhas = [...fixos, ...flexiveis.map((l) => ({ ...l, limite: 0, abaixoDoHabito: true }))];
      const revisar = fixos.filter((l) => l.grupo === 'comprometido').sort((a, b) => b.tipico - a.tipico);
      return { ...base, status: 'deficit', falta: -margem, linhas, revisar, objetivos: [], livre: 0, limites: limitesDe(linhas, [], parcelas.porCategoria), avisos };
    }
    const piso = soma(flexiveis.map((l) => l.piso));
    const objetivos = repartir(demandas(goals, transactions, today), Math.max(margem - piso, 0));
    const pote = margem - soma(objetivos.map((o) => o.destinado));
    const encaixados = encaixar(flexiveis, pote);
    const linhas = [...fixos, ...encaixados];
    const livre = Math.max(pote - soma(encaixados.map((l) => l.limite)), 0);
    return { ...base, status: 'ok', linhas, revisar: [], objetivos, livre, limites: limitesDe(linhas, objetivos, parcelas.porCategoria), avisos };
  }

  return { POLITICA, sugerirGastos, quantil, mediana };
});
