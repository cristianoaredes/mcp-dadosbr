---
id: TCK-0021
slug: remover-dependencias-mortas-em-runtime-agents-smithery-sdk-workers-mcp-async-mut
title: "Remover dependencias mortas em runtime (agents, @smithery/sdk, workers-mcp, async-mutex), sanear CVEs prod e adicionar npm audit ao CI"
source: audit
created_at: 2026-11-20T15:16:19Z
created_by: ops
updated_at: 2026-11-20T18:04:38Z
status: done
severity: high
category: dependency
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0009
linked_designs:
  - DES-0019
linked_runs:
  - RUN-20261120-175542-tck-0021
linked_verifications:
  - VER-20261120-180400-tck-0021
linked_docs:
  - .archagents/06-infra-devops.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npm audit --omit=dev --audit-level=high && echo AUDIT_PROD_OK"
    expect: AUDIT_PROD_OK
  - check: "npm test"
    expect: passed
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport && echo FULL_VERIFY_OK"
    expect: FULL_VERIFY_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T17:54:56Z
---
# TCK-0021 - Remover dependencias mortas em runtime (agents, @smithery/sdk, workers-mcp, async-mutex), sanear CVEs prod e adicionar npm audit ao CI

## Contexto

Originado por **FND-0009** (`dependency` / `high`, auditoria na revisão `6c74db6`).

- **Evidências:** `package.json:L49-L58`, `package-lock.json`, `lib/workers/mcp-agent.ts:L6`, `wrangler.toml:L7-L9`, `.github/workflows/ci.yml:L18-L78`, `npm audit --omit=dev --json` (20 vulns: `0C / 14H / 2M / 4L`).
- **Problema:** 20 CVEs em dependências de produção (14 `high`, incluindo `zod`, `@smithery/sdk`, `agents`, `path-to-regexp`, `lodash`, `fast-uri`, `js-yaml`, `tmp`, `markdown-it`); `@smithery/sdk`, `workers-mcp`, `async-mutex` têm 0 imports e `agents` só serve ao arquivo morto `lib/workers/mcp-agent.ts` (`DadosBRMCP` removida em `wrangler.toml`); `ci.yml` não executa `npm audit`.
- **Mitigação:** Remover dependências de runtime não utilizadas (`agents`, `@smithery/sdk`, `workers-mcp`, `async-mutex`), atualizar pacotes vulneráveis em runtime (`zod`, `express` e lockfile) e adicionar `npm audit --omit=dev --audit-level=high` ao `ci.yml`.

## Falsificador

Evidências verificáveis no commit base `2f0e25c` antes do fix:
- `package.json:L82-L92` e `package-lock.json`: `dependencies` declara `@smithery/sdk`, `agents`, `async-mutex` e `workers-mcp` (todos sem uso vivo em runtime), além de `zod` (`^3.23.8` / `3.25.76` vulnerável) e `express` (`^5.0.1` puxando transitivas vulneráveis).
- `lib/workers/mcp-agent.ts:L6` e `wrangler.toml:L7-L9`: único import de `agents/mcp` encontra-se no arquivo morto `lib/workers/mcp-agent.ts` (`DadosBRMCP` explicitamente deletada em `wrangler.toml`).
- `.github/workflows/ci.yml:L18-L139`: jobs `test` e `lint` não executam `npm audit --omit=dev --audit-level=high`.
- **Comandos falsificadores:** `npm audit --omit=dev --audit-level=high` (falha antes do fix com 20 vulnerabilidades de produção: `0` critical, `14` high, `2` moderate, `4` low) e `npx vitest run test/unit/dependency-hygiene.test.ts` (verifica remoção das dependências mortas, remoção de `lib/workers/mcp-agent.ts` e gate no CI).

## Log de transicoes

- 2026-11-20T15:16:19Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T17:54:56Z - **noted** - body:falsifier (replace): Populate Falsificador evidence and repro command for TCK-0021
- 2026-11-20T17:54:56Z - **triaged** - Triagem de FND-0009 (remover dependencias mortas em runtime, atualizar zod/express e adicionar npm audit prod no CI) [aceite reescrito: 3 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T17:55:42Z - **designed** - DES-0019 (Supply-Chain Threat Model T1-T5) e playbook de 5 passos aprovados
- 2026-11-20T17:55:42Z - **executing** - Iniciando implementacao de DES-0019 em bugfix/TCK-0021-remove-dead-deps-prod-audit-ci (RUN-20261120-175542-tck-0021)
- 2026-11-20T17:59:48Z - **verifying** - Implementacao, 0 vulns prod, 375/375 testes, tsc/builds, test:transport, npm pack e criteria-check 3/3 concluidos; iniciando verify adversarial independente
- 2026-11-20T18:04:38Z - **done** - Verify adversarial independente aprovado (VER-20261120-180400-tck-0021) e judge verdict aprovado
