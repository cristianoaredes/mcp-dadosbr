/**
 * Server-Sent Events (SSE) handler for Cloudflare Workers
 * Implements MCP protocol over SSE for real-time communication
 */

import { Env, handleMCPRequest, corsHeaders } from "../adapters/cloudflare.js";
import { MCPRequest } from "../types/index.js";
import { TIMEOUTS } from "../config/timeouts.js";

/**
 * Handle SSE endpoint for real-time MCP communication
 * Creates a streaming connection for server-sent events
 */
export async function handleSSEEndpoint(
  request: Request,
  env: Env
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

  // Create SSE response stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // SSE headers
  const sseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...corsHeaders,
  };

  // Send initial connection event
  const sendSSEMessage = async (data: unknown, event?: string, id?: string) => {
    let message = "";
    if (id) message += `id: ${id}\n`;
    if (event) message += `event: ${event}\n`;
    message += `data: ${JSON.stringify(data)}\n\n`;

    try {
      await writer.write(encoder.encode(message));
    } catch (error) {
      console.error("SSE write error:", error);
    }
  };

  // Handle the SSE connection
  (async () => {
    try {
      // Send connection established event
      await sendSSEMessage(
        {
          type: "connection",
          status: "connected",
          server: "mcp-dadosbr",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        },
        "connection"
      );

      // Send server capabilities
      await sendSSEMessage(
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
              version: "1.0.0",
            },
          },
        },
        "message"
      );

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(async () => {
        try {
          await sendSSEMessage(
            {
              type: "ping",
              timestamp: new Date().toISOString(),
            },
            "ping"
          );
        } catch (error) {
          clearInterval(pingInterval);
        }
      }, TIMEOUTS.PING_INTERVAL_MS); // Ping periodically to keep connection alive

      // Handle incoming messages from request body (if any)
      if (request.method === "POST") {
        try {
          const body = await request.text();
          if (body) {
            const mcpRequest: MCPRequest = JSON.parse(body);

            const response = await handleMCPRequest(mcpRequest, env);
            await sendSSEMessage(
              response,
              "message",
              mcpRequest.id?.toString()
            );
          }
        } catch (error) {
          await sendSSEMessage(
            {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32700,
                message: "Parse error",
                data: error instanceof Error ? error.message : "Invalid JSON",
              },
            },
            "error"
          );
        }
      }

      // Clean up on connection close
      setTimeout(() => {
        clearInterval(pingInterval);
        writer.close();
      }, TIMEOUTS.SSE_CONNECTION_MS); // Close after configured inactivity period
    } catch (error) {
      console.error("SSE handler error:", error);
      await sendSSEMessage(
        {
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        "error"
      );
      writer.close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: sseHeaders,
  });
}
