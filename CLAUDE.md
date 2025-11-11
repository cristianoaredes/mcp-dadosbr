# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP DadosBR is a production-ready Model Context Protocol server for Brazilian business and address data lookups (CNPJ/CEP). It provides 5 specialized tools integrated with AI assistants through multiple deployment platforms: NPM package, Cloudflare Workers, and Smithery.

**Version**: 0.3.6 | **Runtime**: Node.js 18+ | **Language**: TypeScript (strict mode)

## Common Development Commands

### Development
```bash
# Run development server (stdio transport)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Build specifically for Cloudflare Workers
npm run build:worker

# Run production build
npm start
```

### Testing
```bash
# Run all unit tests (Vitest)
npm test                        # 88 unit tests

# Watch mode for development
npm test:watch

# Visual test UI
npm test:ui

# Coverage report (target: 60%+ coverage)
npm test:coverage

# Integration tests
npm test:integration            # Requires build first
```

### Manual Testing
```bash
# Local HTTP + SSE server
npm run build
TAVILY_API_KEY="tvly-xxx" MCP_TRANSPORT=http MCP_HTTP_PORT=3000 node build/lib/adapters/cli.js

# Test via MCP client (in another terminal)
TAVILY_API_KEY="tvly-xxx" node scripts/mcp-client.js list-tools
TAVILY_API_KEY="tvly-xxx" node scripts/mcp-client.js cnpj 28526270000150
TAVILY_API_KEY="tvly-xxx" MAX_QUERIES=3 MAX_RESULTS=3 node scripts/mcp-client.js intelligence 28526270000150

# Quick health check (production)
curl -i https://mcp-dadosbr.aredes.me/health
```

### Deployment
```bash
# Deploy to Cloudflare Workers (production)
npm run deploy

# Deploy to staging environment
npm run deploy:staging

# View live logs from Cloudflare
npm run cf:logs

# Create KV namespace for caching
npm run cf:kv:create
npm run cf:kv:create:preview
```

### Release Management
```bash
# Automated semantic versioning
npm run release              # Auto-detect version bump
npm run release:patch        # Bug fixes (0.3.6 → 0.3.7)
npm run release:minor        # New features (0.3.6 → 0.4.0)
npm run release:major        # Breaking changes (0.3.6 → 1.0.0)
npm run release:dry-run      # Preview without committing
```

## Architecture Highlights

### Multi-Transport Design
The server supports two transport modes via **Adapter Pattern**:
- **stdio** (default): Direct stdin/stdout for local AI assistants (Claude Desktop, Cursor, etc.)
- **http**: REST API + Server-Sent Events for remote access and ChatGPT integration

Transport is selected via `MCP_TRANSPORT` env var, with a single codebase serving both modes through platform-specific adapters in `lib/adapters/`.

### Request Deduplication
**Critical pattern**: `lib/core/tools.ts` implements request deduplication to prevent parallel identical API calls. All tool executions check an in-memory Map of pending requests and await existing promises instead of creating new ones. This prevents rate limit violations when AI assistants make concurrent tool calls.

### Validation with Business Rules
CNPJ and CEP validation in `lib/core/validation.ts` uses **Brazilian-specific checksum algorithms**:
- **CNPJ**: Modulus-11 check digits validation (positions 12 and 13)
- **CEP**: Format validation (8 digits, optionally formatted as 12345-678)

Both use Zod schemas for runtime type safety + custom refinements for checksum validation.

### SSRF Protection
Configuration loader (`lib/config/index.ts`) implements **whitelist-based SSRF protection**:
- Allowed CNPJ API hosts: `opencnpj.org`, `receitaws.com.br`, `brasilapi.com.br`, etc.
- Allowed CEP API hosts: `opencep.com`, `viacep.com.br`, etc.
- Enforces HTTPS (except localhost/127.0.0.1)
- Rejects any configuration attempting to access unlisted domains

### Circuit Breaker States
HTTP client (`lib/infrastructure/http/circuit-breaker.ts`) implements three-state circuit breaker:
1. **CLOSED** (normal): Requests flow through, failures increment counter
2. **OPEN** (failing): All requests fail fast for `resetTimeout` period (default: 60s)
3. **HALF_OPEN** (testing): Single test request allowed; success → CLOSED, failure → OPEN

Threshold: 5 failures trigger state transition to OPEN.

### Configuration Hierarchy
Settings are resolved with this precedence (highest first):
1. Environment variables (`TAVILY_API_KEY`, `MCP_HTTP_PORT`, etc.)
2. `.mcprc.json` file in project root
3. Hardcoded defaults in `lib/config/index.ts`

**Critical**: `TAVILY_API_KEY` is **required** for `cnpj_search` and `cnpj_intelligence` tools.

### Intelligence Tool Concurrency
`cnpj_intelligence` (`lib/core/intelligence.ts`) orchestrates multiple search queries with:
- **Concurrency limit**: Maximum 3 parallel searches (via `async-mutex`)
- **Timeout**: Configurable via `MCP_INTELLIGENCE_TIMEOUT` (default: 25s)
- **Accuracy filtering**: Validates CNPJ presence in all returned snippets
- **Fallback**: Returns partial results if some queries timeout/fail

### Cache Strategy
In-memory LRU cache (`lib/infrastructure/cache.ts`) with:
- **Default size**: 256 entries (max: 10,000)
- **Default TTL**: 60s (range: 1s - 3600s)
- **Type-specific TTLs**:
  - CNPJ lookups: 300s (5 min) - business data changes slowly
  - CEP lookups: 600s (10 min) - address data is stable
  - Web searches: 60s (1 min) - news/legal data changes frequently
- **Automatic eviction**: LRU eviction when size exceeded, TTL expiration on access

## Security & Production Considerations

### Rate Limiting
- **Default**: 30 requests/minute per IP (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- **Cloudflare Workers**: KV-based storage for distributed rate limiting
- **Bypass**: Set `MCP_DISABLE_RATE_LIMIT=true` (dev only, never in production)

### PII Masking
Logger (`lib/infrastructure/logger.ts`) automatically masks:
- CNPJ numbers in logs (shows only first 8 digits: `12345678****`)
- CPF patterns (if detected)
- Email addresses
- API keys and tokens

### Cloudflare Workers Authentication
Two layers of protection:
1. **REST endpoints** (`/cnpj/*`, `/cep/*`, `/search`, etc.): Require `X-API-Key` or `Authorization: Bearer` header
2. **MCP protocol endpoints** (`/mcp`, `/sse`): **Unprotected** for AI assistant compatibility

Configure API key via: `wrangler secret put MCP_API_KEY`

## TypeScript & Build Configuration

### Strict Mode Enforcement
`tsconfig.json` enables all strict checks:
- `strict: true` (includes strictNullChecks, strictFunctionTypes, etc.)
- `noUncheckedIndexedAccess: true` - Array/object access returns `T | undefined`
- `noImplicitReturns: true` - All code paths must return
- Target: ES2022 with ESNext module resolution

### Dual Build Targets
Two TypeScript configs:
1. **tsconfig.json**: Main build for Node.js (outputs to `build/`)
2. **tsconfig.worker.json**: Cloudflare Workers build (separate compilation)

## Test Coverage Targets

Vitest config (`vitest.config.ts`) enforces:
- **Lines**: 80% coverage
- **Functions**: 80% coverage
- **Branches**: 75% coverage
- Excludes: `workers/`, `bin/`, `scripts/`, integration tests

Run `npm run test:coverage` to verify thresholds before commits.

## Environment Variable Reference

**Required for web search features:**
```bash
TAVILY_API_KEY=tvly-xxx        # Tavily API key (https://tavily.com)
```

**Optional for customization:**
```bash
# Transport
MCP_TRANSPORT=stdio|http       # Default: stdio
MCP_HTTP_PORT=3000             # HTTP server port

# Cache
MCP_CACHE_SIZE=256             # Cache entries (1-10000)
MCP_CACHE_TTL=60000            # Default TTL in ms (1000-3600000)
MCP_CACHE_TTL_CNPJ=300000      # CNPJ-specific TTL
MCP_CACHE_TTL_CEP=600000       # CEP-specific TTL
MCP_CACHE_TTL_SEARCH=60000     # Search-specific TTL

# API Endpoints (for self-hosting alternative data sources)
CNPJ_API_BASE_URL=https://api.opencnpj.org/
CEP_API_BASE_URL=https://opencep.com/v1/

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000     # Window: 60s
RATE_LIMIT_MAX_REQUESTS=30     # 30 req/min per IP
MCP_DISABLE_RATE_LIMIT=false   # Disable rate limiting

# Logging
NODE_ENV=production|development
LOG_LEVEL=debug|info|warn|error
DISABLE_THOUGHT_LOGGING=false  # Disable sequential thinking logs
```

## Documentation Structure

The project has extensive documentation in `docs/`:
- `CONFIGURATION.md` - Complete environment variable and config file reference
- `EXAMPLE_USAGE.md` - Real-world usage examples and prompts
- `MCP_CLIENT_INTEGRATION.md` - Setup guides for 10+ AI assistants/IDEs
- `CLOUDFLARE_DEPLOYMENT.md` - Production deployment walkthrough
- `WEB_SEARCH.md` - Search dorks and query patterns
- `SEQUENTIAL_THINKING.md` - Structured reasoning system
- `PROVIDERS.md` - Search provider comparison (Tavily, SearXNG, Brave)
- `development/AGENTS.md` - Guide for AI agents working with this codebase

**PT-BR versions**: `docs/pt-br/` contains full Portuguese documentation.

## Common Gotchas

1. **Tavily API Key**: `cnpj_search` and `cnpj_intelligence` fail silently without `TAVILY_API_KEY`. Always check this env var first when debugging search issues.

2. **Number Formatting**: CNPJ can be provided as `11222333000181`, `11.222.333/0001-81`, or mixed formats. Validation normalizes to digits-only before checksum validation.

3. **HTTP vs Stdio**: When testing locally with `MCP_TRANSPORT=http`, you must build first (`npm run build`) and run the compiled JS from `build/`, not `tsx` directly.

4. **Cloudflare Workers Secrets**: Use `wrangler secret put` for sensitive values, NOT environment variables in `wrangler.toml`. Secrets are encrypted at rest.

5. **Cache Invalidation**: LRU cache is **in-memory only** (not persisted). Server restarts clear all cached data. For production persistence, implement KV-backed cache in Cloudflare Workers.

6. **Result Pattern**: All core functions return `Result<T, Error>` type, not throwing exceptions. Always check `.success` property before accessing `.data`:
   ```typescript
   const result = await lookupCNPJ(cnpj);
   if (!result.success) {
     logger.error('CNPJ lookup failed', { error: result.error });
     return;
   }
   const data = result.data; // type-safe access
   ```
