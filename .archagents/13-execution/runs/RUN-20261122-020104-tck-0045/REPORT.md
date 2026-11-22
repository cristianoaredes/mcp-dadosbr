---
status: completed
run_id: RUN-20261122-020104-tck-0045
ticket: TCK-0045
design: DES-0041
start_time: 2026-11-22T02:01:04Z
end_time: 2026-11-22T02:05:14Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/tools/government.ts
  - lib/tools/health.ts
  - lib/tools/legal.ts
  - lib/shared/errors.ts
  - test/unit/pncp-app.test.ts
  - test/unit/tools-company-health-osint-legal.test.ts
  - test/unit/errors.test.ts
  - .archagents/05-integrations.md
test_result:
  status: pass
  summary: "540/540 Vitest tests (39 files) PASS, build + build:worker + tsc Node/Worker PASS, test:transport PASS (29 tools, 5 MCP Apps, 101 stdio calls), criteria-check 4/4 PASS, live stdio E2E pncp_licitacoes & cnes_saude PASS, secret-scan PASS"
  details: "Repairs pncp_licitacoes keyword search via /api/search/, cnes_saude 27-UF to IBGE codigo_uf normalization, datajud_processos Elasticsearch query (numeroProcesso 20-digit match vs query_string), and customMessage preservation in TimeoutError/ResourceNotFoundError/categorizeError."
---
# RUN-20261122-020104-tck-0045 - TCK-0045

## Resumo executivo

Execução completa da Etapa 1A (`TCK-0045`, `DES-0041`) no branch `fix/TCK-0045-live-e2e-contracts` (a partir de `main`, sem commit/push/merge):

1. **`pncp_licitacoes` (`lib/tools/government.ts` & `test/unit/pncp-app.test.ts`):**
   - Adicionada `const PNCP_SEARCH = PNCP_ORIGIN + "/api/search/"`.
   - Em `executePncp` (quando `args.modalidade_id === undefined`), consulta `PNCP_SEARCH` com `q`, `tipos_documento=edital`, `ordenacao=-data`, `pagina`, `tam_pagina=10`, `status=todos` e `orgao_cnpj` quando `pncpCnpj(cnpj_orgao)` é válido, preservando o envelope de sucesso e o fallback não-2xx.
   - Atualizada a asserção de URL em `test/unit/pncp-app.test.ts` e adicionado teste de `orgao_cnpj`.
2. **`cnes_saude` (`lib/tools/health.ts` & `test/unit/tools-company-health-osint-legal.test.ts`):**
   - Adicionado mapa `UF_TO_IBGE_CODE` com as 27 UFs brasileiras e normalização `normalizeCnesUf` (`[A-Za-z]{2}` mapeada -> código IBGE; caso contrário preserva o valor original, ex.: `"35"`).
   - Adicionado teste unitário validando `uf: "SP"` -> `codigo_uf=35`, `uf: "rj"` -> `codigo_uf=33` e preservação de `uf: "35"`.
3. **`datajud_processos` (`lib/tools/legal.ts`) & `lib/shared/errors.ts` & `test/unit/errors.test.ts`:**
   - Em `lib/tools/legal.ts`, substituído `{ match: { "_all": query } }` por `{ match: { numeroProcesso: digits } }` quando `digits.length === 20` ou `{ query_string: { query } }` nos demais casos.
   - Em `lib/shared/errors.ts`, adicionado `customMessage?: string` em `TimeoutError(operation, timeoutMs, customMessage)` e `ResourceNotFoundError(resource, identifier, customMessage)` preservando as mensagens padrão quando omitido, e atualizado `categorizeError(error)` para repassar `error.message` como 3º argumento.
   - Nota de teste (`test/unit/errors.test.ts:L250`): no teste `formatErrorResponse > should format generic error` (que passa `new Error("API timeout")`), a asserção legada `toContain("timed out")` (que dependia do descarte antigo de `error.message` para `"Operation 'operation' timed out after 30000ms"`) foi ajustada para `toBe("API timeout")`, e novos testes de `customMessage` foram adicionados para `TimeoutError`, `ResourceNotFoundError` e `categorizeError`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npm run build && npm run build:worker` | Exit `0` | Exit `0` | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit `0` | Exit `0` | PASS |
| `npm test` (`vitest run`) | Pass 100% | `39 passed (39)`, `540 passed (540)` | PASS |
| `npm run test:transport` | stdio + HTTP/SSE (`29` tools, `5` MCP Apps) | `101` chamadas stdio ok, HTTP/SSE `29 tools` + `5` Apps ok | PASS |
| `criteria-check.py --ticket TCK-0045 --json` | `4/4` pass | `4/4` pass | PASS |
| `secret-scan.sh` (arquivos modificados/criados) | Exit `0` | `No secrets detected.` | PASS |

## Live E2E (`StdioClientTransport` -> `build/lib/bin/mcp-dadosbr.js`)

1. **`pncp_licitacoes({ query: "computador" })`:**
   - `isError`: `false` (`elapsedMs`: `344` no resumo / `1139` na captura bruta)
   - `source`: `"Portal Nacional de Contratações Públicas (PNCP)"`, `legal_basis`: `"Lei 14.133/2021"`
   - `results.total`: `79160`, `results.items.length`: `10`
   - Primeiro item observado:
     `{"numero_controle_pncp":"00348003000110-1-001796/2026","title":"Aviso de Contratação Direta nº 51/2026","orgao_cnpj":"00348003000110","uf":"AL"}`
2. **`cnes_saude({ tipo: "estabelecimento", uf: "SP" })`:**
   - `isError`: `false` (`elapsedMs`: `272` no resumo / `210` na captura bruta)
   - `source`: `"CNES — DataSUS"`
   - `results.estabelecimentos.length`: `10`
   - Primeiro item observado:
     `{"codigo_cnes":3204,"nome_razao_social":"ARVP CLINICA ODONTOLOGICA LTDA","codigo_uf":35,"codigo_municipio":351880}`
