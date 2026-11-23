# Changelog

All notable changes to MCP DadosBR will be documented in this file.

## [Unreleased]

### Documentation (`TCK-0046`)

- **SEO/GEO documentation & v0.7.0 alignment**:
  - Highlighted npm `latest` (`0.6.0`, 23 tools) vs repository `main` (`0.7.0`, 29 tools / 5 MCP Apps requiring source build until release) across `README.md` (PT-BR and English) and added observed external-upstream caveats (`tcu_certidoes` error responses and intermittent `querido_diario` / `pncp_licitacoes` timeouts verified on 2026-11-23).
  - Created root `llms.txt` (`llmstxt.org` format covering all 29 tools, 5 MCP Apps, limits, and documentation links) and refreshed `CHANGELOG.md`, `package.json` SEO/GEO metadata, and stale tool/test metrics in `docs/README.md` and `docs/pt-br/desenvolvimento/metricas.md`.

### Planned

- **📱 Flutter/Dart Library**: Comprehensive Flutter library for mobile, web, and desktop applications
  - Cross-platform CNPJ and CEP lookup with the same reliable data sources
  - Smart caching with 60-second TTL and LRU eviction optimized for mobile
  - Circuit breaker pattern with exponential backoff for mobile networks
  - AI integration with LangChain Dart and LangGraph support
  - MCP server mode with HTTP/SSE transport for AI agent connectivity
  - Batch processing with Stream-based APIs for multiple document lookups
  - Comprehensive utility functions for validation, formatting, and offline verification
  - Platform-specific HTTP clients (dart:io for mobile/desktop, fetch for web)
  - Type-safe Dart classes mirroring the TypeScript interfaces
  - See [Flutter Library Documentation](docs/FLUTTER_LIBRARY.md) for details

## [0.7.0] - 2026-11-21

> Source version `0.7.0` on `main` (PR #27 + PR #28; npm `latest` remains `0.6.0` until package publication and GitHub release).

### Added

- **6 new zero-key Worker-safe public-data tools (expanding catalog to 29 tools + 5 MCP Apps, PR #27 / `SPC-0001`):**
  - `tcu_certidoes` (`TCK-0041`): Consolidated PJ integrity certificates from TCU (`certidoes-apf.apps.tcu.gov.br` — TCU Licitantes Inidôneos, CNJ CNIA, CEIS/CNEP), integrated into `company_deep_profile`.
  - `cnae_ncm_lookup` (`TCK-0042`): Structured CNAE classification (`IBGE v2`) and NCM (`BrasilAPI v1`) lookups with bounded pagination (`<= 50`).
  - `sistema_financeiro_lookup` (`TCK-0042`): Pix participants, CVM/B3 brokers, and COMPE/ISPB banks via BrasilAPI.
  - `feriados_ddd_lookup` (`TCK-0042`): Brazilian national holidays / business-day checks and DDD area code lookups (`BrasilAPI`).
  - `bcb_olinda` (`TCK-0043`): Historical PTAX rates (`CotacaoDolarPeriodo` / `CotacaoMoedaPeriodo` with 7-day non-business-day resolution and `exact_date_match`) and Focus Market Expectations (`ExpectativasMercadoAnuais`).
  - `ibge_indicadores` (`TCK-0043`): Population (`6579/9324`), GDP (`5938/37`), and estimated GDP per capita by UF (`N3`) or municipality (`N6`) via IBGE Agregados `v3`.

### Changed & Fixed

- **`lista_suja_lookup` & `consumidor_reclamacoes` reliability (`TCK-0041`, PR #27):** Migrated `lista_suja_lookup` to the official MTE CSV (`cadastro_de_empregadores.csv`) using Worker-safe RFC-4180 parsing (preserving `HOMONYM_HUMAN_REVIEW_NOTICE`); replaced blocked anti-bot scraping in `consumidor_reclamacoes` with a zero-fetch guided portal/open-data fallback.
- **Live E2E contract hardening (`TCK-0045`, PR #28 merged 2026-11-22):** Updated `pncp_licitacoes` unfiltered search to `/api/search/` (`ordenacao=-data`), mapped all 27 UFs in `cnes_saude` via `UF_TO_IBGE_CODE`, refined `datajud_processos` Elastic queries (`numeroProcesso` / `query_string`), and preserved custom timeout/not-found error messages.
- **Governance & security parity (`TCK-0044`, PR #27):** Synchronized `TOOL_DEFINITIONS` (`29`), `TOOL_SCHEMAS` (`29`), `.archagents/mcp-tool-allowlist.json`, `.archagents/_capabilities.json`, Worker OpenAPI `SERVER_VERSION` (`"0.7.0"`), `UNTRUSTED_EXTERNAL_DATA_NOTICE`, and zero `node:*` imports across `lib/shared/`, `lib/tools/`, and `lib/workers/`.

## [0.6.0] - 2026-11-19

### Changed (License)

- **Relicensed from MIT to GNU AGPL-3.0 (`AGPL-3.0-only`)**: replaced `LICENSE` with the verbatim official GNU Affero General Public License v3.0 text, updated `package.json`, `package-lock.json`, and `smithery.yaml` to `AGPL-3.0-only`, and preserved third-party acknowledgments in `NOTICE.md` (included in the npm package). Releases up to `0.5.0` remain under the MIT License; `AGPL-3.0-only` applies starting with `0.6.0`.

### Documentation

- Rewrote `README.md` following the [orqo.pro](https://orqo.pro/) editorial standard (`MCP DadosBR by Orqo`) with the five interactive MCP Apps, full 23-tool domain catalog, execution perimeter comparison (Node `stdio`/`HTTP+SSE` vs. Cloudflare Worker), SSRF allowlist, verified environment variables and defaults, architecture diagram, explicit boundaries (*O que não faz*), FAQ, AGPL-3.0 guidance, governance history (`Codebase OPS by Orqo`), and English overview.
- Synchronized `.archagents/` AS-IS documentation and source hashes against the `v0.5.0`–`0.6.0` codebase.

## [0.5.0] - 2026-11-18

### Added

- Five packaged MCP Apps for IBGE locations, municipal gazettes, Central Bank indicators, PNCP notices, and CNPJ registration profiles.
- Source and provider links for interactive queries, plus the existing text response for clients without MCP Apps.

### Fixed

- The CLI sends request metrics to stderr and keeps the stdio JSON-RPC stream intact after 100 calls.

### Delivery

- CI and npm release jobs use isolated, per-run labels on the dedicated VPS. The package release requires successful CI on the exact main commit and validates a clean installation.
- The public README shows the five tools, their sources, and the project history with Codebase OPS by Orqo.

## [0.2.0] - 2025-09-30

### Added

- **🔍 Web Search Tool (`cnpj_search`)**: Intelligent web search using DuckDuckGo
  - Support for advanced search operators (site:, intext:, intitle:, filetype:, etc.)
  - Rate limiting (1 second between requests)
  - Automatic caching of search results
  - Find lawsuits, documents, news, and online presence of companies
  
- **🧠 Sequential Thinking Tool (`sequentialthinking`)**: Structured and iterative reasoning
  - Dynamic problem-solving with adaptable thinking process
  - Support for revisions and branches in reasoning
  - Colorized output for better visualization
  - Context tracking across multiple thought steps
  - Useful for complex analysis and investigations

### Enhanced

- **Tool System**: Extended to support 4 tools (cnpj_lookup, cep_lookup, cnpj_search, sequentialthinking)
- **Documentation**: Updated README with new tools and examples
- **Architecture**: KISS approach - LLM orchestrates independent tools

### Technical

- Added `duckduckgo-search` dependency for web search
- Added `chalk` dependency for colorized thinking output
- Zero cost for new features (DuckDuckGo is free)
- Minimal changes to existing codebase

## [1.1.1] - 2025-09-28

### Fixed

- **MCP Schema Validation**: Fixed tool inputSchema format to use proper JSON Schema instead of Zod shapes
- **Tool Registration**: Corrected `cnpj_lookup` and `cep_lookup` tools to have valid `type: "object"` schemas
- **MCP Client Compatibility**: Resolved schema validation errors that prevented connection with MCP clients

### Updated

- **Documentation**: Updated README.md with comprehensive integration guide for all AI coding tools
- **Integration Examples**: Added configuration examples for Claude Desktop, Cursor, Windsurf, Continue.dev, VS Code
- **Quick Setup Guide**: Created copy-paste configurations for immediate setup
- **Version Sync**: Updated server version to match package.json version

## [1.1.0] - 2025-09-28

### Added

- **Cloudflare Workers Support**: Full deployment support for Cloudflare Workers with enhanced features
- **Server-Sent Events (SSE)**: Real-time streaming MCP support via `/sse` endpoint
- **ChatGPT Integration**: Direct integration with ChatGPT via OpenAPI schema and REST endpoints
- **OAuth Endpoints**: Complete OAuth 2.0 flow for MCP connectors (`/.well-known/*`, `/oauth/*`)
- **REST API Endpoints**: Direct HTTP access via `/cnpj/{cnpj}` and `/cep/{cep}` for ChatGPT actions
- **OpenAPI Schema**: Auto-generated schema at `/openapi.json` for ChatGPT integration
- **Simplified Integration**: Direct npm package usage without bridge files
- **KV Storage Support**: Cloudflare KV integration for persistent caching across requests
- **Enhanced Worker Features**: Health checks, CORS, DNS rebinding protection, and multi-environment support
- **TypeScript Worker Config**: Separate `tsconfig.worker.json` for Cloudflare Workers compilation
- **Wrangler Configuration**: Complete `wrangler.toml` with staging/production environments and KV namespaces

### Enhanced

- **Multi-Transport Architecture**: Now supports stdio, HTTP, SSE, and REST API transports
- **Documentation**: Added comprehensive ChatGPT integration guide and updated Cloudflare deployment docs
- **Project Structure**: Enhanced organization with workers directory and bridge components
- **Configuration**: Extended environment variable support for Cloudflare Workers deployment

### Features

- **Global Edge Deployment**: Deploy to 300+ Cloudflare locations worldwide
- **Zero Cold Starts**: Instant response times with Cloudflare Workers
- **Free Tier Support**: 100k requests/day on Cloudflare's free tier
- **Real-time Streaming**: SSE support for MCP agents with persistent connections
- **ChatGPT Actions**: Direct integration with ChatGPT custom GPTs
- **Remote MCP**: Bridge local MCP clients to remote Cloudflare Workers deployment

## [1.0.0] - 2025-09-27

### Added

- **Core MCP Server**: Initial release with Model Context Protocol support
- **CNPJ Lookup Tool**: Brazilian company data via OpenCNPJ API integration
- **CEP Lookup Tool**: Brazilian postal code data via OpenCEP API integration
- **Dual Transport Support**: stdio (default) and HTTP Streamable transports
- **Input Validation**: Zod-based validation and normalization for CNPJ/CEP formats
- **Advanced Caching**: In-memory cache with 60-second TTL and LRU eviction (256 entries)
- **Request Deduplication**: Promise-based deduplication prevents concurrent identical API calls
- **Circuit Breaker**: API resilience with 5-failure threshold and 30-second recovery window
- **Metrics Collection**: Built-in performance monitoring with request/cache/error tracking
- **Configurable API Endpoints**: Support for custom CNPJ and CEP API URLs via configuration
- **Configuration File Support**: `.mcprc.json` file for persistent configuration settings
- **Authentication Headers**: Support for custom authentication headers in API requests
- **Configuration Hierarchy**: Environment variables override config file settings
- **Enhanced Logging**: API base URLs included in log output for better debugging
- **URL Validation**: Automatic validation and normalization of custom API URLs
- **Configuration Management**: Environment variables and `.mcprc.json` file support
- **Comprehensive Error Handling**: Structured error responses with HTTP status mapping
- **Timeout Protection**: 8-second AbortController timeout for all API requests
- **Structured Logging**: One-line format with timestamp, tool, input, status, timing, and transport
- **Simplified Deployment**: Focus on npm package and Cloudflare Workers
- **Integration Tests**: Comprehensive test suite with real MCP protocol validation
- **Advanced Features**: Graceful shutdown, CORS support, DNS rebinding protection

### Features

- **Single-file Architecture**: All implementation in server.ts (480 lines of TypeScript)
- **Zero Configuration**: Works out of the box with sensible defaults
- **Enterprise Features**: Comprehensive error handling, monitoring, and deployment support
- **High Performance**: Promise-based request deduplication, LRU caching, and circuit breaker patterns
- **Flexible Deployment**: Supports both CLI tools (stdio) and web services (HTTP Streamable)
- **Advanced Resilience**: Circuit breaker, request deduplication, and timeout protection
- **Built-in Monitoring**: Automatic metrics collection and structured logging

### API Endpoints

- `cnpj_lookup`: Query Brazilian company data by CNPJ number (via https://api.opencnpj.org/)
- `cep_lookup`: Query Brazilian postal code data by CEP (via https://opencep.com/v1/)

### Configuration Options

- **Transport Selection**: stdio (default) or HTTP Streamable transport
- **Cache Configuration**: Configurable size (default: 256) and TTL (default: 60s)
- **API Timeout**: Configurable timeout for external API calls (default: 8s)
- **Circuit Breaker**: Configurable failure threshold (default: 5) and recovery window (default: 30s)
- **HTTP Settings**: Port, CORS, DNS protection, allowed hosts/origins
- **Metrics & Logging**: Enable/disable metrics collection and configure log levels
- **Configuration Sources**: Environment variables, `.mcprc.json` file, or built-in defaults

### Testing

- Manual testing scripts for both transports
- Integration test suite with real MCP protocol validation
- Comprehensive testing suite
- Performance benchmarking capabilities

### Documentation

- Comprehensive README with usage examples
- API documentation with request/response formats
- Configuration guide with all available options
- Deployment guide for different environments
- Troubleshooting guide and FAQ
