/* Finan — interface. Depende de FinanCore (js/core.js) e FinanSugestao (js/sugestao.js). */
(function () {
  'use strict';

  const F = window.FinanCore;
  const S = window.FinanSugestao;
  const STORAGE_KEY = 'finan:data';
  const WEEKDAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
  const TAB_KEY = 'finan:tab';
  const TABS = ['painel', 'lancamentos', 'orcamento', 'metas', 'metodo'];
  const MAIS_TABS = ['metas', 'metodo']; // ficam dentro do "Mais", na barra de baixo
  const BARRA = ['painel', 'lancamentos', 'orcamento', 'mais'];

  const REVIEW_ITEMS = [
    { id: 'registrar', text: 'Conferi se todos os gastos da semana foram lançados (extrato e cartão).' },
    { id: 'envelopes', text: 'Olhei os envelopes em risco e decidi onde vou segurar os gastos.' },
    { id: 'futuro', text: 'O aporte do balde Futuro deste mês já foi feito.' },
    { id: 'contas', text: 'Verifiquei as contas que vencem na próxima semana.' },
    { id: 'assinaturas', text: 'Cancelei alguma assinatura ou gasto que não uso mais (ou confirmei que todas valem a pena).' },
    { id: 'metas', text: 'Atualizei o valor guardado nas minhas metas.' },
  ];

  const TIPO_DA_CATEGORIA = { fixa: 'fixa', variavel: 'variável' };

  const STATUS_LABEL = {
    ok: 'No plano',
    atencao: 'Atenção',
    risco: 'Vai estourar',
    estourado: 'Estourado',
    acima: 'Acima da meta',
    abaixo: 'Abaixo da meta',
    'sem-renda': 'Sem renda',
  };

  // ---------- Estado e armazenamento ----------

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? F.normalizeData(JSON.parse(raw)) : F.emptyData();
    } catch (e) {
      return F.emptyData();
    }
  }

  function saveData() {
    let gravou = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch (e) {
      gravou = false;
      toast('Não foi possível salvar neste navegador. Faça um backup.');
    }
    protegerDados({ pedir: true, gravou });
    limparDesfazer(); // os dados mudaram: a cópia de antes já não vale
    closeSugestao(); // e a sugestão aberta também não vale mais
  }

  // ---------- Proteção dos dados ----------
  // Pede ao navegador para não apagar os dados sozinho quando faltar espaço e mostra em "Seus
  // dados" o que de fato foi conseguido, sem prometer o que não dá. O pedido só acontece depois
  // de um salvamento (nunca ao abrir o app, porque em alguns navegadores ele abre um aviso), uma
  // vez por visita, e só quando há lançamentos. Limpar os dados do navegador continua apagando tudo.
  const PROTECAO = {
    protegido: 'Proteção ativada: o navegador não apaga estes dados sozinho quando falta espaço. Limpar os dados do navegador ainda os apaga: baixe um backup de vez em quando.',
    'nao-garantido': 'O navegador ainda pode apagar estes dados se o aparelho ficar sem espaço. Baixe um backup de vez em quando.',
    indisponivel: 'Este navegador não garante a proteção dos dados. Baixe um backup de vez em quando.',
    aguardando: 'Assim que você lançar algo, o app pede ao navegador para proteger os seus dados.',
    'sem-gravar': 'Não foi possível salvar os seus dados neste navegador. Baixe um backup agora, para não perder o que você lançou.',
  };
  let pediuPersistencia = false;
  let jaProtegido = false;
  let filaProtecao = Promise.resolve();

  async function estadoDaProtecao(pedir) {
    const armazenamento = navigator.storage;
    if (!armazenamento || !armazenamento.persisted || !armazenamento.persist) return 'indisponivel';
    const temDados = state.data.transactions.length > 0;
    let protegido = jaProtegido || await armazenamento.persisted();
    if (!protegido && pedir && temDados && !pediuPersistencia) {
      pediuPersistencia = true;
      protegido = await Promise.resolve().then(() => armazenamento.persist()).catch(() => false);
    }
    jaProtegido = protegido;
    if (protegido) return 'protegido';
    return temDados || pediuPersistencia ? 'nao-garantido' : 'aguardando';
  }

  // As consultas entram numa fila, uma de cada vez: uma resposta antiga nunca cobre uma nova.
  function protegerDados({ pedir = false, gravou = true } = {}) {
    filaProtecao = filaProtecao
      .then(() => (gravou ? estadoDaProtecao(pedir) : 'sem-gravar'))
      .catch(() => 'indisponivel')
      .then((estado) => {
        const texto = PROTECAO[estado];
        const el = $('#storage-status');
        if (el.textContent !== texto) el.textContent = texto;
      });
  }

  function loadTab() {
    try {
      const tab = localStorage.getItem(TAB_KEY);
      return TABS.includes(tab) ? tab : 'painel';
    } catch (e) {
      return 'painel';
    }
  }

  const state = {
    data: loadData(),
    month: F.monthKey(F.todayISO()),
    tab: loadTab(),
    editingId: null,
    addingTo: null, // balde com a lista "Adicionar" aberta
    creating: false, // formulário "Criar" aberto dentro da lista
    filterText: '',
    filterCategory: '',
    allowanceAberto: false, // "Ver detalhes" do cartão do pode gastar: a escolha da pessoa vale mesmo se o cartão sumir num redesenho
    sugestao: null, // resultado da sugestão que está na tela, para "Aplicar como limites"
    undo: null, // cópia dos dados antes de uma exclusão (ou troca geral), para o "Desfazer"
    undoTexto: '', // o que a mensagem diz depois de desfazer
  };

  function newId() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const visivel = (el) => Boolean(el) && el.offsetParent !== null;

  /**
   * A tela é redesenhada com innerHTML, o que apaga o controle em que a pessoa estava e joga o
   * foco para o início da página. Quem usa teclado ou leitor de tela perderia o lugar a cada ação.
   * Guarda onde o foco está e devolve uma função que o restaura depois do redesenho: no mesmo
   * controle; se ele sumiu, no que ocupou o lugar dele (ex.: o próximo "Excluir"); e, se não
   * houver, no título do bloco onde a pessoa estava.
   */
  function guardarFoco() {
    const atual = document.activeElement;
    if (!atual || !$('main').contains(atual)) return () => {};
    const tag = atual.tagName.toLowerCase();
    const atributos = ['data-category', 'data-review', 'data-action', 'data-id'].filter((n) => atual.hasAttribute(n));
    const dosAtributos = atributos.map((n) => `[${n}="${CSS.escape(atual.getAttribute(n))}"]`).join('');
    const seletor = atual.id ? `#${CSS.escape(atual.id)}` : atributos.length ? tag + dosAtributos : null;
    const mesmaAcao = atual.dataset.action ? `${tag}[data-action="${CSS.escape(atual.dataset.action)}"]` : null;
    const posicao = mesmaAcao ? $$(mesmaAcao).filter(visivel).indexOf(atual) : -1;
    const aba = atual.closest('.tab-panel');
    const bloco = aba ? $$('.panel', aba).indexOf(atual.closest('.panel')) : -1;

    return () => {
      const agora = document.activeElement;
      if (agora && agora !== document.body && $('main').contains(agora)) return;
      let alvo = seletor && $$(seletor).find(visivel);
      if (!alvo && mesmaAcao) {
        const irmaos = $$(mesmaAcao).filter(visivel);
        alvo = irmaos[Math.min(posicao, irmaos.length - 1)];
      }
      if (!alvo && aba && bloco >= 0) alvo = $$('.panel', aba)[bloco]?.querySelector('h2');
      if (!alvo) return;
      if (!alvo.matches('button, input, select, a[href], summary')) alvo.tabIndex = -1;
      alvo.focus();
    };
  }

  function redesenhar() {
    const devolverFoco = guardarFoco();
    render();
    devolverFoco();
  }

  function commit(message, copiaAntes, textoDesfeito = 'Exclusão desfeita.') {
    saveData();
    redesenhar();
    if (copiaAntes) { // depois de saveData, que limpa o desfazer anterior
      state.undo = copiaAntes;
      state.undoTexto = textoDesfeito;
    }
    if (message) toast(message, Boolean(copiaAntes));
  }

  // ---------- Utilidades de interface ----------

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // Único ponto das janelas nativas do navegador (confirm e prompt): trocar por uma janela própria,
  // ou ganhar um "desfazer", muda só aqui. Hoje abrem a mesma janela de sempre.
  function confirmar(texto) {
    return window.confirm(texto);
  }

  function perguntar(texto) {
    return window.prompt(texto);
  }

  function money(cents) {
    return esc(F.formatBRL(cents));
  }

  function centsToInput(cents) {
    return (cents / 100).toFixed(2).replace('.', ',');
  }

  let toastTimer;
  const TOAST_MS = 3200;
  const DESFAZER_MS = 10000; // tempo para desfazer uma exclusão (decisão do Isaac, 01/10/2026)

  function toast(text, comDesfazer = false) {
    const el = $('#toast');
    el.textContent = text;
    if (comDesfazer) {
      const botao = document.createElement('button'); // montado sem innerHTML: nenhum texto digitado entra aqui
      botao.type = 'button';
      botao.className = 'toast-btn';
      botao.dataset.action = 'undo';
      botao.textContent = 'Desfazer';
      el.append(botao);
    }
    el.classList.toggle('com-desfazer', comDesfazer);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      limparDesfazer();
    }, comDesfazer ? DESFAZER_MS : TOAST_MS);
  }

  // Cópia dos dados antes de excluir: "Desfazer" devolve esta cópia, até algo mais mudar os dados.
  function copiarDados() {
    return JSON.parse(JSON.stringify(state.data));
  }

  // Cópia para desfazer uma troca geral dos dados; sem dados a perder, não há o que desfazer.
  function copiaSeTemDados() {
    const d = state.data;
    return d.transactions.length || d.goals.length || Object.keys(d.budgets).length ? copiarDados() : undefined;
  }

  function limparDesfazer() {
    state.undo = null;
    const botao = $('#toast .toast-btn');
    if (botao) botao.remove();
    $('#toast').classList.remove('com-desfazer');
  }

  function desfazer() {
    if (!state.undo) return;
    const texto = state.undoTexto;
    state.data = state.undo;
    commit(texto);
    $('#conteudo').focus({ preventScroll: true }); // o botão saiu da tela: o foco volta ao conteúdo
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatLongDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  /** Nome falado pelos botões de um lançamento: distingue um de outro para o leitor de tela. */
  function nomeDoLancamento(t, cat) {
    const parcela = t.installment ? `, parcela ${F.installmentLabel(t)}` : '';
    return `${t.description || cat.name}${parcela}, ${F.formatBRL(t.amount)}`;
  }

  function bar(ratio, status, markerRatio) {
    const width = Math.max(0, Math.min(ratio, 1)) * 100;
    const marker = markerRatio != null ? `<span class="bar-marker" style="left:${Math.min(markerRatio, 1) * 100}%"></span>` : '';
    return `<div class="bar"><span class="bar-fill status-${esc(status)}" style="width:${width}%"></span>${marker}</div>`;
  }

  function expenseCategories() {
    return state.data.categories.filter((c) => c.type === 'expense');
  }

  // ---------- Cálculos do mês selecionado ----------

  function monthContext() {
    const today = F.todayISO();
    const cats = state.data.categories;
    const txs = F.transactionsOfMonth(state.data.transactions, state.month);
    const summary = F.summarize(txs, cats);
    const previousTx = F.transactionsOfMonth(state.data.transactions, F.shiftMonth(state.month, -1));
    const previousSummary = previousTx.length ? F.summarize(previousTx, cats) : null;
    const plan = F.adaptivePlan(F.essentialShare(state.data.transactions, cats, state.month));
    const buckets = F.bucketAnalysis(summary, plan);
    const budgetRows = F.budgetStatus(state.data.budgets, summary, cats, state.month, today);
    const commitments = F.installmentCommitments(state.data.transactions, state.month);
    return { today, txs, summary, previousSummary, plan, buckets, budgetRows, commitments };
  }

  // ---------- Renderização ----------

  function render() {
    $('#month-label').textContent = F.monthLabel(state.month);
    $$('.tabs [data-tab]').forEach((b) => {
      const active = b.dataset.tab === state.tab;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1; // só a aba atual é parada do Tab; as setas trocam de aba
    });
    const noMais = MAIS_TABS.includes(state.tab);
    $('#mais').classList.toggle('active', noMais);
    $('#mais').tabIndex = noMais ? 0 : -1; // com Metas ou Método aberta, o "Mais" é o item atual da barra
    if (noMais) $('#mais').setAttribute('aria-current', 'true');
    else $('#mais').removeAttribute('aria-current');
    TABS.forEach((t) => { $(`#tab-${t}`).hidden = t !== state.tab; });
    $('.fab').hidden = state.tab === 'lancamentos'; // o formulário já está nessa aba

    const ctx = monthContext();
    renderDashboard(ctx);
    renderTransactions(ctx);
    renderBudget(ctx);
    renderGoals(ctx);
    renderReview();
  }

  /** Só vale até o próximo pagamento para renda estável com o dia útil informado; senão, até o fim do mês. */
  function calcularAllowance(ctx) {
    const { incomeProfile, paydayBusinessDay } = state.data.settings;
    const byPayday = incomeProfile === 'estavel' && paydayBusinessDay > 0 && state.month === F.monthKey(ctx.today);
    const allowance = byPayday
      ? F.allowanceUntilPayday(state.data.transactions, state.data.categories, state.data.budgets, ctx.today, paydayBusinessDay)
      : F.dailyAllowance(ctx.budgetRows, state.month, ctx.today, ctx.summary);
    return { allowance, byPayday };
  }

  function renderAllowance(ctx) {
    const { allowance, byPayday } = calcularAllowance(ctx);
    if (!allowance) return '';
    const dias = `${allowance.daysLeft} ${allowance.daysLeft === 1 ? 'dia' : 'dias'}`;
    const periodo = byPayday ? 'desde o último pagamento' : 'no mês';
    const proximo = byPayday ? `${allowance.nextPayday.slice(8, 10)}/${allowance.nextPayday.slice(5, 7)}` : '';
    const ate = byPayday ? `, até o próximo pagamento (${proximo})` : '';
    const contando = byPayday ? `contando até o próximo pagamento (${proximo})` : 'contando até o fim do mês';
    const abertura = allowance.perDay > 0 ? 'Esse é o máximo para hoje' : 'Hoje não sobra nada para gastar';
    // Painel enxuto: o número e uma linha. O resto (semana, envelopes, o que já guardou) fica em "Ver detalhes".
    return `
      <div class="allowance">
        <div>
          <span class="card-label">Você pode gastar hoje</span>
          <span class="allowance-value">${money(allowance.perDay)}</span>
        </div>
        <p class="allowance-resumo">${abertura}, ${contando}.${allowance.capped ? ' Limitado ao que sobrou.' : ''}</p>
        <details class="allowance-mais"${state.allowanceAberto ? ' open' : ''}>
          <summary id="allowance-detalhes">Ver detalhes</summary>
          <p>Nesta semana, até domingo (${allowance.weekDays} ${allowance.weekDays === 1 ? 'dia' : 'dias'}): <strong>${money(allowance.perWeek)}</strong>.</p>
          <p>${allowance.capped ? `Limitado ao que sobrou ${periodo} (${money(allowance.left)})` : `${money(allowance.remaining)} livres nos envelopes variáveis`} para os próximos ${dias}${ate}.</p>
          ${allowance.capped ? `<p>Os envelopes ainda têm ${money(allowance.envelopeRemaining)}, mas esse dinheiro já foi gasto ou guardado.</p>` : ''}
          ${allowance.saved > 0 ? `<p class="muted">Você já guardou ${money(allowance.saved)} ${byPayday ? 'desde o último pagamento' : 'neste mês'}.</p>` : ''}
        </details>
      </div>`;
  }

  function renderDashboard(ctx) {
    const { summary, buckets, budgetRows, previousSummary, commitments, plan } = ctx;
    const hasData = state.data.transactions.length > 0;

    $('#onboarding').innerHTML = hasData ? '' : `
      <article class="panel welcome">
        <h2>Bem-vindo ao Finan 👋</h2>
        <p>Comece em 3 minutos:</p>
        <ol>
          <li>Lance sua <strong>renda do mês</strong> (salário, extras).</li>
          <li>Na aba <strong>Orçamento</strong>, clique em <em>Sugerir pelos meus gastos</em> e ajuste os limites.</li>
          <li>Registre cada gasto no momento em que ele acontece.</li>
        </ol>
        <div class="actions">
          <button type="button" class="btn primary" data-action="quick-add" data-type="income">Lançar minha renda</button>
          <button type="button" class="btn" data-action="load-demo">Ver com dados de exemplo</button>
        </div>
      </article>`;

    renderCards(summary, plan);

    $('#allowance').innerHTML = renderAllowance(ctx);
    renderReviewReminder();
    renderBackupReminder();

    renderBuckets(summary, buckets, plan);

    const list = F.insights({ summary, buckets, budgetRows, previousSummary, commitments, plan, categories: state.data.categories });
    renderInsights(list);

    const cats = F.indexCategories(state.data.categories);
    const entries = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 0;
    $('#top-categories').innerHTML = entries.length ? entries.map(([id, value]) => {
      const cat = cats[id] || { name: id, icon: '•' };
      return `
        <div class="cat-row">
          <span class="cat-name">${esc(cat.icon)} ${esc(cat.name)}</span>
          <div class="bar"><span class="bar-fill bucket-${esc(cat.bucket || 'estilo')}" style="width:${(value / max) * 100}%"></span></div>
          <span class="cat-value">${money(value)}</span>
        </div>`;
    }).join('') : '<p class="muted">Nenhuma despesa neste mês ainda.</p>';
  }

  /** Quatro números que somam a renda: Receitas = Gastos + Guardado + Sobrou. */
  function renderCards(summary, plan) {
    const temRenda = summary.income > 0;
    const sobrouClasse = summary.balance < 0 ? 'negative' : 'positive';
    const guardadoClasse = F.savingsGoalReached(summary, plan) ? 'positive' : '';
    const taxa = temRenda ? `${esc(F.formatPercent(summary.savingsRate))} da renda` : 'sem renda ainda';
    $('#summary-cards').innerHTML = `
      <div class="card"><span class="card-label">Receitas</span><span class="card-value">${money(summary.income)}</span></div>
      <div class="card"><span class="card-label">Gastos</span><span class="card-value">${money(summary.consumption)}</span><span class="card-hint">essenciais + estilo de vida</span></div>
      <div class="card"><span class="card-label">Guardado</span><span class="card-value ${guardadoClasse}">${money(summary.saved)}</span><span class="card-hint">${taxa} · meta: ${plan.futuro}% ou mais</span></div>
      <div class="card"><span class="card-label">Sobrou</span><span class="card-value ${sobrouClasse}">${money(summary.balance)}</span><span class="card-hint">renda menos o que gastou e guardou</span></div>`;
  }

  function renderBuckets(summary, buckets, plan) {
    const profile = F.PLAN_PROFILES[plan.profile];
    const descricao = `${profile.description}${plan.essentialShare != null ? ` Essenciais nos últimos 3 meses: ${F.formatPercent(plan.essentialShare)} da renda.` : ''}`;
    const pedeAtencao = plan.profile === 'ajustando' || plan.profile === 'critico'; // aí a explicação fica à vista, no lugar
    $('#plan-info').innerHTML = `
      <span class="badge plan-${esc(plan.profile)}">${esc(profile.label)}</span>
      <strong>${plan.essencial}/${plan.estilo}/${plan.futuro}</strong>
      <span class="muted small">essenciais / estilo de vida / futuro</span>
      ${pedeAtencao ? `<span class="muted">${esc(descricao)}</span>` : ''}`;
    $('#plan-description').hidden = pedeAtencao;
    $('#plan-description').textContent = descricao;
    $('#buckets').innerHTML = buckets.map((b) => `
      <div class="bucket">
        <div class="bucket-head">
          <strong>${esc(b.label)}</strong>
          <span class="badge status-${esc(b.status)}">${esc(STATUS_LABEL[b.status])}</span>
        </div>
        ${bar(summary.income > 0 ? b.share : 0, b.status, b.targetRatio)}
        <div class="bucket-foot muted">
          <span>${money(b.actual)} (${summary.income > 0 ? esc(F.formatPercent(b.share)) : '—'} da renda) · ${b.id === 'futuro' ? 'mín.' : 'máx.'} ${esc(F.formatPercent(b.targetRatio))}${summary.income > 0 ? ` (${money(b.target)})` : ''}</span>
        </div>
      </div>`).join('');
  }

  function renderCategoryOptions() {
    const form = $('#tx-form');
    const type = form.elements.type.value;
    const select = form.elements.categoryId;
    const current = select.value;
    const editing = state.data.transactions.find((t) => t.id === state.editingId);
    const showGoals = state.data.goals.length > 0 || (editing && editing.categoryId === F.GOALS_CATEGORY);
    const cats = state.data.categories.filter((c) => c.type === type && (showGoals || c.id !== F.GOALS_CATEGORY));
    const groups = type === 'income'
      ? [['Receitas', cats]]
      : Object.keys(F.BUCKETS).map((b) => [F.BUCKETS[b].label, cats.filter((c) => c.bucket === b)]);
    select.innerHTML = groups.map(([label, list]) => `<optgroup label="${esc(label)}">${list.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} ${esc(c.icon)}</option>`).join('')}</optgroup>`).join('');
    if (cats.some((c) => c.id === current)) select.value = current;
    renderGoalField();
  }

  /** "Para qual meta?" só aparece na categoria Metas; e guardar numa meta não se parcela. */
  function renderGoalField() {
    const form = $('#tx-form');
    const isGoal = form.elements.type.value === 'expense' && form.elements.categoryId.value === F.GOALS_CATEGORY;
    const select = form.elements.goalId;
    const current = select.value;
    select.innerHTML = state.data.goals.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
    if (state.data.goals.some((g) => g.id === current)) select.value = current;
    $('#goal-field').hidden = !isGoal;
    // Parcelamento só para despesas novas; editar muda apenas a parcela escolhida.
    $('#installments-field').hidden = form.elements.type.value !== 'expense' || Boolean(state.editingId) || isGoal;
  }

  function renderTransactions(ctx) {
    renderCategoryOptions();
    const filterSelect = $('#filter-category');
    const selected = state.filterCategory;
    filterSelect.innerHTML = `<option value="">Todas as categorias</option>` +
      state.data.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} ${esc(c.icon)}</option>`).join('');
    filterSelect.value = selected;

    const cats = F.indexCategories(state.data.categories);
    const text = state.filterText.trim().toLowerCase();
    const list = F.sortTransactions(ctx.txs).filter((t) =>
      (!state.filterCategory || t.categoryId === state.filterCategory) &&
      (!text || (t.description || '').toLowerCase().includes(text) || (cats[t.categoryId] && cats[t.categoryId].name.toLowerCase().includes(text))));

    if (!list.length) {
      $('#tx-list').innerHTML = `<p class="muted">${ctx.txs.length ? 'Nenhum lançamento encontrado com esse filtro.' : 'Nenhum lançamento neste mês.'}</p>`;
      return;
    }

    let html = '';
    let lastDate = null;
    for (const t of list) {
      if (t.date !== lastDate) {
        if (lastDate) html += '</ul>';
        html += `<h3 class="day">${esc(formatDay(t.date))}</h3><ul class="tx-list">`;
        lastDate = t.date;
      }
      const cat = cats[t.categoryId] || { name: t.categoryId, icon: '•' };
      const nome = esc(nomeDoLancamento(t, cat));
      html += `
        <li class="tx">
          <span class="tx-icon" aria-hidden="true">${esc(cat.icon)}</span>
          <span class="tx-main">
            <span class="tx-desc">${esc(t.description || cat.name)}${t.recurring ? ' <span class="tag">fixo</span>' : ''}${t.installment ? ` <span class="tag">${esc(F.installmentLabel(t))}</span>` : ''}</span>
            <span class="tx-cat muted">${esc(cat.name)}</span>
          </span>
          <span class="tx-amount ${t.type === 'income' ? 'positive' : ''}">${t.type === 'income' ? '+' : '−'} ${money(t.amount)}</span>
          <span class="tx-actions">
            <button type="button" class="icon-btn" data-action="edit-tx" data-id="${esc(t.id)}" aria-label="Editar ${nome}">✎</button>
            <button type="button" class="icon-btn" data-action="delete-tx" data-id="${esc(t.id)}" aria-label="Excluir ${nome}">🗑</button>
          </span>
        </li>`;
    }
    $('#tx-list').innerHTML = html + '</ul>';
  }

  const ROOM_CLASS = { passou: 'danger', justo: 'ok', cabe: '', 'sem-renda': '' };

  /** O que sobra do teto do balde, em texto (nunca só cor). */
  function roomText(room) {
    const base = `Distribuído nos limites: ${money(room.distributed)}`;
    if (room.status === 'passou') return `${base} · passa do teto em ${money(-room.left)}. Reduza algum limite.`;
    if (room.status === 'justo') return `${base} · o teto está todo distribuído`;
    if (room.status === 'cabe') {
      const gasto = room.spentWithoutLimit > 0 ? ` (elas já gastaram ${money(room.spentWithoutLimit)})` : '';
      return `${base} · sobram ${money(room.left)} para as categorias sem limite${gasto}`;
    }
    return base;
  }

  function renderBudget(ctx) {
    const { summary, budgetRows, plan } = ctx;
    const rows = Object.fromEntries(budgetRows.map((r) => [r.categoryId, r]));
    const totalBudget = F.budgetTotal(state.data.budgets, state.data.categories);
    const unassigned = summary.income - totalBudget;

    let zb;
    if (summary.income <= 0) zb = '<div class="notice">Lance a renda deste mês para comparar com o orçamento.</div>';
    else if (unassigned > 0) zb = `<div class="notice warn">Faltam <strong>${money(unassigned)}</strong> sem destino. Distribua nos envelopes (de preferência para o Futuro: reserva e investimentos).</div>`;
    else if (unassigned < 0) zb = `<div class="notice danger">Seu orçamento passa a renda em <strong>${money(-unassigned)}</strong>. Reduza algum envelope.</div>`;
    else zb = '<div class="notice ok">Tudo certo: cada real da renda tem um destino. 🎯</div>';
    $('#zero-based').innerHTML = zb;

    const rooms = Object.fromEntries(F.bucketBudgetStatus(state.data.budgets, state.data.categories, summary, plan).map((r) => [r.id, r]));
    const visible = F.budgetVisibleCategories(state.data.categories, state.data.budgets, state.data.settings.budgetItems);
    $('#budget-table').innerHTML = Object.keys(F.BUCKETS).map((bucketId) => {
      const room = rooms[bucketId];
      const label = F.BUCKETS[bucketId].label;
      return `
        <div class="budget-group">
          <h3>${esc(label)}</h3>
          <p class="budget-sum">${room.ceiling === null ? 'Lance a renda do mês para ver o teto deste balde.' : `Teto do balde: ${money(room.ceiling)} (${plan[bucketId]}% da renda)`}</p>
          <p class="budget-room ${ROOM_CLASS[room.status]}">${roomText(room)}</p>
          ${visible[bucketId].map((c) => budgetRowHtml(c, rows[c.id], summary)).join('')}
          <button type="button" class="btn small budget-add" data-action="open-add" data-bucket="${esc(bucketId)}" aria-label="Adicionar item em ${esc(label)}">Adicionar</button>
          ${state.addingTo === bucketId ? addPanelHtml(bucketId) : ''}
        </div>`;
    }).join('');
  }

  /** Uma linha do Orçamento: nome, status, barra e o campo do limite. */
  function budgetRowHtml(c, r, summary) {
    const limit = state.data.budgets[c.id] || 0;
    const spent = summary.byCategory[c.id] || 0;
    const detail = r
      ? `${money(r.spent)} de ${money(r.limit)} · ${r.remaining >= 0 ? `restam ${money(r.remaining)}` : `passou ${money(-r.remaining)}`}${r.status === 'risco' ? ` · projeção ${money(r.projected)}` : ''}`
      : (spent ? `${money(spent)} gastos · sem limite definido` : 'sem limite definido');
    return `
      <div class="budget-row">
        <div class="budget-info">
          <div class="budget-head">
            <span class="cat-name">${esc(c.icon)} ${esc(c.name)} <span class="tag">${esc(TIPO_DA_CATEGORIA[c.kind] || c.kind)}</span></span>
            ${r ? `<span class="badge status-${esc(r.status)}">${esc(STATUS_LABEL[r.status])}</span>` : ''}
          </div>
          ${r ? bar(r.ratio, r.status) : ''}
          <span class="budget-detail">${detail}</span>
        </div>
        <div class="budget-limit">
          <span class="budget-limit-label" aria-hidden="true">Limite mensal (R$)</span>
          <input class="budget-input" data-category="${esc(c.id)}" inputmode="decimal" aria-label="Limite para ${esc(c.name)}" placeholder="Limite" value="${limit ? esc(centsToInput(limit)) : ''}">
        </div>
      </div>`;
  }

  /** Lista "Adicionar" de um balde: itens do catálogo que ainda não estão no orçamento, e o "Criar". */
  function addPanelHtml(bucketId) {
    const items = F.budgetAddable(state.data.categories, bucketId, state.data.budgets, state.data.settings.budgetItems);
    const list = items.length
      ? `<ul class="add-list">${items.map((c) => `<li><button type="button" class="btn add-item" data-action="add-item" data-id="${esc(c.id)}">${esc(c.name)} ${esc(c.icon)}</button></li>`).join('')}</ul>`
      : '<p class="muted">Todos os itens deste grupo já estão no orçamento. Use "Criar" para cadastrar um novo.</p>';
    const create = state.creating
      ? `<form class="create-form" data-form="create-item" novalidate>
          <label>Nome do novo item
            <input name="name" maxlength="${60}" autocomplete="off">
          </label>
          <p class="form-error" id="create-error" role="alert"></p>
          <div class="actions">
            <button type="submit" class="btn primary">Criar e adicionar</button>
            <button type="button" class="btn" data-action="cancel-create">Cancelar</button>
          </div>
        </form>`
      : '<button type="button" class="btn" data-action="start-create">Criar</button>';
    return `
      <div class="add-panel">
        <h4 id="add-title" tabindex="-1">Adicionar em ${esc(F.BUCKETS[bucketId].label)}</h4>
        ${list}
        ${create}
        <button type="button" class="btn small" data-action="close-add">Fechar</button>
      </div>`;
  }

  function renderPayday(profileId) {
    if (profileId !== 'estavel') return '<p class="muted small">Com renda variável, o "Você pode gastar hoje" do Painel conta até o fim do mês.</p>';
    const atual = state.data.settings.paydayBusinessDay;
    const opcoes = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${atual === i + 1 ? 'selected' : ''}>${i + 1}º dia útil</option>`).join('');
    return `
      <label>Em que dia útil você recebe?
        <select id="payday">
          <option value="0" ${atual ? '' : 'selected'}>Não informar</option>
          ${opcoes}
        </select>
      </label>
      <p class="muted small">Com o dia informado, o "Você pode gastar hoje" do Painel passa a durar até o seu próximo pagamento. Só sábado e domingo contam como folga; feriados não. Sem informar, ele conta até o fim do mês.</p>`;
  }

  function renderGoals(ctx) {
    const profileId = state.data.settings.incomeProfile;
    const months = F.INCOME_PROFILES[profileId].months;
    const target = F.emergencyFundTarget(state.data.transactions, state.data.categories, state.month, profileId);
    const saved = state.data.goals.find(F.isReserveGoal);
    let goalAction = '';
    if (target > 0 && !saved) goalAction = `<button type="button" class="btn primary" data-action="create-emergency" data-target="${target}">Criar meta de reserva</button>`;
    else if (target > 0 && saved.target !== target) goalAction = `<button type="button" class="btn" data-action="update-emergency" data-id="${esc(saved.id)}" data-target="${target}">Atualizar minha meta para ${money(target)}</button>`;
    $('#emergency').innerHTML = `
      <article class="panel emergency">
        <h2>🛟 Reserva de emergência</h2>
        <label>Seu tipo de renda
          <select id="income-profile">
            ${Object.entries(F.INCOME_PROFILES).map(([id, p]) => `<option value="${esc(id)}" ${id === profileId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
          </select>
        </label>
        <p class="muted small">Reserva de ${months} meses de gastos essenciais. Exemplos: ${esc(F.INCOME_PROFILES[profileId].examples)}.</p>
        ${renderPayday(profileId)}
        ${target > 0 ? `
          <div class="reserve-ideal">
            <p>Com base nos seus gastos essenciais, sua reserva ideal é de <strong>${money(target)}</strong> (${months} meses de custo de vida).</p>
            ${goalAction}
          </div>`
        : `<p class="muted">Registre seus gastos essenciais (moradia, mercado, contas…) para calcularmos o valor ideal da sua reserva: ${months} meses de custo de vida.</p>`}
        <p class="muted small">Deixe a reserva em um investimento seguro e com resgate imediato. Ela é o que impede um imprevisto de virar dívida.</p>
      </article>`;

    if (!state.data.goals.length) {
      $('#goal-list').innerHTML = '<p class="muted">Nenhuma meta ainda. Metas com valor e prazo dão motivo para cada real economizado.</p>';
      return;
    }
    $('#goal-list').innerHTML = state.data.goals.map((g) => {
      const p = F.goalProgress(g, ctx.today, state.data.transactions);
      return `
        <div class="goal">
          <div class="goal-head">
            <strong>${esc(g.name)}</strong>
            <span>${money(F.goalSaved(g, state.data.transactions))} de ${money(g.target)}</span>
          </div>
          ${bar(p.ratio, p.done ? 'ok' : 'progresso')}
          <div class="goal-foot muted small">
            <span>${p.done ? 'Meta concluída! 🎉' : `${esc(F.formatPercent(p.ratio))} · faltam ${money(p.remaining)}`}${!p.done && p.monthly ? ` · guarde ${money(p.monthly)}/mês por ${p.monthsLeft} ${p.monthsLeft === 1 ? 'mês' : 'meses'}` : ''}</span>
            <span class="actions">
              ${p.done ? '' : `<button type="button" class="btn small" data-action="deposit-goal" data-id="${esc(g.id)}" aria-label="Guardar valor na meta ${esc(g.name)}">Guardar valor</button>`}
              <button type="button" class="icon-btn" data-action="delete-goal" data-id="${esc(g.id)}" aria-label="Excluir meta ${esc(g.name)}">🗑</button>
            </span>
          </div>
        </div>`;
    }).join('');
  }

  function renderReviewReminder() {
    const done = (state.data.reviews[F.weekKey(F.todayISO())] || []).length;
    const reminder = state.data.transactions.length ? F.reviewReminder(F.todayISO(), state.data.settings.reviewDay, done, REVIEW_ITEMS.length) : null;
    const text = { hoje: 'Hoje é o seu dia de revisão semanal.', atrasada: 'Sua revisão semanal desta semana ainda não foi feita.' }[reminder];
    $('#review-reminder').innerHTML = text ? `
      <article class="panel">
        <p><strong>${text}</strong> Leva só alguns minutos.</p>
        <button type="button" class="btn primary" data-action="open-review">Fazer a revisão</button>
      </article>` : '';
  }

  const insightItem = (i) => `<li class="insight level-${esc(i.level)}">${esc(i.text)}</li>`;

  /** No máximo 3 avisos à vista; o resto fica recolhido em "Ver mais N avisos". */
  function renderInsights(list) {
    const { shown, rest } = F.splitInsights(list);
    $('#insights').innerHTML = shown.map(insightItem).join('');
    const more = $('#insights-more');
    more.hidden = !rest.length;
    $('summary', more).textContent = `Ver mais ${rest.length} ${rest.length === 1 ? 'aviso' : 'avisos'}`;
    $('.insights', more).innerHTML = rest.map(insightItem).join('');
  }

  function renderBackupReminder() {
    const reminder = F.backupReminder(F.todayISO(), state.data.settings.lastBackup, state.data.transactions.length);
    const text = {
      nunca: 'Você ainda não baixou nenhum backup. Seus dados ficam só neste aparelho: se o navegador for limpo, tudo se perde.',
      antigo: 'Faz 30 dias ou mais que você baixou o último backup. Baixe um novo para não perder o que lançou desde então.',
    }[reminder];
    $('#backup-reminder').innerHTML = text ? `
      <article class="panel">
        <p><strong>${text}</strong></p>
        <button type="button" class="btn primary" data-action="export-json">Baixar backup</button>
      </article>` : '';
  }

  function renderReview() {
    const week = F.weekKey(F.todayISO());
    const done = new Set(state.data.reviews[week] || []);
    $('#review-day').innerHTML = WEEKDAYS.map((nome, i) => `<option value="${i + 1}" ${state.data.settings.reviewDay === i + 1 ? 'selected' : ''}>${esc(nome)}</option>`).join('');
    $('#week-label').textContent = `· semana ${week.split('-W')[1]}`;
    $('#review-list').innerHTML = REVIEW_ITEMS.map((item) => `
      <li><label class="check"><input type="checkbox" data-review="${esc(item.id)}" ${done.has(item.id) ? 'checked' : ''}> ${esc(item.text)}</label></li>`).join('') +
      (done.size === REVIEW_ITEMS.length ? '<li class="insight level-bom">Revisão da semana concluída. Você está no controle! 💪</li>' : '');
  }

  // ---------- Formulário de lançamentos ----------

  function resetTxForm() {
    const form = $('#tx-form');
    form.reset();
    state.editingId = null;
    form.elements.date.value = defaultDate();
    $('#tx-form details.more').open = false;
    $('#form-title').textContent = 'Novo lançamento';
    $('#tx-submit').textContent = 'Salvar';
    $('[data-action="cancel-edit"]').hidden = true;
    $('#tx-error').textContent = '';
    renderCategoryOptions();
  }

  /** Rola até o bloco do formulário, com o título à vista (o topo fixo não o cobre). */
  function showTxForm() {
    $('#form-title').closest('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function defaultDate() {
    const today = F.todayISO();
    return F.monthKey(today) === state.month ? today : `${state.month}-01`;
  }

  function startEdit(id) {
    const t = state.data.transactions.find((x) => x.id === id);
    if (!t) return;
    const form = $('#tx-form');
    state.editingId = id;
    form.elements.type.value = t.type;
    renderCategoryOptions();
    form.elements.amount.value = centsToInput(t.amount);
    form.elements.categoryId.value = t.categoryId;
    if (t.goalId) form.elements.goalId.value = t.goalId;
    renderGoalField();
    form.elements.date.value = t.date;
    form.elements.description.value = t.description;
    form.elements.recurring.checked = t.recurring;
    $('#form-title').textContent = 'Editar lançamento';
    $('#tx-submit').textContent = 'Salvar alterações';
    $('[data-action="cancel-edit"]').hidden = false;
    $('#tx-form details.more').open = true;
    showTxForm();
    form.elements.amount.focus();
  }

  /** Data vazia: avisa e leva o foco ao campo, abrindo o "Mais detalhes" onde ele fica. */
  function pedirData(form) {
    $('#tx-error').textContent = 'Informe uma data válida.';
    $('#tx-form details.more').open = true;
    form.elements.date.focus();
  }

  /** Depois de um gasto novo, diz quanto ainda dá para gastar hoje (o mesmo número do cartão do Painel). */
  function restanteDoDia(entry) {
    if (entry.type !== 'expense' || guardaDinheiro(entry)) return '';
    const { allowance } = calcularAllowance(monthContext());
    return allowance ? ` Você ainda pode gastar ${F.formatBRL(allowance.perDay)} hoje.` : '';
  }

  function submitTx(event) {
    event.preventDefault();
    const form = event.target;
    const amount = F.parseAmount(form.elements.amount.value);
    const date = form.elements.date.value;
    const error = $('#tx-error');
    if (!(amount > 0)) {
      error.textContent = 'Informe um valor maior que zero, por exemplo 25,90.';
      form.elements.amount.focus();
      return;
    }
    if (!F.isISODate(date)) {
      pedirData(form);
      return;
    }
    const entry = F.buildEntry({
      type: form.elements.type.value,
      amount,
      date,
      categoryId: form.elements.categoryId.value,
      description: form.elements.description.value,
      recurring: form.elements.recurring.checked,
      goalId: form.elements.goalId.value,
    }, state.data.goals);
    const installments = F.requestedInstallments(entry, form.elements.installments.value);
    const doMes = F.installmentAmounts(amount, installments)[0]; // o que cai no mês da compra
    if (!state.editingId && guardaDinheiro(entry) && !confirmarGuardar(doMes, F.monthKey(date))) return;
    const lancamentoNovo = !state.editingId;
    let message;
    if (state.editingId) {
      const idx = state.data.transactions.findIndex((t) => t.id === state.editingId);
      if (idx > -1) state.data.transactions[idx] = F.applyEdit(state.data.transactions[idx], entry);
      message = 'Lançamento atualizado.';
    } else if (installments > 1) {
      const parcels = F.createInstallments(entry, installments, newId);
      state.data.transactions.push(...parcels);
      message = `Compra de ${F.formatBRL(amount)} em ${parcels.length}x de ${F.formatBRL(parcels[0].amount)} lançada.`;
    } else {
      state.data.transactions.push({ id: newId(), createdAt: Date.now(), ...entry });
      message = `${entry.type === 'income' ? 'Receita' : 'Despesa'} de ${F.formatBRL(amount)} lançada.`;
    }
    const keepType = entry.type;
    const keepDate = entry.date;
    const movedMonth = F.monthKey(date) !== state.month;
    if (movedMonth) state.month = F.monthKey(date);
    resetTxForm();
    form.elements.type.value = keepType;
    form.elements.date.value = keepDate;
    commit(lancamentoNovo ? message + restanteDoDia(entry) : message);
    form.elements.amount.focus();
  }

  // ---------- Ações ----------

  function deleteTransaction(id) {
    const t = state.data.transactions.find((x) => x.id === id);
    if (!t) return;
    const todasAsParcelas = Boolean(t.installment) && confirmar(`Esta compra foi parcelada em ${t.installment.of}x. Excluir todas as parcelas?`);
    if (t.installment && !todasAsParcelas && !confirmar('Excluir só esta parcela?')) return; // sem parcelas, o "Desfazer" cobre o engano
    const antes = copiarDados();
    const ids = F.idsToDelete(state.data.transactions, id, todasAsParcelas);
    const remove = new Set(ids);
    state.data.transactions = state.data.transactions.filter((x) => !remove.has(x.id));
    if (remove.has(state.editingId)) resetTxForm();
    commit(ids.length > 1 ? `${ids.length} parcelas excluídas.` : 'Lançamento excluído.', antes);
  }

  function copyRecurring() {
    const from = F.shiftMonth(state.month, -1);
    const copies = F.recurringForMonth(state.data.transactions, from, state.month, newId);
    if (!copies.length) {
      toast('Nenhum lançamento fixo novo para trazer do mês anterior.');
      return;
    }
    state.data.transactions.push(...copies);
    commit(`${copies.length} lançamento(s) fixo(s) copiados.`);
  }

  function suggestBudget() {
    const result = S.sugerirGastos(state.data, state.month, F.todayISO());
    if (result.status === 'sem-renda') {
      toast('Lance sua renda primeiro para receber uma sugestão.');
      return;
    }
    if (result.status === 'sem-historico') {
      openQuiz();
      return;
    }
    abrirSugestao(result);
  }

  // ---------- Sugestão de limites pelos gastos reais ----------

  const sugItem = (rotulo, valor, nota = '') => `<li><span>${esc(rotulo)}</span><strong>${valor}</strong>${nota ? `<span class="muted small">${esc(nota)}</span>` : ''}</li>`;
  const meses = (n) => `${n} ${n === 1 ? 'mês' : 'meses'}`;

  function sugConfianca(r) {
    if (r.confianca === 'baixa') return `Baseada em só ${meses(r.meses)} de histórico: use como ponto de partida e ajuste.`;
    if (r.confianca === 'media') return `Baseada em ${meses(r.meses)} de histórico. Quanto mais meses você lançar, melhor fica.`;
    return `Baseada nos seus últimos ${meses(r.meses)}.`;
  }

  function sugResumo(r) {
    const notaRenda = r.renda.variavel ? 'Renda variável: usamos a parte mais baixa dos últimos meses, para não contar com dinheiro incerto.' : '';
    const extra = r.renda.extra > 0 ? `Neste mês já entrou ${F.formatBRL(r.renda.extra)} acima disso.` : '';
    const itens = [sugItem('Renda prevista', F.formatBRL(r.renda.base), `${notaRenda} ${extra}`.trim()), sugItem('O que você precisa pagar', F.formatBRL(r.necessarios))];
    if (r.comprometidos > 0) itens.push(sugItem('Compromissos fixos', F.formatBRL(r.comprometidos)));
    itens.push(sugItem('Margem', F.formatBRL(r.margem)));
    return `<ul class="sug-lista">${itens.join('')}</ul>`;
  }

  function sugLinha(l) {
    const valor = l.fixa ? F.formatBRL(l.limite) : `até ${F.formatBRL(l.limite)}`;
    const notas = [];
    if (l.esporadico) notas.push('Você gasta isso de vez em quando.');
    if (l.abaixoDoHabito) notas.push(`Abaixo do que você costuma gastar (${F.formatBRL(l.tipico)}).`);
    return sugItem(l.nome, valor, notas.join(' '));
  }

  function sugGrupo(titulo, linhas) {
    return linhas.length ? `<h4>${esc(titulo)}</h4><ul class="sug-lista">${linhas.map(sugLinha).join('')}</ul>` : '';
  }

  function sugObjetivos(r) {
    if (!r.objetivos.length) return '';
    const itens = r.objetivos.map((o) => {
      const valor = o.completo ? `${F.formatBRL(o.destinado)} por mês` : `${F.formatBRL(o.destinado)} por mês, de ${F.formatBRL(o.precisa)} que ela precisa`;
      const nota = o.meses ? `${o.completo ? 'Chega lá em' : 'Nesse ritmo, leva'} ${meses(o.meses)}.` : 'Não sobra nada para ela neste mês.';
      return sugItem(o.nome, valor, nota);
    });
    return `<h4>Para guardar</h4><ul class="sug-lista">${itens.join('')}</ul>`;
  }

  function sugAvisos(r) {
    const atipicos = r.linhas.flatMap((l) => l.atipicos.map((v) => `<p class="muted small">Não entrou na conta: ${esc(l.nome)} teve ${F.formatBRL(v)} num mês fora do comum.</p>`));
    const sobra = r.livre > 0 ? `<div class="notice">Sobram <strong>${F.formatBRL(r.livre)}</strong> sem destino. Você decide: guardar numa meta ou deixar de folga.</div>` : '';
    const reserva = r.status === 'ok' && r.avisos.includes('sem-meta-de-reserva')
      ? '<p>Você ainda não tem uma meta de reserva de emergência. <button type="button" class="btn small" data-action="go-metas">Ir para Metas</button></p>' : '';
    return atipicos.join('') + sobra + reserva;
  }

  function sugDeficit(r) {
    const revisar = r.revisar.length ? ` Para rever primeiro: ${r.revisar.map((l) => `${esc(l.nome)} (${F.formatBRL(l.limite)})`).join(', ')}.` : '';
    const semFolga = r.linhas.filter((l) => l.grupo === 'flexivel').map((l) => esc(l.nome));
    const folga = semFolga.length ? ` Sem folga para: ${semFolga.join(', ')}.` : '';
    return `<div class="notice danger">Sua renda não cobre o que você já paga todo mês: faltam <strong>${F.formatBRL(r.falta)}</strong>. Por isso a sugestão não separa dinheiro para metas nem para gastos de estilo de vida.${folga}${revisar}</div>`;
  }

  const SUG_COMO = `
    <details class="how">
      <summary>Como calculamos</summary>
      <p class="muted">O app não usa porcentagens fixas da renda. Ele olha o que você realmente paga e gasta nos últimos meses (até 6) e separa a conta em partes: o que você precisa pagar (moradia, mercado, saúde, dívidas…), os compromissos fixos (assinaturas, parcelas) e a margem que sobra.</p>
      <p class="muted small">Da margem, primeiro fica o mínimo que você já gasta no dia a dia; depois vão as suas metas, só até o que o prazo de cada uma pede; o resto é para gastar à vontade. Em cada categoria vale o valor típico dos seus meses (um mês fora do comum não conta) e o limite é “até” um valor que você já teve. Nada é sugerido para o que você não usa. Se a renda não cobre o básico, o app mostra o tamanho do buraco em vez de inventar folga.</p>
    </details>`;

  function abrirSugestao(r) {
    closeQuiz();
    state.sugestao = r;
    const deficit = r.status === 'deficit';
    $('#sug-conteudo').innerHTML = `<p class="muted">${esc(sugConfianca(r))}</p>${sugResumo(r)}${deficit ? sugDeficit(r) : ''}`
      + sugGrupo('Necessários', r.linhas.filter((l) => l.grupo === 'necessario'))
      + sugGrupo('Compromissos fixos', r.linhas.filter((l) => l.grupo === 'comprometido'))
      + sugObjetivos(r)
      + (deficit ? '' : sugGrupo('Para gastar, até:', r.linhas.filter((l) => l.grupo === 'flexivel')))
      + sugAvisos(r) + SUG_COMO;
    $('#sugestao').hidden = false;
    $('#sug-title').focus();
  }

  function closeSugestao() {
    state.sugestao = null;
    const painel = $('#sugestao');
    const focoDentro = painel.contains(document.activeElement);
    painel.hidden = true;
    if (focoDentro) $('[data-action="suggest-budget"]').focus(); // o foco não pode se perder junto com o painel
  }

  function cancelarSugestao() {
    closeSugestao();
    $('[data-action="suggest-budget"]').focus();
  }

  /** Grava o que a pessoa viu na tela (não recalcula), com pergunta se já havia limites e "Desfazer". */
  function aplicarSugestao() {
    const r = state.sugestao;
    if (!r) return;
    const temLimites = Object.keys(state.data.budgets).length > 0;
    if (temLimites && !confirmar('Substituir os limites atuais pela sugestão baseada nos seus gastos? O que você definiu para o Futuro (como Investimentos) fica como está.')) return;
    const antes = temLimites ? copiarDados() : undefined;
    state.data.budgets = S.mesclarLimites(state.data.budgets, r.limites, state.data.categories); // o que ela definiu no Futuro fica
    closeSugestao();
    commit('Limites aplicados. Ajuste os valores à sua realidade.', antes, 'Limites anteriores de volta.');
    $('#budget-title').focus();
  }

  function irParaMetas() {
    abrirAba('metas');
    $('#conteudo').focus({ preventScroll: true });
  }

  // ---------- Questionário do orçamento (quem ainda não tem histórico) ----------

  /** Abre o questionário: um campo por categoria de Essenciais e Estilo de vida, todos opcionais. */
  function openQuiz() {
    const grupos = ['essencial', 'estilo'].map((bucketId) => {
      const campos = expenseCategories().filter((c) => c.bucket === bucketId).map((c) => `
        <label>${esc(c.name)}
          <input data-category="${esc(c.id)}" data-name="${esc(c.name)}" inputmode="decimal" placeholder="0,00" autocomplete="off">
        </label>`).join('');
      return `<fieldset class="quiz-group"><legend>${esc(F.BUCKETS[bucketId].label)} (R$ por mês)</legend>${campos}</fieldset>`;
    }).join('');
    $('#quiz-fields').innerHTML = grupos;
    $('#quiz-error').textContent = '';
    closeSugestao();
    $('#budget-quiz').hidden = false;
    $('#quiz-title').focus();
  }

  function closeQuiz() {
    $('#budget-quiz').hidden = true;
  }

  /** Lê as respostas do questionário. Devolve null (com o erro na tela) se alguma for inválida ou se não houver nenhuma. */
  function readQuizAnswers() {
    const answers = {};
    for (const input of $$('#quiz-fields input')) {
      const raw = input.value.trim();
      if (!raw) continue;
      const cents = F.parseAmount(raw);
      if (!(cents > 0)) {
        $('#quiz-error').textContent = `Valor inválido em ${input.dataset.name}: informe um número como 600 ou 1.250,50.`;
        input.focus();
        return null;
      }
      answers[input.dataset.category] = cents;
    }
    if (!Object.keys(answers).length) {
      $('#quiz-error').textContent = 'Informe o valor de pelo menos uma categoria, ou toque em "Agora não".';
      return null;
    }
    return answers;
  }

  function submitQuiz(event) {
    event.preventDefault();
    $('#quiz-error').textContent = '';
    const answers = readQuizAnswers();
    if (!answers) return;
    if (Object.keys(state.data.budgets).length > 0 && !confirmar('Substituir os limites atuais pelos valores que você informou?')) return;
    const income = F.referenceIncome(state.data.transactions, state.data.categories, state.month);
    state.data.budgets = F.budgetsFromAnswers(answers, state.data.categories, income, monthContext().plan);
    closeQuiz();
    commit('Orçamento criado com os valores que você informou. Ajuste quando quiser.');
    $('#budget-title').focus();
  }

  /** Avisa antes de guardar mais do que sobrou no mês. Devolve false se a pessoa desistir. */
  function confirmarGuardar(valor, mes) {
    const resumo = F.summarize(F.transactionsOfMonth(state.data.transactions, mes), state.data.categories);
    const depois = F.leftAfterSaving(resumo, valor);
    if (depois === null || depois >= 0) return true;
    return confirmar(`Guardar ${F.formatBRL(valor)} deixa ${F.monthLabel(mes)} no vermelho: depois de guardar, faltariam ${F.formatBRL(-depois)}. Quer guardar mesmo assim?`);
  }

  function guardaDinheiro(entry) {
    const categoria = F.indexCategories(state.data.categories)[entry.categoryId];
    return entry.type === 'expense' && Boolean(categoria) && categoria.bucket === 'futuro';
  }

  function depositGoal(id) {
    const goal = state.data.goals.find((g) => g.id === id);
    if (!goal) return;
    const input = perguntar(`Quanto você guardou para "${goal.name}"? (R$)`);
    if (input == null) return;
    const amount = F.parseAmount(input);
    if (!(amount > 0)) {
      toast('Valor inválido.');
      return;
    }
    if (!confirmarGuardar(amount, F.monthKey(F.todayISO()))) return;
    // Guardar numa meta é guardar: vira um lançamento do Futuro, ligado à meta, que conta no Painel.
    state.data.transactions.push(F.createGoalDeposit(goal, amount, F.todayISO(), newId()));
    commit(`${F.formatBRL(amount)} adicionados à meta.`);
  }

  function submitGoal(event) {
    event.preventDefault();
    const form = event.target;
    const target = F.parseAmount(form.elements.target.value);
    const saved = form.elements.saved.value ? F.parseAmount(form.elements.saved.value) : 0;
    const error = $('#goal-error');
    if (!(target > 0)) {
      error.textContent = 'Informe o valor total da meta.';
      return;
    }
    if (!(saved >= 0)) {
      error.textContent = 'Valor guardado inválido.';
      return;
    }
    state.data.goals.push(F.createGoal({ name: form.elements.name.value, target, saved, deadline: form.elements.deadline.value }, newId()));
    form.reset();
    error.textContent = '';
    commit('Meta criada.');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = F.normalizeData(JSON.parse(reader.result));
        if (!confirmar(`Restaurar backup com ${data.transactions.length} lançamento(s)? Os dados atuais serão substituídos.`)) return;
        const antes = copiaSeTemDados();
        state.data = data;
        commit('Backup restaurado.', antes, 'Restauração do backup desfeita.');
      } catch (e) {
        toast('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  }

  function demoData() {
    const data = F.emptyData();
    const today = F.todayISO();
    const current = F.monthKey(today);
    const todayDay = Number(today.slice(8, 10));
    const add = (month, day, type, categoryId, reais, description, recurring = false) => {
      const d = Math.min(day, F.daysInMonth(month));
      if (month === current && d > todayDay) return;
      data.transactions.push({ id: newId(), type, categoryId, amount: Math.round(reais * 100), date: `${month}-${String(d).padStart(2, '0')}`, description, recurring, createdAt: Date.now() });
    };
    for (let i = 2; i >= 0; i--) {
      const m = F.shiftMonth(current, -i);
      const k = 1 + (2 - i) * 0.08;
      add(m, 1, 'income', 'salario', 5200, 'Salário', true);
      add(m, 1, 'expense', 'investimentos', 600, 'Aporte mensal', true);
      add(m, 1, 'expense', 'reserva', 300, 'Reserva', true);
      add(m, 5, 'expense', 'moradia', 1500, 'Aluguel', true);
      add(m, 8, 'expense', 'contas', 280, 'Luz, água e internet', true);
      add(m, 10, 'expense', 'assinaturas', 55.9, 'Streaming e música', true);
      add(m, 3, 'expense', 'mercado', 320 * k, 'Mercado do mês');
      add(m, 12, 'expense', 'mercado', 180 * k, 'Feira e hortifrúti');
      add(m, 20, 'expense', 'mercado', 210, 'Reposição');
      add(m, 2, 'expense', 'transporte', 150, 'Recarga do transporte');
      add(m, 15, 'expense', 'transporte', 90, 'Aplicativo de corrida');
      add(m, 6, 'expense', 'restaurantes', 85 * k, 'Pizza');
      add(m, 9, 'expense', 'restaurantes', 62 * k, 'Almoço fora');
      add(m, 13, 'expense', 'restaurantes', 110 * k, 'Delivery');
      add(m, 18, 'expense', 'lazer', 120, 'Cinema e passeio');
      add(m, 22, 'expense', 'compras', 199.9, 'Roupa');
      add(m, 25, 'expense', 'saude', 75, 'Farmácia');
    }
    data.budgets = {
      moradia: 150000, contas: 30000, mercado: 75000, transporte: 25000, saude: 15000,
      restaurantes: 35000, lazer: 25000, compras: 30000, assinaturas: 6000, outros: 10000,
      reserva: 30000, investimentos: 60000,
    };
    data.goals = [
      { id: newId(), name: 'Reserva de emergência', target: 1800000, saved: 450000, deadline: '' },
      { id: newId(), name: 'Viagem de férias', target: 600000, saved: 120000, deadline: `${F.shiftMonth(current, 10)}-01` },
    ];
    return data;
  }

  function mudarMes(delta) {
    state.month = F.shiftMonth(state.month, delta);
    closeSugestao(); // a sugestão é de um mês só
    if (!state.editingId) $('#tx-form').elements.date.value = defaultDate();
    render();
  }

  function lancarRapido(el) {
    state.tab = 'lancamentos';
    if (el && el.dataset.type) $('#tx-form').elements.type.value = el.dataset.type;
    render();
    showTxForm();
    $('#tx-form').elements.amount.focus();
  }

  function exportarCsv() {
    download(`finan-${state.month}.csv`, '\ufeff' + F.toCSV(F.transactionsOfMonth(state.data.transactions, state.month), state.data.categories), 'text/csv;charset=utf-8');
  }

  function cancelarQuestionario() {
    closeQuiz();
    $('[data-action="suggest-budget"]').focus();
  }

  function criarReserva(el) {
    state.data.goals.unshift(F.createEmergencyGoal(Number(el.dataset.target), newId()));
    commit('Meta de reserva criada.');
  }

  function atualizarReserva(el) {
    const goal = state.data.goals.find((g) => g.id === el.dataset.id);
    if (goal) goal.target = Number(el.dataset.target);
    commit('Meta de reserva atualizada.');
  }

  function excluirMeta(el) {
    const antes = copiarDados(); // sem pergunta: o "Desfazer" cobre o engano
    state.data.goals = state.data.goals.filter((g) => g.id !== el.dataset.id);
    commit('Meta excluída.', antes);
  }

  function exportarBackup() {
    state.data.settings.lastBackup = F.todayISO(); // antes de baixar, para o arquivo já levar a data
    download(`finan-backup-${F.todayISO()}.json`, JSON.stringify(state.data, null, 2), 'application/json');
    commit('Backup baixado.');
  }

  function carregarExemplo() {
    if (state.data.transactions.length && !confirmar('Substituir seus dados pelos dados de exemplo?')) return;
    const antes = copiaSeTemDados();
    state.data = demoData();
    state.month = F.monthKey(F.todayISO());
    state.tab = 'painel';
    commit('Dados de exemplo carregados. Use "Apagar tudo" para começar do zero.', antes, 'Dados de exemplo desfeitos.');
  }

  function apagarTudo() {
    if (!confirmar('Apagar TODOS os lançamentos, orçamentos e metas deste navegador? Você terá 10 segundos para desfazer.')) return;
    const antes = copiarDados();
    state.data = F.emptyData();
    resetTxForm();
    commit('Dados apagados.', antes);
  }

  // Cada botão com data-action chama a função daqui; o clique chega por handleAction (e a tecla "n" por 'quick-add').
  const ACTIONS = {
    'prev-month': () => mudarMes(-1),
    'next-month': () => mudarMes(1),
    'quick-add': (el) => lancarRapido(el),
    'cancel-edit': () => resetTxForm(),
    'edit-tx': (el) => startEdit(el.dataset.id),
    'delete-tx': (el) => deleteTransaction(el.dataset.id),
    'copy-recurring': () => copyRecurring(),
    'export-csv': () => exportarCsv(),
    'suggest-budget': () => suggestBudget(),
    'cancel-quiz': () => cancelarQuestionario(),
    'apply-suggestion': () => aplicarSugestao(),
    'cancel-suggestion': () => cancelarSugestao(),
    'go-metas': () => irParaMetas(),
    'create-emergency': (el) => criarReserva(el),
    'update-emergency': (el) => atualizarReserva(el),
    'deposit-goal': (el) => depositGoal(el.dataset.id),
    'delete-goal': (el) => excluirMeta(el),
    'export-json': () => exportarBackup(),
    'load-demo': () => carregarExemplo(),
    'reset': () => apagarTudo(),
    'undo': () => desfazer(),
  };

  function handleAction(action, el) {
    const acao = ACTIONS[action];
    if (acao) acao(el);
  }

  // ---------- Eventos ----------

  function abrirAba(tab, { manterMais = false } = {}) {
    state.tab = tab;
    try { localStorage.setItem(TAB_KEY, state.tab); } catch (e) { /* preferência opcional */ }
    if (!manterMais) fecharMais(false);
    render();
  }

  // "Mais": lista com Metas e Método, aberta acima da barra.
  function maisAberto() { return !$('#mais-menu').hidden; }

  function abrirMais() {
    $('#mais-menu').hidden = false;
    $('#mais').setAttribute('aria-expanded', 'true');
    $(`[data-tab="${MAIS_TABS.includes(state.tab) ? state.tab : MAIS_TABS[0]}"]`).focus();
  }

  function fecharMais(devolverFoco) {
    $('#mais-menu').hidden = true;
    $('#mais').setAttribute('aria-expanded', 'false');
    if (devolverFoco) $('#mais').focus();
  }

  $('#mais').addEventListener('click', () => (maisAberto() ? fecharMais(false) : abrirMais()));

  // Teclado: ao sair da lista com o Tab, ela fecha (senão ficaria aberta sobre a página). Só quando o
  // foco vai para um elemento de fora da barra: com toque o foco pode ser nulo e a lista não deve fechar.
  $('.tabs').addEventListener('focusout', (event) => {
    const destino = event.relatedTarget;
    if (maisAberto() && destino && !destino.closest('.tabs')) fecharMais(false);
  });

  // Teclado: setas, Home e End percorrem a barra (Painel, Lançamentos, Orçamento, Mais) e, aberta a
  // lista, Metas e Método. Nas abas a seleção acompanha o foco; no "Mais" o Enter abre a lista.
  $('.tabs').addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && maisAberto()) {
      event.preventDefault();
      fecharMais(true);
      return;
    }
    const naLista = Boolean(event.target.closest('#mais-menu'));
    const itens = naLista ? MAIS_TABS : BARRA;
    const atual = itens.indexOf(event.target.id === 'mais' ? 'mais' : event.target.dataset.tab);
    const n = itens.length;
    const destino = { ArrowRight: (atual + 1) % n, ArrowLeft: (atual + n - 1) % n, Home: 0, End: n - 1 }[event.key];
    if (atual < 0 || destino === undefined) return;
    event.preventDefault();
    const alvo = itens[destino];
    if (alvo === 'mais') {
      $('#mais').focus();
      return;
    }
    abrirAba(alvo, { manterMais: naLista });
    $(`[data-tab="${alvo}"]`).focus();
  });

  document.addEventListener('click', (event) => {
    if (maisAberto() && !event.target.closest('.tabs')) fecharMais(false); // tocou fora da lista
    const tabBtn = event.target.closest('[data-tab]');
    if (tabBtn) {
      abrirAba(tabBtn.dataset.tab);
      if (MAIS_TABS.includes(tabBtn.dataset.tab)) $('#mais').focus();
      return;
    }
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) handleAction(actionEl.dataset.action, actionEl);
  });

  $('#tx-form').addEventListener('submit', submitTx);
  // Campo obrigatório vazio dentro do "Mais detalhes" recolhido: abre para o navegador poder avisar e focar.
  $('#tx-form').addEventListener('invalid', (event) => {
    const detalhes = event.target.closest('details');
    if (detalhes) detalhes.open = true;
  }, true);
  $('#tx-form').addEventListener('change', (event) => {
    if (event.target.name === 'type') renderCategoryOptions();
    else if (event.target.name === 'categoryId') renderGoalField();
  });
  $('#goal-form').addEventListener('submit', submitGoal);
  $('#emergency').addEventListener('change', (event) => {
    if (event.target.id === 'payday') {
      state.data.settings.paydayBusinessDay = Number(event.target.value);
      commit('Dia de pagamento atualizado.');
    } else if (event.target.id === 'income-profile') {
      state.data.settings.incomeProfile = event.target.value;
      commit('Tipo de renda atualizado.');
    }
  });

  $('#filter-text').addEventListener('input', (event) => {
    state.filterText = event.target.value;
    renderTransactions(monthContext());
  });
  $('#filter-category').addEventListener('change', (event) => {
    state.filterCategory = event.target.value;
    renderTransactions(monthContext());
  });

  // Adicionar item ao orçamento: abrir/fechar a lista, escolher um item ou criar um novo.
  function focusBudgetLimit(categoryId) {
    const input = $$('.budget-input').find((el) => el.dataset.category === categoryId);
    if (input) input.focus();
  }

  function addBudgetItem(category) {
    const items = state.data.settings.budgetItems;
    if (!items.includes(category.id)) items.push(category.id);
    state.addingTo = null;
    state.creating = false;
    commit(`${category.name} adicionado ao orçamento.`);
    focusBudgetLimit(category.id);
  }

  function createBudgetItem(form) {
    const check = F.validateCategoryName(state.data.categories, form.elements.name.value);
    if (!check.ok) {
      $('#create-error').textContent = check.error;
      form.elements.name.focus();
      return;
    }
    const category = F.createCategory(state.addingTo, check.name, newId());
    state.data.categories.push(category);
    addBudgetItem(category);
  }

  const ADD_ACTIONS = {
    'open-add': (el) => { state.addingTo = el.dataset.bucket; state.creating = false; render(); $('#add-title').focus(); },
    'close-add': () => {
      const bucket = state.addingTo;
      state.addingTo = null;
      state.creating = false;
      render();
      $$('.budget-add').find((el) => el.dataset.bucket === bucket).focus();
    },
    'add-item': (el) => addBudgetItem(state.data.categories.find((c) => c.id === el.dataset.id)),
    'start-create': () => { state.creating = true; render(); $('.create-form input').focus(); },
    'cancel-create': () => { state.creating = false; render(); $('[data-action="start-create"]').focus(); },
  };

  $('#budget-table').addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    const action = el && ADD_ACTIONS[el.dataset.action];
    if (action) action(el);
  });

  $('#budget-table').addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.dataset.form === 'create-item') createBudgetItem(event.target);
  });

  $('#budget-table').addEventListener('change', (event) => {
    const input = event.target.closest('.budget-input');
    if (!input) return;
    const id = input.dataset.category;
    const value = input.value.trim() ? F.parseAmount(input.value) : 0;
    if (Number.isNaN(value) || value < 0) {
      toast('Limite inválido.');
      input.value = state.data.budgets[id] ? centsToInput(state.data.budgets[id]) : '';
      return;
    }
    if (value > 0) state.data.budgets[id] = value;
    else delete state.data.budgets[id];
    saveData();
    const categoria = F.indexCategories(state.data.categories)[id];
    const nome = categoria ? categoria.name : id;
    toast(value > 0 ? `Limite de ${nome} salvo: ${F.formatBRL(value)}.` : `Limite de ${nome} removido.`);
    // Adia o redesenho: com Tab, o foco ainda está chegando ao campo seguinte quando o "change" dispara.
    setTimeout(redesenhar, 0);
  });

  $('#budget-quiz').addEventListener('submit', submitQuiz);
  $('#allowance').addEventListener('toggle', (e) => { state.allowanceAberto = e.target.open; }, true); // o evento "toggle" não sobe: captura na ida

  $('#review-day').addEventListener('change', (event) => {
    state.data.settings.reviewDay = Number(event.target.value);
    commit('Dia da revisão atualizado.');
  });

  $('#review-reminder').addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="open-review"]')) return;
    abrirAba('metodo');
    $('#review-title').focus();
  });

  $('#review-list').addEventListener('change', (event) => {
    const box = event.target.closest('[data-review]');
    if (!box) return;
    const week = F.weekKey(F.todayISO());
    const done = new Set(state.data.reviews[week] || []);
    if (box.checked) done.add(box.dataset.review);
    else done.delete(box.dataset.review);
    state.data.reviews[week] = Array.from(done);
    commit();
  });

  $('#import-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) importBackup(file);
    event.target.value = '';
  });

  // Atalho: tecla "n" abre um novo lançamento.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      event.preventDefault();
      handleAction('quick-add');
    }
  });

  // Histórico de atualizações, escondido: 5 toques seguidos na barra do topo, fora das setinhas de mês
  // (decisão do Isaac, 01/10/2026). No celular o nome "Finan" fica escondido da vista, então ali se toca no mês.
  const TOQUES_PARA_ABRIR = 5;
  const PAUSA_MAXIMA_ENTRE_TOQUES = 1500; // ms
  let toquesNoTopo = 0;
  let ultimoToque = 0;

  function novidadesHtml(entradas) {
    return entradas.map((e) => `<section class="novidade">
      <h3>${esc(e.versao ? `Versão ${e.versao}` : e.rotulo)}${e.data ? ` <span class="muted">· ${esc(formatLongDay(e.data))}</span>` : ''}</h3>
      ${e.secoes.map((s) => `<h4>${esc(s.nome)}</h4><ul>${s.itens.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`).join('')}
    </section>`).join('');
  }

  function abrirNovidades() {
    const entradas = window.FINAN_NOVIDADES || [];
    const atual = entradas.find((e) => e.versao);
    $('#novidades-versao').textContent = atual ? `Você está na versão ${atual.versao}.` : '';
    $('#novidades-lista').innerHTML = entradas.length ? novidadesHtml(entradas) : '<p class="muted">Ainda não há histórico.</p>';
    $('#novidades').showModal();
    $('#novidades').scrollTop = 0;
  }

  $('.topbar').addEventListener('click', (event) => {
    if (event.target.closest('button')) return; // as setinhas de mês não contam
    const agora = Date.now();
    toquesNoTopo = agora - ultimoToque <= PAUSA_MAXIMA_ENTRE_TOQUES ? toquesNoTopo + 1 : 1;
    ultimoToque = agora;
    if (toquesNoTopo >= TOQUES_PARA_ABRIR) {
      toquesNoTopo = 0;
      abrirNovidades();
    }
  });

  // App instalável e que abre sem internet. Só em http(s): ao abrir o arquivo direto (file://) não vale.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sem service worker o app continua funcionando */ });
  }

  resetTxForm();
  render();
  protegerDados();
})();
