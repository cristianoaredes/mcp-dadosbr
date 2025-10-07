# MCP DadosBR - AI Coding Assistant Instructions

## Architecture Overview

**MCP server for Brazilian business data** with multi-transport deployment:
- **Adapters**: `cli.ts` (stdio), `cloudflare.ts` (Workers), `smithery.ts` (Smithery platform)
- **Core**: Business logic in `lib/core/` - tools, caching, HTTP client, search providers, intelligence orchestration
- **Infrastructure**: Circuit breaker, thread-safe cache, telemetry in `lib/infrastructure/`
- **Data Flow**: CNPJ/CEP lookups → external APIs (OpenCNPJ/OpenCEP) → MCP JSON-RPC responses

## Critical Requirements

### Logging Protocol
**ALL logging uses `console.error()`** - stdout reserved for JSON-RPC communication. Bug: `lib/core/tools.ts:71-73` incorrectly uses `console.log()`.

### ESM Module Resolution
**All imports use `.js` extensions** even for `.ts` files:
```typescript
// Correct
import { foo } from './bar.js';
// Wrong
import { foo } from './bar.ts';
```

## Developer Workflows

### Build & Test
- **Build**: `npm run build` compiles TypeScript to `build/`
- **Unit tests**: `npm test` (Vitest, 88 tests)
- **Integration tests**: `npm run test:integration` (plain Node.js scripts in `test/integration/`, run after build)
- **Manual testing**: Scripts in `test/manual/` for HTTP/stdio modes

### Development Commands
```bash
# Local development
npm run dev                    # tsx lib/adapters/cli.ts
npm start                      # node build/lib/adapters/cli.js

# Testing
npm run test:integration       # Integration tests against build/
npm run mcp:test              # Quick CNPJ+CEP test via scripts/mcp-client.js

# Deployment
npm run build                  # TypeScript compilation
npm run deploy                 # Cloudflare Workers
wrangler deploy --env staging  # Staging deployment
```

## Project Patterns

### HTTP Resilience
- **Circuit breaker**: Global singleton in `lib/infrastructure/http/circuit-breaker.ts` - 5 failures → blocks ALL HTTP for 30s
- **Request deduplication**: `lib/core/tools.ts:47-52` - concurrent identical calls share Promise
- **Timeout bug**: `lib/core/http-client.ts:51` hardcodes "8 seconds" despite configurable `timeoutMs`

### Intelligence Operations
- **25-second total timeout**: `lib/core/intelligence.ts:65` uses `Promise.race()` (not AbortController)
- **Post-filtering**: Results filtered by CNPJ presence after search completion
- **Provider restriction**: Only Tavily supported - `lib/core/search-providers.ts:106-113` throws for non-Tavily

### Configuration Hierarchy
- **File location**: `.mcprc.json` in current working directory (not project root)
- **Override order**: Environment variables → `.mcprc.json` → defaults
- **API URLs**: Configurable via `apiUrls.cnpj`/`apiUrls.cep` in config file

### Caching Strategy
- **LRU cache**: `lib/core/cache.ts` with TTL support
- **Thread-safe**: `lib/infrastructure/cache/thread-safe-cache.ts` for concurrent access
- **Metrics logging**: Every 10 requests to stderr

## Integration Points

### MCP Transports
```bash
# STDIO (default)
mcp-dadosbr

# HTTP/SSE
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 mcp-dadosbr

# Cloudflare Workers
# Deployed at https://mcp-dadosbr.aredes.me/
```

### External Dependencies
- **APIs**: OpenCNPJ (`api.opencnpj.org`), OpenCEP (`opencep.com`)
- **Search**: Tavily API (required for `cnpj_search`/`cnpj_intelligence`)
- **Cloud**: Cloudflare Workers, Smithery platform

### Tool Definitions
- `cnpj_lookup`: Company data via CNPJ
- `cep_lookup`: Address data via CEP
- `cnpj_search`: Web search with dorks
- `cnpj_intelligence`: Orchestrated search + lookup
- `sequentialthinking`: Step-by-step reasoning

## Code Examples

### Adding New Tool
```typescript
// lib/core/tools.ts
export const MY_TOOL = {
  name: "my_tool",
  description: "My custom tool",
  inputSchema: { /* zod schema */ },
};

// Add to TOOL_DEFINITIONS array
```

### HTTP Request with Resilience
```typescript
// Uses circuit breaker + deduplication automatically
const result = await httpJson(url, authHeaders, timeoutMs);
if (result.ok) {
  // Success - result.data contains parsed JSON
} else {
  // Error - result.error contains user-friendly message
}
```

### Configuration Loading
```typescript
// lib/config/index.ts
const config = loadApiConfiguration(); // Handles env → file → defaults
```

## Quality Assurance

- **TypeScript strict mode**: All code must pass `tsc`
- **Integration first**: New features require integration tests
- **ESM compliance**: No CommonJS patterns
- **Error handling**: Use `Result<T,E>` type from `lib/shared/types/result.ts`

## Deployment Targets

- **NPM package**: `npm install -g @aredes.me/mcp-dadosbr`
- **Cloudflare Workers**: REST API at `mcp-dadosbr.aredes.me`
- **Smithery**: One-click install via `smithery.ai`

Reference: `AGENTS.md`, `PROJECT_STRUCTURE.md`, `README.md`</content>
<parameter name="filePath">/Users/cristianocosta/workspace/mcp-workspace/dadosbr-mcp/.github/copilot-instructions.md