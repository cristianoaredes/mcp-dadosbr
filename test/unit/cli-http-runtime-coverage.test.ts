import http from "node:http";
import type net from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { MemoryCache } from "../../lib/core/cache.js";
import {
  createCliHttpApp,
  createGracefulShutdown,
  isAllowedCliHost,
  isAllowedCliOrigin,
  normalizeHostHeader,
  parseCommaSeparatedList,
  type CliHttpContext,
  type CliHttpOptions,
} from "../../lib/adapters/cli-http.js";

interface HttpTestResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function sendRawHttpRequest(
  port: number,
  options: {
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
  } = {},
): Promise<HttpTestResponse> {
  return new Promise((resolvePromise, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method: options.method ?? "GET",
        path: options.path ?? "/messages",
        headers: {
          Host: `127.0.0.1:${port}`,
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolvePromise({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    if (options.body !== undefined) {
      req.write(options.body);
    }
    req.end();
  });
}

describe("TCK-0039 / FND-0024: CLI HTTP/SSE runtime, error paths & graceful shutdown", () => {
  const originalEnv = { ...process.env };
  const activeServers: Array<{ server: http.Server; ctx: CliHttpContext }> = [];

  async function startTestServer(overrides: Partial<CliHttpOptions> = {}) {
    const apiConfig = resolveApiConfig();
    const cache = new MemoryCache(50, 60_000);
    const ctx = createCliHttpApp({
      apiConfig,
      cache,
      host: "127.0.0.1",
      ...overrides,
    });
    const server = http.createServer(ctx.app);
    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", () => resolvePromise());
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      throw new Error("Unexpected server address");
    }
    activeServers.push({ server, ctx });
    return { port: addr.port, ctx, server, cache };
  }

  afterEach(async () => {
    while (activeServers.length > 0) {
      const entry = activeServers.pop()!;
      entry.ctx.closeAll();
      entry.server.closeIdleConnections?.();
      await new Promise<void>((resolvePromise) => {
        entry.server.close(() => resolvePromise());
      });
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
    process.env = { ...originalEnv };
  });

  describe("Host/Origin parsing and extraAllowedHosts allowlist", () => {
    it("parses comma-separated lists and trims/filters blank entries", () => {
      expect(parseCommaSeparatedList(undefined)).toEqual([]);
      expect(parseCommaSeparatedList("")).toEqual([]);
      expect(parseCommaSeparatedList("  ,  ")).toEqual([]);
      expect(
        parseCommaSeparatedList("  app.internal , , api.internal:8443 , "),
      ).toEqual(["app.internal", "api.internal:8443"]);
    });

    it("rejects malformed Host and Origin edge cases cleanly", () => {
      expect(normalizeHostHeader("[not-ipv6]")).toBeNull();
      expect(normalizeHostHeader("[::1]:0")).toBeNull();
      expect(normalizeHostHeader("[::1]:65536")).toBeNull();
      expect(normalizeHostHeader("::1")).toBeNull();
      expect(normalizeHostHeader("example.com:abc")).toBeNull();
      expect(normalizeHostHeader(":8080")).toBeNull();

      expect(isAllowedCliOrigin(42 as unknown as string)).toEqual({ allowed: false });
      expect(isAllowedCliOrigin("http://[invalid")).toEqual({ allowed: false });
      expect(isAllowedCliOrigin("ftp://localhost:6274")).toEqual({ allowed: false });
      expect(isAllowedCliOrigin("http://localhost:6274/path")).toEqual({ allowed: false });
      expect(isAllowedCliOrigin("http://localhost:6274/")).toEqual({ allowed: false });
      expect(isAllowedCliOrigin("http://localhost:6274?a=1")).toEqual({ allowed: false });
      expect(isAllowedCliOrigin("http://localhost:6274#frag")).toEqual({ allowed: false });
      expect(isAllowedCliOrigin(["http://u", "p@localhost:6274"].join(":"))).toEqual({
        allowed: false,
      });
    });

    it("allows explicit bindHost and extraAllowedHosts while rejecting wildcards and spoofed hosts", async () => {
      expect(isAllowedCliHost("10.20.30.40:3000", "10.20.30.40")).toBe(true);
      expect(isAllowedCliHost("0.0.0.0", "0.0.0.0")).toBe(false);
      expect(
        isAllowedCliHost("api.internal:8443", "127.0.0.1", [
          "*",
          "0.0.0.0",
          "::",
          "bad host/",
          "api.internal",
        ]),
      ).toBe(true);
      expect(
        isAllowedCliHost("spoofed.internal", "127.0.0.1", ["api.internal"]),
      ).toBe(false);

      const { port } = await startTestServer({
        allowedHosts: ["custom.local", "*", "0.0.0.0", "::"],
      });

      const allowedWithoutPort = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=missing",
        headers: { Host: "custom.local" },
      });
      expect(allowedWithoutPort.status).toBe(404);

      const allowedWithPort = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=missing",
        headers: { Host: `custom.local:${port}` },
      });
      expect(allowedWithPort.status).toBe(404);

      for (const rejectedHost of ["spoofed.local", "0.0.0.0", "custom.local.evil.com"]) {
        const res = await sendRawHttpRequest(port, {
          method: "POST",
          path: "/messages?sessionId=missing",
          headers: { Host: rejectedHost },
        });
        expect(res.status).toBe(403);
        expect(JSON.parse(res.body)).toEqual({
          error: "Forbidden",
          message: "Invalid or disallowed Host header",
        });
      }
    });

    it("rejects array Origin headers with 403 Invalid Origin header", async () => {
      const ctx = createCliHttpApp({
        apiConfig: resolveApiConfig(),
        cache: new MemoryCache(10, 60_000),
        host: "127.0.0.1",
      });
      try {
        const fakeReq = Object.assign(Object.create(http.IncomingMessage.prototype), {
          method: "GET",
          url: "/mcp",
          headers: {
            host: "127.0.0.1:3000",
            origin: ["http://localhost:6274", "https://evil.example"],
          },
          socket: { remoteAddress: "127.0.0.1" } as net.Socket,
        }) as http.IncomingMessage;

        const chunks: Buffer[] = [];
        let statusCode = 0;
        const headers = new Map<string, string | string[]>();
        const fakeRes = {
          locals: {},
          headersSent: false,
          setHeader(name: string, value: string | string[]) {
            headers.set(name.toLowerCase(), value);
          },
          getHeader(name: string) {
            return headers.get(name.toLowerCase());
          },
          status(code: number) {
            statusCode = code;
            return this;
          },
          json(payload: unknown) {
            this.headersSent = true;
            chunks.push(Buffer.from(JSON.stringify(payload), "utf8"));
            return this;
          },
          sendStatus(code: number) {
            statusCode = code;
            this.headersSent = true;
            return this;
          },
        } as unknown as http.ServerResponse;

        await new Promise<void>((resolvePromise) => {
          (
            ctx.app as unknown as (
              req: http.IncomingMessage,
              res: http.ServerResponse,
              next: (err?: unknown) => void,
            ) => void
          )(fakeReq, fakeRes, () => resolvePromise());
          setImmediate(resolvePromise);
        });

        expect(statusCode).toBe(403);
        expect(JSON.parse(Buffer.concat(chunks).toString("utf8"))).toEqual({
          error: "Forbidden",
          message: "Invalid Origin header",
        });
      } finally {
        ctx.closeAll();
      }
    });
  });

  describe("JSON body limits (413 / 400) and rate limiting (429)", () => {
    it("returns 413 Payload Too Large above 1MB, 400 on malformed JSON, and passes non-JSON parser errors to Express", async () => {
      const { port } = await startTestServer();

      const oversizedPayload = JSON.stringify({ data: "a".repeat(1024 * 1024 + 512) });
      const tooLargeRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=abc",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(oversizedPayload)),
        },
        body: oversizedPayload,
      });
      expect(tooLargeRes.status).toBe(413);
      expect(JSON.parse(tooLargeRes.body)).toEqual({
        error: "Payload Too Large",
        message: "Request body exceeds 1MB limit",
      });

      const badJsonRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=abc",
        headers: { "Content-Type": "application/json" },
        body: "{not-valid-json",
      });
      expect(badJsonRes.status).toBe(400);
      expect(JSON.parse(badJsonRes.body)).toEqual({
        error: "Bad Request",
        message: "Invalid JSON payload",
      });

      // Unsupported encoding triggers body-parser error forwarded via next(err)
      const unsupportedEncodingRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=abc",
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "unknown-enc",
        },
        body: "{}",
      });
      expect(unsupportedEncodingRes.status).toBe(415);
    });

    it("enforces rateLimitMiddleware with 429 JSON retryAfter and masks clientId in production logs", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      process.env.NODE_ENV = "test";

      const { port: devPort } = await startTestServer({
        rateLimitWindowMs: 30_000,
        rateLimitMaxRequests: 2,
      });

      const first = await sendRawHttpRequest(devPort, {
        method: "POST",
        path: "/messages?sessionId=missing",
      });
      expect(first.status).toBe(404);
      expect(first.headers["x-ratelimit-limit"]).toBe("2");
      expect(first.headers["x-ratelimit-remaining"]).toBe("1");

      const second = await sendRawHttpRequest(devPort, {
        method: "POST",
        path: "/messages?sessionId=missing",
      });
      expect(second.status).toBe(404);
      expect(second.headers["x-ratelimit-remaining"]).toBe("0");

      const blockedDev = await sendRawHttpRequest(devPort, {
        method: "POST",
        path: "/messages?sessionId=missing",
      });
      expect(blockedDev.status).toBe(429);
      const blockedBody = JSON.parse(blockedDev.body) as {
        error: string;
        message: string;
        retryAfter: number;
      };
      expect(blockedBody.error).toBe("Rate limit exceeded");
      expect(blockedBody.retryAfter).toBeGreaterThanOrEqual(1);
      expect(blockedBody.message).toContain(`${blockedBody.retryAfter} seconds`);

      const devLogs = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(devLogs).toContain("http.rate_limited");
      expect(devLogs).toContain("127.0.0.1");

      // In production, rate-limited client IP must be masked in stderr logs
      errSpy.mockClear();
      process.env.NODE_ENV = "production";
      const { port: prodPort } = await startTestServer({
        rateLimitWindowMs: 30_000,
        rateLimitMaxRequests: 1,
      });

      await sendRawHttpRequest(prodPort, {
        method: "POST",
        path: "/messages?sessionId=missing",
      });
      const blockedProd = await sendRawHttpRequest(prodPort, {
        method: "POST",
        path: "/messages?sessionId=missing",
      });
      expect(blockedProd.status).toBe(429);

      const prodLogs = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(prodLogs).toContain("http.rate_limited");
      expect(prodLogs).toContain('"[masked]"');
      expect(prodLogs).not.toContain("127.0.0.1");
    });
  });

  describe("Live HTTP SSE lifecycle, session cleanup & error paths", () => {
    it("opens GET /mcp SSE stream, emits endpoint event, accepts POST /messages, enforces maxSessions 503, and deletes on close", async () => {
      const { port, ctx } = await startTestServer({
        maxSessions: 1,
        apiKey: "test-key-123",
      });

      let sseReq: http.ClientRequest | undefined;
      try {
        const { sessionId, firstMessagePromise, closeStream } = await new Promise<{
          sessionId: string;
          firstMessagePromise: Promise<string>;
          closeStream: () => void;
        }>((resolvePromise, rejectPromise) => {
          sseReq = http.get(
            {
              host: "127.0.0.1",
              port,
              path: "/mcp",
              headers: {
                Host: `127.0.0.1:${port}`,
                "X-API-Key": "test-key-123",
              },
            },
            (res) => {
              expect(res.statusCode).toBe(200);
              expect(res.headers["content-type"]).toContain("text/event-stream");

              let buffer = "";
              let resolvedEndpoint = false;
              let resolveMsg: ((data: string) => void) | undefined;
              const messagePromise = new Promise<string>((resMsg) => {
                resolveMsg = resMsg;
              });

              res.on("data", (chunk: Buffer) => {
                buffer += chunk.toString("utf8");
                if (!resolvedEndpoint) {
                  const match = /event: endpoint\ndata: \/messages\?sessionId=([^\n]+)/.exec(buffer);
                  if (match) {
                    resolvedEndpoint = true;
                    resolvePromise({
                      sessionId: match[1].trim(),
                      firstMessagePromise: messagePromise,
                      closeStream: () => {
                        res.destroy();
                        sseReq?.destroy();
                      },
                    });
                  }
                } else if (buffer.includes("event: message")) {
                  resolveMsg?.(buffer);
                }
              });
              res.on("error", () => {});
            },
          );
          sseReq.on("error", rejectPromise);
        });

        try {
          expect(ctx.transports.size).toBe(1);
          const session = ctx.transports.get(sessionId);
          expect(session).toBeDefined();
          const initialActivity = session!.lastActivity.getTime();

          // While 1 session is active (maxSessions: 1), a second GET /mcp returns 503
          const overflowRes = await sendRawHttpRequest(port, {
            method: "GET",
            path: "/mcp",
            headers: { Authorization: "Bearer test-key-123" },
          });
          expect(overflowRes.status).toBe(503);
          expect(JSON.parse(overflowRes.body)).toEqual({
            error: "Service Unavailable",
            message: "Maximum active SSE sessions reached",
          });

          // Small delay to ensure lastActivity timestamp advances measurably
          await new Promise((r) => setTimeout(r, 15));

          const rpcPayload = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: { name: "sse-raw-test", version: "1.0.0" },
            },
          });

          const postRes = await sendRawHttpRequest(port, {
            method: "POST",
            path: `/messages?sessionId=${encodeURIComponent(sessionId)}`,
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": "test-key-123",
            },
            body: rpcPayload,
          });
          expect(postRes.status).toBe(202);
          expect(session!.lastActivity.getTime()).toBeGreaterThanOrEqual(initialActivity);

          const sseOutput = await firstMessagePromise;
          expect(sseOutput).toContain("event: message");
          expect(sseOutput).toContain("mcp-dadosbr");
        } finally {
          closeStream();
        }

        await vi.waitFor(() => {
          expect(ctx.transports.size).toBe(0);
        });
      } finally {
        sseReq?.destroy();
      }
    });

    it("supports an authenticated SDK Client over SSEClientTransport end-to-end", async () => {
      const { port, ctx } = await startTestServer({
        apiKey: "test-key-123",
      });

      const sseTransport = new SSEClientTransport(
        new URL(`http://127.0.0.1:${port}/mcp`),
        {
          requestInit: {
            headers: { "X-API-Key": "test-key-123" },
          },
        },
      );
      const client = new Client({ name: "cli-http-sse-sdk-test", version: "1.0.0" });

      try {
        await client.connect(sseTransport);
        expect(ctx.transports.size).toBe(1);

        const toolResult = await client.callTool({
          name: "cpf_validate",
          arguments: { cpf: "00000000000" },
        });
        expect(toolResult.isError).toBeUndefined();
      } finally {
        await client.close();
        await vi.waitFor(() => {
          expect(ctx.transports.size).toBe(0);
        });
      }
    });

    it("handles GET /mcp catch paths (before and after headersSent) and POST /messages catch paths", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { port, ctx } = await startTestServer();

      // 1) GET /mcp fails BEFORE headersSent -> 500 "Error establishing SSE stream"
      vi.spyOn(SSEServerTransport.prototype, "start").mockRejectedValueOnce(
        new Error("sse handshake failed"),
      );
      const preHeaderSseErr = await sendRawHttpRequest(port, {
        method: "GET",
        path: "/mcp",
      });
      expect(preHeaderSseErr.status).toBe(500);
      expect(preHeaderSseErr.body).toBe("Error establishing SSE stream");

      // 2) GET /mcp fails AFTER headersSent -> catch skips res.status(500), logs sse.connection_error
      vi.spyOn(Server.prototype, "connect").mockImplementationOnce(async (transport) => {
        await transport.start();
        await transport.close();
        throw new Error("post-header connect failure");
      });
      const postHeaderSseErr = await sendRawHttpRequest(port, {
        method: "GET",
        path: "/mcp",
      });
      expect(postHeaderSseErr.status).toBe(200);

      // 3) POST /messages handlePostMessage throws BEFORE headersSent -> 500 "Error handling request"
      ctx.transports.set("err-pre", {
        transport: {
          handlePostMessage: vi.fn().mockRejectedValue(new Error("boom before headers")),
          close: vi.fn(),
        } as never,
        createdAt: new Date(),
        lastActivity: new Date(),
      });
      const postPreHeaderErr = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=err-pre",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(postPreHeaderErr.status).toBe(500);
      expect(postPreHeaderErr.body).toBe("Error handling request");

      // 4) POST /messages handlePostMessage throws AFTER sending 500 headers (unstarted SSEServerTransport)
      const unstartedTransport = new SSEServerTransport("/messages", {} as http.ServerResponse);
      ctx.transports.set("err-post", {
        transport: unstartedTransport,
        createdAt: new Date(),
        lastActivity: new Date(),
      });
      const postAfterHeaderErr = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=err-post",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(postAfterHeaderErr.status).toBe(500);
      expect(postAfterHeaderErr.body).toBe("SSE connection not established");

      const logs = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(logs).toContain("sse.connection_error");
      expect(logs).toContain("http.message_error");
    });
  });

  describe("createGracefulShutdown edge cases & timeout", () => {
    it("continues best-effort cleanup when closeAll/server.close/mcpServer.close/cache.clear fail", async () => {
      const onExit = vi.fn();
      const logger = vi.fn();

      const shutdown = createGracefulShutdown({
        httpContext: {
          closeAll: () => {
            throw new Error("closeAll failed");
          },
        },
        server: {
          listening: true,
          close: () => {
            throw new Error("server close failed");
          },
        } as unknown as http.Server,
        mcpServer: {
          close: async () => {
            throw new Error("mcp close failed");
          },
        },
        cache: {
          clear: async () => {
            throw new Error("cache clear failed");
          },
        },
        timeoutMs: -1, // falls back to default 5000ms
        logger,
        onExit,
      });

      await shutdown();

      expect(logger).toHaveBeenCalledWith("Shutting down gracefully...");
      expect(onExit).toHaveBeenCalledTimes(1);
      expect(onExit).toHaveBeenCalledWith(0);
    });

    it("exits with code 1 when shutdown timeout expires while server.close stalls", async () => {
      vi.useFakeTimers();

      const onExit = vi.fn();
      const closeIdleConnections = vi.fn();
      const close = vi.fn(); // never invokes callback -> stalls

      const shutdown = createGracefulShutdown({
        server: {
          listening: true,
          close,
          closeIdleConnections,
        } as unknown as http.Server,
        timeoutMs: 50,
        onExit,
      });

      const pending = shutdown("SIGINT");
      await vi.advanceTimersByTimeAsync(50);
      await pending;

      expect(close).toHaveBeenCalledTimes(1);
      expect(closeIdleConnections).toHaveBeenCalledTimes(1);
      expect(onExit).toHaveBeenCalledTimes(1);
      expect(onExit).toHaveBeenCalledWith(1);
    });
  });
});
