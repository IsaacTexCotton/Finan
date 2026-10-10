# Backlog

Histórias pequenas, na ordem de prioridade. Cada uma = um ou poucos commits, com teste
quando houver regra de negócio. Marque `[x]` ao concluir.

## Parte 1 — Rascunho (spike) ✅
- [x] Núcleo do método em `js/core.js` com 14 testes
- [x] Estrutura das telas (`index.html`, `js/app.js`)

## Parte 2 — Base de XP ✅
- [x] `CLAUDE.md` com as regras do projeto
- [x] CI no GitHub Actions: ESLint, `npm audit`, testes
- [x] Este backlog
- [x] Fluxo GitHub: commits direto no `main` com CI, Dependabot, modelo de PR, licença MIT
- [x] Atualizações do Dependabot: ESLint 10, actions/checkout v7, actions/setup-node v7
- [x] Guia do método Akita em `docs/` e `CLAUDE.md` no modelo do guia (TDD vermelho → verde,
      checklist antes de cada commit, problemas já resolvidos)
- [x] Trava de commit: `.githooks/pre-commit` bloqueia commit com lint ou teste falhando

## Parte 3 — Revisão do método financeiro ✅
- [x] Baldes adaptativos: 50/30/20 quando cabe; acima de 50% em essenciais o plano se adapta
      (ex.: 60/25/15) e volta ao 50/30/20 sozinho; acima de 80% vira alerta de custo fixo
- [x] Reserva de emergência pelo tipo de renda: 6 meses (estável) ou 12 meses (variável)
- [x] Novas categorias: Impostos e taxas, Cuidados pessoais, Presentes e doações
- [x] Compras parceladas: entram no mês da compra, uma parcela por mês, com aviso do
      quanto do futuro já está comprometido

## Parte 4 — Visual e primeira versão utilizável
- [x] `css/styles.css`: visual base (cores, tipografia, botões, campos, cartões e Painel),
      celular primeiro, com testes de acessibilidade (`tests/css.test.js`) e auditoria axe-core
- [x] Visual da tela Lançamentos: formulário para o polegar e lista por dia
- [x] Visual da tela Orçamento (envelopes)
- [x] Tokens de fonte (5 tamanhos) e de espaçamento (4/8/12/16/24) no `:root`
- [x] Botão "+ Lançar" flutuante, sempre no mesmo canto (substitui o do topo)
- [x] Painel: os 4 números e o "pode gastar hoje" cabem na primeira tela do celular (teste de proteção)
- [x] Formulário rápido: só Despesa/Receita, Valor, Categoria e Salvar à vista; o resto em "Mais detalhes"
- [x] Mensagem de confirmação acima do botão "+ Lançar", com os tokens de espaçamento
- [x] Navegação inferior com 4 itens (Painel, Lançamentos, Orçamento, Mais), por decisão do Isaac
      (01/10/2026); os testes de abas foram atualizados com a autorização dele
- [x] Visual da tela Metas (reserva em destaque, metas em cartões)
- [x] Visual da tela Método (passos em cartões numerados, texto sobre dívidas recolhido)
- [ ] Tema escuro (segue a configuração do celular)
- [x] Barra de navegação fixa embaixo no celular (feita: ver "Navegação inferior" abaixo)
- [ ] Sugestão: `scrollIntoView` em `app.js` ignora "reduzir movimento"; trocar por `behavior: auto`
      quando `prefers-reduced-motion: reduce`
- [ ] Teste manual no navegador de cada tela (Painel, Lançamentos, Orçamento, Metas, Método)
- [x] Teste no navegador na CI (Playwright): abrir o app, lançar uma despesa e ver no Painel
- [x] Teste no navegador: receita e despesa continuam lá depois de recarregar a página

## Parte 5 — Publicar
- [x] App instalável e que abre sem internet (manifesto, ícones, service worker de rede primeiro)
- [x] Dados protegidos: pede armazenamento persistente ao navegador e mostra o estado em "Seus dados"
- [ ] Sugestão: o primeiro parágrafo de "Seus dados" e a linha de proteção repetem o conselho de fazer backup; enxugar
- [x] Backup: lembrete no Painel (02/10/2026): com 5 lançamentos ou mais, avisa se nunca baixou um backup
      ou se o último tem 30 dias ou mais, com botão "Baixar backup". Decisão tomada pela IA com o Isaac
      ausente; ele pode trocar os números (5 lançamentos, 30 dias)
- [ ] Backup: cópias internas automáticas (a outra metade da decisão; hoje só há o lembrete)
- [ ] Sugestão: o lembrete de backup não tem "Agora não"; quem não quer baixar vê o aviso em toda abertura
- [ ] Ícone definitivo do app (hoje é uma letra F provisória; não é prioridade)
- [ ] Sugestão: endereço próprio (domínio) para o produto vendido, separado de outros sites do GitHub Pages
      (no GitHub Pages, todas as páginas de uma conta dividem o mesmo armazenamento do navegador)
- [ ] Sugestão: fixar as Actions de `ci.yml` e `publicar.yml` por código exato (SHA); o Dependabot atualiza
- [ ] Sugestão (grátis): ligar o CodeQL do GitHub em Settings > Security > Code scanning (padrão)
- [ ] Sugestão: deixar a CI mais resistente quando a instalação do navegador de teste (Chromium) trava.
      Em 01/10/2026 o passo "Instalar o navegador do teste" levou 9 min 38 s no `main` (run 74) e
      estourou o limite de 10 minutos (`timeout-minutes: 10` em `.github/workflows/ci.yml`); os testes
      foram cancelados e a publicação do site foi pulada, sem nenhum erro no código. Ideias: guardar o
      navegador entre execuções (cache), e/ou aumentar o limite do passo de instalação. Não mexer na CI
      sem decisão do Isaac
- [x] Revisão de segurança automática por API: avaliada e descartada por custo (decisão do Isaac, 01/10/2026)
- [ ] README com o método e como usar
- [x] Revisão de segurança antes de publicar: nenhum segredo ou dado pessoal no repositório;
      testes no navegador provam que texto malicioso (digitado ou vindo de backup) aparece
      como texto e não executa, e que o app não faz nenhuma requisição de rede
- [x] Workflow `publicar.yml` pronto (publicação manual, só `index.html`, `css/` e `js/`,
      depois de lint e testes)
- [x] Isaac: trocar o branch padrão para `main` (Settings > General) e ligar o Pages
      (Settings > Pages > Source: GitHub Actions)
- [x] Primeira publicação disparada e no ar (https://isaactexcotton.github.io/Finan/)
- [x] Publicar sozinho depois que a CI passar no `main`
- [ ] Sugestão: Content-Security-Policy no `index.html` (`connect-src 'none'`) para o próprio
      navegador impedir qualquer envio de dados, mesmo que um bug futuro tente

## Achados do teste como usuário leigo (30/09/2026)
Feito por mim, sozinho, como alguém que não entende de finanças nem do app (celular 390px e PC
1280px, teclado, zoom 200%, axe-core, leitor de tela via árvore de acessibilidade). Cada item
tem que virar teste no navegador antes da correção.

Prioridade alta
- [x] "Lançar minha renda" (tela de boas-vindas) abre o formulário em Receita / Salário
      (antes abria em Despesa / Moradia e a pessoa registrava o salário como gasto).
      Sobra: a rolagem deixa o topo fixo cobrindo o título "Novo lançamento"
- [x] **Foco some** (volta ao início da página) depois de: digitar um limite no Orçamento,
      marcar item da revisão semanal, "Guardar valor" numa meta, excluir lançamento e trocar
      o tipo de renda. Corrigido: o redesenho devolve o foco ao mesmo controle, ao vizinho
      ou ao título do bloco (`guardarFoco` em `app.js`), com 8 testes em `foco.spec.js`
- [x] Dois jeitos de "guardar" que não se conversavam: guardar R$ 300 na meta de reserva e o
      Painel continuava "Futuro R$ 0,00". Agora "Guardar valor" cria um lançamento do Futuro
      ligado à meta (`goalId`), que conta no Guardado e no balde Futuro. O valor da meta é o
      valor inicial mais os depósitos; excluir o depósito na lista desfaz tudo
- [x] Mensagens que se contradiziam no Painel ("Você guardou R$ 0,00" junto com "Excelente!
      taxa de poupança 48%"). O Painel agora mostra Receitas, Gastos, Guardado e Sobrou, que
      somam a renda; a taxa de poupança conta só o guardado (Futuro), sem a sobra

Prioridade média
- [x] Botões "Editar" e "Excluir" repetidos (17× cada) sem dizer de qual lançamento; o leitor
      de tela não distingue. Agora o nome inclui descrição, parcela e valor; os botões das
      metas dizem de qual meta são
- [x] Abas: setas, Home e End trocam de aba; só a aba atual é parada do Tab; `aria-controls`
      e painéis com nome; link "Pular para o conteúdo"; título principal (h1); abas dentro de
      uma região de navegação. `acessibilidade.spec.js` roda o axe-core em todas as telas
      (celular e PC) e exige zero violações, inclusive boas práticas
- [x] Lista de categorias: cada opção começava com emoji, então digitar "Mer" não escolhia
      "Mercado". Agora o nome vem primeiro e o emoji depois ("Mercado 🛒")
- [x] Limite do Orçamento salvava sem aviso. Agora diz "Limite de Mercado salvo: R$ 500,00" (ou "removido")
- [x] Palavras de finanças sem explicação no Painel e no Orçamento: baldes, 50/30/20,
      envelopes, fixa/variável e "orçamento base zero" (agora "dar um destino a cada real").
      "Taxa de poupança" deixou de aparecer: agora é "Você guardou X% da renda"
- [x] Metas e Método escondidas à direita no celular. Agora as 5 abas aparecem inteiras: duas
      linhas (3 + 2) no celular e uma linha a partir de 480px; `abas-visiveis.spec.js` confere
      de 320 a 1280px. Uma barra fixa embaixo não coube em 320px ("Lançamentos")

Prioridade baixa
- [x] Etiqueta "variavel" sem acento (aparece na tela do Orçamento)
- [ ] "para os próximos 1 dia" (singular) no "Você pode gastar hoje"
- [ ] Tela vazia mostra três selos "Sem renda" que só fazem ruído até existir renda
- [ ] "Guardar valor" usa janela nativa `prompt()` e excluir usa `confirm()`; funciona, mas
      destoa do app e não há "desfazer" ao excluir
- [x] Títulos dos grupos do Orçamento colados na lista anterior (resolvido no visual do Orçamento)

Verificado e funcionando: lançar, editar, excluir, parcelar, lançamentos fixos (sem duplicar),
backup e restauração, "Apagar tudo", CSV, teclado (tecla N, Enter para salvar), zoom 200% e
320px sem rolagem horizontal, alvos de toque de 44px em todas as telas, contraste e leitura
do formulário, sem erros de JavaScript.
Não testado: leitor de tela real, Safari/iOS, Firefox, pessoas de verdade.

Decisões do Isaac aplicadas (30/09/2026)
- [x] Sobrou pode ficar negativo, mas o app avisa antes de deixar guardar mais do que sobrou
      (formulário e "Guardar valor" nas metas); a pessoa escolhe se guarda mesmo assim
- [ ] Sugestão: o aviso também ao editar um lançamento do Futuro para um valor maior

## Refatorações (parecer do tech lead, 01/10/2026)
Ordem escolhida: só refatorar o que destrava algo que o Isaac quer. Critério de aceite de todas: **nenhum
teste existente muda, todos continuam passando e a pessoa não vê diferença** (por isso não entram no
`CHANGELOG.md`). Hoje o lint tem 1 aviso: `parseAmount`.
- [x] 1. Regras de negócio que moravam na tela voltaram ao núcleo (`core.js`): divisão em parcelas e o
      que apagar, montar e editar um lançamento, metas, soma dos limites e "bateu a meta de guardar".
      Prepara o "desfazer ao excluir" e a fatura do cartão (7 → 6 avisos)
- [x] 2. `handleAction` (complexidade 24, 72 linhas): trocar `switch` por mapa de ações (`ACTIONS`); as
      janelas nativas (`confirm` e `prompt`) passaram por `confirmar()` e `perguntar()`, um ponto só
      para trocar por janela própria ou ganhar o "desfazer ao excluir" (6 → 4 avisos)
- [x] 3. `insights` (complexidade 34): quebrar em uma função por tipo de alerta (lista `INSIGHT_RULES`,
      na ordem de prioridade; facilita o item "no máximo 3 alertas por vez"; 4 → 3 avisos)
- [x] 4. `normalizeData` (complexidade 32, 64 linhas): um normalizador por coleção (categorias,
      lançamentos, limites, metas, revisões e ajustes). É a porta de entrada dos backups (área de risco
      do `CLAUDE.md`: foi por PR com `/security-review`). Os testes cobriam só 23 de 51 regras de
      validação; agora cobrem todas (62 sabotagens percebidas). Achou e consertou um defeito: nomes como
      `constructor` eram aceitos como tipo de renda e como balde (3 → 1 aviso do lint)
- [ ] Sugestão: uma categoria com id `__proto__` num backup ainda é aceita; no núcleo o gasto dela não
      aparece em `byCategory` (a lista "Para onde foi o dinheiro" pode omiti-lo). Visto só no núcleo, não
      testado na tela; recusar esse id é uma regra nova, por isso fica para o Isaac decidir
- [ ] 5. `parseAmount` (complexidade 19): separar detecção de separador decimal. **Baixa prioridade:** é
      a função mais crítica do app (lê o dinheiro digitado) e passa só um pouco do limite; só mexer
      quando outro motivo levar a ela

Decidido **não** refatorar agora: `demoData` (só dados de exemplo), dividir `app.js` e `core.js` em
vários arquivos (sem etapa de build, cada arquivo novo exige mexer em `sw.js` e na publicação; o sinal
para fazer é passar de uns 1.500 linhas ou duas funcionalidades se atropelarem), o CSS (já vigiado
por testes) e as 5 funções do núcleo sem teste direto (triviais).

## Ideias futuras (não priorizadas)
- Importar extrato do banco (OFX/CSV)
- Controle por cartão de crédito (fatura, limite, dia de fechamento)
- Plano adaptativo editável manualmente
- Categorias personalizadas pela interface
- Funcionar offline como app instalável (PWA)

## Identidade visual e ícones (09/10/2026)
Decisão do Isaac: símbolo **F com moeda** (opção F do Design; a 1ª rodada, A–C, foi recusada por genérica) e
conjunto de ícones **Lucide** (ISC). Passos, um commit cada:
- [x] 1. Ícone do app, `theme-color` e logo do topo (a marca aparece também no celular; o nome escrito, só em tela
      larga). Nova cor `--conquista` (#5fd39a), só para a moeda do logo e, no futuro, metas atingidas
- [ ] 2. `js/icones.js` com os SVG do Lucide (cópia dentro do projeto, sem CDN) e as ações: lixeira, lápis, mais,
      meta, reserva. Entra no `sw.js` e guarda o aviso da licença ISC
- [ ] 3. Ícones das categorias no lugar dos emojis, com migração dos dados antigos em `normalizeCategories`
      (área de risco: vai com `/security-review`); nas listas `<option>` fica só o nome
- [ ] 4. Tirar os emojis restantes dos textos (👋 🎉 💪)
- [ ] Sugestão: usar `--conquista` quando uma meta for atingida (hoje só aparece no logo)
- [ ] Sugestão: atualizar o Design System do Finan (Artifact) com a cor de conquista e o novo símbolo

## Onboarding (09/10/2026)
- [x] Onboarding de 3 passos na primeira abertura (baldes, privacidade, primeiro lançamento), com "Pular" e
      `settings.onboardingVisto` gravado nos dados (decisões do Isaac: botões de lançar e de exemplo só no passo 3,
      e gravar o "visto"). Os testes que clicavam em "Ver com dados de exemplo" na primeira tela passaram a usar o
      ajudante `carregarExemplo` (só o começo mudou)
- [x] Tostão nos 3 passos (acenando, abraçando o cadeado, joinha), no lugar dos ícones provisórios (09/10/2026, decisão
      do Isaac: desenho v4, nome Tostão, cor de conquista aprovada)
- [ ] Sugestão: o passo 1 ainda não mostra os três baldes com os nomes e cores do Painel
- [ ] Sugestão: as outras poses do Tostão v4 (tela vazia, meta atingida, mês apertado) em outros momentos do app
- [ ] Defeito antigo (visto em 360x640): no passo 3, o "+ Lançar" flutuante cobre parte do botão "Ver com dados de
      exemplo"; o botão continua tocável pela esquerda. Ideia: esconder o "+ Lançar" enquanto o onboarding está na tela
- [ ] Sugestão: depois de testar com pessoas (roteiro da Etapa 5), rever o texto dos 3 passos

## Transferir entre metas e a sobra (08/10/2026)
Ideia do Isaac: metas (inclusive a reserva) e a sobra do mês poderiam "se conversar" como contas de
um banco. Dividido em 3 etapas, cada uma por decisão dele:
- [x] Etapa 1: botão "Transferir" em cada meta move o que já está guardado para outra meta (ou da
      reserva para uma meta, e vice-versa). Não cria lançamento: não conta como gasto nem muda o
      Guardado/Sobrou do mês, só realoca o valor (`transferBetweenGoals`)
- [x] Etapa 2: botão "Tirar" devolve dinheiro guardado numa meta (ou na reserva) para a Sobra do
      mês de hoje: cria uma retirada (`withdrawFromGoal`), o espelho do depósito, que baixa o
      Guardado e sobe a Sobra na mesma hora. Avisa (sem bloquear) antes de deixar a reserva abaixo
      do valor ideal. Por tocar em `normalizeData`, foi por PR com `/security-review`
- [x] Interface das etapas 1 e 2 (09/10/2026): botão único "Movimentar" abre um painel na tela (`<dialog>`),
      no lugar das janelas `prompt()`/`confirm()`: Guardar mais, Transferir e Tirar. Autorizado pelo Isaac,
      que também liberou reescrever só a parte de interação dos testes que respondiam a `prompt()`.
      Especificação em `docs/ux-estrategia.md` (Etapa 6)
- [ ] Etapa 3: a sobra de um mês passa para o próximo, em vez de zerar (mexe nas contas do Painel e
      do "pode gastar hoje"; etapa mais delicada, por PR com `/security-review`)

## Dia de pagamento
- [x] "Você pode gastar hoje" até o próximo pagamento, pelo N-ésimo dia útil (renda estável)
- [x] "Pode gastar hoje" também mostra quanto dá para gastar até domingo
- [ ] Sugestão: feriados nacionais na conta do dia útil
- [ ] Sugestão: Painel e limites por ciclo do salário, não por mês de calendário
- [x] Formulário de lançamento: categoria "Metas" abre a lista das metas (só aparece com metas)
- [ ] Sugestão: limite do envelope Metas sugerido pela soma dos valores mensais das metas
- [x] Revisão semanal no dia escolhido (padrão domingo), com lembrete no Painel
- [x] Visual da lista da revisão semanal (`.checklist`): sem marcadores soltos, linhas tocáveis e com filete
- [x] "Pode gastar" limitado ao que sobrou no período (guardar numa meta baixa o valor)
- [ ] Sugestão: reservar também o que a pessoa ainda pretende guardar no mês (envelope Metas com limite)

## Orçamento pelo que a pessoa realmente gasta (reformulação, 30/09/2026)
Decisão do Isaac: a sugestão atual inventa números (porcentagem repartida à força entre
categorias). Novo princípio: o orçamento parte da realidade; a porcentagem do plano vira teto
do balde e comparação. Uma parte por vez:
- [x] Parte 1: teto do balde, o que já foi distribuído e o que sobra, com aviso de excesso
- [x] Parte 2: o botão "Sugerir pelos meus gastos" sugere a média dos últimos 3 meses por
      categoria (nas fixas, o valor que a pessoa de fato paga), só para categorias com gasto; o
      balde Futuro vem do percentual do plano (`suggestFromHistory`)
- [ ] Sugestão: retirar `suggestBudgets` do núcleo quando os testes antigos dele puderem ser
      trocados (hoje ele só divide o balde Futuro por dentro de `suggestFromHistory`)
- [x] Parte 3: questionário simples (aluguel, mercado, transporte…) para quem não tem histórico
- [ ] Sugestão: cada valor sugerido mostra o motivo ("média dos últimos 3 meses: R$ 290")

## Adicionar item ao orçamento (30/09/2026)
- [x] Orçamento enxuto na primeira abertura, botão "Adicionar" por balde e "Criar" item novo
- [ ] Sugestão: remover um item do orçamento (hoje um item adicionado fica para sempre; só os
      que aparecem por ter limite somem ao apagar o limite)
- [ ] Sugestão: escolher "fixa" ou "variável" e o ícone ao criar um item
- [ ] Sugestão: renomear e excluir categorias criadas pela pessoa

## Histórico de atualizações (01/10/2026)
- [x] `CHANGELOG.md` (Keep a Changelog + SemVer, em português simples), versão 0.1.0, janela
      "Novidades" escondida (5 toques na barra do topo) e testes de consistência
- [ ] Sugestão: marcar cada versão lançada no GitHub (tag `v0.1.0`), para o histórico do código
      acompanhar o `CHANGELOG.md`
- [ ] Sugestão: mostrar a versão em uso em algum lugar à vista (hoje só aparece na janela escondida)

## Achados do teste de 6 meses como brasileiro médio (01/10/2026)
Feito por mim, sozinho, no navegador de celular simulado, com um usuário inventado (Marcos, CLT,
salário de R$ 3.450, aluguel, iFood, celular parcelado). Tudo abaixo é **sugestão**: o Isaac escolhe
o que entra e em que ordem. Cada item precisa de teste no navegador antes da correção. Os marcados
"(visto)" aconteceram na tela; os marcados "(avaliação)" são minha leitura de como a pessoa se
comporta, sem medição. Não testado: celular de verdade, iPhone, uso real por 6 meses.

Por que ele pararia de usar (do mais provável ao menos)
- [ ] Esquece de lançar e os números passam a mentir (avaliação). O app não avisa com ele fechado
      (sem servidor). Ideias: lançar mais rápido (valores e descrições usados com frequência),
      aviso na abertura quando faz dias que não há lançamentos
- [x] Medo de perder tudo (avaliação): trocar de celular ou limpar o navegador apaga o histórico, e o
      app nunca lembra de fazer backup (visto: só o texto em "Seus dados"). Resolvido em parte
      (02/10/2026): o Painel lembra de baixar um backup (ver o item de backup da Parte 5)
- [ ] O app não bate com a vida real (visto na falta dos campos): sem fatura do cartão (a compra
      entra no dia da compra, mas o dinheiro sai no vencimento); sem vale-alimentação; só um
      pagamento por mês (sem adiantamento do dia 20); receitas só Salário, Renda extra e Outras
      (sem 13º, férias, reembolso)
- [ ] Culpa repetida (visto): todo mês "Você guardou R$ 0,00… faça o aporte"; num mês estourado o
      Painel mostrou 10 mensagens seguidas. Feito (02/10/2026): no máximo 3 avisos à vista, o resto em
      "Ver mais N avisos" (decisão tomada pela IA com o Isaac ausente). Falta: aviso de "guarde mais"
      só uma vez por semana
- [ ] Esforço e palavras difíceis no começo (avaliação): balde, envelope, "80/15/5", "renda
      estável ou variável", "Essenciais consomem 96%". Explicar no lugar ou trocar por palavras do dia a dia

Defeitos e confusões vistos
- [x] **Alarme falso no começo do mês** (visto): no dia 2, R$ 80 em iFood geraram "no ritmo atual você
      vai gastar R$ 1.240 (limite R$ 380). Desacelere". A previsão multiplicava 2 dias pelo mês
      inteiro. Resolvido: a previsão só vale a partir do 7º dia (decisão do Isaac, 01/10/2026);
      envelope já estourado continua avisando desde o dia 1
- [ ] "Sobrou" negativo e baldes "Sem renda" nos primeiros dias, até o salário cair (visto, mesma tela
      do item acima; fora do que foi resolvido)
- [ ] "Sobrou" otimista no meio do mês (visto): no dia 8 mostrou R$ 2.850, com aluguel (R$ 1.100) e
      contas ainda por pagar. Ideia: mostrar ao lado o que ainda vai vencer (fixos do mês)
- [ ] A sugestão de limites já nasce com alertas (visto): logo depois de "Sugerir pelos meus gastos"
      apareceram "passa do teto em R$ 180", "Transporte estourado" e "Mercado vai estourar"
- [ ] O "Você pode gastar hoje" só aparece depois de definir limites (visto: sem limites o Painel
      não mostra o número, e o Orçamento avisa "Faltam R$ 3.450,00 sem destino"). Ideia: sem
      limites, mostrar um valor simples a partir da renda e dos gastos
- [x] Depois de salvar um gasto nada mostra o efeito (visto): só "Despesa de R$ X lançada", e a
      pessoa fica em Lançamentos. Resolvido (02/10/2026): a mensagem diz "Você ainda pode gastar R$ Y
      hoje" (o mesmo número do cartão do Painel); só para gastos novos que não são guardar, e só quando
      o cartão existe (decisão tomada pela IA com o Isaac ausente)
- [x] "Sugerir pelos meus gastos" guiado pelos dados reais (02/10/2026): renda − necessários − comprometidos
      = margem, depois piso de vida, metas e gastos flexíveis "até" um valor (`js/sugestao.js`). Dívida
      virou Essenciais. Sem porcentagem fixa. Decisões 1 a 4 do Isaac; a 5 (criar a reserva sozinho) ficou
      sem resposta e a IA manteve "só oferecer"
- [ ] Sugestão, próxima fase: o questionário ainda reparte o Futuro pelo plano (porcentagem). Ideia: usar a
      mesma conta do motor (metas e reserva pelo prazo) quando a pessoa já tem metas
- [ ] Sugestão, próxima fase: o "teto do balde" do Orçamento ainda vem do plano 50/30/20 (Isaac decidiu
      manter na 1ª fase) e pode avisar "passou do teto" mesmo com uma sugestão coerente
- [ ] Sugestão, próxima fase: avisar uma vez por mês, ao abrir o app, "quer rever seus limites?" (hoje só
      pelo botão), e avisar quando um limite estoura em 2 dos últimos 3 meses
- [ ] Sugestão: categorias com gasto só em meses atuais não entram (a janela é de meses anteriores); gastos
      anuais (IPVA, seguro) só viram provisão se aparecerem na janela de 6 meses
- [x] Painel enxuto, fase 1 (02/10/2026): cartão "pode gastar" com número e uma linha + "Ver detalhes", baldes
      e plano em "Como funciona", barras de uma linha
- [x] Painel enxuto, fase 2, parte 1 (09/10/2026, plano aprovado pelo Isaac, feito com a habilidade frontend-design):
      o "pode gastar hoje" vem primeiro, numa faixa verde-escura que continua o topo; o resumo do mês virou um bloco
      só, em linhas no celular e lado a lado no computador
- [ ] Painel enxuto, fase 2, parte 2: avisos sem a faixa grossa à esquerda e com texto mais calmo ("Desacelere" soa
      como bronca), baldes e categorias recolhidos ("Para onde foi o dinheiro"). Falta o Isaac decidir: 1 ou 3
      avisos à vista (a fase 2 fala em 1; a regra de hoje deixa 3)
- [ ] Defeito antigo (achado em 09/10/2026): o teste "nenhuma violação do axe em nenhuma tela" (`acessibilidade.spec.js`)
      falha às vezes (5 em 16 no código de antes da faixa verde) com "color-contrast: #toast". Causa: a mensagem de
      confirmação entra e sai com um esmaecer de 0,2 s (`opacity`), e se o axe mede no meio dele o texto parece claro
      demais. Pode derrubar a CI por acaso. Saídas (decisão do Isaac): a mensagem aparecer sem esmaecer (só deslizar),
      ou o teste esperar a mensagem sumir antes de medir
- [ ] Sugestão (revisão de design, 09/10/2026): linhas de números colados com "·" nos baldes e no Orçamento
      ("R$ 2.301,20 (44% da renda) · máx. 55% (R$ 2.860,00)") são difíceis de ler; o Orçamento e o Método estão longos
- [ ] Painel enxuto, fase 3: lembretes calmos (um por vez, faixa fina, "Agora não" que guarda uma data: mexe
      em dados, vai por PR)
- [ ] Painel enxuto, depois: valor sem centavos no destaque ("R$ 46") e trocar balde/envelope/plano por
      palavras do dia a dia (decisão do Isaac)
- [ ] Estilo de vida aparece vazio no Orçamento mesmo com gasto (visto): diz "elas já gastaram
      R$ 525,70" sem dizer quais categorias; Restaurantes, Compras e Assinaturas só surgem em "Adicionar".
      Ideia: categorias com gasto no mês aparecem sozinhas
- [ ] Fixos não vêm sozinhos (visto): todo mês é preciso apertar "Trazer fixos do mês anterior", e
      os meses futuros não mostram nada previsto (nem parcelas já feitas)
- [x] Excluir não tem "desfazer" (visto): uma confirmação apagou 12 parcelas de uma vez, numa janela
      do navegador. Resolvido (01/10/2026): depois de excluir um lançamento, as parcelas de uma
      compra, uma meta ou "Apagar tudo", a mensagem ganha o botão "Desfazer" por 10 segundos (cópia dos
      dados antes de excluir; some assim que outra coisa muda os dados). Foco no celular: sem atalho
- [x] Tirar as perguntas "tem certeza?" ao excluir um lançamento ou uma meta, já que o "Desfazer" as
      substitui (02/10/2026, decisão tomada pela IA com o Isaac ausente, a pedido dele de "fazer tudo").
      Continuam perguntando: compra parcelada (é uma escolha), "Apagar tudo" e "Restaurar backup". Único
      teste existente reescrito: `metas-e-dados` ("Excluir meta pergunta antes")
- [x] "Desfazer" também para "Restaurar backup" e "Carregar exemplo" (02/10/2026, decisão tomada pela IA
      com o Isaac ausente): só aparece quando havia dados a perder (lançamentos, metas ou limites); cada
      caso diz a sua mensagem ao desfazer. As perguntas dos dois continuam
- [ ] Reserva ideal sem prazo (visto): com sobra de uns R$ 500 por mês a tela mostra
      "R$ 15.700,02" e não diz em quanto tempo a pessoa chegaria lá
- [ ] O mesmo teto do Futuro com dois valores (visto): R$ 170,00 no Orçamento e R$ 172,50 no Painel
- [ ] Mensagem de confirmação fica em cima de campos do formulário de Metas, e o "+ Lançar" cobre
      texto ao rolar (visto, menor)

O que ele sente falta (ideias, sem ordem)
- [ ] Ver os meses juntos ("estou melhorando?"): hoje cada mês é uma tela isolada
- [ ] Fatura do cartão e "quanto já está comprometido nos próximos meses" (etapa grande, à parte)
- [ ] Renomear ou esconder categorias; etiquetas como Pix, dinheiro e cartão
- [ ] Usar no celular e no computador, e o casal usar junto (hoje cada aparelho tem a sua cópia;
      exigiria servidor e vai contra "os dados nunca saem do navegador": decisão do Isaac)
- [ ] Busca em todos os meses (hoje vale só para o mês aberto)
- [ ] Tema escuro (já está na Parte 4)

O que funciona bem (não mexer)
- Lançar é rápido; aceita "3200", "3.200", "R$ 3.200,00" e "25,90". Tocar duas vezes em Salvar não
  duplica. Parcelas, mês estourado e o limite do "pode gastar" fazem as contas certas. Sem erros de JavaScript.
