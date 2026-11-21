/**
 * REST API endpoints for ChatGPT integration
 */

import { corsHeaders, Env } from '../adapters/cloudflare.js';
import { handleMCPRequest } from '../adapters/cloudflare.js';
import { createLogger } from '../infrastructure/logger.js';
import { maskSensitiveText } from '../shared/log-redaction.js';
import { MCPRequest } from '../types/index.js';
import {
  SearchRequestBody,
  IntelligenceRequestBody,
  ThinkingRequestBody
} from './types.js';

const restLogger = createLogger('worker-rest');

function invalidJsonResponse(): { ok: false; response: Response } {
  return {
    ok: false,
    response: new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid JSON payload',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    ),
  };
}

/**
 * Parse a JSON object request body, returning a sanitized 400 response on malformed JSON.
 */
async function parseJsonBody<T>(
  request: Request
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch (error: unknown) {
    if (error instanceof SyntaxError || (error instanceof Error && error.name === 'SyntaxError')) {
      return invalidJsonResponse();
    }
    throw error;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return invalidJsonResponse();
  }

  return { ok: true, data: parsed as T };
}

/**
 * Log a masked internal error and return a generic 500 response without leaking raw error details.
 */
function internalServerErrorResponse(endpoint: string, error: unknown): Response {
  restLogger.error('rest.handler_error', {
    endpoint,
    error: maskSensitiveText(error instanceof Error ? error.message : String(error)),
  });
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

/**
 * Handle /cnpj/{cnpj} and /cep/{cep} GET endpoints
 */
export async function handleLookupEndpoint(
  toolType: string,
  value: string,
  env: Env
): Promise<Response> {
  try {
    const mcpRequest: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: `${toolType}_lookup`,
        arguments: { [toolType]: value }
      }
    };

    const mcpResponse = await handleMCPRequest(mcpRequest, env);

    if (mcpResponse.error) {
      const isNotFound =
        mcpResponse.error.code === -32603 &&
        typeof mcpResponse.error.data === 'string' &&
        /not found/i.test(mcpResponse.error.data);
      return new Response(
        JSON.stringify({
          error: mcpResponse.error.message,
          code: mcpResponse.error.code,
          data: mcpResponse.error.data
        }),
        {
          status: isNotFound ? 404 : 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(JSON.stringify(mcpResponse.result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    return internalServerErrorResponse(
      toolType === 'cnpj' || toolType === 'cep' ? `/${toolType}` : '/lookup',
      error
    );
  }
}

/**
 * Handle /search POST endpoint
 */
export async function handleSearchEndpoint(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const parsedBody = await parseJsonBody<SearchRequestBody>(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const { query, max_results = 5 } = parsedBody.data;

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing query parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const mcpRequest: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'cnpj_search',
        arguments: { query, max_results }
      }
    };

    const mcpResponse = await handleMCPRequest(mcpRequest, env);

    if (mcpResponse.error) {
      return new Response(
        JSON.stringify({
          error: mcpResponse.error.message,
          code: mcpResponse.error.code
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(JSON.stringify(mcpResponse.result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: unknown) {
    return internalServerErrorResponse('/search', error);
  }
}

/**
 * Handle /intelligence POST endpoint
 */
export async function handleIntelligenceEndpoint(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const parsedBody = await parseJsonBody<IntelligenceRequestBody>(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const {
      cnpj,
      categories,
      provider,
      max_results_per_query,
      max_queries,
      max_results,
    } = parsedBody.data;

    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'Missing cnpj parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const args: Record<string, unknown> = { cnpj };
    if (categories !== undefined) args.categories = categories;
    if (provider !== undefined) args.provider = provider;
    if (max_results_per_query !== undefined) args.max_results_per_query = max_results_per_query;
    if (max_queries !== undefined) args.max_queries = max_queries;
    if (max_results !== undefined) args.max_results = max_results;

    const mcpRequest: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'cnpj_intelligence',
        arguments: args
      }
    };

    const mcpResponse = await handleMCPRequest(mcpRequest, env);

    if (mcpResponse.error) {
      return new Response(
        JSON.stringify({
          error: mcpResponse.error.message,
          code: mcpResponse.error.code
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(JSON.stringify(mcpResponse.result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: unknown) {
    return internalServerErrorResponse('/intelligence', error);
  }
}

/**
 * Handle /thinking POST endpoint
 */
export async function handleThinkingEndpoint(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const parsedBody = await parseJsonBody<ThinkingRequestBody>(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.data;

    const mcpRequest: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'sequentialthinking',
        arguments: body
      }
    };

    const mcpResponse = await handleMCPRequest(mcpRequest, env);

    if (mcpResponse.error) {
      return new Response(
        JSON.stringify({
          error: mcpResponse.error.message,
          code: mcpResponse.error.code
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(JSON.stringify(mcpResponse.result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: unknown) {
    return internalServerErrorResponse('/thinking', error);
  }
}
