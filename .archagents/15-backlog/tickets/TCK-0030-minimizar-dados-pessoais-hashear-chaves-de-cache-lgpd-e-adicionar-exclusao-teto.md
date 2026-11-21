---
id: TCK-0030
slug: minimizar-dados-pessoais-hashear-chaves-de-cache-lgpd-e-adicionar-exclusao-teto
title: "Minimizar dados pessoais, hashear chaves de cache LGPD e adicionar exclusao/teto TTL"
source: audit
created_at: 2026-11-21T13:09:39Z
created_by: ops
updated_at: 2026-11-21T13:09:39Z
status: raw
severity: high
category: compliance-br
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0015
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
# TCK-0030 - Minimizar dados pessoais, hashear chaves de cache LGPD e adicionar exclusao/teto TTL

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0015`** (`compliance-br`, `high`).

**Problema:** Chaves de cache de lookup/busca e consultas penais ou com CPF/nome são derivadas sem hash SHA-256, não há teto rígido configurado para `MCP_CACHE_TTL`, a interface `Cache`/`KVCache` não expõe método `delete(key)` para eliminação sob demanda (LGPD) e `cnpj_lookup` não oferece opção de minimização de QSA/contatos.

**Evidências (`a3a2e12`):**
- `lib/core/lookup.ts:L63-L76`
- `lib/tools/government.ts:L187-L206`
- `lib/tools/legal.ts:L40,L59,L100,L109,L139,L160,L205,L376-L378,L462,L472`
- `lib/tools/health.ts:L24,L33`
- `lib/core/search.ts:L24,L71-L73`
- `lib/core/cache.ts:L37-L52,L178-L181`
- `lib/config/index.ts:L199`
- `lib/types/index.ts:L59-L72`

**Mitigação sugerida:**
- Aplicar hash SHA-256 nas chaves de cache contendo CPF, nome ou query sensível.
- Adotar TTL curto ou bypass de cache para consultas penais e com CPF (`bnmp_mandados`, `procurados_lookup`, `servidores`).
- Impor teto máximo validado em `MCP_CACHE_TTL` (`lib/config/index.ts`).
- Adicionar `delete(key)` na interface `Cache`/`KVCache` (`lib/types/index.ts`, `lib/core/cache.ts`).
- Disponibilizar opção de minimização de QSA/contatos em `cnpj_lookup`.

## Falsificador

Antes do fix, `lib/core/lookup.ts:L63-L76`, `lib/tools/legal.ts:L376-L378`, `lib/core/search.ts:L71-L73`, `lib/core/cache.ts:L37-L52,L178-L181`, `lib/config/index.ts:L199` e `lib/types/index.ts:L59-L72` geram chaves de cache sem hash SHA-256 para consultas pessoais, não implementam `Cache.delete(key)` nem teto de `MCP_CACHE_TTL`, e não minimizam QSA/contatos em `cnpj_lookup`. Um teste unitário falha se uma chave de cache expuser CPF/nome em texto claro, se `Cache`/`KVCache` não implementar `delete(key)` ou se `MCP_CACHE_TTL` aceitar valores acima do teto.

## Log de transicoes

- 2026-11-21T13:09:39Z - **raw** - criado via scripts/ops/ticket/create.py.
