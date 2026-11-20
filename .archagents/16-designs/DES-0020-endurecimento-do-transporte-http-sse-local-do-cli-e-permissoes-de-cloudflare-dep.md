---
id: DES-0020
slug: endurecimento-do-transporte-http-sse-local-do-cli-e-permissoes-de-cloudflare-dep
title: "Endurecimento do transporte HTTP/SSE local do CLI e permissoes de cloudflare-deploy.yml"
created_at: 2026-11-20T18:31:23Z
status: approved
ticket: TCK-0015
type: design
scope_files_new:
  - lib/adapters/cli-http.ts
  - test/unit/cli-http-security.test.ts
scope_files_modified:
  - lib/types/index.ts
  - lib/config/index.ts
  - lib/adapters/cli.ts
  - .github/workflows/cloudflare-deploy.yml
  - .archagents/06-infra-devops.md
  - .archagents/07-security-compliance.md
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0020-playbook.md
acceptance_delta: unchanged
---
# DES-0020 - Endurecimento do transporte HTTP/SSE local do CLI e permissoes de cloudflare-deploy.yml

## Problema

O transporte `http` local do CLI (`lib/adapters/cli.ts`) faz bind implícito em `0.0.0.0`/`::`, responde `Access-Control-Allow-Origin: *`, não valida `Host` nem `Origin`, mantém `x-powered-by` ativo sem headers defensivos, armazena `transports` em objeto simples `{}` indexado por `req.query.sessionId as string` sem validação nem limite máximo de sessões, e `.github/workflows/cloudflare-deploy.yml` não declara `permissions:` de menor privilégio nem `persist-credentials: false`.

## Threat Model

| ID | Ameaça | Vetor | Contramedida |
|---|---|---|---|
| T1 | Exposição em rede local/pública | `app.listen(port)` sem host escuta em `0.0.0.0`/`::` | Default `MCP_HTTP_HOST=127.0.0.1` em `ServerConfig` / `cli.ts`, com aviso em `stderr` se configurado em `0.0.0.0`/`::` |
| T2 | DNS rebinding para acessar servidor local | Header `Host` arbitrário aceito pelo Express | `isAllowedCliHost` valida `Host` exato contra loopback / `bindHost` / `MCP_ALLOWED_HOSTS` -> `403` JSON |
| T3 | CSRF cross-origin via navegador | `Access-Control-Allow-Origin: *` em rotas SSE/POST | `isAllowedCliOrigin` exige loopback exato ou `MCP_ALLOWED_ORIGINS` explícito (ignorando `*`), reflete origem exata + `Vary: Origin`, `OPTIONS` `204`, `403` em origem não autorizada |
| T4 | Fingerprinting / MIME sniffing / clickjacking / body abuse | `x-powered-by` ativo, sem headers de segurança, `express.json()` sem limite explícito explícito | `app.disable("x-powered-by")`, `express.json({ limit: "1mb" })`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `Referrer-Policy` |
| T5 | Prototype lookup / DoS de memória em sessões SSE | `transports = {}` indexado por `req.query.sessionId as string` sem validação ou cap | `Map<string, TransportSession>`, `isValidSessionId` (`^[A-Za-z0-9_-]{1,128}$` -> `400`), cap `DEFAULT_MAX_SSE_SESSIONS = 100` (`503`) e `.unref?.()` no monitor |
| T6 | Escalação / vazamento de token em workflow CI/CD | `.github/workflows/cloudflare-deploy.yml` sem `permissions:` e com `persist-credentials` default | `permissions: { contents: read }` top-level e `persist-credentials: false` em `actions/checkout@v4` |

## Solucao

- Adicionar `httpHost?: string` em `ServerConfig` (`lib/types/index.ts`, opcional para compatibilidade com `cloudflare.ts`) carregado via `MCP_HTTP_HOST` (default `"127.0.0.1"`) em `lib/config/index.ts`.
- Extrair criação do app HTTP/SSE para `lib/adapters/cli-http.ts` (`createCliHttpApp`, validadores exportados e testáveis) mantendo execução CLI idêntica em `lib/adapters/cli.ts` e preservando a linha `"started on HTTP+SSE transport (port ${port})"` esperada por `test/integration/transports.mjs`.
- Endurecer `.github/workflows/cloudflare-deploy.yml` com `permissions: { contents: read }` e `persist-credentials: false`.

## Mudancas

- `lib/types/index.ts`, `lib/config/index.ts`, `lib/adapters/cli-http.ts` (novo), `lib/adapters/cli.ts`
- `.github/workflows/cloudflare-deploy.yml`
- `test/unit/cli-http-security.test.ts` (novo)
- `.archagents/06-infra-devops.md`, `.archagents/07-security-compliance.md`

## Criterios de sucesso

- [ ] `npx vitest run test/unit/cli-http-security.test.ts` passa todos os cenários adversariais.
- [ ] `npm test` passa sem regressões.
- [ ] `tsc`, `tsc.worker`, `build`, `build:worker` e `npm run test:transport` passam integralmente.
