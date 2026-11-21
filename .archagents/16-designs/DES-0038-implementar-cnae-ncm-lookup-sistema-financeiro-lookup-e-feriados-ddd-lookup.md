---
id: DES-0038
slug: implementar-cnae-ncm-lookup-sistema-financeiro-lookup-e-feriados-ddd-lookup
title: "Implementar cnae_ncm_lookup, sistema_financeiro_lookup e feriados_ddd_lookup"
created_at: 2026-11-21T16:24:39Z
status: approved
ticket: TCK-0042
type: design
scope_files_new:
  - lib/shared/fiscal-banking-schemas.ts
  - lib/tools/fiscal-banking.ts
  - test/unit/fiscal-banking-v070.test.ts
scope_files_modified: []
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0038-playbook.md
acceptance_delta: unchanged
---
# DES-0038 - Implementar cnae_ncm_lookup, sistema_financeiro_lookup e feriados_ddd_lookup

## Problema

Consultas transversais de classificação econômica (`CNAE` IBGE `v2`, `NCM` BrasilAPI), validação bancária/Pix/CVM (`banks/v1`, `pix/v1/participants`, `cvm/corretoras/v1`) e calendário/DDD (`feriados/v1`, `ddd/v1`) faltam no `mcp-dadosbr` para validar notas fiscais, fornecedores de CEAP e consistência cadastral sem API key.

## Solucao

1. **`lib/shared/fiscal-banking-schemas.ts` (somente `zod`, sem `node:*`):**
   - `CnaeNcmSchema`, `SistemaFinanceiroSchema` e `FeriadosDddSchema` com `.strict()`, bounds explícitos (`limit <= 50`, `page <= 1000`, regex estritos em `codigo`, `ispb`, `ddd`, `data`, `uf_esperada`).
2. **`lib/tools/fiscal-banking.ts`:**
   - `executeCnaeNcm`: para `tipo=cnae` por código (2, 3, 4-5 ou 7 dígitos normalizados) consulta `/divisoes`, `/grupos`, `/classes` ou `/subclasses` em `servicodados.ibge.gov.br/api/v2/cnae`; por termo consulta lista paginada. Para `tipo=ncm`, consulta `brasilapi.com.br/api/ncm/v1/{codigo}` ou `brasilapi.com.br/api/ncm/v1?search={termo}` paginado.
   - `executeSistemaFinanceiro`: `bancos` (`banks/v1`), `pix` (`pix/v1/participants` ~180 KB cacheado + filtro por `ispb`/`busca` + paginação default 25, max 50), `corretoras` (`cvm/corretoras/v1/{cnpj}` ou lista `cvm/corretoras/v1` ~192 KB cacheada + filtro `status`/`busca` + paginação).
   - `executeFeriadosDdd`: `feriados` (`feriados/v1/{ano}` com verificação `is_holiday` quando `data` YYYY-MM-DD é fornecida); `ddd` (`ddd/v1/{ddd}` com `uf_matches` quando `uf_esperada` é fornecida).
   - Exporta `registerFiscalBankingTools()` (idempotente via `hasTool`) sem auto-executar top-level na Wave 1.

## Threat Model

- **Exaustão de contexto / DoS:** listas Pix (~180 KB) e Corretoras (~192 KB) são filtradas e paginadas (`limit <= 50`) antes da serialização MCP.
- **Injection / Path traversal:** códigos, datas (`YYYY-MM-DD`), DDD (`\d{2}`), ISPB (`\d{8}`) e UF (`[A-Za-z]{2}`) passam por regex Zod + `encodeURIComponent`.
- **Prompt Injection:** textos externos são higienizados com `sanitizeUntrustedText` e acompanhados de `UNTRUSTED_EXTERNAL_DATA_NOTICE`.
- **Worker parity:** zero imports `node:*`.

## Mudancas

- Novos: `lib/shared/fiscal-banking-schemas.ts`, `lib/tools/fiscal-banking.ts`, `test/unit/fiscal-banking-v070.test.ts`

## Criterios de sucesso

- [ ] `npx vitest run test/unit/fiscal-banking-v070.test.ts` passa cobrindo todos os modos, paginação, validações e erros.
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` passa sem erros.
- [ ] `registerFiscalBankingTools` exportada corretamente sem alterar `TOOL_DEFINITIONS` durante Wave 1.
