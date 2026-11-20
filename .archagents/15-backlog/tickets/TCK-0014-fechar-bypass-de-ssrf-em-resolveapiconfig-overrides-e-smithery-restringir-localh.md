---
id: TCK-0014
slug: fechar-bypass-de-ssrf-em-resolveapiconfig-overrides-e-smithery-restringir-localh
title: "Fechar bypass de SSRF em resolveApiConfig(overrides) e Smithery, restringir localhost e validar tipo em fipe_veiculos"
source: audit
created_at: 2026-11-20T15:16:12Z
created_by: ops
updated_at: 2026-11-20T16:39:23Z
status: done
severity: high
category: security
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0002
linked_designs:
  - DES-0014
linked_runs:
  - RUN-20261120-162809-ssrf-overrides-smithery-fipe
linked_verifications:
  - VER-20261120-163838-tck-0014
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "npx vitest run test/unit/config.test.ts test/unit/smithery-fipe-security.test.ts"
    expect: passed
    note: "Unit and security tests for SSRF overrides, loopback restriction, embedded credentials, Smithery allowlist, and FIPE tipo validation"
  - check: "npm test && npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
    note: "Full test suite and Node + Worker TypeScript typechecks pass without regressions"
  - check: "node -e 'const fs=require(\"fs\"); const c=fs.readFileSync(\"lib/config/index.ts\",\"utf8\"); const s=fs.readFileSync(\"lib/adapters/smithery.ts\",\"utf8\"); const f=fs.readFileSync(\"lib/tools/financial.ts\",\"utf8\"); if(!c.includes(\"validateAndNormalizeApiConfig\")||!c.includes(\"parsed.username\")||s.includes(\"https://opencnpj.org/api/v1\")||!f.includes(\"ALLOWED_FIPE_TYPES\")) process.exit(1); console.log(\"SSRF_CHECKS_OK\");'"
    expect: SSRF_CHECKS_OK
    note: "Code enforces URL validation in resolveApiConfig(overrides), aligns smithery.ts default/allowlist, and enforces ALLOWED_FIPE_TYPES in executeFipe"
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-20T16:27:12Z
---
# TCK-0014 - Fechar bypass de SSRF em resolveApiConfig(overrides) e Smithery, restringir localhost e validar tipo em fipe_veiculos

## Contexto

Originado por **FND-0002** (`security` / `high`, auditoria na revisão `6c74db6`).

- **Evidências:** `lib/config/index.ts:L17-L35`, `lib/config/index.ts:L48-L57`, `lib/config/index.ts:L149-L163`, `lib/adapters/smithery.ts:L8-L35`, `lib/tools/financial.ts:L81-L83`.
- **Problema:** `resolveApiConfig(overrides)` não reexecuta `validateUrl()` nem `normalizeBaseUrl()` sobre URLs sobrescritas (permitindo SSRF com envio de `authHeaders`), `smithery.ts` aceita qualquer `z.string().url()` (com default `https://opencnpj.org/api/v1` fora da allowlist), `localhost`/`127.0.0.1` e `.localhost` são aceitos sem checagem de ambiente nem bloqueio de credenciais embutidas, e `executeFipe` interpola `tipo` sem allowlist/encoding.
- **Mitigação:** Revalidar/normalizar URLs em `resolveApiConfig(overrides)`, alinhar `smithery.ts` à allowlist/default de `lib/config/index.ts`, restringir `localhost`/`127.0.0.1` a dev e rejeitar `username`/`password` na URL, e validar `tipo` contra allowlist em `executeFipe`.

## Falsificador

Evidências verificáveis no código antes do fix (`HEAD` `5414f6e` / base `4199d0a`):
- `lib/config/index.ts:L149-L163`: `resolveApiConfig({ cnpjBaseUrl: "https://169.254.169.254/latest/meta-data" })` retorna sem validar URL nem normalizar `/` final, preservando `authHeaders`.
- `lib/config/index.ts:L24-L25,L33-L34,L48-L57`: `ALLOWED_CNPJ_HOSTS`/`ALLOWED_CEP_HOSTS` incluem `"localhost"` e `"127.0.0.1"` sem checar `NODE_ENV`, permitem subdomínios `.localhost`/`.127.0.0.1`, e `validateUrl` não rejeita `parsed.username || parsed.password`.
- `lib/adapters/smithery.ts:L14,L35`: `configSchema` define default `"https://opencnpj.org/api/v1"` (fora de `ALLOWED_CNPJ_HOSTS`) e aceita qualquer `.url()`, permitindo SSRF via `createServer({ config: { cnpjBaseUrl: "https://169.254.169.254/" } })`.
- `lib/tools/financial.ts:L81-L83`: `executeFipe({ tipo: "../../cnpj/v1/11222333000181" })` interpola `tipo` diretamente em `${FIPE_API}/marcas/v1/${tipo}` sem allowlist nem encoding.
- **Comando falsificador:** `npx vitest run test/unit/config.test.ts test/unit/smithery-fipe-security.test.ts` (testes de bypass em `overrides`, loopback em prod/unset, credenciais embutidas, Smithery e FIPE path traversal reprovam antes do fix).

## Log de transicoes

- 2026-11-20T15:16:12Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-20T16:27:12Z - **triaged** - Triagem de FND-0002 (SSRF overrides/Smithery, loopback/userinfo, FIPE path traversal) com critérios verificáveis [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-20T16:27:52Z - **linked** - links updated
- 2026-11-20T16:27:52Z - **designed** - DES-0014 (Threat Model T1-T5) e playbook de 4 passos aprovados em L3
- 2026-11-20T16:27:52Z - **executing** - Iniciando implementacao de DES-0014 em branch bugfix/TCK-0014-ssrf-overrides-smithery-fipe ()
- 2026-11-20T16:28:09Z - **linked** - links updated
- 2026-11-20T16:33:36Z - **verifying** - Implementacao, testes unitarios/negativos e builds concluidos; iniciando verify adversarial independente
- 2026-11-20T16:39:23Z - **done** - Verify adversarial independente aprovado (VER-20261120-163838-tck-0014) e judge verdict aprovado (safety 100)
