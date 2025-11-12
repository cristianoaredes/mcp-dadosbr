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

  // Handle the SSE connection asynchronously
  // Inspired by mcp-camara SSE implementation for robustness
  (async () => {
    let pingInterval: NodeJS.Timeout | undefined;
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      // 1. IMMEDIATE CONNECTION EVENT
      // Send connection established event BEFORE any initialization
      // This provides immediate feedback to the client (<100ms typically)
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

      // 2. EARLY CAPABILITIES RESPONSE
      // Send server capabilities immediately to keep stream alive
      // This prevents client timeout while server initializes
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

      // 3. HEARTBEAT MECHANISM
      // Keep connection alive with periodic pings every 30 seconds
      // This helps detect disconnections early and prevents timeout on idle connections
      pingInterval = setInterval(async () => {
        try {
          await sendSSEMessage(
            {
              type: "ping",
              timestamp: new Date().toISOString(),
            },
            "ping"
          );
        } catch (error) {
          console.error("SSE ping error:", error);
          if (pingInterval) clearInterval(pingInterval);
        }
      }, TIMEOUTS.PING_INTERVAL_MS);

      // 4. HANDLE INCOMING REQUESTS
      // Process POST requests with MCP commands
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
          console.error("SSE request processing error:", error);
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

      // 5. CONNECTION TIMEOUT
      // Close connection after configured timeout to respect Workers CPU time limit
      // Default: 50 seconds (configurable via MCP_SSE_TIMEOUT)
      // Note: Cloudflare Workers have a CPU time limit of ~50 seconds
      timeoutHandle = setTimeout(() => {
        console.log("SSE connection timeout reached, closing gracefully");
        if (pingInterval) clearInterval(pingInterval);
        writer.close();
      }, TIMEOUTS.SSE_CONNECTION_MS);
    } catch (error) {
      // 6. ERROR HANDLING
      // Log errors and notify client before closing
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
        ? error 
        : 'Unknown error occurred';
      
      console.error("SSE handler error:", errorMessage, error);
      
      try {
        await sendSSEMessage(
          {
            type: "error",
            message: errorMessage,
            timestamp: new Date().toISOString(),
          },
          "error"
        );
      } catch (sendError) {
        console.error("Failed to send error message:", sendError);
      }
      
      try {
        await writer.close();
      } catch (closeError) {
        console.error("Failed to close writer:", closeError);
      }
    } finally {
      // 7. GRACEFUL SHUTDOWN
      // Ensure all resources are cleaned up properly
      // This prevents resource leaks in Workers environment
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: sseHeaders,
  });
}
