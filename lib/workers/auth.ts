/**
 * Authentication middleware for Cloudflare Workers
 */

import { Env, getCorsHeaders } from "../adapters/cloudflare.js";
import { createLogger } from "../infrastructure/logger.js";
import type { RequestContext } from "../infrastructure/tracing.js";

const authLogger = createLogger("worker-auth");

export interface AuthResult {
  authenticated: boolean;
  error?: Response;
}

export const PUBLIC_PATHS = new Set<string>([
  "/health",
  "/",
  "/openapi.json",
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid_configuration",
  "/.well-known/jwks.json",
]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

const textEncoder = new TextEncoder();

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = textEncoder.encode(a);
  const bufB = textEncoder.encode(b);
  const maxLen = Math.max(bufA.length, bufB.length);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Authenticate incoming request
 * Checks for API key in Authorization header or X-API-Key header
 * Skips authentication only for explicit public metadata/health paths
 */
export async function authenticateRequest(
  request: Request,
  env: Env,
  requestContext?: RequestContext
): Promise<AuthResult> {
  const url = new URL(request.url);
  if (isPublicPath(url.pathname)) {
    return { authenticated: true };
  }

  const expectedApiKey = env.MCP_API_KEY;
  if (typeof expectedApiKey === "string" && expectedApiKey.length > 0) {
    const authHeader = request.headers.get("Authorization");
    const apiKey = request.headers.get("X-API-Key");

    let providedKey: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      providedKey = authHeader.slice(7);
    } else if (apiKey) {
      providedKey = apiKey;
    }

    if (!providedKey || !constantTimeEqual(providedKey, expectedApiKey)) {
      authLogger.warn(
        "auth.unauthorized",
        {
          event: "auth_failure",
          status: 401,
          method: request.method,
          path: url.pathname,
          reason: providedKey ? "invalid_credentials" : "missing_credentials",
          authHeaderPresent: Boolean(authHeader),
          apiKeyHeaderPresent: Boolean(apiKey),
          clientIp: request.headers.get("CF-Connecting-IP") || "unknown",
        },
        requestContext?.requestId
      );
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
              ...getCorsHeaders(request, env),
            },
          }
        ),
      };
    }
  }

  return { authenticated: true };
}
