# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Adapter Implementations

- **Cloudflare adapter**: Bypasses MCP SDK entirely in [`lib/adapters/cloudflare.ts`](lib/adapters/cloudflare.ts:62-153) - implements manual JSON-RPC protocol handling
- **Three different adapters**: CLI, Cloudflare, and Smithery in [`lib/adapters/`](lib/adapters/) have significantly different implementations despite shared core

## Testing Framework Mix

- **Unit tests**: Use Vitest framework
- **Integration tests**: Plain Node.js scripts (NOT Vitest) in [`test/integration/`](test/integration/)
- **Reason**: Integration tests need to test built artifacts, not source files

## Intelligence Search Behavior

- **Post-filtering**: Intelligence operations filter results by CNPJ presence AFTER search completes in [`lib/core/intelligence.ts`](lib/core/intelligence.ts:147) - not during search
- **Dork generation**: Has hardcoded heuristics in [`lib/core/dork-templates.ts`](lib/core/dork-templates.ts:151-159) (e.g., checks for "tecnologia" to add GitHub search)
- **Partner limit**: Restricts to first 3 partners in [`lib/core/dork-templates.ts`](lib/core/dork-templates.ts:165) to avoid excessive queries

## Terminal Output

- **Sequential thinking**: Uses chalk library in [`lib/core/sequential-thinking.ts`](lib/core/sequential-thinking.ts:1) without environment checks - assumes terminal supports colors