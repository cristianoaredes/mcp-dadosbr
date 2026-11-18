---
run_id: RUN-20261118-031326-stdio-metrics
ticket: TCK-0007
design: DES-0007
status: completed
operator: codex
start_time: "2026-11-18T03:13:26Z"
end_time: 2026-11-18T03:19:47+00:00
commits:
  - sha: d59989c94f6ccf0bcbc5cb238648ae6555048bc1
    message: "[TCK-0007] Keep stdio metrics out of the MCP protocol stream"
    files: [lib/core/tools.ts, test/integration/transports.mjs]
files_modified: [lib/core/tools.ts, test/integration/transports.mjs]
test_result:
  status: pass
  summary: "Regressão vermelha na base e verde na correção, 286 testes e Worker"
---
# TCK-0007 — Métricas em stderr

- O teste novo reprovou a base com a mensagem de parsing de `[metrics]` a partir da centésima chamada.
- Na correção, 101 chamadas retornaram o resultado esperado, sem erro de framing. Os dois transportes mantiveram 23 ferramentas e os cinco recursos.
- `npm test` registrou 286 aprovações em 17 arquivos. O build Worker e `git diff --check` passaram.
- O verificador reproduziu antes e depois em cópia isolada.
