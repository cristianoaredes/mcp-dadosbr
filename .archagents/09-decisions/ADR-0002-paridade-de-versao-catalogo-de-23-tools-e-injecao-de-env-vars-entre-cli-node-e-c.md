---
id: ADR-0002
title: "Paridade de versao, catalogo de 23 tools e injecao de env vars entre CLI Node e Cloudflare Worker"
status: accepted
date: 2026-11-20
deciders: codex
tickets:
  - TCK-0024
supersedes: []
---
# ADR-0002 - Paridade de versao, catalogo de 23 tools e injecao de env vars entre CLI Node e Cloudflare Worker

## Contexto

Na auditoria (`FND-0012` / `TCK-0024`), detectaram-se desvios entre o runtime Node CLI (`package.json` versão `0.6.0`, 23 tools registradas via `lib/tools/index.ts`, configuração por `process.env`) e o runtime Cloudflare Workers (`lib/adapters/cloudflare.ts`, `lib/workers/worker.ts`, `lib/workers/sse.ts`, `lib/workers/openapi.ts`):

1. **Versão divergente (`1.0.0` vs `0.6.0`):** `SERVER.VERSION` em `lib/shared/utils/constants.ts` e literais `"1.0.0"` em `worker.ts`, `sse.ts` e `openapi.ts` divergiam de `package.json` (`"0.6.0"`).
2. **Catálogo incompleto na rota raiz `/` do Worker:** `worker.ts` listava apenas 5 strings hardcoded no endpoint `GET /`, enquanto `tools/list` (`TOOL_DEFINITIONS`) expõe 23 ferramentas.
3. **Propagação parcial de secrets no Cloudflare Worker:** apenas `TAVILY_API_KEY` era copiada de `env` para `process.env`, deixando ferramentas OSINT/legais/governamentais no Worker sem acesso a `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY` e `DATAJUD_API_KEY`. Além disso havia blocos `if (env.TAVILY_API_KEY)` duplicados em `cloudflare.ts` e `worker.ts`.

## Decisao

1. **Fonte única de versão (`0.6.0`):** alinhar `SERVER.VERSION` em `lib/shared/utils/constants.ts:L37` para `'0.6.0'`; `lib/config/index.ts:L13` re-exporta `SERVER_VERSION = SERVER.VERSION`, e `lib/adapters/cloudflare.ts:L163`, `lib/workers/worker.ts:L16,L96`, `lib/workers/sse.ts:L159,L182` e `lib/workers/openapi.ts:L6,L19` consomem `SERVER_VERSION` em vez de strings hardcoded.
2. **Catálogo dinâmico em `GET /`:** `lib/workers/worker.ts:L17,L109` importa `TOOL_DEFINITIONS` e publica `TOOL_DEFINITIONS.map((tool) => tool.name)` (todas as 23 ferramentas ativas).
3. **Helper centralizado com allowlist explícita de secrets (`syncWorkerEnv`):** `Env` em `lib/adapters/cloudflare.ts:L34-L37` declara explicitamente `TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY` e `DATAJUD_API_KEY`, e `syncWorkerEnv(env)` (`L40-L58`) propaga somente essa allowlist não-vazia para `process.env`, chamado em `cloudflare.ts:L184,L280` e `worker.ts:L166` sem copiar chaves arbitrárias de `env` (como `MCP_API_KEY` ou bindings KV) e sem logar valores.

## Alternativas descartadas

- **Copiar `Object.entries(env)` inteiro para `process.env`:** rejeitada por segurança, pois vazaria segredos de controle (`MCP_API_KEY`) ou tentaria serializar bindings não-string (`KVNamespace`) em `process.env`.
- **Manter strings hardcoded por arquivo de Worker:** rejeitada pela alta probabilidade de nova deriva entre `package.json`, OpenAPI, SSE e MCP `initialize`.

## Consequencias

- **Positivas:** paridade verificada em testes unitários para versão (`0.6.0`), lista de 23 ferramentas e propagação restrita das 4 API keys de provedores; redução de código duplicado entre `worker.ts` e `cloudflare.ts`.
- **Custos / Trade-offs:** inclusão futura de uma nova chave de API externa para tools exige adicioná-la intencionalmente em `WORKER_ENV_KEYS` (`lib/adapters/cloudflare.ts:L40-L45`) e `Env`. Execução real no edge Cloudflare Workers (secrets via `wrangler secret put` e comportamento global de isolados) permanece *a confirmar* em ambiente remoto.

## Evidencias

- `lib/shared/utils/constants.ts:L32-L44`
- `lib/config/index.ts:L12-L13`
- `lib/adapters/cloudflare.ts:L23-L58,L163,L184,L280`
- `lib/workers/worker.ts:L12-L17,L92-L110,L166`
- `lib/workers/sse.ts:L155-L185`
- `lib/workers/openapi.ts:L6,L14-L20`
- `test/unit/architecture-hygiene.test.ts`
