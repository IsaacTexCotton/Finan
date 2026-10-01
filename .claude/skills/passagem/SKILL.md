---
name: passagem
description: Gera o relatório de passagem de contexto (.md) para continuar o trabalho no Finan num chat novo, sem depender do resumo da compactação. Use quando o contexto estiver perto do limite, antes de encerrar uma sessão longa, ou quando o Isaac pedir "passagem" ou "relatório de passagem".
argument-hint: "[foco opcional, ex.: só o Orçamento]"
allowed-tools: Read, Grep, Glob, Write, Bash(git status:*), Bash(git log:*), Bash(git rev-parse:*), Bash(git fetch:*), Bash(git diff:*), Bash(git show:*), Bash(grep:*), Bash(date:*), Bash(npm run check), Bash(npm run test:e2e), mcp__github__actions_list
---

Você vai escrever o RELATÓRIO DE PASSAGEM desta sessão do Finan, para que um chat
novo, sem nada da conversa, continue de onde esta parou sem perder fato e sem
herdar erro. Foco extra pedido pelo Isaac (pode estar vazio): $ARGUMENTS

O resumo automático da compactação é escrito de memória e pode omitir, distorcer
ou repetir um erro antigo com cara de verdade. Este relatório existe para NÃO ser
isso: tudo o que ele afirma como fato foi conferido agora, e o que não foi
conferido aparece marcado como tal.

## 1. Confira no repositório ANTES de escrever (não de memória)

Rode e leia o resultado (não resuma de cabeça):

- `git status --short`, `git rev-parse --short HEAD`, `git log --oneline -15`
- `git fetch -q origin main` e `git log --oneline HEAD..origin/main` (alguém mais
  empurrou? o Dependabot e outras sessões também escrevem no repositório)
- o branch de trabalho da sessão, se o ambiente exigir um (nesta sessão foi
  `claude/gallant-rubin-2k21cp`): `git rev-parse --short origin/<branch>` deve ser
  igual ao `HEAD`; se não for, diga
- CI e publicação do `HEAD`: `mcp__github__actions_list` (`list_workflow_runs`,
  repositório `IsaacTexCotton/Finan`) e leia o `status` e a `conclusion` do run
  "CI" e do run "Publicar no GitHub Pages" **do mesmo `head_sha`**. Se o GitHub não
  estiver acessível, escreva "CI e publicação NÃO conferidas"
- `npm run check` (lint + testes rápidos, ~5 s) sempre que houver mudança não
  commitada ou dúvida; `npm run test:e2e` (~1 min) se a tela mudou. Se não rodar,
  escreva "check NÃO rodado" ou "e2e NÃO rodado". Contagens (testes que passaram)
  só as que saíram do comando agora
- `CLAUDE.md` (regras do negócio, "Problemas já resolvidos"), `BACKLOG.md` e
  `docs/guia-metodo-akita.md`: leia o que já está registrado para NÃO duplicar no
  relatório; cite o arquivo e a seção

Se precisar conferir uma fala literal do Isaac, o transcrito da sessão está em
`~/.claude/projects/<projeto>/<sessão>.jsonl` (leia só o trecho necessário).

## 2. Classifique cada afirmação

Todo item do relatório leva uma destas marcas:

- `[VERIFICADO: fonte]` conferido agora (arquivo:linha, hash de commit, saída de comando)
- `[USUÁRIO: "frase literal"]` o que o Isaac disse, entre aspas
- `[HIPÓTESE]` ainda não confirmado (quem confirma e como)
- `[DESCARTADO]` o Isaac desistiu ou foi refutado (para ninguém ressuscitar)

Sem marca, não entra. Separe sempre "o Isaac disse" de "eu concluí".

## 3. Estrutura do relatório

Escreva em português, sem emoji, com datas absolutas (AAAA-MM-DD), alvo de 150
linhas ou menos:

0. **Cabeçalho**: data, branch, HEAD, estado do git (limpo? à frente ou atrás de
   `origin/main`? branch da sessão igual?), resultado do `check` e do `test:e2e`,
   CI e publicação do HEAD, e o endereço publicado
   (https://isaactexcotton.github.io/Finan/).
1. **O que o Isaac quer agora** (3 linhas) e a última coisa que ele pediu, literal.
2. **O que foi feito nesta sessão**: um commit por linha (hash e o que mudou em
   uma frase), só o que o `git log` mostra. Foi publicado? (diga como foi
   conferido: run da publicação com o mesmo `head_sha`).
3. **Decisões do Isaac** nesta sessão (literais) e onde foram registradas
   (`CLAUDE.md`, seção "Regras do negócio" ou "Regras de visual", com a data).
   Se alguma NÃO foi registrada, diga "NÃO REGISTRADA" e registre no `CLAUDE.md`
   antes de terminar. Inclua os testes existentes que ele autorizou a mudar.
4. **Fatos confirmados fora do código** nesta sessão (por exemplo, "abri no celular
   real e a tela X abriu"), com quem confirmou e quando. Separe do que só passou
   em navegador simulado. Lembre o que continua NÃO verificado: celular real,
   leitor de tela real, Safari e Firefox. Nunca coloque aqui o que foi só visto
   em teste automático como se fosse uso real.
5. **Pendências**, em quatro grupos: (a) aguardando decisão do Isaac, com a
   pergunta exata; (b) aguardando o Isaac testar no celular ou no site publicado,
   com o passo; (c) planejado e não feito (cite o item do `BACKLOG.md`);
   (d) descartado pelo Isaac.
6. **Erros e armadilhas** desta sessão: o que deu errado, a causa, como evitar
   (inclusive erros seus). É a parte que mais protege o chat novo. O que virou
   regra permanente já está em "Problemas já resolvidos" do `CLAUDE.md`: aponte
   para lá em vez de repetir.
7. **Como validar**: comandos que valem (`npm run check`, `npm test`,
   `npm run test:e2e`, `npx playwright test tests/e2e/<arquivo>.spec.js`), o que NÃO
   foi rodado e por quê.
8. **Regras que pesam no que vem agora**: só as ligadas ao trabalho em curso
   (por exemplo, teste antes do código, nunca alterar teste existente sem decisão
   do Isaac, dinheiro em centavos, `commit()` para devolver o foco, `esc()` antes
   de `innerHTML`, axe com zero violações), em uma linha cada, citando o
   `CLAUDE.md`. Não copie o `CLAUDE.md`.
9. **Primeira ação sugerida** e um prompt de abertura de no máximo 6 linhas para
   colar no chat novo (ele manda ler o `CLAUDE.md`, o `BACKLOG.md`, este relatório
   e o `git log`, e dizer o que entendeu antes de mexer; lembra que "planejar e
   esperar aprovação" vale antes de codar).

## 4. Regras de qualidade (não negociáveis)

- **Privacidade (regra do projeto e preferência do Isaac):** nenhum dado real:
  nada de CPF, CNPJ, nome de pessoa, telefone, e-mail, conta bancária, endereço,
  senha, token nem valor financeiro real do Isaac. Use só valores inventados (os
  de exemplo dos testes) e descreva dados reais por formato ou contagem.
- **Nenhum identificador técnico de modelo** (o ID no formato
  `claude-<família>-<versão>`) em lugar nenhum do relatório.
- Nada de resumo vago ("várias melhorias"): diga qual, em qual arquivo.
- Não repita o que já está no `CLAUDE.md`, no `BACKLOG.md` ou no guia Akita:
  aponte para lá. O relatório guarda o que SÓ existe nesta conversa.
- Número, hash e linha só se você os viu agora. Na dúvida, `[HIPÓTESE]`.
- Mudança de comportamento, texto ou visual que o Isaac ainda não aprovou aparece
  em "aguardando decisão", nunca como feita.

## 5. Depois de escrever

1. Salve em `passagens/AAAA-MM-DD-HHMM.md` (use `date` para a hora). A pasta fica
   na raiz e é só para isso; a publicação envia apenas `index.html`, `css/` e
   `js/`, então ela não vai ao ar. Se a gravação for bloqueada, salve no
   scratchpad da sessão, diga ao Isaac onde ficou e peça autorização; não
   contorne o bloqueio.
2. Confira o arquivo: a busca de dado real
   `grep -nE "[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}|[0-9]{2}\.[0-9]{3}\.[0-9]{3}/[0-9]{4}|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[a-z]{2,}|\(?[0-9]{2}\)? ?9?[0-9]{4}-?[0-9]{4}|ghp_|github_pat_|senha" <arquivo>`
   e a de modelo `grep -nE "claude-(opus|sonnet|haiku|fable)" <arquivo>`. Nada deve
   sair (a palavra "senha" só pode aparecer numa regra, nunca com um valor). Corrija
   e rode de novo se aparecer algo.
3. Mostre ao Isaac: o caminho do arquivo, o prompt de abertura do item 9 e as
   pendências (a) e (b) em duas linhas cada.
4. Pergunte se pode commitar e empurrar o relatório (numa sessão remota o arquivo
   some com o contêiner). Só commite se ele concordar: `npm run check` com código
   de saída 0, mensagem em português no imperativo, rodapé de coautoria da sessão,
   `git push origin main` (e no branch da sessão, se houver um).
