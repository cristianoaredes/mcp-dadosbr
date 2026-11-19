# Ship do TCK-0009

- **Ticket:** `TCK-0009` (`done`) · **Design:** `DES-0009` (`approved`) · **Run:** `RUN-20261119-052343-readme-orqo-agpl3` (`completed`) · **Verify:** `VER-20261119-054107-tck-0009` (`approved-with-notes`, contexto limpo).
- **Critérios locais e gates:** `criteria-check.py` 2/2 PASS (`AGPL-3.0-only` nos manifestos + `LICENSE` verbatim + `NOTICE.md`; `git diff --check`, `npm run build`, 286/286 testes Vitest, `npm run test:transport` com 23 ferramentas, 5 MCP Apps e 101 chamadas `stdio` + `HTTP/SSE`), `npm run build:worker` PASS, `npm pack --dry-run` PASS, `verify-run.py` PASS e scanners de segredo (`gitleaks` + `secret-scan.sh`) limpos no diff staged.
- **Auto-approval (`auto-approve.py --dry-run`, informativo):** não elegível (effort `M` e checklist de baixo risco conservador); merge, tag e release permanecem decisão humana (SAFETY §ship).
- **Observação de release:** antes de publicar a primeira versão npm sob `AGPL-3.0-only`, incrementar `package.json` além de `0.5.0` (tag MIT já publicada) e revisar `smithery.yaml`.
- **Aprendizado:** confrontar cada afirmação do `README.md` (provedores implementados, variáveis de ambiente, escopo de proveniência e sintaxe Mermaid) contra o código-fonte em contexto independente evita propagar comentários obsoletos; separar atribuições de terceiros em `NOTICE.md` preserva a detecção SPDX verbatim da GNU AGPL-3.0.
