# Changelog

All notable changes to MCP DadosBR will be documented in this file.

## [Unreleased]

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
