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
| `frontend-design` | Plugin "frontend-design" v1 da Anthropic, enviado pelo Isaac em 09/10/2026 (zip, sem repositório) | sha256 do `SKILL.md`: `d91970639e9f…` | Apache-2.0 |

Em `systematic-debugging` ficaram só o `SKILL.md` e os três guias; os scripts e arquivos de
teste da skill original foram deixados de fora. Referências a eles no texto (ex.:
`find-polluter.sh`) e a outras skills do superpowers ficam sem efeito. Em conflito, o
`CLAUDE.md` do projeto manda.

Em `frontend-design` ficaram só o `SKILL.md` e o `LICENSE.txt` (o `README.md`, o manifesto do plugin e a
cópia da licença na raiz do zip ficaram de fora). Ela foi escrita para criar telas novas com identidade
própria; no Finan a identidade já existe, então valem primeiro as regras do `CLAUDE.md`. Os conflitos que
mais importam: ela sugere escolher fontes próprias, mas o Finan usa as fontes do sistema e **não baixa nada
de fora** (fonte da internet seria um pedido de rede, proibido); as cores, tamanhos e espaçamentos só vêm
das variáveis do `:root`; e nada muda na tela sem o plano aprovado pelo Isaac.

## Skills próprias

| Skill | Origem |
|---|---|
| `passagem` | Adaptada de um comando de passagem de contexto de outro projeto do Isaac (conferências do repositório, marcas `[VERIFICADO]`, `[USUÁRIO]`, `[HIPÓTESE]` e `[DESCARTADO]`, relatório em `passagens/`). Trocados os itens específicos daquele projeto pelos do Finan: `npm run check`, `npm run test:e2e`, `CLAUDE.md`, `BACKLOG.md`, CI e publicação no GitHub Pages, branch da sessão e a regra de nunca registrar dados reais. |
