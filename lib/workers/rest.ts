/**
 * REST API endpoints for ChatGPT integration
 */

import { corsHeaders, Env } from '../adapters/cloudflare.js';
import { handleMCPRequest } from '../adapters/cloudflare.js';
import { MCPRequest } from '../types/index.js';
import {
  SearchRequestBody,
  IntelligenceRequestBody,
  ThinkingRequestBody
} from './types.js';

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
      return new Response(
        JSON.stringify({
          error: mcpResponse.error.message,
          code: mcpResponse.error.code,
          data: mcpResponse.error.data
        }),
        {
          status: mcpResponse.error.code === -32603 && mcpResponse.error.data === 'Not found' ? 404 : 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(JSON.stringify(mcpResponse.result, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
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
}

/**
 * Handle /search POST endpoint
 */
export async function handleSearchEndpoint(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as SearchRequestBody;
    const { query, max_results = 5 } = body;

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
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
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
    const body = await request.json() as IntelligenceRequestBody;
    const { cnpj, categories, max_results_per_query = 5, max_queries = 10 } = body;

    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'Missing cnpj parameter' }),
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
        name: 'cnpj_intelligence',
        arguments: { cnpj, categories, max_results_per_query, max_queries }
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
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
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
    const body = await request.json() as ThinkingRequestBody;

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
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}
