/**
 * Cloudflare Worker entry point for MCP DadosBR
 * Supports both HTTP JSON-RPC and Server-Sent Events (SSE) for remote MCP
 * Based on Cloudflare's MCP Agent documentation
 */

import {
  handleMCPEndpoint,
  handleCORS,
  handleHealthCheck,
  withCorsHeaders,
  syncWorkerEnv,
  corsHeaders,
  Env
} from '../adapters/cloudflare.js';
import { SERVER_VERSION } from '../config/index.js';
import { TOOL_DEFINITIONS } from '../core/tools.js';
import { authenticateRequest, isPublicPath } from './auth.js';
import { checkRateLimit } from './rate-limit.js';
import { handleSSEEndpoint } from './sse.js';
import {
  handleOAuthAuthorize,
  handleOAuthToken,
  handleOAuthUserInfo,
  handleOAuthRegister,
  handleJWKS,
  handleOAuthDiscovery
} from './oauth.js';
import { handleOpenAPIEndpoint } from './openapi.js';
import {
  handleLookupEndpoint,
  handleSearchEndpoint,
  handleIntelligenceEndpoint,
  handleThinkingEndpoint
} from './rest.js';
import { WorkerExportedHandler } from './types.js';

async function routeRequest(
  request: Request,
  env: Env,
  url: URL,
  ctx?: ExecutionContext
): Promise<Response> {
  switch (url.pathname) {
    case '/health':
      return handleHealthCheck(request, env);

    case '/mcp':
      // HTTP JSON-RPC endpoint
      if (request.method !== 'POST') {
        return new Response('Method not allowed', {
          status: 405,
          headers: corsHeaders,
        });
      }
      return await handleMCPEndpoint(request, env);

    case '/sse':
      // Server-Sent Events endpoint for streaming MCP
      if (request.method !== 'GET' && request.method !== 'POST') {
        return new Response('Method not allowed', {
          status: 405,
          headers: corsHeaders,
        });
      }
      return await handleSSEEndpoint(request, env, ctx);

    case '/.well-known/oauth-authorization-server':
    case '/.well-known/openid_configuration':
      return handleOAuthDiscovery(request, env);

    case '/oauth/authorize':
      return handleOAuthAuthorize(request, env);

    case '/oauth/token':
      return await handleOAuthToken(request, env);

    case '/oauth/register':
      return await handleOAuthRegister(request, env);

    case '/oauth/userinfo':
      return handleOAuthUserInfo(request, env);

    case '/.well-known/jwks.json':
      return handleJWKS(request, env);

    case '/openapi.json':
      return handleOpenAPIEndpoint(request, env);

    case '/': {
      // Root endpoint with basic info
      const info = {
        service: 'MCP DadosBR',
        description:
          'Model Context Protocol server for Brazilian public data',
        version: SERVER_VERSION,
        runtime: 'cloudflare-workers',
        free_tier: {
          workers: '100,000 requests/day',
          kv: '100,000 reads/day, 1,000 writes/day, 1GB storage',
          note: 'Perfect for MCP remote server hosting',
        },
        endpoints: {
          mcp: '/mcp (HTTP JSON-RPC)',
          sse: '/sse (Server-Sent Events)',
          health: '/health',
          openapi: '/openapi.json',
        },
        tools: TOOL_DEFINITIONS.map((tool) => tool.name),
        documentation: 'https://github.com/cristianoaredes/mcp-dadosbr',
        cloudflare_docs: {
          agents: 'https://developers.cloudflare.com/agents/',
          sse: 'https://developers.cloudflare.com/agents/api-reference/http-sse/',
          pricing:
            'https://developers.cloudflare.com/workers/platform/pricing/',
        },
      };

      return new Response(JSON.stringify(info), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    default: {
      // Handle REST API endpoints for ChatGPT integration
      const pathMatch = url.pathname.match(/^\/(cnpj|cep)\/(.+)$/);
      if (pathMatch && request.method === 'GET') {
        const [, toolType, value] = pathMatch;
        return await handleLookupEndpoint(toolType, value, env);
      }

      // Handle advanced REST endpoints
      if (url.pathname === '/search' && request.method === 'POST') {
        return await handleSearchEndpoint(request, env);
      }

      if (url.pathname === '/intelligence' && request.method === 'POST') {
        return await handleIntelligenceEndpoint(request, env);
      }

      if (url.pathname === '/thinking' && request.method === 'POST') {
        return await handleThinkingEndpoint(request, env);
      }

      return new Response('Not found', {
        status: 404,
        headers: corsHeaders,
      });
    }
  }
}

/**
 * Main Cloudflare Worker fetch handler
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    syncWorkerEnv(env);

    const url = new URL(request.url);
    const isPublic = isPublicPath(url.pathname);

    // Handle CORS preflight
    const corsResponse = handleCORS(request, env, { isPublic });
    if (corsResponse) {
      return corsResponse;
    }

    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(request, env);
    if (!rateLimitResult.allowed) {
      return withCorsHeaders(rateLimitResult.error!, request, env, { isPublic });
    }

    // Apply authentication
    const authResult = await authenticateRequest(request, env);
    if (!authResult.authenticated) {
      return withCorsHeaders(authResult.error!, request, env, { isPublic });
    }

    const response = await routeRequest(request, env, url, ctx);
    return withCorsHeaders(response, request, env, { isPublic });
  },
} satisfies WorkerExportedHandler<Env>;
