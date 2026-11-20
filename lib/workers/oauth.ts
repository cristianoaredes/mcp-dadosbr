/**
 * OAuth endpoints for Cloudflare Workers — fail-closed (disabled)
 */

import { Env, corsHeaders, getCorsHeaders } from '../adapters/cloudflare.js';

const OAUTH_DISABLED_BODY = JSON.stringify({
  error: 'oauth_not_supported',
  error_description:
    "OAuth 2.0 is disabled on this server. Authenticate with MCP_API_KEY via 'Authorization: Bearer <key>' or 'X-API-Key: <key>'.",
});

function oauthNotSupportedResponse(request?: Request, env?: Env): Response {
  const cors = request ? getCorsHeaders(request, env) : corsHeaders;
  return new Response(OAUTH_DISABLED_BODY, {
    status: 501,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...cors,
    },
  });
}

export function handleOAuthAuthorize(request?: Request, env?: Env): Response {
  return oauthNotSupportedResponse(request, env);
}

export async function handleOAuthToken(request?: Request, env?: Env): Promise<Response> {
  return oauthNotSupportedResponse(request, env);
}

export function handleOAuthUserInfo(request?: Request, env?: Env): Response {
  return oauthNotSupportedResponse(request, env);
}

export function handleJWKS(request?: Request, env?: Env): Response {
  return oauthNotSupportedResponse(request, env);
}

export async function handleOAuthRegister(request?: Request, env?: Env): Promise<Response> {
  return oauthNotSupportedResponse(request, env);
}

export function handleOAuthDiscovery(request?: Request, env?: Env): Response {
  return oauthNotSupportedResponse(request, env);
}
