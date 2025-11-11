#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createMCPServer } from "../core/mcp-server.js";
import { MemoryCache } from "../core/cache.js";
import { RateLimiter } from "../infrastructure/rate-limiter.js";
import {
  loadServerConfiguration,
  resolveApiConfig,
  SERVER_NAME,
  SERVER_VERSION
} from "../config/index.js";
import { TIMEOUTS } from "../config/timeouts.js";

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

    // Create rate limiter (30 requests per minute per IP)
    const rateLimiter = new RateLimiter({
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 30        // 30 requests per minute
    });

    // Rate limiting middleware
    const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const clientId = req.ip || req.socket.remoteAddress || "unknown";

      if (!rateLimiter.checkLimit(clientId)) {
        const resetTime = rateLimiter.getResetTime(clientId);
        const resetSeconds = Math.ceil(resetTime / 1000);

        // Mask IP address in production logs
        const logClientId = DEBUG ? clientId : "[masked]";
        console.error(`[RateLimit] Client ${logClientId} exceeded rate limit`);

        res.status(429).json({
          error: "Rate limit exceeded",
          message: `Too many requests. Please try again in ${resetSeconds} seconds.`,
          retryAfter: resetSeconds
        });
        return;
      }

      // Add rate limit headers
      const remaining = rateLimiter.getRemaining(clientId);
      res.header("X-RateLimit-Limit", "30");
      res.header("X-RateLimit-Remaining", remaining.toString());

      next();
    };

    // Store transports by session ID (SSE protocol with stateful sessions)
    // Inspired by mcp-camara for better connection management
    interface TransportSession {
      transport: SSEServerTransport;
      createdAt: Date;
      lastActivity: Date;
    }
    const transports: Record<string, TransportSession> = {};

    // Connection monitoring and cleanup
    // Periodically check for stale connections and clean them up
    const connectionMonitor = setInterval(() => {
      const now = new Date();
      const timeout = TIMEOUTS.SSE_CONNECTION_MS;

      for (const [sessionId, session] of Object.entries(transports)) {
        const age = now.getTime() - session.lastActivity.getTime();
        if (age > timeout) {
          debug(`Cleaning up stale SSE session ${sessionId} (age: ${age}ms)`);
          session.transport.close?.();
          delete transports[sessionId];
        }
      }

      const activeCount = Object.keys(transports).length;
      if (activeCount > 0) {
        debug(`Active SSE connections: ${activeCount}`);
      }
    }, TIMEOUTS.PING_INTERVAL_MS);

    // Cleanup on server shutdown
    process.on('SIGTERM', () => {
      debug('SIGTERM received, closing SSE connections...');
      clearInterval(connectionMonitor);
      for (const session of Object.values(transports)) {
        session.transport.close?.();
      }
    });

    // SSE endpoint - establishes the stream (GET)
    app.get("/mcp", rateLimitMiddleware, async (req, res) => {
      debug("GET /mcp - Establishing SSE stream");
      try {
        // Create a new SSE transport for this client
        // The endpoint for POST messages is '/messages'
        const transport = new SSEServerTransport("/messages", res);

        // Store transport by its session ID with metadata
        const sessionId = transport.sessionId;
        const now = new Date();
        transports[sessionId] = {
          transport,
          createdAt: now,
          lastActivity: now,
        };
        debug(`Created SSE transport with session ID: ${sessionId} (total sessions: ${Object.keys(transports).length})`);

        // Set up cleanup handler
        transport.onclose = () => {
          debug(`SSE transport closed for session ${sessionId}`);
          delete transports[sessionId];
        };

        // Create a new MCP server instance for this transport
        const server = createMCPServer({ apiConfig, cache });
        await server.connect(transport);
        debug(`MCP server connected to SSE transport ${sessionId}`);
      } catch (error) {
        debug("Error establishing SSE stream:", error);
        if (!res.headersSent) {
          res.status(500).send("Error establishing SSE stream");
        }
      }
    });

    // Messages endpoint - receives client JSON-RPC requests (POST)
    app.post("/messages", rateLimitMiddleware, async (req, res) => {
      debug("POST /messages");
      try {
        // Extract session ID from URL query parameter
        const sessionId = req.query.sessionId as string;

        if (!sessionId) {
          debug("No session ID provided in request");
          res.status(400).send("Missing sessionId parameter");
          return;
        }

        const session = transports[sessionId];
        if (!session) {
          debug(`No transport found for session: ${sessionId}`);
          res.status(404).send("Session not found");
          return;
        }

        // Update last activity timestamp to keep session alive
        session.lastActivity = new Date();

        // Handle the POST message with the transport
        await session.transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        debug("Error handling message:", error);
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
