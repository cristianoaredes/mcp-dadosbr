---
status: completed
run_id: RUN-20261120-162809-ssrf-overrides-smithery-fipe
ticket: TCK-0014
design: DES-0014
start_time: 2026-11-20T16:28:09Z
end_time: 2026-11-20T16:32:46Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/config/index.ts
  - lib/adapters/smithery.ts
  - lib/tools/financial.ts
  - test/unit/config.test.ts
  - test/unit/smithery-fipe-security.test.ts
  - .archagents/07-security-compliance.md
test_result:
  status: pass
  summary: "32/32 testes SSRF/Smithery/FIPE (config.test.ts + smithery-fipe-security.test.ts), 315/315 Vitest (19 arquivos), tsc + tsc.worker TYPECHECK_OK, npm run build + build:worker BUILD_OK, git diff --check e secret-scan.sh limpos"
---
# RUN-20261120-162809-ssrf-overrides-smithery-fipe - TCK-0014

## Resumo executivo

- Endurecida a proteção SSRF em `lib/config/index.ts`: extraído `validateAndNormalizeApiConfig` aplicado tanto em `loadApiConfiguration()` quanto em `resolveApiConfig(overrides)` (com merge explícito preservando `base` quando override é `undefined` e rejeitando URLs inválidas/maliciosas antes de retornar `authHeaders`).
- Removidos `"localhost"` e `"127.0.0.1"` de `ALLOWED_CNPJ_HOSTS` e `ALLOWED_CEP_HOSTS`; adicionado `isLocalhostAllowed()` liberando loopback exato via HTTP/HTTPS exclusivamente quando `NODE_ENV === "development" || "test"` (fail-closed em `"production"` ou quando `NODE_ENV` está ausente, como no Worker Cloudflare), bloqueando subdomínios `.localhost`/`.127.0.0.1`, `[::1]` e `file://`.
- Adicionada rejeição de credenciais embutidas (`parsed.username || parsed.password`) em `validateUrl()` e sanitização de URL em logs e mensagens de erro (`sanitizeUrlForLog`).
- Alinhado `lib/adapters/smithery.ts` aos defaults allowlisted (`DEFAULT_CNPJ_URL` = `https://api.opencnpj.org/`, `DEFAULT_CEP_URL` = `https://opencep.com/v1/`) e `.refine(isAllowedCnpjUrl / isAllowedCepUrl)` no `configSchema` (além da validação em `resolveApiConfig(config)` dentro de `createServer`).
- Validados `tipo` (`ALLOWED_FIPE_TYPES`: `carros`, `motos`, `caminhoes`) e `codigo_fipe` (`FIPE_CODE_REGEX` `/^[0-9]+(?:-[0-9]+)?$/`) com `encodeURIComponent` em `lib/tools/financial.ts` (`executeFipe`), bloqueando path traversal e query smuggling antes de `httpJson`.
- Expandido `test/unit/config.test.ts` (corrigido também snapshot `originalEnv` em `afterEach`), criado `test/unit/smithery-fipe-security.test.ts` e atualizado `.archagents/07-security-compliance.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/config.test.ts test/unit/smithery-fipe-security.test.ts` | All passed | 2 arquivos, 32/32 passed (327 ms) | PASS |
| `npm test` | All tests pass | 19 arquivos, 315/315 passed (3.56 s) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `git diff --check && bash secret-scan.sh .` | Exit 0, zero segredos | Exit 0, limpo | PASS |

## Matriz de Controles (`DES-0014` Threat Model)

| Threat ID | Recurso | Implementação | Evidência / Teste | Risco residual |
|---|---|---|---|---|
| `T1` | `resolveApiConfig(overrides)` | `validateAndNormalizeApiConfig(merged)` valida e normaliza `cnpjBaseUrl`/`cepBaseUrl` pós-merge | `test/unit/config.test.ts` (`resolveApiConfig Overrides SSRF Protection`) | Baixo; qualquer caller em runtime passa pela função |
| `T2` | `lib/adapters/smithery.ts` | `DEFAULT_CNPJ_URL`/`DEFAULT_CEP_URL`, `.refine(isAllowed*)` em `configSchema` e `resolveApiConfig(config)` em `createServer` | `test/unit/smithery-fipe-security.test.ts` (`Smithery SSRF & ConfigSchema Hardening`) | Runtime hospedado Smithery fica **a confirmar** externamente |
| `T3` | Loopback & subdomínios | `DEV_LOCALHOST_HOSTS` separado da allowlist, `isLocalhostAllowed()` só true em `development`/`test` e `http:`/`https:` | `test/unit/config.test.ts` (`Loopback Environment & Subdomain Restrictions`) | Resolução DNS dinâmica em hosts públicos allowlisted fora do escopo |
| `T4` | Credenciais embutidas na URL | Bloqueio `parsed.username \|\| parsed.password` + `sanitizeUrlForLog` em erros/logs | `test/unit/config.test.ts` (`Embedded Credentials Rejection & Log Sanitization`) | N/A |
| `T5` | `fipe_veiculos` (`executeFipe`) | `ALLOWED_FIPE_TYPES`, `FIPE_CODE_REGEX` e `encodeURIComponent` antes de `httpJson` | `test/unit/smithery-fipe-security.test.ts` (`fipe_veiculos Path Traversal & Input Validation`) | N/A |
