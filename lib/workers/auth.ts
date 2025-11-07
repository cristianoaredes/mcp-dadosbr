/**
 * Authentication middleware for Cloudflare Workers
 */

import { Env } from "../adapters/cloudflare.js";
import { corsHeaders } from "../adapters/cloudflare.js";

export interface AuthResult {
  authenticated: boolean;
  error?: Response;
}

/**
 * Authenticate incoming request
 * Checks for API key in Authorization header or X-API-Key header
 * Skips authentication for public endpoints (health, OAuth, etc.)
 */
export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<AuthResult> {
  // Skip authentication for health checks, OAuth endpoints, and MCP protocol endpoints
  const url = new URL(request.url);
  if (
    url.pathname === "/health" ||
    url.pathname === "/mcp" ||
    url.pathname === "/sse" ||
    url.pathname.startsWith("/oauth/") ||
    url.pathname.startsWith("/.well-known/") ||
    url.pathname === "/openapi.json"
  ) {
    return { authenticated: true };
  }

  // Check for API key if configured
  const expectedApiKey = env.MCP_API_KEY;
  if (expectedApiKey) {
    const authHeader = request.headers.get("Authorization");
    const apiKey = request.headers.get("X-API-Key");

    let providedKey: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      providedKey = authHeader.substring(7);
    } else if (apiKey) {
      providedKey = apiKey;
    }

    if (!providedKey || providedKey !== expectedApiKey) {
      return {
        authenticated: false,
        error: new Response(
          JSON.stringify({
            error: "Unauthorized",
            message:
              "Valid API key required. Provide via 'Authorization: Bearer <key>' or 'X-API-Key: <key>' header.",
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": "Bearer",
              ...corsHeaders,
            },
          }
        ),
      };
    }
  }

  return { authenticated: true };
}
