/**
 * Server-Sent Events (SSE) handler for Cloudflare Workers
 * Implements MCP protocol over SSE for real-time communication
 */

import { Env, handleMCPRequest, corsHeaders } from "../adapters/cloudflare.js";
import { SERVER_VERSION } from "../config/index.js";
import { MCPRequest } from "../types/index.js";
import { TIMEOUTS } from "../config/timeouts.js";
import { createLogger } from "../infrastructure/logger.js";
import type { RequestContext } from "../infrastructure/tracing.js";
import { maskSensitiveText } from "../shared/log-redaction.js";
import "./types.js";

const sseLogger = createLogger("worker-sse");

type SSECloseReason = "timeout" | "abort" | "closed" | "error";

const SSE_STREAM_HIGH_WATER_MARK = 16;

/**
 * Handle SSE endpoint for real-time MCP communication
 * Creates a streaming connection for server-sent events
 */
export async function handleSSEEndpoint(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
  requestContext?: RequestContext
): Promise<Response> {
  // Check if client accepts SSE (relaxed for MCP connectors)
  const acceptHeader = request.headers.get("Accept");
  if (
    acceptHeader &&
    !acceptHeader.includes("text/event-stream") &&
    !acceptHeader.includes("*/*")
  ) {
    return new Response("SSE endpoint requires Accept: text/event-stream", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const encoder = new TextEncoder();

  // SSE headers
  const sseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...corsHeaders,
  };

  let closed = false;
  let pingInterval: ReturnType<typeof setInterval> | undefined;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  let resolveDone!: () => void;

  const donePromise = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  ctx?.waitUntil(donePromise);

  const cleanup = (reason: SSECloseReason): void => {
    if (closed) {
      return;
    }
    closed = true;

    try {
      if (pingInterval !== undefined) {
        clearInterval(pingInterval);
        pingInterval = undefined;
      }
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
      if (abortListener && request.signal) {
        request.signal.removeEventListener("abort", abortListener);
        abortListener = undefined;
      }

      if (reason !== "closed" && streamController) {
        try {
          if (reason === "abort") {
            streamController.error(new Error("SSE client disconnected"));
          } else {
            streamController.close();
          }
        } catch {
          // Ignore errors when controller is already closed, cancelled, or errored
        }
      }
    } finally {
      // Always settle ctx.waitUntil immediately without awaiting consumer drainage
      resolveDone();
    }
  };

  const sendSSEMessage = (
    data: unknown,
    event?: string,
    id?: string,
    options?: { dropOnBackpressure?: boolean }
  ): boolean => {
    if (closed || !streamController) {
      return false;
    }

    if (
      options?.dropOnBackpressure &&
      streamController.desiredSize !== null &&
      streamController.desiredSize <= 0
    ) {
      // Drop heartbeat frames cleanly when consumer stops draining the buffer
      return true;
    }

    let message = "";
    if (id) message += `id: ${id}\n`;
    if (event) message += `event: ${event}\n`;
    message += `data: ${JSON.stringify(data)}\n\n`;

    try {
      streamController.enqueue(encoder.encode(message));
      return true;
    } catch (error) {
      sseLogger.error(
        "sse.write_error",
        { error: maskSensitiveText(error instanceof Error ? error.message : String(error)) },
        requestContext?.requestId
      );
      cleanup("error");
      return false;
    }
  };

  const readable = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        streamController = controller;

        if (request.signal) {
          if (request.signal.aborted) {
            cleanup("abort");
            return;
          }
          abortListener = () => cleanup("abort");
          request.signal.addEventListener("abort", abortListener, { once: true });
        }

        // Arm connection timeout cleanly so stalled clients always close & settle waitUntil
        timeoutHandle = setTimeout(() => {
          sseLogger.info(
            "sse.connection_timeout",
            { reason: "timeout" },
            requestContext?.requestId
          );
          cleanup("timeout");
        }, TIMEOUTS.SSE_CONNECTION_MS);
        (timeoutHandle as { unref?: () => void }).unref?.();

        // 1. IMMEDIATE CONNECTION EVENT
        if (
          !sendSSEMessage(
            {
              type: "connection",
              status: "connected",
              server: "mcp-dadosbr",
              version: SERVER_VERSION,
              timestamp: new Date().toISOString(),
            },
            "connection"
          ) ||
          closed
        ) {
          return;
        }

        // 2. EARLY CAPABILITIES RESPONSE
        if (
          !sendSSEMessage(
            {
              jsonrpc: "2.0",
              id: "init",
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: {},
                },
                serverInfo: {
                  name: "mcp-dadosbr",
                  version: SERVER_VERSION,
                },
              },
            },
            "message"
          ) ||
          closed
        ) {
          return;
        }

        // 3. HEARTBEAT MECHANISM (drop-on-backpressure avoids piling frames on stalled consumers)
        pingInterval = setInterval(() => {
          if (closed) {
            return;
          }
          sendSSEMessage(
            {
              type: "ping",
              timestamp: new Date().toISOString(),
            },
            "ping",
            undefined,
            { dropOnBackpressure: true }
          );
        }, TIMEOUTS.PING_INTERVAL_MS);
        (pingInterval as { unref?: () => void }).unref?.();

        // 4. HANDLE INCOMING POST REQUESTS
        if (request.method === "POST" && !closed) {
          void (async () => {
            try {
              const body = await request.text();
              if (body && !closed) {
                const mcpRequest: MCPRequest = JSON.parse(body);
                const response = await handleMCPRequest(mcpRequest, env, requestContext);
                if (!closed) {
                  sendSSEMessage(
                    response,
                    "message",
                    mcpRequest.id?.toString()
                  );
                }
              }
            } catch (error) {
              sseLogger.error(
                "sse.request_error",
                { error: maskSensitiveText(error instanceof Error ? error.message : String(error)) },
                requestContext?.requestId
              );
              if (!closed) {
                sendSSEMessage(
                  {
                    jsonrpc: "2.0",
                    id: null,
                    error: {
                      code: -32700,
                      message: "Parse error",
                      data:
                        error instanceof Error ? error.message : "Invalid JSON",
                    },
                  },
                  "error"
                );
              }
            }
          })();
        }
      },
      cancel() {
        cleanup("closed");
      },
    },
    { highWaterMark: SSE_STREAM_HIGH_WATER_MARK }
  );

  return new Response(readable, {
    status: 200,
    headers: sseHeaders,
  });
}
