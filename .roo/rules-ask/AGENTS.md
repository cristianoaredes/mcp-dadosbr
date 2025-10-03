# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Multi-Runtime Architecture

- **Dual runtime**: Same code runs in Node.js AND Cloudflare Workers with different entry points
- **Multi-protocol**: Worker serves MCP protocol (JSON-RPC + SSE) AND REST API in [`lib/workers/worker.ts`](lib/workers/worker.ts:201-487)
- **Dual build configs**: [`tsconfig.json`](tsconfig.json) for Node.js vs [`tsconfig.worker.json`](tsconfig.worker.json) for Workers

## Configuration System

- **Configuration hierarchy**: Defined in [`lib/config/index.ts`](lib/config/index.ts:28-82) - environment variables always override `.mcprc.json` which overrides defaults
- **Location sensitivity**: `.mcprc.json` must be in current working directory, not necessarily project root
- **URL normalization**: Config automatically adds trailing slash to URLs - don't add manually

## Testing & Coverage

- **Cloudflare exclusion**: Worker files excluded from test coverage in [`vitest.config.ts`](vitest.config.ts:17)
- **Integration tests**: Plain Node.js scripts, not Vitest framework - run with `npm run test:integration`

## Worker Endpoints

- **MCP endpoints**: `/mcp` (JSON-RPC), `/sse` (Server-Sent Events), `/health`
- **OAuth endpoints**: `/oauth/*` for authentication flows
- **REST API**: `/cnpj/{cnpj}` and `/cep/{cep}` for direct data access
- **Documentation**: `/openapi.json` for API specification

## Module System

- **ESM requirement**: All imports must use `.js` extensions even for `.ts` source files
- **TypeScript moduleResolution**: "node" for Node.js builds, "bundler" for Worker builds