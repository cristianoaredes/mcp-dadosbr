/**
 * Cloudflare Worker entry point for MCP DadosBR
 * Supports both HTTP JSON-RPC and Server-Sent Events (SSE) for remote MCP
 * Based on Cloudflare's MCP Agent documentation
 */

import {
  handleMCPEndpoint,
  handleCORS,
  handleHealthCheck,
  corsHeaders,
  Env
} from '../adapters/cloudflare.js';
import { authenticateRequest } from './auth.js';
import { checkRateLimit } from './rate-limit.js';
import { handleSSEEndpoint } from './sse.js';
import { handleOpenAPIEndpoint } from './openapi.js';
import {
  handleLookupEndpoint,
  handleSearchEndpoint,
  handleIntelligenceEndpoint,
  handleThinkingEndpoint
} from './rest.js';
import { WorkerExportedHandler } from './types.js';

/**
 * Main Cloudflare Worker fetch handler
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    const corsResponse = handleCORS(request);
    if (corsResponse) {
      return corsResponse;
    }

    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(request, env);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!;
    }

    // Apply authentication
    const authResult = await authenticateRequest(request, env);
    if (!authResult.authenticated) {
      return authResult.error!;
    }

    // Route handling
    switch (url.pathname) {
      case '/health':
        return handleHealthCheck();

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
        return await handleSSEEndpoint(request, env);

      case '/openapi.json':
        // OpenAPI schema endpoint
        return handleOpenAPIEndpoint(request);

      case '/':
        // Root endpoint with basic info
        const info = {
          service: 'MCP DadosBR',
          description:
            'Model Context Protocol server for Brazilian public data',
          version: '1.0.0',
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
            openapi: '/openapi.json'
          },
          tools: ['cnpj_lookup', 'cep_lookup', 'cnpj_search', 'sequentialthinking', 'cnpj_intelligence'],
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

      default:
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
  },
} satisfies WorkerExportedHandler<Env>;
