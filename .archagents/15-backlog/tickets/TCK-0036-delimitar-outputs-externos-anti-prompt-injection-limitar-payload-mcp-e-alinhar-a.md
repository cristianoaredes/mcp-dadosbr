---
id: TCK-0036
slug: delimitar-outputs-externos-anti-prompt-injection-limitar-payload-mcp-e-alinhar-a
title: "Delimitar outputs externos anti-prompt-injection, limitar payload MCP e alinhar allowlist"
source: audit
created_at: 2026-11-21T13:09:43Z
created_by: ops
updated_at: 2026-11-21T14:02:29Z
status: done
severity: medium
category: agentic-security
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0021
linked_designs:
  - DES-0031
linked_runs:
  - RUN-20261121-134527-tck-0036
linked_verifications:
  - VER-20261121-135930-tck-0036
linked_docs:
  - .archagents/mcp-tool-allowlist.json
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/agentic-security.test.ts test/unit/search.test.ts test/unit/legal-timeouts-intelligence.test.ts test/unit/tools-company-health-osint-legal.test.ts test/unit/tool-validation-allowlist.test.ts test/unit/worker-rest-cloudflare.test.ts && echo AGENTIC_TESTS_OK"
    expect: AGENTIC_TESTS_OK
  - check: "npm run test && echo FULL_TESTS_OK"
    expect: FULL_TESTS_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
  - check: "node -e \"const fs=require('fs');const a=JSON.parse(fs.readFileSync('.archagents/mcp-tool-allowlist.json','utf8'));const e=a.entries.find(x=>x.name==='cnpj_intelligence');if(!e||!e.rationale.includes('20 queries'))process.exit(1);console.log('ALLOWLIST_ALIGNED');\""
    expect: ALLOWLIST_ALIGNED
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-21T13:44:56Z
---
# TCK-0036 - Delimitar outputs externos anti-prompt-injection, limitar payload MCP e alinhar allowlist

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0021`** (`agentic-security`, `medium`).

**Problema:** Outputs externos (snippets web/HTML de busca/legal) e o campo `context` em `strategic_osint_prompt` não são encapsulados com delimitadores anti-prompt-injection de conteúdo não confiável; respostas de tools em `mcp-server.ts` e `cloudflare.ts` não possuem teto/truncamento uniforme de payload; e `.archagents/mcp-tool-allowlist.json:L56` diverge de `lib/core/tool-schemas.ts:L59` (`10` vs `20` queries).

**Evidências (`a3a2e12`):**
- `lib/core/search-providers.ts:L96-L105,L209-L223`
- `lib/tools/legal.ts:L221-L237`
- `lib/tools/osint.ts:L95-L114`
- `lib/core/mcp-server.ts:L212-L220`
- `lib/adapters/cloudflare.ts:L290-L302`
- `.archagents/mcp-tool-allowlist.json:L56` vs `lib/core/tool-schemas.ts:L59`

**Mitigação sugerida:**
- Encapsular snippets externos/HTML e `context` em `strategic_osint_prompt` com delimitadores explícitos de dado não confiável anti-prompt-injection.
- Impor teto máximo e truncamento de payload de saída em `mcp-server.ts` e `cloudflare.ts`.
- Alinhar `.archagents/mcp-tool-allowlist.json:L56` ao limite vigente em `lib/core/tool-schemas.ts:L59` (`20` queries).

## Falsificador

Antes do fix, `lib/core/search-providers.ts:L96-L105,L209-L223`, `lib/tools/legal.ts:L221-L237` e `lib/tools/osint.ts:L95-L114` não delimitam outputs/contextos não confiáveis, `lib/core/mcp-server.ts:L212-L220` e `lib/adapters/cloudflare.ts:L290-L302` não aplicam limite/truncamento de saída e `.archagents/mcp-tool-allowlist.json:L56` diverge de `lib/core/tool-schemas.ts:L59`.

## Log de transicoes

- 2026-11-21T13:09:43Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T13:44:56Z - **triaged** - triaged in wave 1 parallel remediation [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-21T13:45:27Z - **designed** - DES-0031 created
- 2026-11-21T13:45:34Z - **executing** - executing TCK-0036
- 2026-11-21T13:50:55Z - **verifying** - DES-0031 implemented and verified in RUN-20261121-134527-tck-0036
- 2026-11-21T14:02:29Z - **done** - P10 verify approved-with-notes (8147006d) + judge pass
