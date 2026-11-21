---
status: completed
run_id: RUN-20261121-134527-tck-0036
ticket: TCK-0036
design: DES-0031
start_time: 2026-11-21T13:45:27Z
end_time: 2026-11-21T13:50:30Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - lib/shared/agentic-guard.ts
  - lib/tools/osint.ts
  - lib/core/search-providers.ts
  - lib/tools/legal.ts
  - lib/core/mcp-server.ts
  - lib/adapters/cloudflare.ts
  - .archagents/mcp-tool-allowlist.json
  - test/unit/search.test.ts
  - test/unit/agentic-security.test.ts
test_result:
  status: pass
  summary: "87/87 targeted (6 files), 453/453 Vitest (32 files), V8 coverage 91.44% stmts / 83.47% branch / 93.31% funcs / 92.19% lines >= 85/80/85/85, tsc + tsc.worker + secret-scan PASS"
  details: "learn consult succeeded (1 cross-ticket advisory lesson: Precisou de 2 iteracoes). Allowlist aligned to 20 queries."
---
# RUN-20261121-134527-tck-0036 - TCK-0036 (`FND-0021`)

## Resumo executivo

Execução completa da remediação de segurança agêntica (`FND-0021` / `DES-0031`):

1. **`lib/shared/agentic-guard.ts` (Web-standard, zero imports `node:*`):** implementados `DEFAULT_MAX_TOOL_OUTPUT_CHARS = 100_000`, `UNTRUSTED_EXTERNAL_DATA_NOTICE`, `resolveMaxToolOutputChars()`, `sanitizeUntrustedText()`, `wrapUntrustedContext()` e `serializeBoundedToolOutput()` (com busca binária para garantir envelope JSON válido `<= maxChars` mesmo com escapes de aspas/quebras de linha e fallback compacto quando `budget <= 0`).
2. **`lib/tools/osint.ts` (`strategic_osint_prompt`):** `context` encapsulado via `wrapUntrustedContext(context, "user_context", 2000)` acompanhado de instrução explícita de que conteúdo em `<untrusted_user_context>` é dado não confiável (nunca instrução de sistema/ferramenta); `company_name`/`cnpj` também sanitizados.
3. **`lib/core/search-providers.ts` & `lib/tools/legal.ts`:** adicionado `untrusted_source?: boolean` em `SearchResult`; `TavilyProvider.search` e `PerplexityProvider.search` sanitizam `title` (`300`) e `snippet` (`2000`) e marcam `untrusted_source: true`; `parseProcuradosHtml` (`lib/tools/legal.ts`) sanitiza `name` (`200`) e `state` (`50`) preservando os blocos de retorno das tools paralelas (`TCK-0033`).
4. **`lib/core/mcp-server.ts` & `lib/adapters/cloudflare.ts`:** substituído `JSON.stringify(result.data, null, 2)` por `serializeBoundedToolOutput(result.data)` (com suporte a `MCP_MAX_TOOL_OUTPUT_CHARS` via `process.env` e `Env` do Worker, mantendo `BASE_CORS_HEADERS` intacto para `TCK-0035`).
5. **`.archagents/mcp-tool-allowlist.json`:** alinhado `cnpj_intelligence` de `"bounded to 10 queries"` para `"bounded to 20 queries"` conforme `lib/core/tool-schemas.ts:L59`.
6. **Testes (`test/unit/agentic-security.test.ts` + ajuste em `test/unit/search.test.ts`):** 11 novos testes cobrindo sanitização, delimitação anti-prompt-injection, truncamento JSON, providers, `parseProcuradosHtml`, `createMCPServer`, `handleMCPRequest` e allowlist; ajustadas 2 asserções `.toEqual` em `test/unit/search.test.ts` para `untrusted_source: true`.

## Pré-execução / Learnings

- `python3 "$CBOPS/cbctl.py" learn consult TCK-0036 --run RUN-20261121-134527-tck-0036` executado com sucesso (`1 lição [medium] cross-ticket: Precisou de 2 iterações (re-execução)`).

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| Testes direcionados (`6` arquivos) | Pass 100% + `AGENTIC_TESTS_OK` | `6 passed (6)`, `87 passed (87)` | PASS |
| Suíte unitária completa (`npm run test`) | Pass 100% + `FULL_TESTS_OK` | `32 passed (32)`, `453 passed (453)` | PASS |
| Cobertura V8 (`npm run test:coverage`) | `>= 85/80/85/85` | `91.44% stmts / 83.47% branch / 93.31% funcs / 92.19% lines` | PASS |
| Typecheck Node + Worker (`tsc --noEmit` & `tsc -p tsconfig.worker.json --noEmit`) | Exit `0` + `TYPECHECK_OK` | Exit `0` em ambos | PASS |
| Allowlist alignment (`.archagents/mcp-tool-allowlist.json`) | `20 queries` -> `ALLOWLIST_ALIGNED` | `ALLOWLIST_ALIGNED` | PASS |
| Secret scan (`secret-scan.sh`) | Exit `0` sem segredos | `✅ No secrets detected.` | PASS |
