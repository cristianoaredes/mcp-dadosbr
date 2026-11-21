---
id: DES-0031
slug: delimitadores-anti-prompt-injection-e-teto-de-payload-mcp
title: "Delimitar outputs externos anti-prompt-injection, limitar payload MCP e alinhar allowlist"
created_at: 2026-11-21T13:45:00Z
status: approved
ticket: TCK-0036
type: design
scope_files_new:
  - lib/shared/agentic-guard.ts
  - test/unit/agentic-security.test.ts
scope_files_modified:
  - lib/tools/osint.ts
  - lib/core/search-providers.ts
  - lib/tools/legal.ts
  - lib/core/mcp-server.ts
  - lib/adapters/cloudflare.ts
  - .archagents/mcp-tool-allowlist.json
  - test/unit/search.test.ts
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0031-playbook.md
acceptance_delta: unchanged
---
# DES-0031 - Delimitar outputs externos anti-prompt-injection, limitar payload MCP e alinhar allowlist

## Problema

`FND-0021` / `TCK-0036`:
1. `lib/tools/osint.ts:L95-L114` interpola `context` diretamente nos templates de `strategic_osint_prompt` sem delimitador explícito de dado não confiável nem instrução anti-prompt-injection.
2. `lib/core/search-providers.ts:L96-L105,L209-L223` (`TavilyProvider`, `PerplexityProvider`) e `lib/tools/legal.ts:L221-L237` (`parseProcuradosHtml`) repassam `title`, `snippet`, `name` e `state` externos/HTML sem sanitização de caracteres de controle, neutralização de delimitadores falsificados ou teto de tamanho, e sem sinalização `untrusted_source`.
3. `lib/core/mcp-server.ts:L217` e `lib/adapters/cloudflare.ts:L298` serializam `result.data` com `JSON.stringify(result.data, null, 2)` sem limite máximo configurável (`MCP_MAX_TOOL_OUTPUT_CHARS`), permitindo payloads de resposta arbitrários.
4. `.archagents/mcp-tool-allowlist.json:L56` registra `"bounded to 10 queries"` para `cnpj_intelligence`, divergindo de `lib/core/tool-schemas.ts:L59` (`max_queries` até `20`).

## Solucao

1. **Módulo Web-standard `lib/shared/agentic-guard.ts` (zero imports `node:*`):**
   - Exportar `DEFAULT_MAX_TOOL_OUTPUT_CHARS = 100_000`, `UNTRUSTED_EXTERNAL_DATA_NOTICE`, `resolveMaxToolOutputChars()`, `sanitizeUntrustedText()`, `wrapUntrustedContext()` e `serializeBoundedToolOutput()`.
   - `sanitizeUntrustedText(text, maxChars = 2000)` remove `\u0000` e caracteres de controle C0/DEL (exceto `\n`, `\t`, `\r`), neutraliza tags falsificadas `</?untrusted_[a-z0-9_-]*>` e aplica truncamento seguro `<= maxChars`.
   - `wrapUntrustedContext(text, label, maxChars = 2000)` encapsula texto sanitizado em `<untrusted_${label}>\n...\n</untrusted_${label}>`.
   - `serializeBoundedToolOutput(data, maxChars?)` retorna `JSON.stringify(data, null, 2) ?? "null"` quando dentro do teto e, quando excede, constrói envelope JSON válido parseável `<= limit` com `truncated: true`, `max_chars`, `original_chars`, `notice` e `preview` (ou fallback compacto sem `preview` quando o orçamento for insuficiente).
2. **Boundary em `lib/tools/osint.ts`:**
   - Em `executeStrategicPrompt`, encapsular `context` via `wrapUntrustedContext(context, "user_context", 2000)` e adicionar instrução explícita de que conteúdo dentro de `<untrusted_user_context>` é dado não confiável, nunca instruções de sistema/ferramenta.
3. **Sanitização e marcação em `lib/core/search-providers.ts` e `lib/tools/legal.ts`:**
   - Adicionar `untrusted_source?: boolean` em `SearchResult`; em `TavilyProvider.search` e `PerplexityProvider.search`, sanitizar `title` (`300`) e `snippet` (`2000`) e definir `untrusted_source: true`.
   - Em `lib/tools/legal.ts`, alterar apenas `parseProcuradosHtml` aplicando `sanitizeUntrustedText` em `name` (`200`) e `state` (`50`), evitando tocar blocos de retorno de `executeDatajud`/`executeBnmp`/`executeProcurados` para manter isolamento com `TCK-0033`.
4. **Teto uniforme de payload MCP (`lib/core/mcp-server.ts` e `lib/adapters/cloudflare.ts`):**
   - Substituir `JSON.stringify(result.data, null, 2)` por `serializeBoundedToolOutput(result.data)` em `mcp-server.ts:L217` e `cloudflare.ts:L298` (preservando `BASE_CORS_HEADERS` inalterado em `cloudflare.ts`).
5. **Alinhamento da allowlist (`.archagents/mcp-tool-allowlist.json:L56`):**
   - Atualizar `"bounded to 10 queries"` para `"bounded to 20 queries"`.
6. **Testes (`test/unit/agentic-security.test.ts` + ajuste em `test/unit/search.test.ts`):**
   - Cobrir sanitização, delimitação `strategic_osint_prompt`, truncamento JSON válido em `serializeBoundedToolOutput`, `TavilyProvider`/`PerplexityProvider`, `parseProcuradosHtml`, `handleMCPRequest`/`mcp-server.ts` com `MCP_MAX_TOOL_OUTPUT_CHARS`, e aderência de `.archagents/mcp-tool-allowlist.json`.

## Mudancas

- `lib/shared/agentic-guard.ts` (novo)
- `lib/tools/osint.ts`
- `lib/core/search-providers.ts`
- `lib/tools/legal.ts` (apenas `parseProcuradosHtml`)
- `lib/core/mcp-server.ts`
- `lib/adapters/cloudflare.ts`
- `.archagents/mcp-tool-allowlist.json`
- `test/unit/agentic-security.test.ts` (novo)
- `test/unit/search.test.ts` (ajuste de `.toEqual` para incluir `untrusted_source: true`)

## Criterios de sucesso

- [ ] `sanitizeUntrustedText`, `wrapUntrustedContext`, `serializeBoundedToolOutput` e `resolveMaxToolOutputChars` implementados em `lib/shared/agentic-guard.ts` sem imports Node-only (`tsconfig.worker.json` compila limpo).
- [ ] `strategic_osint_prompt`, `TavilyProvider`, `PerplexityProvider` e `parseProcuradosHtml` aplicam sanitização/delimitadores anti-prompt-injection.
- [ ] `lib/core/mcp-server.ts` e `lib/adapters/cloudflare.ts` aplicam `serializeBoundedToolOutput` respeitando `MCP_MAX_TOOL_OUTPUT_CHARS`.
- [ ] `.archagents/mcp-tool-allowlist.json` alinhado a `20 queries`.
- [ ] `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` e `secret-scan.sh` passam 100%.
