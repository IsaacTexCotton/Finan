const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/core.js');
const S = require('../js/sugestao.js');

// "Sugerir pelos meus gastos" guiado pelos dados da própria pessoa (decisão do Isaac, 02/10/2026).
// A conta: renda esperada − necessários − comprometidos = margem. Da margem saem, nesta ordem, o
// piso de vida (o quartil baixo do próprio histórico), os objetivos e, por fim, os gastos flexíveis.
// Hoje fixo em 15/10/2026; o histórico olha abril a setembro (seis meses antes do mês sugerido).

const KEY = '2026-10';
const HOJE = '2026-10-15';
const MESES = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']; // do mais antigo ao mais novo
const reais = (v) => Math.round(v * 100);
let seq = 0;
const tx = (m, categoryId, valor, extra = {}) => ({ id: `s${++seq}`, type: categoryId === 'salario' ? 'income' : 'expense', categoryId, amount: reais(valor), date: `${m}-05`, description: '', ...extra });
const mensal = (cat, valores) => valores.flatMap((v, i) => (v ? [tx(MESES[i], cat, v)] : []));
const fixo = (cat, valor) => mensal(cat, MESES.map(() => valor));
const salario = (valor) => fixo('salario', valor);

function sugerir(transactions, { goals = [], settings = {}, categories = F.DEFAULT_CATEGORIES } = {}) {
  return S.sugerirGastos({ transactions, categories, goals, settings }, KEY, HOJE);
}
const linha = (r, id) => r.linhas.find((l) => l.id === id);

test('sem renda registrada não há o que sugerir', () => {
  assert.equal(sugerir(fixo('moradia', 1000)).status, 'sem-renda');
  assert.equal(sugerir([]).status, 'sem-renda');
});

test('sem gastos de meses anteriores não inventa nada (quem decide é o questionário)', () => {
  assert.equal(sugerir([tx(KEY, 'salario', 3000)]).status, 'sem-historico'); // só o mês corrente
  assert.equal(sugerir(salario(3000)).status, 'sem-historico'); // só renda, nenhum gasto
});

test('nunca sugere nada para categoria que a pessoa não usa (jovem que mora com os pais)', () => {
  const r = sugerir([...salario(2000), ...fixo('transporte', 120), ...mensal('lazer', [300, 280, 320, 260, 300, 310]), ...mensal('restaurantes', [250, 200, 260, 240, 230, 250])]);
  assert.equal(r.status, 'ok');
  assert.equal(r.margem, reais(2000 - 120));
  for (const id of ['moradia', 'saude', 'compras', 'assinaturas', 'educacao']) assert.equal(linha(r, id), undefined, id);
  assert.equal(r.limites.saude, undefined);
  assert.ok(linha(r, 'lazer'));
});

test('renda que não cobre o básico é déficit: nada para objetivos nem para gastos flexíveis', () => {
  const r = sugerir([...salario(1800), ...fixo('moradia', 1200), ...mensal('mercado', [600, 620, 590, 610, 600, 630]), ...fixo('transporte', 200),
    ...mensal('saude', [100, 80, 120, 90, 100, 110]), ...mensal('lazer', [80, 60, 90, 70, 80, 60])]);
  assert.equal(r.status, 'deficit');
  assert.equal(r.necessarios, reais(1200 + 618 + 200 + 108)); // mercado e saúde pelo topo da faixa, arredondado para cima
  assert.equal(r.margem, -reais(326));
  assert.equal(r.falta, reais(326));
  assert.deepEqual(r.objetivos, []);
  assert.equal(linha(r, 'lazer').limite, 0);
  assert.equal(r.livre, 0);
});

test('no déficit, o que dá para rever primeiro são os compromissos que não são necessidade (como assinaturas)', () => {
  const r = sugerir([...salario(1500), ...fixo('moradia', 1200), ...fixo('assinaturas', 100), ...fixo('mercado', 500)]);
  assert.equal(r.status, 'deficit');
  assert.deepEqual(r.revisar.map((l) => l.id), ['assinaturas']); // moradia e mercado são necessários: nunca aparecem aqui
});

test('saúde pesada é necessidade (nunca "categoria para cortar") e o lazer raro vira provisão mensal', () => {
  const r = sugerir([...salario(3000), ...mensal('saude', [1400, 1350, 1500, 1420, 1380, 1450]), ...mensal('mercado', [700, 680, 720, 700, 690, 710]),
    ...fixo('contas', 300), ...mensal('lazer', [100, 0, 0, 80, 0, 0])]);
  assert.equal(r.status, 'ok');
  assert.equal(linha(r, 'saude').grupo, 'necessario');
  assert.equal(r.necessarios, reais(1443 + 708 + 300)); // saúde e mercado pelo topo da faixa
  assert.equal(r.margem, reais(549));
  const lazer = linha(r, 'lazer');
  assert.equal(lazer.grupo, 'flexivel');
  assert.equal(lazer.esporadico, true); // gastou em 2 de 6 meses
  assert.equal(lazer.tipico, reais(30)); // R$ 180 em 6 meses = R$ 30 por mês
  assert.equal(lazer.limite, reais(95)); // no máximo o que já gastou num mês
});

test('fixa usa o último valor pago, não a média', () => {
  const r = sugerir([...salario(3000), ...mensal('moradia', [800, 800, 900, 900, 1000, 1100]), ...mensal('mercado', [500, 500, 500, 500, 500, 500])]);
  assert.equal(linha(r, 'moradia').tipico, reais(1100));
  assert.equal(linha(r, 'moradia').limite, reais(1100));
});

test('gasto variável usa a mediana, não a média, e um mês fora do comum não vira hábito', () => {
  const r = sugerir([...salario(4000), ...fixo('moradia', 1200), ...fixo('mercado', 600), ...mensal('compras', [100, 120, 2500, 90, 110, 100])]);
  const compras = linha(r, 'compras');
  assert.equal(compras.tipico, reais(100));
  assert.equal(compras.limite, reais(110)); // topo da faixa: o quartil alto dos meses normais
  assert.deepEqual(compras.atipicos, [reais(2500)]); // aparece para a pessoa, mas fica fora da conta
});

test('renda estável usa a renda do mês ou, sem ela, a do mês anterior', () => {
  assert.equal(sugerir([...salario(2500), ...fixo('moradia', 800)]).renda.base, reais(2500));
  assert.equal(sugerir([...salario(2500), tx(KEY, 'salario', 3100), ...fixo('moradia', 800)]).renda.base, reais(3100));
});

test('renda variável usa uma base conservadora (a metade mais baixa) e o que vier acima é extra', () => {
  const rendas = [4000, 1500, 3500, 900, 3000, 2200];
  const base = [...mensal('salario', rendas), ...fixo('moradia', 900), ...fixo('mercado', 600)];
  const sem = sugerir(base, { settings: { incomeProfile: 'variavel' } });
  assert.equal(sem.renda.base, 153333); // média de 900, 1.500 e 2.200
  assert.equal(sem.renda.extra, 0);
  const com = sugerir([...base, tx(KEY, 'salario', 2000)], { settings: { incomeProfile: 'variavel' } });
  assert.equal(com.renda.base, 153333);
  assert.equal(com.renda.extra, 200000 - 153333); // o que entrou acima da base
  assert.equal(sugerir(base).renda.base, reais(2200)); // renda estável: a do mês anterior
});

test('pagamento de dívida é obrigação: entra nos necessários e reduz a margem', () => {
  const r = sugerir([...salario(3000), ...fixo('moradia', 900), ...mensal('mercado', [600, 600, 600, 600, 600, 600]), ...fixo('dividas', 700), ...mensal('lazer', [200, 150, 180, 160, 200, 170])]);
  assert.equal(linha(r, 'dividas').grupo, 'necessario');
  assert.equal(r.margem, reais(3000 - 900 - 600 - 700));
  assert.equal(linha(r, 'lazer').limite, reais(195)); // cabe: fica no topo da faixa dele
  assert.equal(r.livre, reais(800) - reais(195)); // o resto não tem destino: a pessoa decide
});

test('com margem boa, cada meta recebe o que precisa e o resto fica sem destino', () => {
  const viagem = { id: 'g1', name: 'Viagem', target: reais(6000), saved: 0, deadline: '2027-04-15' };
  const reserva = { id: 'g2', name: 'Reserva de emergência', target: reais(12000), saved: 0, deadline: '' };
  const r = sugerir([...salario(5000), ...fixo('moradia', 1500), ...mensal('mercado', [700, 720, 690, 710, 700, 700]),
    ...mensal('lazer', [300, 280, 320, 260, 300, 310]), ...mensal('restaurantes', [250, 200, 260, 240, 230, 250])], { goals: [viagem, reserva] });
  assert.equal(r.margem, reais(2792)); // mercado entra pelo topo da faixa: R$ 708
  assert.deepEqual(r.objetivos.map((o) => [o.nome, o.precisa, o.destinado]), [['Reserva de emergência', reais(1000), reais(1000)], ['Viagem', reais(1000), reais(1000)]]);
  assert.equal(linha(r, 'lazer').limite, 30700);
  assert.equal(linha(r, 'restaurantes').limite, reais(250));
  assert.equal(r.livre, 23500);
  assert.equal(linha(r, 'lazer').abaixoDoHabito, false);
});

test('com margem pequena, as metas cedem antes do dia a dia: o piso da pessoa é protegido e a meta atrasa', () => {
  const viagem = { id: 'g1', name: 'Viagem', target: reais(6000), saved: 0, deadline: '2027-04-15' };
  const reserva = { id: 'g2', name: 'Reserva de emergência', target: reais(12000), saved: 0, deadline: '' };
  const r = sugerir([...salario(3800), ...fixo('moradia', 1500), ...mensal('mercado', [700, 720, 690, 710, 700, 700]),
    ...mensal('lazer', [300, 280, 320, 260, 300, 310]), ...mensal('restaurantes', [250, 200, 260, 240, 230, 250])], { goals: [viagem, reserva] });
  assert.equal(r.margem, reais(1592));
  const [primeira, segunda] = r.objetivos;
  assert.equal(primeira.nome, 'Reserva de emergência'); // a reserva vem primeiro
  assert.equal(primeira.destinado, reais(1000));
  assert.equal(segunda.destinado, 7450); // só o que sobra depois de proteger o piso do lazer e dos restaurantes
  assert.equal(segunda.meses, 81); // e a tela diz que, nesse ritmo, a viagem demora
  assert.equal(linha(r, 'lazer').limite, 28500); // o piso: o quartil baixo do que a pessoa já gastou
  assert.equal(linha(r, 'lazer').abaixoDoHabito, true);
});

test('uma meta sem prazo não cobra nada por mês, mas a reserva sem prazo usa o horizonte de 12 meses', () => {
  const sonho = { id: 'g1', name: 'Carro', target: reais(40000), saved: 0, deadline: '' };
  const reserva = { id: 'g2', name: 'Reserva de emergência', target: reais(12000), saved: reais(6000), deadline: '' };
  const r = sugerir([...salario(5000), ...fixo('moradia', 1500), ...fixo('mercado', 700)], { goals: [sonho, reserva] });
  assert.deepEqual(r.objetivos.map((o) => o.nome), ['Reserva de emergência']); // o carro não tem prazo: nada a cobrar
  assert.equal(r.objetivos[0].precisa, reais(500)); // faltam R$ 6.000, em 12 meses
});

test('meta concluída não entra na conta', () => {
  const feita = { id: 'g1', name: 'Viagem', target: reais(1000), saved: reais(1000), deadline: '2027-01-15' };
  assert.deepEqual(sugerir([...salario(3000), ...fixo('moradia', 900)], { goals: [feita] }).objetivos, []);
});

test('parcelas já agendadas para o mês entram nos compromissos e no limite da própria categoria', () => {
  const parcela = tx(KEY, 'compras', 300, { installment: { group: 'g', n: 1, of: 5 } });
  const r = sugerir([...salario(3000), ...fixo('moradia', 1000), ...fixo('mercado', 500), parcela]);
  assert.equal(r.parcelas, reais(300));
  assert.equal(r.comprometidos, reais(300));
  assert.equal(r.margem, reais(3000 - 1000 - 500 - 300));
  assert.equal(r.limites.compras, reais(300)); // o Orçamento não grita quando a parcela cair
});

test('as parcelas de meses anteriores não viram "hábito de gastar" em compras', () => {
  const velhas = MESES.map((m, i) => tx(m, 'compras', 300, { installment: { group: 'g', n: i + 1, of: 8 } }));
  const r = sugerir([...salario(3000), ...fixo('moradia', 1000), ...velhas]);
  assert.equal(linha(r, 'compras'), undefined);
});

test('a confiança cresce com os meses de histórico', () => {
  const um = [tx('2026-09', 'salario', 3000), tx('2026-09', 'moradia', 1000), tx('2026-09', 'lazer', 200)];
  assert.equal(sugerir(um).confianca, 'baixa');
  assert.equal(sugerir(um).meses, 1);
  const tres = ['2026-07', '2026-08', '2026-09'].flatMap((m) => [tx(m, 'salario', 3000), tx(m, 'moradia', 1000)]);
  assert.equal(sugerir(tres).confianca, 'media');
  assert.equal(sugerir([...salario(3000), ...fixo('moradia', 1000)]).confianca, 'alta');
});

test('sem meta de reserva, o resultado avisa para a tela oferecer criar uma (nunca cria sozinho)', () => {
  const sem = sugerir([...salario(3000), ...fixo('moradia', 1000)]);
  assert.ok(sem.avisos.includes('sem-meta-de-reserva'));
  const reserva = { id: 'g', name: 'Reserva de emergência', target: reais(9000), saved: 0, deadline: '' };
  assert.ok(!sugerir([...salario(3000), ...fixo('moradia', 1000)], { goals: [reserva] }).avisos.includes('sem-meta-de-reserva'));
  assert.deepEqual(sem.objetivos, []); // e não inventa objetivo por conta própria
});

test('os limites sugeridos incluem a reserva e as outras metas no balde Futuro', () => {
  const viagem = { id: 'g1', name: 'Viagem', target: reais(6000), saved: 0, deadline: '2027-04-15' };
  const reserva = { id: 'g2', name: 'Reserva de emergência', target: reais(12000), saved: 0, deadline: '' };
  const r = sugerir([...salario(5000), ...fixo('moradia', 1500), ...fixo('mercado', 700)], { goals: [viagem, reserva] });
  assert.equal(r.limites.reserva, reais(1000));
  assert.equal(r.limites.metas, reais(1000));
  assert.equal(r.limites.moradia, reais(1500));
});

test('todo valor devolvido é um inteiro em centavos, nunca negativo, em qualquer cenário', () => {
  const cenarios = [
    sugerir([...salario(2000), ...fixo('transporte', 120), ...mensal('lazer', [300, 280, 320, 260, 300, 310])]),
    sugerir([...salario(1800), ...fixo('moradia', 1200), ...mensal('mercado', [600, 620, 590, 610, 600, 630])]),
    sugerir([...mensal('salario', [4000, 1500, 3500, 900, 3000, 2200]), ...fixo('moradia', 900), ...mensal('lazer', [300, 100, 250, 50, 200, 150])], { settings: { incomeProfile: 'variavel' } }),
  ];
  for (const r of cenarios) {
    const numeros = [r.renda.base, r.renda.extra, r.necessarios, r.comprometidos, r.livre, ...Object.values(r.limites), ...r.linhas.flatMap((l) => [l.tipico, l.limite])];
    for (const n of numeros) assert.ok(Number.isInteger(n) && n >= 0, `valor inválido: ${n}`);
  }
});

test('quantil e mediana trabalham com centavos inteiros', () => {
  assert.equal(S.mediana([100, 300, 200]), 200);
  assert.equal(S.mediana([100, 200, 300, 400]), 250);
  assert.equal(S.quantil([10000, 20000, 30000, 40000], 0.25), 17500);
  assert.equal(S.quantil([], 0.5), 0);
  assert.equal(S.quantil([500], 0.9), 500);
});

// ---------- Achados da revisão de código (02/10/2026) ----------

test('o limite do que a pessoa paga nunca fica abaixo do valor pago (arredonda para cima, não para baixo)', () => {
  const r = sugerir([...salario(5000), ...fixo('moradia', 1234.56), ...fixo('assinaturas', 59.9)]);
  assert.equal(linha(r, 'moradia').limite, reais(1235)); // R$ 1.234,56 pagos: o envelope não nasce estourado
  assert.equal(linha(r, 'assinaturas').limite, reais(60));
  assert.equal(r.limites.moradia, reais(1235));
  assert.equal(r.necessarios, reais(1235)); // e o total da conta usa o mesmo valor
  assert.equal(r.comprometidos, reais(60));
});

test('a conta mostrada e os limites aplicados batem: necessários e margem usam os mesmos valores dos limites', () => {
  const r = sugerir([...salario(3000), ...fixo('moradia', 1000), ...mensal('mercado', [600, 620, 590, 610, 600, 630])]);
  assert.equal(linha(r, 'mercado').limite, reais(618)); // topo da faixa, arredondado para cima
  assert.equal(r.necessarios, reais(1000) + reais(618)); // o total é a soma das linhas que a tela mostra
  assert.equal(r.margem, reais(3000) - r.necessarios - r.comprometidos);
});

test('a soma dos limites sugeridos nunca passa da renda prevista', () => {
  const viagem = { id: 'g1', name: 'Viagem', target: reais(6000), saved: 0, deadline: '2027-04-15' };
  const reserva = { id: 'g2', name: 'Reserva de emergência', target: reais(12000), saved: 0, deadline: '' };
  const comMetas = { goals: [viagem, reserva] };
  const cenarios = [
    sugerir([...salario(3800), ...fixo('moradia', 1500), ...mensal('mercado', [700, 720, 690, 710, 700, 700]), ...mensal('lazer', [300, 280, 320, 260, 300, 310])], comMetas),
    sugerir([...salario(5000), ...fixo('moradia', 1500), ...mensal('mercado', [700, 720, 690, 710, 700, 700]), ...mensal('lazer', [300, 280, 320, 260, 300, 310]), tx(KEY, 'compras', 333.33, { installment: { group: 'g', n: 1, of: 3 } })], comMetas),
    sugerir([...salario(3000), ...mensal('saude', [1400, 1350, 1500, 1420, 1380, 1450]), ...mensal('mercado', [700, 680, 720, 700, 690, 710]), ...fixo('contas', 300)]),
  ];
  for (const r of cenarios) {
    assert.equal(r.status, 'ok');
    const total = Object.values(r.limites).reduce((a, b) => a + b, 0);
    assert.ok(total <= r.renda.base, `limites ${total} passam da renda ${r.renda.base}`);
  }
});

test('o aviso "abaixo do hábito" vale para cada categoria, não para todas ao mesmo tempo', () => {
  const r = sugerir([...salario(1300), ...fixo('moradia', 1000), ...fixo('lazer', 100), ...mensal('restaurantes', [100, 200, 300, 400, 150, 250])]);
  assert.equal(r.margem, reais(300));
  assert.equal(linha(r, 'lazer').limite, reais(100)); // gasto estável: continua igual ao que ela gasta
  assert.equal(linha(r, 'lazer').abaixoDoHabito, false);
  assert.equal(linha(r, 'restaurantes').limite, reais(200)); // este sim ficou abaixo dos R$ 225 de costume
  assert.equal(linha(r, 'restaurantes').abaixoDoHabito, true);
});

test('cada objetivo diz se está completo, para a tela não refazer a conta', () => {
  const viagem = { id: 'g1', name: 'Viagem', target: reais(6000), saved: 0, deadline: '2027-04-15' };
  const reserva = { id: 'g2', name: 'Reserva de emergência', target: reais(12000), saved: 0, deadline: '' };
  const r = sugerir([...salario(4300), ...fixo('moradia', 1500), ...fixo('mercado', 700)], { goals: [viagem, reserva] });
  assert.deepEqual(r.objetivos.map((o) => [o.nome, o.completo]), [['Reserva de emergência', true], ['Viagem', true]]);
  const apertado = sugerir([...salario(2800), ...fixo('moradia', 1500), ...fixo('mercado', 700)], { goals: [viagem, reserva] });
  assert.deepEqual(apertado.objetivos.map((o) => [o.nome, o.completo]), [['Reserva de emergência', false], ['Viagem', false]]);
});

test('um aporte de meta menor que R$ 1 não vira um limite de R$ 0 gravado', () => {
  const miuda = { id: 'g1', name: 'Moeda', target: reais(1), saved: 0, deadline: '2027-04-15' };
  const r = sugerir([...salario(3000), ...fixo('moradia', 1000)], { goals: [miuda] });
  assert.equal(r.objetivos[0].destinado > 0, true);
  assert.equal(r.limites.metas, undefined);
  const reservaMiuda = { id: 'g2', name: 'Reserva de emergência', target: reais(1), saved: 0, deadline: '2027-04-15' };
  assert.equal(sugerir([...salario(3000), ...fixo('moradia', 1000)], { goals: [reservaMiuda] }).limites.reserva, undefined);
});

test('mesclarLimites troca os limites pela sugestão, mas não apaga o que a pessoa definiu no Futuro', () => {
  const atuais = { investimentos: 20000, lazer: 5000, mercado: 99000, reserva: 500 };
  const novos = { mercado: 58800, reserva: 100000 };
  assert.deepEqual(S.mesclarLimites(atuais, novos, F.DEFAULT_CATEGORIES), { investimentos: 20000, mercado: 58800, reserva: 100000 });
  assert.deepEqual(S.mesclarLimites({}, novos, F.DEFAULT_CATEGORIES), novos);
  assert.deepEqual(S.mesclarLimites({ metas: 7000 }, { mercado: 100 }, F.DEFAULT_CATEGORIES), { metas: 7000, mercado: 100 });
});
