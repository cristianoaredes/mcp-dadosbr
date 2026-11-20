---
status: completed
run_id: RUN-20261120-183209-tck-0015
ticket: TCK-0015
design: DES-0020
start_time: 2026-11-20T18:32:09Z
end_time: 2026-11-20T18:35:02Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/types/index.ts
  - lib/config/index.ts
  - lib/adapters/cli-http.ts
  - lib/adapters/cli.ts
  - .github/workflows/cloudflare-deploy.yml
  - test/unit/cli-http-security.test.ts
  - .archagents/06-infra-devops.md
  - .archagents/07-security-compliance.md
test_result:
  status: pass
  summary: "7/7 cli-http-security.test.ts, 382/382 Vitest (25 arquivos), tsc + tsc.worker TYPECHECK_OK, build + build:worker BUILD_OK, npm run test:transport PASS, criteria-check 3/3 pass"
---
# RUN-20261120-183209-tck-0015 - TCK-0015

## Resumo executivo

- Adicionado `httpHost?: string` em `ServerConfig` (`lib/types/index.ts`) carregado via `MCP_HTTP_HOST` (default `"127.0.0.1"`) em `lib/config/index.ts`.
- Criado `lib/adapters/cli-http.ts` (`createCliHttpApp`, validadores anti-DNS-rebinding `Host`, CORS sem `*` em `Origin`, headers defensivos `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `CSP`, `Referrer-Policy`, `x-powered-by` desabilitado, `express.json({ limit: "1mb" })`, `transports` em `Map` com validação de `sessionId` e teto `DEFAULT_MAX_SSE_SESSIONS = 100`, `.unref?.()` no monitor).
- Refatorado `lib/adapters/cli.ts` para usar `createCliHttpApp`, fazer bind explícito em `host` (default `127.0.0.1`), alertar em `stderr` se configurado para `0.0.0.0`/`::`, preservar a mensagem de log para `test:transport` e documentar novas envs no `--help`.
- Endurecido `.github/workflows/cloudflare-deploy.yml:L27-L41` com `permissions: { contents: read }` e `persist-credentials: false` em `actions/checkout@v4`.
- Adicionada suíte `test/unit/cli-http-security.test.ts` (`7` testes) e atualizadas `.archagents/06-infra-devops.md` e `.archagents/07-security-compliance.md`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `npx vitest run test/unit/cli-http-security.test.ts` | `passed` | 1 arquivo, **7/7** passed (`30ms`) | PASS |
| `npm test` | `passed` | **25/25** arquivos, **382/382** passed (`3.59s`) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` | Exit 0 (`TYPECHECK_OK`) | Exit 0 (`TYPECHECK_OK`) | PASS |
| `npm run build && npm run build:worker` | Exit 0 (`BUILD_OK`) | Exit 0 (`BUILD_OK`) | PASS |
| `npm run test:transport` | `PASS: both transports expose the expected catalogue` | `stdio` (`101` chamadas) + `HTTP/SSE` | PASS |
| `criteria-check.py --ticket TCK-0015 --json` | `verdict: pass` | 3/3 critérios pass | PASS |
