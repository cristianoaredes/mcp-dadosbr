/**
 * OAuth endpoints for MCP connector integration
 */

import { corsHeaders } from '../adapters/cloudflare.js';
import { generateSecureToken } from './tokens.js';

/**
 * Handle /oauth/authorize endpoint
 * Simple OAuth authorize endpoint with auto-approval for MCP connector
 */
export function handleOAuthAuthorize(request: Request): Response {
  const authUrl = new URL(request.url);
  const clientId = authUrl.searchParams.get('client_id');
  const redirectUri = authUrl.searchParams.get('redirect_uri');
  const state = authUrl.searchParams.get('state');

  if (!redirectUri) {
    return new Response('Missing redirect_uri', {
      status: 400,
      headers: corsHeaders
    });
  }

  // For MCP connector, auto-approve and redirect with a secure code
  const code = generateSecureToken('access');
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
      ...corsHeaders,
    },
  });
}

/**
 * Handle /oauth/token endpoint
 * OAuth token endpoint for exchanging authorization code for access token
 */
export function handleOAuthToken(request: Request): Response {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  const tokenResponse = {
    access_token: generateSecureToken('bearer'),
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'mcp'
  };

  return new Response(JSON.stringify(tokenResponse), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Handle /oauth/userinfo endpoint
 * OAuth userinfo endpoint for retrieving user information
 */
export function handleOAuthUserInfo(): Response {
  const userInfo = {
    sub: 'mcp-dadosbr-user',
    name: 'MCP DadosBR User',
    preferred_username: 'mcp-user'
  };

  return new Response(JSON.stringify(userInfo), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Handle /.well-known/jwks.json endpoint
 * JSON Web Key Set (dummy for MCP compatibility)
 */
export function handleJWKS(): Response {
  const jwks = {
    keys: []
  };

  return new Response(JSON.stringify(jwks), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Handle /.well-known/oauth-authorization-server endpoint
 * OAuth discovery endpoint for ChatGPT MCP connector
 */
export function handleOAuthDiscovery(request: Request): Response {
  const baseUrl = new URL(request.url).origin;
  const oauthConfig = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    scopes_supported: ['openid', 'profile', 'mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
  };

  return new Response(JSON.stringify(oauthConfig), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
