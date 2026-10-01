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
- [ ] Backup: decidir o que fazer (cópias internas automáticas, lembrete de backup externo ou os dois)
- [ ] Ícone definitivo do app (hoje é uma letra F provisória; não é prioridade)
- [ ] Sugestão: endereço próprio (domínio) para o produto vendido, separado de outros sites do GitHub Pages
      (no GitHub Pages, todas as páginas de uma conta dividem o mesmo armazenamento do navegador)
- [ ] Sugestão: fixar as Actions de `ci.yml` e `publicar.yml` por código exato (SHA); o Dependabot atualiza
- [ ] Sugestão (grátis): ligar o CodeQL do GitHub em Settings > Security > Code scanning (padrão)
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

## Refatorações (avisos do ESLint)
- [ ] `insights` (complexidade 34): quebrar em uma função por tipo de alerta
- [ ] `handleAction` (complexidade 24, 72 linhas): trocar `switch` por mapa de ações
- [ ] `parseAmount` (complexidade 19): separar detecção de separador decimal
- [ ] `normalizeData` (complexidade 22): um normalizador por coleção

## Ideias futuras (não priorizadas)
- Importar extrato do banco (OFX/CSV)
- Controle por cartão de crédito (fatura, limite, dia de fechamento)
- Plano adaptativo editável manualmente
- Categorias personalizadas pela interface
- Funcionar offline como app instalável (PWA)

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
- [ ] Medo de perder tudo (avaliação): trocar de celular ou limpar o navegador apaga o histórico, e o
      app nunca lembra de fazer backup (visto: só o texto em "Seus dados"). Ligado ao item de backup
      da Parte 5. Ideia: aviso suave a cada 2 a 4 semanas e botão "Salvar cópia" mais à vista
- [ ] O app não bate com a vida real (visto na falta dos campos): sem fatura do cartão (a compra
      entra no dia da compra, mas o dinheiro sai no vencimento); sem vale-alimentação; só um
      pagamento por mês (sem adiantamento do dia 20); receitas só Salário, Renda extra e Outras
      (sem 13º, férias, reembolso)
- [ ] Culpa repetida (visto): todo mês "Você guardou R$ 0,00… faça o aporte"; num mês estourado o
      Painel mostrou 10 mensagens seguidas. Ideias: no máximo 3 alertas por vez; aviso de "guarde
      mais" só uma vez por semana
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
- [ ] Depois de salvar um gasto nada mostra o efeito (visto): só "Despesa de R$ X lançada", e a
      pessoa fica em Lançamentos. Ideia: mostrar na mensagem quanto ainda pode gastar hoje
- [ ] Estilo de vida aparece vazio no Orçamento mesmo com gasto (visto): diz "elas já gastaram
      R$ 525,70" sem dizer quais categorias; Restaurantes, Compras e Assinaturas só surgem em "Adicionar".
      Ideia: categorias com gasto no mês aparecem sozinhas
- [ ] Fixos não vêm sozinhos (visto): todo mês é preciso apertar "Trazer fixos do mês anterior", e
      os meses futuros não mostram nada previsto (nem parcelas já feitas)
- [ ] Excluir não tem "desfazer" (visto): uma confirmação apagou 12 parcelas de uma vez, numa janela
      do navegador. Ligado ao item da Prioridade baixa sobre `confirm()`
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
