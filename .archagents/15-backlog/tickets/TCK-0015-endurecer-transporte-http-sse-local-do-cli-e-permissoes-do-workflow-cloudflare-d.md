---
id: TCK-0015
slug: endurecer-transporte-http-sse-local-do-cli-e-permissoes-do-workflow-cloudflare-d
title: "Endurecer transporte HTTP/SSE local do CLI e permissoes do workflow cloudflare-deploy.yml"
source: audit
created_at: 2026-11-20T15:16:13Z
created_by: ops
updated_at: 2026-11-20T18:40:18Z
status: done
severity: medium
category: security
effort: S
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0003
linked_designs:
  - DES-0020
linked_runs:
  - RUN-20261120-183209-tck-0015
linked_verifications:
  - VER-20261120-183648-tck-0015
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/cli-http-security.test.ts"
    expect: passed
  - check: "npm test"
    expect: passed
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && npm run build && npm run build:worker && npm run test:transport && echo FULL_VERIFY_OK"
    expect: FULL_VERIFY_OK
depth_decision:
  workflow: inline
  design: skip
  verify: lightweight
  source: routing-classifier
  classified_at: 2026-11-20T18:31:23Z
---
# TCK-0015 - Endurecer transporte HTTP/SSE local do CLI e permissoes do workflow cloudflare-deploy.yml

## Contexto

Originado por **FND-0003** (`security` / `medium`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/adapters/cli.ts:L82-L90`, `lib/adapters/cli.ts:L133`, `lib/adapters/cli.ts:L176`, `lib/adapters/cli.ts:L206-L225`, `lib/adapters/cli.ts:L234-L239`, `.github/workflows/cloudflare-deploy.yml:L27-L36`.
- **Problema:** O modo HTTP/SSE do CLI escuta em `0.0.0.0`/`::`, envia CORS `*`, não valida `Host`/`Origin` nem headers defensivos (`x-powered-by` ativo), indexa `transports` em objeto simples `{}` por `req.query.sessionId` sem teto de sessões, e `cloudflare-deploy.yml` omite `permissions:` e `persist-credentials: false`.
- **Mitigação:** Fazer bind padrão em `127.0.0.1` (configurável), validar `Host`/`Origin`, restringir CORS e adicionar headers defensivos; trocar `transports` para `Map` com teto de sessões e validação de `sessionId`; declarar `permissions: { contents: read }` e `persist-credentials: false` em `cloudflare-deploy.yml`.

## Falsificador

Evidências verificáveis no commit base `c4bbd4f` antes do fix:
- `lib/adapters/cli.ts:L82-L90,L234-L239`: `app.listen(port)` sem host faz bind em `0.0.0.0`/`::`; middleware CORS envia `Access-Control-Allow-Origin: *`, não valida headers `Host` ou `Origin` contra DNS rebinding/CSRF, não define `X-Content-Type-Options`/`X-Frame-Options`/`CSP`/`Referrer-Policy` e mantém `x-powered-by` ativo.
- `lib/adapters/cli.ts:L133,L176,L206-L225`: `const transports: Record<string, TransportSession> = {}` indexa diretamente por `req.query.sessionId as string` sem validar formato/tipo (permitindo chaves de protótipo como `toString`/`constructor`) e sem teto de sessões SSE simultâneas.
- `.github/workflows/cloudflare-deploy.yml:L27-L36`: workflow omite bloco top-level `permissions:` de menor privilégio (`contents: read`) e `persist-credentials: false` em `actions/checkout@v4`.
- **Comando falsificador:** `npx vitest run test/unit/cli-http-security.test.ts` (reprova antes do fix porque o CLI faz bind em `0.0.0.0`, aceita `Host`/`Origin` arbitrários, retorna CORS `*` sem headers defensivos, expõe protótipo em `transports`, não limita sessões SSE e `cloudflare-deploy.yml` carece de `permissions` e `persist-credentials: false`).

## Log de transicoes

- 2026-11-20T15:16:13Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T18:31:23Z - **noted** - body:falsifier (replace): Populate Falsificador evidence and repro command for TCK-0015
- 2026-11-20T18:31:23Z - **triaged** - Triagem de FND-0003 (hardening do transporte HTTP/SSE local do CLI e permissoes de cloudflare-deploy.yml) [aceite reescrito: 3 critério(s)] [depth_decision do routing-classifier: workflow inline, design skip, verify lightweight]
- 2026-11-20T18:32:08Z - **designed** - DES-0020 (Threat Model T1-T6) e playbook de 4 passos aprovados
- 2026-11-20T18:32:09Z - **executing** - Iniciando implementacao de DES-0020 em bugfix/TCK-0015-cli-http-hardening-cf-workflow-perms (RUN-20261120-183209-tck-0015)
- 2026-11-20T18:35:42Z - **verifying** - Implementacao, 7 novos testes adversariais, 382/382 suite completa, tsc/builds, test:transport e criteria-check 3/3 concluidos; iniciando verify adversarial independente
- 2026-11-20T18:40:18Z - **done** - Verify adversarial independente aprovado (VER-20261120-183648-tck-0015) e judge verdict aprovado
