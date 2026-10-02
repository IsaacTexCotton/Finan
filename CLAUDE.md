# Sobre o projeto
- **O que é:** Finan, um app web para controlar gastos pessoais com o **Método Finan**
  (baldes adaptativos, envelopes, pague-se primeiro, reserva de emergência, revisão semanal).
  Roda 100% no navegador, sem build e sem servidor.
- **Para quem:** pessoas que querem controlar os próprios gastos, sem precisar entender
  de finanças nem de tecnologia.
- **Como trabalhamos:** método Akita (XP + IA). Guia completo em
  [`docs/guia-metodo-akita.md`](docs/guia-metodo-akita.md). A regra de ouro: **a IA escreve
  o código, mas quem manda no projeto é o Isaac.** Ele decide o quê e o porquê; a IA faz o
  como, os testes e o trabalho repetitivo.

# Regras de trabalho
- **Uma tarefa por vez**, do tamanho de um commit que se revisa em poucos minutos. Não
  adicione nada que não foi pedido; ideias extras vão para o `BACKLOG.md` como sugestão.
- **Planeje antes de codar:** explique o quê e o porquê, e espere aprovação.
- **Sempre escreva o teste ANTES da implementação** e rode para vê-lo falhar (fase
  vermelha). Depois implemente o mínimo para passar (fase verde). Por fim, refatore.
- **Nunca altere um teste existente para fazê-lo passar.** O teste é a regra; quem muda a
  regra é o Isaac.
- Todo bug corrigido ganha um teste de regressão (o teste que falha antes da correção).
- **Prefira a solução mais simples que funcione.**
- **Rode `npm run check` (lint + testes) ao final de cada tarefa** e antes de todo commit.
  Faça o commit só se o comando terminar com sucesso (código de saída 0).
- **Explique em português o que mudou e por quê** ao final de cada tarefa.
- Ao terminar uma história, marque-a no `BACKLOG.md`.
- **Histórico de atualizações** (decisão do Isaac, 01/10/2026): toda mudança que a pessoa nota
  entra em "Não lançado" no `CHANGELOG.md`, em português simples (blocos Adicionado, Alterado,
  Corrigido, Removido, Segurança), e `node tools/gerar-novidades.js` copia o texto para
  `js/novidades.js`. **Só o Isaac manda lançar**: aí a seção ganha número e data e o
  `package.json` acompanha. Numeração SemVer: correção sobe o último número, novidade sobe o do
  meio, e o `1.0.0` fica para quando o app for vendido. `tests/novidades.test.js` confere.
  O Isaac consulta o histórico numa janela **escondida** ("Novidades", `#novidades`): sem botão à
  vista, abre com **5 toques seguidos (até 1,5 s entre eles) na barra verde do topo**, fora das
  setinhas de mês. No celular o nome "Finan" fica escondido da vista, por isso ali se toca no mês.
  Não é segredo de segurança: o texto fica no site publicado. Testes em `tests/e2e/novidades.spec.js`.
- **Fluxo Git:** commits pequenos direto no `main`, em português, no imperativo. Se a CI
  falhar no GitHub, corrigir é a prioridade. PRs só para contribuições externas, Dependabot e
  **commits com risco de segurança** (decisão do Isaac, 01/10/2026): o que não tem risco a IA
  integra direto no `main`, depois do `npm run check`; o que tem risco vai por PR, passa pelo
  `/security-review` e **só o Isaac manda integrar**. Tem risco de segurança quem mexe em:
  (1) como texto é desenhado na tela (`innerHTML`, `esc()`); (2) dados de entrada, backup,
  importação ou armazenamento (`normalizeData`, `importBackup`, `localStorage`, proteção dos
  dados); (3) rede, service worker, manifesto, publicação ou CI (`sw.js`, `.github/`, endereço
  externo, política de segurança do navegador); (4) dependências (`package.json`,
  `package-lock.json`); (5) segredos, credenciais ou dados pessoais. Na dúvida, trate como risco.

## Antes de cada commit
Só faça o commit quando todas as respostas forem "sim":
- [ ] `npm run check` passou (código de saída 0)?
- [ ] O que mudou foi explicado e entendido?
- [ ] Foi feito só o que foi pedido?
- [ ] Nenhum teste existente foi alterado sem decisão do Isaac?
- [ ] Não há dados reais, senhas ou credenciais no código?

# Regras do negócio
- **Dinheiro é inteiro em centavos.** Nunca some ou compare reais em ponto flutuante.
  Entrada com `parseAmount` (aceita `1.234,56`), saída com `formatBRL` (`R$ 1.234,56`).
- **Datas são strings locais `AAAA-MM-DD`.** Não use `new Date('AAAA-MM-DD')` (vira UTC).
- **Três baldes:** Essenciais, Estilo de vida e Futuro (reserva, investimentos e metas). **Pagar dívida
  é Essenciais** (decisão do Isaac, 02/10/2026): é obrigação, não poupança, então "Quitação de dívidas"
  conta em Gastos e nunca em Guardado. Dados antigos, com ela no Futuro, migram sozinhos (`normalizeData`).
- **Gastar e guardar são coisas diferentes** (decisão do Isaac, 30/09/2026). O Painel mostra
  quatro números que somam a renda: **Gastos** (Essenciais + Estilo de vida), **Guardado**
  (balde Futuro), **Sobrou** (renda − gastos − guardado) e as **Receitas**. Dinheiro do Futuro
  não é "despesa" para o usuário, embora seja uma saída da conta. A **taxa de poupança** é o
  Guardado ÷ renda; a sobra do mês não conta, porque dinheiro parado ainda não foi guardado.
  Ninguém recebe "Excelente!" por ter sobrado dinheiro sem guardar.
- **Guardar numa meta é guardar** (decisão do Isaac, 30/09/2026). "Guardar valor" cria um
  lançamento do balde Futuro, ligado à meta por `goalId`, datado de hoje: a categoria é
  "Reserva de emergência" para a meta de reserva e "Metas" para as demais. O valor da meta é
  o valor inicial (o que já tinha ao criá-la) + os depósitos (`goalSaved`), e o Painel conta os
  depósitos em Guardado. Excluir ou editar o lançamento muda a meta junto. Valor negativo
  ou zero não é aceito.
- **Lançar direto na meta** (decisão do Isaac, 30/09/2026). No formulário, a categoria "Metas"
  (balde Futuro) só aparece se a pessoa tem alguma meta. Ao escolhê-la, abre "Para qual meta?"
  com a lista das metas, e o lançamento fica ligado à escolhida (`goalId`), como no "Guardar
  valor". Sem descrição, vira "Meta: <nome>". Não se parcela. Trocar a categoria ao editar
  desliga o lançamento da meta.
- **Revisão semanal no dia que a pessoa escolher** (decisão do Isaac, 30/09/2026). Em "Método" a
  pessoa escolhe o dia da revisão (padrão: domingo). No dia, e nos dias seguintes da semana, o
  Painel mostra um lembrete com botão "Fazer a revisão" enquanto a revisão da semana não estiver
  completa (`reviewReminder`). Não lembra antes do dia nem sem lançamentos. A revisão continua
  valendo em qualquer dia e fecha por semana, de segunda a domingo. O app não manda alarme com
  ele fechado (não tem servidor); o lembrete só aparece com o app aberto, e a tela diz isso.
- **Sobrou pode ficar negativo, mas o app avisa antes de deixar guardar** (decisão do Isaac,
  30/09/2026). Ao lançar uma despesa do balde Futuro ou usar "Guardar valor" numa meta, se o
  valor passar do que sobrou no mês (`leftAfterSaving`), o app pergunta "Quer guardar mesmo
  assim?" e a pessoa decide. Sem renda registrada no mês não há o que comparar e não avisa.
  Gastar (Essenciais e Estilo de vida) além da renda não gera esse aviso: o Painel já alerta.
  Editar um lançamento existente também não pergunta.
- **Baldes adaptativos:** o plano olha a parcela da renda gasta com Essenciais nos 3 meses
  anteriores (sem o mês corrente):
  - até 50% → 50/30/20;
  - de 50% a 80% → Essenciais reais (arredondados para cima de 5 em 5); do resto, 40% vai
    para o Futuro (mínimo 5%) e 60% para Estilo de vida. Ex.: 60% → 60/25/15;
  - acima de 80% → Futuro de 5% e alerta para cortar custos fixos ou aumentar a renda;
  - sem histórico → 50/30/20.
- **Envelopes:** cada categoria pode ter um limite mensal. Categorias `fixa` (aluguel,
  assinaturas) não entram na projeção de fim de mês; `variavel` (mercado, delivery) entram,
  e também no "pode gastar hoje". A **previsão de fim de mês só vale a partir do 7º dia** do mês
  (decisão do Isaac, 01/10/2026): antes disso um único gasto, multiplicado pelo mês inteiro, dava
  alarme falso ("vai estourar"). O aviso de envelope **já estourado** não depende de previsão e vale
  desde o dia 1.
- **"Você pode gastar hoje" até o próximo pagamento** (decisão do Isaac, 30/09/2026). Com renda
  estável e o "N-ésimo dia útil em que recebe" informado (1º a 10º, nas Metas), o valor divide
  o que sobra nos envelopes variáveis pelos dias até o próximo pagamento, contando só os gastos
  do ciclo (do último pagamento até hoje). Só sábado e domingo são folga; feriado não entra na
  conta. Sem o dia informado, ou com renda variável, conta até o fim do mês. O resto do Painel
  continua por mês de calendário.
  O cartão também mostra quanto dá para gastar **até domingo** (a semana da revisão semanal):
  o mesmo ritmo por dia × os dias que faltam até domingo, nunca além do fim do período.
- **O "pode gastar" nunca passa do que sobrou** (decisão do Isaac, 30/09/2026, opção A). O valor
  do cartão é o **menor** entre o que resta nos envelopes variáveis e o Sobrou do período (o mês,
  ou o ciclo do salário quando o dia de pagamento está informado). Assim guardar numa meta baixa o
  valor quando o dinheiro que sobrou fica menor que o prometido pelos envelopes, e o cartão diz
  por quê ("Limitado ao que sobrou…"). Sobra negativa dá R$ 0. Sem renda registrada no período
  não há o que comparar e valem só os envelopes. O cartão também mostra quanto já foi guardado.
- **Painel enxuto** (consenso de UX, finanças e usuário, decisão do Isaac, 02/10/2026: "uma pergunta, um
  número, um aviso"). Fase 1: o cartão "Você pode gastar hoje" mostra o número e uma linha ("Esse é o
  máximo para hoje, contando até…", com "Limitado ao que sobrou." quando for o caso, para não soar como
  permissão de gastar); semana, envelopes e o que já guardou ficam em "Ver detalhes" (`.allowance-mais`, que
  continua aberto depois de redesenhar). Os baldes têm uma frase curta; o texto do método e a explicação do
  plano vão para "Como funciona"; cada barra tem uma linha. Nada é apagado. Fases seguintes (ainda não
  feitas): reordenar (resumo, 1 aviso, baldes recolhidos) e lembretes calmos (um por vez, "Agora não").
  Testes em `tests/e2e/painel-enxuto.spec.js`.
- **Teto do balde** (decisão do Isaac, 30/09/2026). Cada balde tem um teto: a parte da renda do
  mês que o plano reserva para ele (`bucketCeilings`, em múltiplos de R$ 10, somando a renda
  arredondada). Os limites por categoria são **opcionais**: as categorias sem limite gastam do
  que sobra do teto. A tela do Orçamento mostra, por balde, o teto, o que já foi distribuído em
  limites e o que sobra, e avisa com texto quando os limites passam do teto (`bucketBudgetStatus`).
  O app **não corta nada sozinho**: mostra o tamanho do excesso e a pessoa decide. Sem renda no
  mês não há teto.
- **Sugestão de limites pelos gastos reais** (decisão do Isaac, 02/10/2026; substitui a de 30/09, que
  usava a média de 3 meses e o Futuro pelo plano). O botão "Sugerir pelos meus gastos" (`js/sugestao.js`,
  `sugerirGastos`) parte do que a pessoa realmente paga e gasta, sem porcentagem fixa da renda, sem idade
  e sem número para categoria que ela não usa. A conta: **renda esperada − necessários − comprometidos =
  margem**. Necessários = categorias de Essenciais (inclui saúde e dívida: nunca são "cortadas");
  comprometidos = categorias fixas de Estilo de vida (assinaturas) + parcelas já agendadas para o mês.
  Os dois entram na conta pelo **mesmo valor do limite que a tela mostra** (fixa = o valor pago, variável
  = o topo da faixa, sempre arredondado para cima), então a soma dos limites nunca passa da renda. Da
  margem saem, nesta ordem: (1) o **piso de vida** (quartil baixo do que ela já gasta em cada categoria
  flexível), (2) os **objetivos** (cada meta recebe o aporte que o prazo pede; a reserva vem primeiro e,
  sem prazo, usa 12 meses; meta sem prazo não cobra nada), (3) os **gastos flexíveis**, sempre "até" um
  valor da própria faixa dela (do típico ao quartil alto, nunca acima do que sobra). Quando a margem não
  paga tudo, as metas cedem antes do dia a dia e a tela diz quanto a meta demora. Sobra além disso é
  mostrada como "sem destino": o app não decide sozinho. Cada categoria: fixa = último valor pago;
  variável = **mediana** dos meses de uso; usada em menos da metade dos meses = provisão mensal; mês com
  mais de 2× a mediana é "atípico" (fica fora da conta, mas aparece na tela). **Renda variável**: a base é
  a média da metade mais baixa dos últimos 6 meses; o que entrar acima é "extra". **Renda que não cobre o
  básico** é déficit explícito (quanto falta e o que rever primeiro), sem metas nem gastos de estilo de vida.
  A confiança (baixa, média, alta) vem dos meses de histórico e aparece na tela. Os números de política
  (6 meses, 12 meses de reserva, 2× a mediana) ficam em `POLITICA`. **Sem renda ou sem gastos de meses
  anteriores, não inventa números**: abre o **questionário** (`#budget-quiz`, `budgetsFromAnswers`), com um
  campo por categoria de Essenciais e Estilo de vida ("Deixe em branco o que você não gasta"); nele o
  Futuro ainda vem da parte do plano. "Aplicar como limites" grava o que a pessoa viu (pergunta antes de
  substituir limites, tem "Desfazer" e **mantém o que ela definiu no Futuro**, como Investimentos:
  `mesclarLimites`). A sugestão aberta fecha sozinha quando os dados mudam, para nunca se aplicar uma velha. Nunca cria a meta de reserva sozinho: a tela oferece "Ir para
  Metas". Testes em `tests/sugestao.test.js` e `tests/e2e/sugerir-pelos-gastos.spec.js`.
- **Orçamento enxuto e "Adicionar item"** (decisão do Isaac, 30/09/2026). Na primeira abertura o
  Orçamento mostra só o essencial (`DEFAULT_BUDGET_ITEMS` em `core.js`, um único lugar: Moradia,
  Contas da casa, Mercado, Transporte, Saúde e Reserva de emergência), mas os três baldes sempre
  aparecem, mesmo vazios. O resto entra pelo botão "Adicionar" no fim de cada balde, que lista só
  as categorias do catálogo **daquele balde** que ainda não estão no orçamento. Tocar numa a
  adiciona (`settings.budgetItems`), fecha a lista e leva o foco ao campo de limite dela.
  **Quem já tem limite definido nunca perde o item.** "Criar" cadastra um item novo no balde e no
  catálogo (`state.data.categories`, então vale para lançamentos, filtros e Painel): é despesa,
  "variável" (Essenciais e Estilo de vida) ou "fixa" (Futuro), com o ícone 🏷️. Nome vazio, com
  mais de 60 letras ou **repetido em qualquer lugar do catálogo** (sem diferenciar maiúsculas e
  acentos) é bloqueado com o erro no lugar. Ainda não há "remover item" nem editar o nome.
- **Orçamento base zero (na tela):** a tela compara a soma dos limites com a renda e mostra o
  que falta ou passa. A sugestão não força essa soma (ver acima).
- **Reserva de emergência:** média dos gastos essenciais × 6 meses (renda estável: CLT,
  servidor, aposentadoria) ou × 12 meses (renda variável: autônomo, freelancer, empresário).
- **Compras parceladas:** entram no mês da compra; uma parcela por mês nos seguintes; os
  centavos da divisão ficam nas primeiras parcelas; máximo de 48 parcelas.
- **Lançamentos fixos** (recorrentes) podem ser copiados do mês anterior sem duplicar.

# Arquitetura
- `js/core.js` — regras de negócio **puras** (sem DOM, sem `localStorage`). Toda conta mora aqui.
- `js/app.js` — interface: lê o estado, chama o núcleo, desenha a tela. Não faz contas de negócio.
- `tests/*.test.js` — testes com `node --test`, focados no núcleo.
- `index.html` + `css/` — estrutura e visual. Sem frameworks, sem etapa de build.
- Scripts clássicos (não ES modules) para o app abrir com duplo clique (`file://`).

## Regras de código
- **Nomes do domínio em português** (`orcamento`, `envelope`, `balde`), código em inglês
  simples onde já é assim; siga o padrão do arquivo que está editando.
- Funções pequenas com uma responsabilidade. O ESLint avisa acima de 60 linhas ou
  complexidade 15: trate o aviso como pedido de refatoração.
- Sem duplicação: se a mesma conta aparece duas vezes, ela vai para `core.js`.
- **Depois de uma ação do usuário que muda dados, use `commit()`** (salva, redesenha e devolve
  o foco). Redesenhar com `render()` direto apaga o controle em que a pessoa estava e o foco
  volta ao início da página, o que quebra o uso por teclado e leitor de tela.

## Regras de visual e acessibilidade (conferidas por `tests/css.test.js`)
- Celular primeiro; o app precisa permitir lançar e consultar rápido, com uma mão.
- Cores só pelas variáveis do `:root` em `css/styles.css`. Contraste mínimo WCAG AA: 4,5:1
  para texto e 3:1 para bordas, foco e barras. Cor nova entra no teste de pares.
- **Tamanhos de fonte e espaçamentos só pelos tokens do `:root`** (decisão do Isaac, 01/10/2026):
  fonte `--fs-small|body|title|number|display`; espaçamento `--space-1…5` (4, 8, 12, 16, 24 px).
  Nada de `rem` solto em `font-size`, `padding`, `margin` ou `gap` (`tests/tokens.test.js`).
  Sem kit de componentes: CSS puro, seguindo os padrões do Material 3 (privacidade, sem build).
- **Ação principal sempre no mesmo lugar** (decisão do Isaac, 01/10/2026): o botão "+ Lançar"
  é flutuante (`.fab`), fixo no canto inferior direito e na rolagem, em todas as abas **menos
  Lançamentos**, onde o formulário já está e o botão some (decisão do Isaac, 01/10/2026). O fim
  do conteúdo nunca fica escondido atrás dele (`tests/e2e/botao-flutuante.spec.js`).
- **Lançar rápido** (decisão do Isaac, 01/10/2026): no formulário ficam à vista só Despesa/Receita,
  Valor, Categoria e Salvar, que cabem juntos num celular de 360×640. Data (hoje por padrão),
  Descrição, Parcelas e Lançamento fixo ficam em "Mais detalhes" (`details.more`). Ao editar um
  lançamento os detalhes já abrem; ao salvar, voltam a fechar (`tests/e2e/lancar-rapido.spec.js`).
- Alvos de toque com pelo menos 44px (`--tap`), inclusive botões "pequenos".
- Nunca remover o `outline` do foco; nunca informar só por cor (status sempre com texto).
  Em campos de texto e de escolha o foco pinta a própria borda de azul e o contorno cola nela
  (`outline-offset: 0`): um traço só, sem borda dupla (decisão do Isaac, 30/09/2026). Botões,
  abas e caixas de marcar mantêm o anel afastado. Testes em `tests/e2e/foco-campos.spec.js`.
- Linguagem simples: palavra do método (balde, envelope, fixa, variável, 50/30/20) é explicada
  no lugar em que aparece. `tests/e2e/explicacoes.spec.js` protege os textos.
  Textos longos de ajuda ficam recolhidos num "Como funciona" (`details.how`, abre ao tocar),
  mas a definição curta de cada palavra continua visível (no Orçamento: envelope, fixa e
  variável). Decisão do Isaac, 30/09/2026: o primeiro balde tem que aparecer na primeira tela
  do celular (`tests/e2e/como-funciona.spec.js`).
- **Navegação na barra de baixo** (decisão do Isaac, 01/10/2026): fixa no fim da tela, com
  Painel, Lançamentos, Orçamento e "Mais" (Metas e Método ficam dentro do "Mais", que abre uma
  lista acima da barra). Os 4 itens aparecem sempre inteiros, sem deslizar e sem mudar de tamanho
  ao trocar de aba, de 320 a 1280px (`tests/e2e/abas-visiveis.spec.js`). Com Metas ou Método
  aberta, o "Mais" é o item atual (`aria-current`). O "+ Lançar" e a mensagem de confirmação
  ficam acima da barra, e o fim do conteúdo nunca fica atrás dela
  (`tests/e2e/navegacao-inferior.spec.js`).
- As abas seguem o padrão ARIA: Painel, Lançamentos e Orçamento são abas; Metas e Método são abas
  de um segundo grupo ("Mais seções"). Só o item atual da barra é parada do Tab; setas, Home e End
  percorrem a barra (nas abas a seleção acompanha o foco; no "Mais", Enter abre a lista); Esc fecha
  a lista e devolve o foco ao "Mais". Cada aba controla um painel com nome. A página tem um título
  principal (h1) e o atalho "Pular para o conteúdo". `tests/e2e/acessibilidade.spec.js` (axe-core)
  precisa continuar com zero violações em todas as telas, inclusive com o "Mais" aberto; tela ou
  controle novo entra nesse teste. Nos testes, `irParaAba(page, 'Metas')` abre o "Mais" sozinho.
- Em listas de escolha (`<select>`), o texto de cada opção começa pelo nome, nunca por emoji:
  o navegador acha a opção pelas primeiras letras digitadas.
- Botões que se repetem numa lista (Editar, Excluir, Guardar valor) têm `aria-label` com o
  item a que se referem, para o leitor de tela distinguir um do outro.
- Campos com fonte de pelo menos 16px (senão o celular dá zoom ao digitar).
- Respeitar `prefers-reduced-motion` e o atributo `hidden`.
- Ao mudar o visual ou o comportamento de uma tela, rodar `npm run test:e2e` (navegador de
  celular de verdade) e olhar a captura.

# App instalável (PWA)
- O Finan é instalável e abre sem internet (decisão do Isaac, 01/10/2026: entrega por link de
  acesso, instalado no celular). `manifest.webmanifest`, `sw.js` e `icons/` (PNG gerados de
  `icons/icon.svg` por `node tools/gerar-icones.js`; o ícone, uma letra F, é provisório).
- O service worker usa **rede primeiro**: com internet entrega sempre a versão mais nova (pede ao
  servidor com `cache: 'no-cache'`, porque o GitHub Pages manda guardar os arquivos por 10
  minutos); sem internet, a cópia guardada, e só a página inicial para pedidos de página (um
  arquivo que falta falha de verdade). Nunca fica preso numa versão antiga. Só mexe em arquivos do
  próprio site e **nunca chama endereço externo**. Só é registrado em http(s), não ao abrir o
  arquivo. A lista `ARQUIVOS` do `sw.js` tem que ter todo arquivo de `css/` e `js/` (a instalação
  falha inteira se um listado não existir): `tests/pwa.test.js` confere.
- Service worker não roda em `file://`: os testes em `tests/e2e/pwa.spec.js` usam um servidor
  local que entrega só o que a publicação entrega, com cache longo como o do GitHub Pages.
  **Offline de verdade = desligar o servidor.** O `setOffline` do Playwright não alcança o service
  worker, então um teste só com ele passaria sem provar nada.
- **Dados protegidos** (decisão do Isaac, 01/10/2026): o app pede ao navegador o armazenamento
  persistente (`navigator.storage.persist()`) **depois de um salvamento**, uma vez por visita e só
  quando há lançamentos. Nunca ao abrir o app, porque no Firefox o pedido abre um aviso. Em "Seus
  dados" (`#storage-status`) o app diz a verdade sobre o que conseguiu: proteção ativada (só vale
  contra apagar sozinho quando falta espaço; **limpar os dados do navegador ainda apaga tudo**, e o
  texto diz isso), ainda pode ser apagado, sem garantia neste navegador, aguardando o primeiro
  lançamento, ou "não foi possível salvar" (manda baixar o backup agora; nunca diz "protegido" depois
  de uma gravação que falhou). As consultas entram numa fila (`protegerDados`), então uma resposta
  antiga nunca cobre uma nova. Testes em `tests/e2e/dados-protegidos.spec.js`.
- **Lembrete de backup** (decisão tomada pela IA com o Isaac ausente, 02/10/2026; ele pode mudar os
  números): com 5 lançamentos ou mais, o Painel lembra de baixar um backup quando nunca se baixou um ou
  o último tem 30 dias ou mais (`backupReminder`). A data do último backup (`settings.lastBackup`) é
  gravada ao baixar, vai dentro do próprio arquivo e passa por `normalizeData` (só aceita data real).
  Testes em `tests/e2e/lembrete-backup.spec.js`.
- **No máximo 3 avisos à vista no Painel** (decisão tomada pela IA com o Isaac ausente, 02/10/2026): a
  lista de "O que fazer agora" já vem por prioridade; os 3 primeiros ficam à vista e o resto fica num
  "Ver mais N avisos" (`splitInsights`, `#insights-more`). Nenhum aviso some. `insights()` continua
  devolvendo a lista inteira. Testes em `tests/e2e/avisos-no-painel.spec.js`.
- **A mensagem de "salvar gasto" diz quanto ainda pode gastar hoje** (decisão tomada pela IA com o Isaac
  ausente, 02/10/2026): depois de salvar uma despesa nova que não seja do balde Futuro, a mensagem ganha
  "Você ainda pode gastar R$ X hoje.", o mesmo número do cartão do Painel (`calcularAllowance`). Não
  aparece em receita, em edição, em guardar dinheiro, em gasto de outro mês nem sem o cartão (sem limites).
  Testes em `tests/e2e/pode-gastar-ao-salvar.spec.js`.
- **Desfazer ao excluir** (decisão do Isaac, 01/10/2026; sem atalhos de teclado, o foco é o celular):
  depois de excluir um lançamento (ou todas as parcelas), uma meta ou usar "Apagar tudo", a mensagem
  ganha o botão "Desfazer" por 10 segundos (`desfazer`, `copiarDados`). A cópia dos dados fica só na
  memória e o botão some quando qualquer outra coisa muda os dados (`saveData` chama `limparDesfazer`).
  **Excluir lançamento simples ou meta não pergunta mais "tem certeza?"** (decisão tomada pela IA com o
  Isaac ausente, 02/10/2026): o "Desfazer" cobre o engano. Continuam perguntando a compra parcelada (é
  uma escolha), "Apagar tudo" e "Restaurar backup". O "Desfazer" também vale para "Restaurar backup" e
  "Carregar exemplo" (decisão tomada pela IA com o Isaac ausente, 02/10/2026), só quando havia dados a
  perder (`copiaSeTemDados`: lançamentos, metas ou limites); as perguntas desses dois continuam. Testes
  em `tests/e2e/desfazer.spec.js`, `tests/e2e/desfazer-restaurar.spec.js` e
  `tests/e2e/excluir-sem-pergunta.spec.js`.
- **Site instalável primeiro** (decisão do Isaac, 01/10/2026): o produto desta etapa é o site que
  funciona como app (PWA). Aplicativo de loja (Play Store ou App Store) **fica para depois** do
  teste com pessoas de verdade; com ele o próprio sistema do celular poderia guardar cópia dos dados,
  mas custa mais tempo e dinheiro e quebra a regra "sem build". Não construir nada de loja agora.
- O site publicado de hoje (completo e grátis) é o ambiente de teste do Isaac; o app que for
  vendido ficará em outro endereço (decisão a tomar quando chegar a hora).

# Segurança e privacidade (inegociável)
- Os dados **nunca saem do navegador**: nada de APIs externas, analytics, CDNs com rastreio
  ou envio de dados. Persistência só em `localStorage` e backups baixados pelo usuário.
- **Nunca coloque dados reais no projeto** (nomes, CPFs, contas, valores reais). Nos testes e
  no exemplo, só dados inventados. Nunca cole senhas ou credenciais no chat nem no código.
- **Todo texto vindo do usuário ou de backup passa por `esc()` antes de ir para `innerHTML`.**
- Dados importados passam por `normalizeData` (valida e descarta o que for inválido).
- CSV exportado neutraliza fórmulas (`=`, `+`, `-`, `@`).
- **Custo zero** (decisão do Isaac, 01/10/2026): o projeto não usa serviços pagos. A revisão de
  segurança automática por API (Action da Anthropic) foi **descartada** por exigir chave paga. Em
  vez dela: `/security-review` local, o Dependabot, o `npm audit` na CI e a revisão manual por
  intervalo de commits. O `/security-review` só enxerga o que ainda **não foi enviado** ao GitHub e
  precisa da referência local `origin/HEAD` (`git remote set-head origin main` a cria). O CodeQL do
  GitHub (grátis em repositório público) é opcional e se liga nas configurações do repositório.
  Qualquer serviço pago ou chave de API entra só com decisão do Isaac, e a chave nunca vai ao chat.
- Antes de publicar, faça uma revisão de segurança do código. `tests/e2e/seguranca.spec.js`
  garante que HTML digitado ou vindo de backup nunca executa e que o app não faz requisição
  de rede. Mudou como algo é desenhado na tela? Esses testes têm que continuar passando.
- Publicação (GitHub Pages): `.github/workflows/publicar.yml` publica só `index.html`,
  `manifest.webmanifest`, `sw.js`, `css/`, `js/` e `icons/`. Arquivo novo que o app precise em
  produção tem que entrar nesse `cp` (`tests/pwa.test.js` confere).
  Publica sozinho depois que a CI passa num push no `main` (nunca em PR de fork), e também
  pode ser disparado à mão. Endereço: https://isaactexcotton.github.io/Finan/

# Problemas já resolvidos
- **Arredondamento dos envelopes passava da renda** (ex.: renda R$ 3.333 virava R$ 3.340 de
  envelopes). Solução: `allocate` com o método do maior resto, entre baldes e dentro de cada
  balde. Testes de regressão em `suggestBudgets`.
- **Ponto flutuante no plano adaptativo:** `0.6 * 100` dá `60.00000000000001`, e arredondar
  para cima levaria a 65%. Solução: subtrair um epsilon antes do `Math.ceil` e fazer o resto
  das contas com inteiros. Teste cobre o caso 0.6.
- **Commit feito com teste falhando:** o comando encadeava `npm run check | grep ... && git
  commit`, e o `grep` "passava" mesmo com falha. Solução: conferir o código de saída do
  próprio `npm run check` antes do commit. Depois, a trava `.githooks/pre-commit` passou a
  bloquear automaticamente qualquer commit com lint ou teste falhando.
- **ESLint acusando o invólucro do módulo** (`core.js`) como função de 387 linhas. Solução:
  `eslint-disable-next-line` só nessa linha, com justificativa.
- **Dependabot abrindo PRs para o branch errado:** ele usa o branch padrão do repositório.
  Solução: o branch padrão deve ser o `main` (Settings → General → Default branch).

- **Teste de CSS reprovando CSS correto:** o leitor do teste tratava o comentário antes da
  regra como parte do seletor. Solução: o teste remove comentários antes de ler. A exigência
  (`.btn` com `min-height: var(--tap)`) não mudou.

- **"Lançar minha renda" abria o formulário como Despesa:** o botão da tela de boas-vindas e o
  "+ Lançar" do topo compartilhavam a mesma ação. Solução: o botão ganhou `data-type="income"`
  e a ação `quick-add` aplica o tipo antes de desenhar o formulário. O "+ Lançar" continua
  abrindo como Despesa (hoje o botão flutuante). Testes em `tests/e2e/lancar-renda.spec.js`.

- **O foco sumia depois de ações** (limite do Orçamento, revisão semanal, guardar valor,
  excluir, tipo de renda): o `innerHTML` apagava o controle e o foco voltava ao início da
  página. Solução: `commit()` agora passa por `redesenhar()`, que guarda o foco e o devolve ao
  mesmo controle (ou ao vizinho, ou ao título do bloco). No limite do Orçamento o redesenho
  é adiado (`setTimeout`), porque com Tab o foco ainda está chegando ao campo seguinte quando
  o evento `change` dispara. Testes em `tests/e2e/foco.spec.js`.

# Comandos
- `npm install` — instala as dependências e ativa a trava de commit (`.githooks/pre-commit`),
  que roda `npm run check` e bloqueia o commit se algo falhar. Não use `--no-verify`.
- `npm run check` — lint + testes (o mesmo que a CI roda, além do `npm audit`)
- `npm test` — só os testes rápidos (contas e CSS)
- `npm run test:e2e` — testes no navegador (Playwright, celular Pixel 7): abrem o app de
  verdade e usam como o usuário usa. Precisa do Chromium (`npx playwright install chromium`).
  Não entram na trava de commit por serem mais lentos; a CI roda em todo push.
- `npm start` — servidor local em http://localhost:8080 (ou abra `index.html` direto)
