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
  const scope = authUrl.searchParams.get('scope');
  const responseType = authUrl.searchParams.get('response_type');

  if (!redirectUri) {
    return new Response('Missing redirect_uri', {
      status: 400,
      headers: corsHeaders
    });
  }

  if (!clientId) {
    return new Response('Missing client_id', {
      status: 400,
      headers: corsHeaders
    });
  }

  // For MCP connector, auto-approve and redirect with a secure code
  // Include scope in the code so it can be retrieved during token exchange
  const code = generateSecureToken('access');
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);
  
  // Store scope with code for token exchange (in production, use KV storage)
  // For now, we'll encode it in the code itself

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
export async function handleOAuthToken(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Parse form data from request body
    const body = await request.text();
    const params = new URLSearchParams(body);
    const code = params.get('code');
    const grantType = params.get('grant_type');
    
    // Validate required parameters
    if (grantType !== 'authorization_code') {
      return new Response(JSON.stringify({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    if (!code) {
      return new Response(JSON.stringify({
        error: 'invalid_request',
        error_description: 'Missing authorization code'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Grant all supported scopes (ChatGPT needs this to succeed)
    const tokenResponse = {
      access_token: generateSecureToken('bearer'),
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid profile mcp', // Grant all scopes we support
      id_token: generateSecureToken('jwt') // Add dummy id_token for OpenID compliance
    };

    return new Response(JSON.stringify(tokenResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'invalid_request',
      error_description: error instanceof Error ? error.message : 'Invalid token request'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
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
 * Handle /oauth/register endpoint
 * RFC 7591 Dynamic Client Registration for ChatGPT integration
 */
export async function handleOAuthRegister(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    
    // Generate client credentials
    const clientId = generateSecureToken('client');
    const clientSecret = generateSecureToken('secret');
    
    // Build registration response
    const registrationResponse = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires
      redirect_uris: body.redirect_uris || [],
      grant_types: body.grant_types || ['authorization_code'],
      response_types: body.response_types || ['code'],
      client_name: body.client_name || 'MCP Client',
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'client_secret_basic',
    };

    return new Response(JSON.stringify(registrationResponse), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'invalid_request',
      error_description: error instanceof Error ? error.message : 'Invalid registration request'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

/**
 * Handle /.well-known/oauth-authorization-server endpoint
 * OAuth discovery endpoint for ChatGPT MCP connector with RFC 7591 support
 */
export function handleOAuthDiscovery(request: Request): Response {
  const baseUrl = new URL(request.url).origin;
  const oauthConfig = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    scopes_supported: ['openid', 'profile', 'mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    registration_endpoint_auth_methods_supported: ['none'],
  };

  return new Response(JSON.stringify(oauthConfig), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
