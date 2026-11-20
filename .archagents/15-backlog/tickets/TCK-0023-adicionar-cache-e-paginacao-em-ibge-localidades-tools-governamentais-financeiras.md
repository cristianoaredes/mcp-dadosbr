---
id: TCK-0023
slug: adicionar-cache-e-paginacao-em-ibge-localidades-tools-governamentais-financeiras
title: "Adicionar cache e paginacao em ibge_localidades, tools governamentais/financeiras e otimizar raspagem de procurados_lookup"
source: audit
created_at: 2026-11-20T15:16:20Z
created_by: ops
updated_at: 2026-11-20T15:16:20Z
status: raw
severity: medium
category: performance
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0011
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/05-integrations.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
---
# TCK-0023 - Adicionar cache e paginacao em ibge_localidades, tools governamentais/financeiras e otimizar raspagem de procurados_lookup

## Contexto

Originado por **FND-0011** (`performance` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/tools/government.ts:L20-L38`, `lib/tools/government.ts:L46`, `lib/tools/government.ts:L75-L110`, `lib/tools/government.ts:L142-L192`, `lib/tools/government.ts:L225-L319`, `lib/tools/financial.ts:L16-L89`, `lib/tools/company.ts:L156-L160`, `lib/tools/legal.ts:L141-L161`.
- **Problema:** `ibge_localidades({ tipo: "municipios" })` retorna ~5.570 itens sem paginação nem cache; tools de `government.ts`, `financial.ts` e `legal.ts` ignoram o parâmetro `cache`; `company_deep_profile` bypassa `lookup()`/`cache`/`deduplicate`; `procurados_lookup` raspa 13 páginas sequencialmente sem cache.
- **Mitigação:** Adicionar paginação/filtro opcional em `ibge_localidades`, habilitar cache em tools de leitura e dados estáveis/semi-estáveis, reutilizar `lookup()` em `executeDeepProfile` e cachear/paralelizar com limite a lista de `procurados_lookup`.

## Falsificador

<!-- O que reprova ANTES do fix: o comando que fica vermelho hoje, ou
     `arquivo:linha` da evidência. Sem isto o ticket não fecha. -->

## Log de transicoes

- 2026-11-20T15:16:20Z - **raw** - criado via scripts/ops/ticket/create.py.
