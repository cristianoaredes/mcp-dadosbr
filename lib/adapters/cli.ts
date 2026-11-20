#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMCPServer } from "../core/mcp-server.js";
import { MemoryCache } from "../core/cache.js";
import {
  loadServerConfiguration,
  resolveApiConfig,
  SERVER_NAME,
  SERVER_VERSION
} from "../config/index.js";
import {
  createCliHttpApp,
  DEFAULT_CLI_HTTP_HOST,
  DEFAULT_MAX_SSE_SESSIONS,
  parseCommaSeparatedList,
} from "./cli-http.js";

// Debug logging only in development
const DEBUG = process.env.NODE_ENV !== "production";
function debug(...args: unknown[]) {
  if (DEBUG) {
    console.error("[DEBUG]", ...args);
  }
}

async function main() {
  // Handle CLI arguments
  const args = process.argv.slice(2);
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`${SERVER_NAME} v${SERVER_VERSION}`);
    process.exit(0);
  }
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${SERVER_NAME} v${SERVER_VERSION} - Model Context Protocol server for Brazilian public data

Usage:
  mcp-dadosbr [options]
  npx @aredes.me/mcp-dadosbr [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version number

Environment Variables:
  MCP_TRANSPORT         Transport mode: stdio (default) or http
  MCP_HTTP_PORT         HTTP server port (default: 3000)
  MCP_HTTP_HOST         HTTP bind host (default: 127.0.0.1)
  MCP_ALLOWED_ORIGINS   Comma-separated allowed Origin URLs for CORS
  MCP_ALLOWED_HOSTS     Comma-separated allowed Host headers
  MCP_MAX_SSE_SESSIONS  Maximum concurrent SSE sessions (default: 100)
  CNPJ_API_BASE_URL     Custom CNPJ API base URL
  CEP_API_BASE_URL      Custom CEP API base URL
  API_KEY_HEADER        Authentication header name
  API_KEY_VALUE         Authentication header value

Examples:
  mcp-dadosbr                                    # Start with stdio transport
  MCP_TRANSPORT=http mcp-dadosbr                 # Start with HTTP transport (127.0.0.1:3000)
  CNPJ_API_BASE_URL=https://my-api.com/ npx @aredes.me/mcp-dadosbr  # Use custom API

For more information, visit: https://github.com/cristianoaredes/mcp-dadosbr`);
    process.exit(0);
  }

  // Load configurations
  const serverConfig = loadServerConfiguration();
  const apiConfig = resolveApiConfig();

  // Log configuration at startup
  console.error(`${SERVER_NAME} v${SERVER_VERSION} configuration:`);
  console.error(`  CNPJ API: ${apiConfig.cnpjBaseUrl}`);
  console.error(`  CEP API: ${apiConfig.cepBaseUrl}`);
  if (apiConfig.authHeaders) {
    console.error(
      `  Auth headers: ${Object.keys(apiConfig.authHeaders).join(", ")}`
    );
  }

  // Create cache
  const cache = new MemoryCache(serverConfig.cacheSize, serverConfig.cacheTTL);

  // Create MCP server
  const mcpServer = createMCPServer({ apiConfig, cache });

  // Setup transport
  const transportMode = serverConfig.transport;
  if (transportMode === "http") {
    const host = serverConfig.httpHost || DEFAULT_CLI_HTTP_HOST;
    if (host === "0.0.0.0" || host === "::") {
      console.error(
        `[Security] WARNING: HTTP+SSE transport bound to wildcard interface (${host}). ` +
        "Prefer 127.0.0.1 and configure MCP_ALLOWED_HOSTS / MCP_ALLOWED_ORIGINS when exposing externally."
      );
    }

    const parsedMaxSessions = Number.parseInt(process.env.MCP_MAX_SSE_SESSIONS || "", 10);
    const maxSessions =
      Number.isFinite(parsedMaxSessions) && parsedMaxSessions > 0
        ? parsedMaxSessions
        : DEFAULT_MAX_SSE_SESSIONS;

    const httpContext = createCliHttpApp({
      apiConfig,
      cache,
      host,
      allowedOrigins: parseCommaSeparatedList(process.env.MCP_ALLOWED_ORIGINS),
      allowedHosts: parseCommaSeparatedList(process.env.MCP_ALLOWED_HOSTS),
      maxSessions,
      debug,
    });

    process.on("SIGTERM", () => {
      debug("SIGTERM received, closing SSE connections...");
      httpContext.closeAll();
    });

    const port = serverConfig.httpPort;
    httpContext.app.listen(port, host, () =>
      console.error(
        `${SERVER_NAME} v${SERVER_VERSION} started on HTTP+SSE transport (port ${port}) [${host}]`
      )
    );
  } else {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error(
      `${SERVER_NAME} v${SERVER_VERSION} started on stdio transport`
    );
  }
}

const cleanup = async () => {
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
