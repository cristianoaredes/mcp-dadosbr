#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createMCPServer } from "../core/mcp-server.js";
import { MemoryCache } from "../core/cache.js";
import {
  loadServerConfiguration,
  resolveApiConfig,
  SERVER_NAME,
  SERVER_VERSION
} from "../config/index.js";

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
  MCP_TRANSPORT        Transport mode: stdio (default) or http
  MCP_HTTP_PORT        HTTP server port (default: 3000)
  CNPJ_API_BASE_URL    Custom CNPJ API base URL
  CEP_API_BASE_URL     Custom CEP API base URL
  API_KEY_HEADER       Authentication header name
  API_KEY_VALUE        Authentication header value

Examples:
  mcp-dadosbr                                    # Start with stdio transport
  MCP_TRANSPORT=http mcp-dadosbr                 # Start with HTTP transport
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
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") return res.sendStatus(200);
      next();
    });

    // Store transports by session ID (SSE protocol with stateful sessions)
    const transports: Record<string, SSEServerTransport> = {};

    // SSE endpoint - establishes the stream (GET)
    app.get("/mcp", async (req, res) => {
      console.error(`[DEBUG] GET /mcp - Establishing SSE stream`);
      try {
        // Create a new SSE transport for this client
        // The endpoint for POST messages is '/messages'
        const transport = new SSEServerTransport("/messages", res);
        
        // Store transport by its session ID
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;
        console.error(`[DEBUG] Created SSE transport with session ID: ${sessionId}`);

        // Set up cleanup handler
        transport.onclose = () => {
          console.error(`[DEBUG] SSE transport closed for session ${sessionId}`);
          delete transports[sessionId];
        };

        // Create a new MCP server instance for this transport
        const server = createMCPServer({ apiConfig, cache });
        await server.connect(transport);
        console.error(`[DEBUG] MCP server connected to SSE transport ${sessionId}`);
      } catch (error) {
        console.error("[DEBUG] Error establishing SSE stream:", error);
        if (!res.headersSent) {
          res.status(500).send("Error establishing SSE stream");
        }
      }
    });

    // Messages endpoint - receives client JSON-RPC requests (POST)
    app.post("/messages", async (req, res) => {
      console.error(`[DEBUG] POST /messages`);
      try {
        // Extract session ID from URL query parameter
        const sessionId = req.query.sessionId as string;
        
        if (!sessionId) {
          console.error("[DEBUG] No session ID provided in request");
          res.status(400).send("Missing sessionId parameter");
          return;
        }

        const transport = transports[sessionId];
        if (!transport) {
          console.error(`[DEBUG] No transport found for session: ${sessionId}`);
          res.status(404).send("Session not found");
          return;
        }

        // Handle the POST message with the transport
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        console.error("[DEBUG] Error handling message:", error);
        if (!res.headersSent) {
          res.status(500).send("Error handling request");
        }
      }
    });

    const port = serverConfig.httpPort;
    app.listen(port, () =>
      console.error(
        `${SERVER_NAME} v${SERVER_VERSION} started on HTTP+SSE transport (port ${port})`
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
