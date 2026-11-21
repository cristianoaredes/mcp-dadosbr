---
id: TCK-0032
slug: mascarar-clientip-em-logs-de-auth-rate-limit-e-corrigir-alegacao-lgpd-em-metrica
title: "Mascarar clientIp em logs de auth/rate-limit e corrigir alegacao LGPD em metricas.md"
source: audit
created_at: 2026-11-21T13:09:41Z
created_by: ops
updated_at: 2026-11-21T13:09:41Z
status: raw
severity: medium
category: compliance-br
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0017
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
---
# TCK-0032 - Mascarar clientIp em logs de auth/rate-limit e corrigir alegacao LGPD em metricas.md

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0017`** (`compliance-br`, `medium`).

**Problema:** Logs de autenticação e rate limiting registram `clientIp` sem mascaramento/pseudonimização obrigatória independente de `NODE_ENV`, e o documento `docs/pt-br/desenvolvimento/metricas.md` contém afirmação imprecisa de conformidade LGPD automática.

**Evidências (`a3a2e12`):**
- `lib/workers/auth.ts:L71-L84`
- `lib/adapters/cli-http.ts:L322-L327`
- `docs/pt-br/desenvolvimento/metricas.md:L11,L179-L183`
- `lib/infrastructure/logger.ts:L55-L108`
- `lib/shared/log-redaction.ts:L17-L32`

**Mitigação sugerida:**
- Mascarar/pseudonimizar `clientIp` em `lib/workers/auth.ts` e `lib/adapters/cli-http.ts` independentemente de `NODE_ENV`.
- Corrigir `docs/pt-br/desenvolvimento/metricas.md` removendo declaração falsa/exagerada de conformidade LGPD automática.

## Falsificador

Antes do fix, `lib/workers/auth.ts:L71-L84` e `lib/adapters/cli-http.ts:L322-L327` logam `clientIp` sem mascaramento incondicional a `NODE_ENV`, e `docs/pt-br/desenvolvimento/metricas.md:L11,L179-L183` mantém alegação incorreta de conformidade LGPD automática.

## Log de transicoes

- 2026-11-21T13:09:41Z - **raw** - criado via scripts/ops/ticket/create.py.
