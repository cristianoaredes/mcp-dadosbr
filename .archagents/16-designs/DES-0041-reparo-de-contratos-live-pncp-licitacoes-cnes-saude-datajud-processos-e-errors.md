---
id: DES-0041
slug: reparo-de-contratos-live-pncp-licitacoes-cnes-saude-datajud-processos-e-errors
title: "Reparo de contratos live pncp_licitacoes, cnes_saude, datajud_processos e errors"
created_at: 2026-11-22T02:00:37Z
status: approved
ticket: TCK-0045
type: design
scope_files_new: []
scope_files_modified:
  - lib/tools/government.ts
  - lib/tools/health.ts
  - lib/tools/legal.ts
  - lib/shared/errors.ts
  - test/unit/pncp-app.test.ts
  - test/unit/tools-company-health-osint-legal.test.ts
  - test/unit/errors.test.ts
  - .archagents/05-integrations.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0041-playbook.md
acceptance_delta: unchanged
---
# DES-0041 - Reparo de contratos live pncp_licitacoes, cnes_saude, datajud_processos e errors

## Problema

Testes live E2E revelaram 3 quebras de contrato com APIs públicas e 1 perda de diagnóstico de erro no MCP Server:
1. `pncp_licitacoes` (`lib/tools/government.ts`) sem `modalidade_id` consultava `PNCP_PUBLICACOES` (`/api/consulta/v1/contratacoes/publicacao`) com parâmetros incompatíveis (`q`, `tamanhoPagina`, `cnpjOrgao`), recebendo HTTP 400 na API live e caindo no fallback.
2. `cnes_saude` (`lib/tools/health.ts`) encaminhava `uf` diretamente para `codigo_uf` sem converter siglas de 2 letras (`"SP"`) para o código IBGE (`"35"`).
3. `datajud_processos` (`lib/tools/legal.ts`) enviava `{ match: { "_all": query } }`, campo `_all` removido no Elasticsearch do Datajud CNJ.
4. `lib/shared/errors.ts` descartava `error.message` em `categorizeError()` ao construir `TimeoutError("operation", 30000)` e `ResourceNotFoundError("resource", "unknown")`.

## Solucao

1. **`pncp_licitacoes` (`lib/tools/government.ts` & `test/unit/pncp-app.test.ts`):**
   - Definir `const PNCP_SEARCH = PNCP_ORIGIN + "/api/search/";`.
   - Quando `args.modalidade_id === undefined`, consultar `PNCP_SEARCH` com `URLSearchParams({ q: query, tipos_documento: "edital", ordenacao: "-data", pagina: String(pagina), tam_pagina: "10", status: "todos" })`, adicionando `orgao_cnpj` se `pncpCnpj(cnpj_orgao)` retornar CNPJ válido.
   - Preservar exatamente o envelope de sucesso `{ query, results: result.data, source: PNCP_SOURCE, legal_basis: "Lei 14.133/2021" }` e fallback não-2xx `{ query, note: "PNCP API may be temporarily unavailable.", search_url: ... }`.
   - Atualizar `test/unit/pncp-app.test.ts` (~L66) para validar a nova URL `/api/search/` e testar `orgao_cnpj`.
2. **`cnes_saude` (`lib/tools/health.ts` & `test/unit/tools-company-health-osint-legal.test.ts`):**
   - Definir `UF_TO_IBGE_CODE` com todas as 27 UFs (`AC:"12"`, ..., `SP:"35"`, ...).
   - Se `uf` tiver 2 letras `[A-Za-z]{2}` mapeadas no dicionário (case-insensitive), enviar o código IBGE em `codigo_uf`; caso contrário manter o valor original (ex.: `"35"`).
   - Adicionar teste unitário em `test/unit/tools-company-health-osint-legal.test.ts` validando `uf: "SP"` -> `codigo_uf=35` e compatibilidade com `uf: "35"`.
3. **`datajud_processos` (`lib/tools/legal.ts`) & `lib/shared/errors.ts` & `test/unit/errors.test.ts`:**
   - Em `lib/tools/legal.ts`, calcular `const digits = query.replace(/\D/g, "")` e `const esQuery = digits.length === 20 ? { match: { numeroProcesso: digits } } : { query_string: { query } }`, enviando `{ query: esQuery, size: tamanho }`.
   - Em `lib/shared/errors.ts`, adicionar `customMessage?: string` opcional em `TimeoutError(operation, timeoutMs, customMessage)` e `ResourceNotFoundError(resource, identifier, customMessage)` mantendo a mensagem padrão quando omitido; em `categorizeError(error)`, passar `error.message` como 3º argumento em ambos.
   - Atualizar a asserção legada em `test/unit/errors.test.ts` L234 (`formatErrorResponse(new Error("API timeout"))` passa a preservar `"API timeout"` em vez de sobrescrever para `"Operation 'operation' timed out after 30000ms"`) e adicionar testes dedicados de `customMessage` em `TimeoutError`, `ResourceNotFoundError` e `categorizeError`.

## Mudancas

- Código e testes restritos aos 7 arquivos declarados em `scope_files_modified` + atualização de `.archagents/05-integrations.md`.
- Nota sobre IDs: `cbctl.py` alocou `TCK-0045` (próximo após `TCK-0044`) e `DES-0041` (próximo após `DES-0040`, sequência monotônica).

## Criterios de sucesso

- [ ] `npm run build && npm run build:worker && npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` passam.
- [ ] `npx vitest run` e `npm run test:transport` passam 100%.
- [ ] Chamada live E2E via `StdioClientTransport` em `build/lib/bin/mcp-dadosbr.js` retorna resultados válidos para `pncp_licitacoes({ query: "computador" })` e `cnes_saude({ tipo: "estabelecimento", uf: "SP" })`.
- [ ] `secret-scan.sh` passa sem alertas.
