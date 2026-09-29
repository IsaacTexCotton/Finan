# Finan — regras do projeto

App web para controlar gastos pessoais com o **Método Finan** (50/30/20, envelopes,
pague-se primeiro, reserva de emergência, revisão semanal). Roda 100% no navegador,
sem build e sem servidor.

Trabalhamos com **Agile Vibe Coding** (XP + IA): planejar antes, passos pequenos,
testes sempre, CI verde a cada commit.

## Como trabalhar
1. **Planeje antes de codar.** Explique o que vai mudar e por quê; espere aprovação.
2. **Uma história do `BACKLOG.md` por vez.** Um commit pequeno por passo.
3. **Toda funcionalidade vem com teste. Todo bug corrigido ganha teste de regressão**
   (escreva o teste que falha antes da correção).
4. **Antes de todo commit rode `npm run check`** (lint + testes). Nada de commit vermelho.
5. Ao terminar uma história, marque-a no `BACKLOG.md`.
6. **Fluxo Git:** `main` é sempre estável. Trabalhe em um branch, abra um Pull Request
   para `main` e só integre com a CI verde. Commits em português, no imperativo.

## Arquitetura
- `js/core.js` — regras de negócio **puras** (sem DOM, sem `localStorage`). Toda conta mora aqui.
- `js/app.js` — interface: lê o estado, chama o núcleo, desenha a tela. Não faz contas de negócio.
- `tests/*.test.js` — testes com `node --test`, focados no núcleo.
- `index.html` + `css/` — estrutura e visual. Sem frameworks, sem etapa de build.
- Scripts clássicos (não ES modules) para o app abrir com duplo clique (`file://`).

## Regras de código (observáveis)
- **Dinheiro é inteiro em centavos.** Nunca some ou compare reais em ponto flutuante.
  Converta entrada com `parseAmount` e exiba com `formatBRL`.
- **Datas são strings locais `AAAA-MM-DD`.** Não use `new Date('AAAA-MM-DD')` (vira UTC).
- **Nomes do domínio em português** (`orcamento`, `envelope`, `balde`), código em inglês
  simples onde já é assim; siga o padrão do arquivo que está editando.
- Funções pequenas com uma responsabilidade. O ESLint avisa acima de 60 linhas ou
  complexidade 15 — trate o aviso como pedido de refatoração.
- Sem duplicação: se a mesma conta aparece duas vezes, ela vai para `core.js`.
- **Todo texto vindo do usuário ou de backup passa por `esc()` antes de ir para `innerHTML`.**
- Dados importados passam por `normalizeData` (valida e descarta o que for inválido).
- CSV exportado neutraliza fórmulas (`=`, `+`, `-`, `@`).

## Privacidade (inegociável)
- Os dados **nunca saem do navegador**: nada de APIs externas, analytics, CDNs com rastreio
  ou envio de dados. Persistência só em `localStorage` e backups baixados pelo usuário.
- Não registre nem versione dados financeiros reais; use apenas dados de exemplo.

## Comandos
- `npm run check` — lint + testes (o mesmo que a CI roda, além do `npm audit`)
- `npm test` — só os testes
- `npm start` — servidor local em http://localhost:8080 (ou abra `index.html` direto)
