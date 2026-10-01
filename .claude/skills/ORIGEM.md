# Origem das skills

Skills de terceiros, copiadas sem alteração e fixadas em um commit (para não mudarem sozinhas).
Antes de atualizar, leia o diff. Elas só contêm instruções em texto: nenhuma tem script,
chamada de rede ou hook.

| Skill | Repositório | Commit | Licença |
|---|---|---|---|
| `playwright-best-practices` | currents-dev/playwright-best-practices-skill | 283d5cb | MIT |
| `verification-before-completion` | obra/superpowers | 8ca22db | MIT |
| `systematic-debugging` | obra/superpowers | 8ca22db | MIT |
| `prompt-optimizer` | getsentry/skills | d18b7aa | Apache-2.0 |

Em `systematic-debugging` ficaram só o `SKILL.md` e os três guias; os scripts e arquivos de
teste da skill original foram deixados de fora. Referências a eles no texto (ex.:
`find-polluter.sh`) e a outras skills do superpowers ficam sem efeito. Em conflito, o
`CLAUDE.md` do projeto manda.

## Skills próprias

| Skill | Origem |
|---|---|
| `passagem` | Adaptada de um comando de passagem de contexto de outro projeto do Isaac (conferências do repositório, marcas `[VERIFICADO]`, `[USUÁRIO]`, `[HIPÓTESE]` e `[DESCARTADO]`, relatório em `passagens/`). Trocados os itens específicos daquele projeto pelos do Finan: `npm run check`, `npm run test:e2e`, `CLAUDE.md`, `BACKLOG.md`, CI e publicação no GitHub Pages, branch da sessão e a regra de nunca registrar dados reais. |
