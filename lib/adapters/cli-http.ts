import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import type http from "node:http";
import { createMCPServer } from "../core/mcp-server.js";
import { RateLimiter } from "../infrastructure/rate-limiter.js";
import { createLogger } from "../infrastructure/logger.js";
import {
  extractRequestId,
  REQUEST_ID_HEADER,
  RequestContext,
} from "../infrastructure/tracing.js";
import { maskSensitiveText } from "../shared/log-redaction.js";
import { ApiConfig, Cache } from "../types/index.js";

const cliHttpLogger = createLogger("cli-http");
import { TIMEOUTS } from "../config/timeouts.js";

export const DEFAULT_CLI_HTTP_HOST = "127.0.0.1";
export const DEFAULT_MAX_SSE_SESSIONS = 100;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SESSION_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

export interface TransportSession {
  transport: SSEServerTransport;
  createdAt: Date;
  lastActivity: Date;
}

export interface CliHttpOptions {
  apiConfig: ApiConfig;
  cache: Cache;
  host?: string;
  apiKey?: string;
  allowedOrigins?: string[];
  allowedHosts?: string[];
  maxSessions?: number;
  rateLimitWindowMs?: number;
  rateLimitMaxRequests?: number;
  debug?: (...args: unknown[]) => void;
}

export interface CliHttpContext {
  app: express.Express;
  transports: Map<string, TransportSession>;
  rateLimiter: RateLimiter;
  closeAll: () => void;
}

export function parseCommaSeparatedList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Normalize an HTTP Host header into a lowercase hostname (without port or IPv6 brackets),
 * rejecting malformed, whitespace-containing, or path/credential-smuggling values.
 */
export function normalizeHostHeader(hostHeader?: string): string | null {
  if (!hostHeader || typeof hostHeader !== "string") {
    return null;
  }

  const trimmed = hostHeader.trim().toLowerCase();
  if (!trimmed || /[\s/@\\?#]/.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith("[")) {
    const match = /^\[([a-f0-9:.]+)\](?::(\d{1,5}))?$/.exec(trimmed);
    if (!match) {
      return null;
    }
    if (match[2] !== undefined) {
      const port = Number(match[2]);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return null;
      }
    }
    return match[1];
  }

  const firstColon = trimmed.indexOf(":");
  if (firstColon === -1) {
    return trimmed;
  }

  const lastColon = trimmed.lastIndexOf(":");
  if (firstColon !== lastColon) {
    // Reject unbracketed IPv6 or multi-colon strings.
    return null;
  }

  const hostname = trimmed.slice(0, firstColon);
  const portStr = trimmed.slice(firstColon + 1);
  if (!hostname || !/^\d{1,5}$/.test(portStr)) {
    return null;
  }
  const port = Number(portStr);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }
  return hostname;
}

export function isAllowedCliHost(
  hostHeader: string | undefined,
  bindHost?: string,
  extraAllowedHosts?: string[],
): boolean {
  const host = normalizeHostHeader(hostHeader);
  if (!host) {
    return false;
  }

  if (LOOPBACK_HOSTS.has(host)) {
    return true;
  }

  if (bindHost) {
    const normalizedBind = normalizeHostHeader(bindHost);
    if (
      normalizedBind &&
      normalizedBind !== "0.0.0.0" &&
      normalizedBind !== "::" &&
      host === normalizedBind
    ) {
      return true;
    }
  }

  if (extraAllowedHosts && extraAllowedHosts.length > 0) {
    for (const rawAllowed of extraAllowedHosts) {
      const normalized = normalizeHostHeader(rawAllowed);
      if (normalized && normalized !== "*" && normalized !== "0.0.0.0" && normalized !== "::") {
        if (host === normalized) {
          return true;
        }
      }
    }
  }

  return false;
}

export function isAllowedCliOrigin(
  originHeader: string | undefined,
  allowedOrigins?: string[],
): { allowed: boolean; allowOriginHeader?: string } {
  if (originHeader === undefined) {
    return { allowed: true };
  }

  if (typeof originHeader !== "string") {
    return { allowed: false };
  }

  const trimmed = originHeader.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed === "*") {
    return { allowed: false };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { allowed: false };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { allowed: false };
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    trimmed.endsWith("/")
  ) {
    return { allowed: false };
  }

  const canonicalOrigin = parsed.origin;
  const nonEmptyAllowed = (allowedOrigins ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (nonEmptyAllowed.length > 0) {
    const exactMatches = nonEmptyAllowed.filter((entry) => entry !== "*");
    const matched = exactMatches.some(
      (entry) => entry.toLowerCase() === canonicalOrigin.toLowerCase(),
    );
    return matched ? { allowed: true, allowOriginHeader: canonicalOrigin } : { allowed: false };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
    return { allowed: true, allowOriginHeader: canonicalOrigin };
  }

  return { allowed: false };
}

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_REGEX.test(value);
}

/**
 * Return true only for explicit loopback bind hosts.
 */
export function isLoopbackHost(host: string): boolean {
  if (typeof host !== "string") {
    return false;
  }
  const normalized = host.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

/**
 * Constant-time API key comparison via SHA-256 digests so key length is never leaked.
 */
export function isValidApiKey(provided: string, expected: string): boolean {
  if (typeof provided !== "string" || typeof expected !== "string" || !provided || !expected) {
    return false;
  }
  const providedDigest = createHash("sha256").update(provided, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export function createCliHttpApp(options: CliHttpOptions): CliHttpContext {
  const bindHost = options.host ?? DEFAULT_CLI_HTTP_HOST;
  const apiKey =
    typeof options.apiKey === "string" && options.apiKey.trim().length > 0
      ? options.apiKey.trim()
      : undefined;

  if (!isLoopbackHost(bindHost) && !apiKey) {
    throw new Error(
      `Refusing to start HTTP/SSE server on non-loopback host "${bindHost}" without MCP_API_KEY`,
    );
  }

  const debug = options.debug ?? (() => {});
  const maxSessions =
    options.maxSessions !== undefined && Number.isFinite(options.maxSessions) && options.maxSessions > 0
      ? Math.floor(options.maxSessions)
      : DEFAULT_MAX_SSE_SESSIONS;

  const app = express();
  app.disable("x-powered-by");

  // Assign or propagate sanitized X-Request-Id across all CLI HTTP/SSE responses
  app.use((req, res, next) => {
    const requestContext = new RequestContext(extractRequestId(req.headers));
    res.locals.requestContext = requestContext;
    res.setHeader(REQUEST_ID_HEADER, requestContext.requestId);
    next();
  });

  // Defensive security headers across all responses (including 4xx/5xx)
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  // Anti-DNS-rebinding Host validation and strict Origin/CORS enforcement
  app.use((req, res, next) => {
    if (!isAllowedCliHost(req.headers.host, options.host, options.allowedHosts)) {
      res.status(403).json({
        error: "Forbidden",
        message: "Invalid or disallowed Host header",
      });
      return;
    }

    const rawOrigin = req.headers.origin;
    if (Array.isArray(rawOrigin)) {
      res.status(403).json({
        error: "Forbidden",
        message: "Invalid Origin header",
      });
      return;
    }

    const originCheck = isAllowedCliOrigin(rawOrigin, options.allowedOrigins);
    if (!originCheck.allowed) {
      res.status(403).json({
        error: "Forbidden",
        message: "Origin not allowed",
      });
      return;
    }

    if (originCheck.allowOriginHeader) {
      res.setHeader("Access-Control-Allow-Origin", originCheck.allowOriginHeader);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  // Require Bearer or X-API-Key authentication on all non-preflight routes when apiKey is configured
  if (apiKey) {
    app.use((req, res, next) => {
      const rawAuth = req.headers.authorization;
      const rawApiKey = req.headers["x-api-key"];

      let token: string | undefined;
      if (!Array.isArray(rawAuth) && !Array.isArray(rawApiKey)) {
        const trimmedAuth = typeof rawAuth === "string" ? rawAuth.trim() : "";
        const bearerMatch = trimmedAuth ? /^bearer\s+(.+)$/i.exec(trimmedAuth) : null;
        if (bearerMatch) {
          const candidate = bearerMatch[1].trim();
          if (candidate.length > 0) {
            token = candidate;
          }
        } else if (typeof rawApiKey === "string" && rawApiKey.trim().length > 0) {
          token = rawApiKey.trim();
        }
      }

      if (!token || !isValidApiKey(token, apiKey)) {
        const requestContext = res.locals.requestContext as RequestContext | undefined;
        cliHttpLogger.warn(
          "auth.unauthorized",
          { path: req.path },
          requestContext?.requestId,
        );
        res.setHeader("WWW-Authenticate", "Bearer");
        res.status(401).json({
          error: "Unauthorized",
          message: "Valid API key required",
        });
        return;
      }

      next();
    });
  }

  // Parse JSON payloads only after security headers, Host, and Origin checks pass
  app.use(express.json({ limit: "1mb" }));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const errorObj = err as { type?: string } | undefined;
      if (errorObj?.type === "entity.too.large") {
        res.status(413).json({
          error: "Payload Too Large",
          message: "Request body exceeds 1MB limit",
        });
        return;
      }
      if (err instanceof SyntaxError || errorObj?.type === "entity.parse.failed") {
        res.status(400).json({
          error: "Bad Request",
          message: "Invalid JSON payload",
        });
        return;
      }
      next(err);
    },
  );

  const rateLimiter = new RateLimiter({
    windowMs: options.rateLimitWindowMs ?? 60 * 1000,
    maxRequests: options.rateLimitMaxRequests ?? 30,
  });

  const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientId = req.ip || req.socket.remoteAddress || "unknown";

    if (!rateLimiter.checkLimit(clientId)) {
      const requestContext = res.locals.requestContext as RequestContext | undefined;
      const resetTime = rateLimiter.getResetTime(clientId);
      const resetSeconds = Math.ceil(resetTime / 1000);
      const logClientId = process.env.NODE_ENV !== "production" ? clientId : "[masked]";
      cliHttpLogger.warn(
        "http.rate_limited",
        { clientId: logClientId, path: req.path, retryAfter: resetSeconds },
        requestContext?.requestId,
      );

      res.status(429).json({
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again in ${resetSeconds} seconds.`,
        retryAfter: resetSeconds,
      });
      return;
    }

    const remaining = rateLimiter.getRemaining(clientId);
    res.setHeader("X-RateLimit-Limit", String(options.rateLimitMaxRequests ?? 30));
    res.setHeader("X-RateLimit-Remaining", remaining.toString());

    next();
  };

  // Use Map instead of plain object to prevent Object.prototype key collisions
  const transports = new Map<string, TransportSession>();

  const connectionMonitor = setInterval(() => {
    const now = Date.now();
    const timeout = TIMEOUTS.SSE_CONNECTION_MS;

    for (const [sessionId, session] of transports.entries()) {
      const age = now - session.lastActivity.getTime();
      if (age > timeout) {
        debug(`Cleaning up stale SSE session ${sessionId} (age: ${age}ms)`);
        session.transport.close?.();
        transports.delete(sessionId);
      }
    }

    if (transports.size > 0) {
      debug(`Active SSE connections: ${transports.size}`);
    }
  }, TIMEOUTS.PING_INTERVAL_MS);
  connectionMonitor.unref?.();

  let closed = false;
  const closeAll = () => {
    if (closed) {
      return;
    }
    closed = true;
    clearInterval(connectionMonitor);
    rateLimiter.dispose();
    for (const session of transports.values()) {
      try {
        session.transport.close?.();
      } catch {
        // Ignore individual session close errors during drain
      }
    }
    transports.clear();
  };

  // SSE endpoint - establishes the stream (GET)
  app.get("/mcp", rateLimitMiddleware, async (req, res) => {
    const requestContext =
      (res.locals.requestContext as RequestContext | undefined) ??
      new RequestContext(extractRequestId(req.headers));
    if (!res.headersSent) {
      res.setHeader(REQUEST_ID_HEADER, requestContext.requestId);
    }
    debug("GET /mcp - Establishing SSE stream");
    if (transports.size >= maxSessions) {
      cliHttpLogger.warn(
        "sse.max_sessions_reached",
        { activeSessions: transports.size, maxSessions },
        requestContext.requestId,
      );
      res.status(503).json({
        error: "Service Unavailable",
        message: "Maximum active SSE sessions reached",
      });
      return;
    }

    try {
      const transport = new SSEServerTransport("/messages", res);
      const sessionId = transport.sessionId;
      const now = new Date();
      transports.set(sessionId, {
        transport,
        createdAt: now,
        lastActivity: now,
      });
      debug(`Created SSE transport with session ID: ${sessionId} (total sessions: ${transports.size})`);
      cliHttpLogger.info(
        "sse.session_connected",
        { activeSessions: transports.size },
        requestContext.requestId,
      );

      transport.onclose = () => {
        debug(`SSE transport closed for session ${sessionId}`);
        transports.delete(sessionId);
        cliHttpLogger.info(
          "sse.session_closed",
          { activeSessions: transports.size },
          requestContext.requestId,
        );
      };

      const server = createMCPServer({ apiConfig: options.apiConfig, cache: options.cache });
      await server.connect(transport);
      debug(`MCP server connected to SSE transport ${sessionId}`);
    } catch (error) {
      debug("Error establishing SSE stream:", error);
      cliHttpLogger.error(
        "sse.connection_error",
        { error: maskSensitiveText(error instanceof Error ? error.message : String(error)) },
        requestContext.requestId,
      );
      if (!res.headersSent) {
        res.status(500).send("Error establishing SSE stream");
      }
    }
  });

  // Messages endpoint - receives client JSON-RPC requests (POST)
  app.post("/messages", rateLimitMiddleware, async (req, res) => {
    const requestContext =
      (res.locals.requestContext as RequestContext | undefined) ??
      new RequestContext(extractRequestId(req.headers));
    if (!res.headersSent) {
      res.setHeader(REQUEST_ID_HEADER, requestContext.requestId);
    }
    debug("POST /messages");
    try {
      const sessionId = req.query.sessionId;
      if (!isValidSessionId(sessionId)) {
        debug("Invalid or missing sessionId parameter in request");
        cliHttpLogger.warn(
          "http.invalid_session_id",
          { path: "/messages" },
          requestContext.requestId,
        );
        res.status(400).json({
          error: "Bad Request",
          message: "Invalid or missing sessionId parameter",
        });
        return;
      }

      const session = transports.get(sessionId);
      if (!session) {
        debug(`No transport found for session: ${sessionId}`);
        cliHttpLogger.warn(
          "http.session_not_found",
          { path: "/messages" },
          requestContext.requestId,
        );
        res.status(404).json({
          error: "Not Found",
          message: "Session not found",
        });
        return;
      }

      session.lastActivity = new Date();
      await session.transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      debug("Error handling message:", error);
      cliHttpLogger.error(
        "http.message_error",
        { error: maskSensitiveText(error instanceof Error ? error.message : String(error)) },
        requestContext.requestId,
      );
      if (!res.headersSent) {
        res.status(500).send("Error handling request");
      }
    }
  });

  return {
    app,
    transports,
    rateLimiter,
    closeAll,
  };
}

export interface GracefulShutdownOptions {
  server?: Pick<http.Server, "listening" | "close"> & {
    closeIdleConnections?: () => void;
  };
  httpContext?: Pick<CliHttpContext, "closeAll">;
  mcpServer?: { close?: () => Promise<void> | void };
  cache?: { clear?: () => Promise<void> | void };
  timeoutMs?: number;
  logger?: (...args: unknown[]) => void;
  onExit?: (code: number) => void;
}

/**
 * Create an idempotent graceful shutdown coordinator that drains SSE sessions,
 * closes the HTTP server, shuts down the MCP server, and clears caches within a bounded timeout.
 */
export function createGracefulShutdown(
  options: GracefulShutdownOptions,
): (signal?: string) => Promise<void> {
  const timeoutMs =
    options.timeoutMs !== undefined && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs
      : 5000;
  const logger = options.logger ?? (() => {});

  let shutdownPromise: Promise<void> | undefined;
  let exited = false;

  const finishExit = (code: number) => {
    if (exited) {
      return;
    }
    exited = true;
    options.onExit?.(code);
  };

  return (signal?: string) => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      logger(`Shutting down gracefully${signal ? ` (${signal})` : ""}...`);

      let forceTimer: ReturnType<typeof setTimeout> | undefined;
      let timedOut = false;

      const drainPromise = (async () => {
        try {
          options.httpContext?.closeAll();
        } catch {
          // Best-effort SSE session cleanup
        }

        if (options.server?.listening) {
          await new Promise<void>((resolve) => {
            try {
              options.server!.close(() => resolve());
              options.server!.closeIdleConnections?.();
            } catch {
              resolve();
            }
          });
        }

        try {
          await options.mcpServer?.close?.();
        } catch {
          // Best-effort MCP server close
        }

        try {
          await options.cache?.clear?.();
        } catch {
          // Best-effort cache clear
        }
      })();

      const timeoutPromise = new Promise<void>((resolve) => {
        forceTimer = setTimeout(() => {
          timedOut = true;
          resolve();
        }, timeoutMs);
        forceTimer.unref?.();
      });

      try {
        await Promise.race([drainPromise, timeoutPromise]);
      } finally {
        if (forceTimer !== undefined) {
          clearTimeout(forceTimer);
          forceTimer = undefined;
        }
      }

      finishExit(timedOut ? 1 : 0);
    })();

    return shutdownPromise;
  };
}
