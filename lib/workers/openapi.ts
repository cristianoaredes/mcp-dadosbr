/**
 * OpenAPI schema generation for ChatGPT integration
 */

import { Env, getCorsHeaders } from '../adapters/cloudflare.js';
import { SERVER_VERSION } from '../config/index.js';
import { DORK_CATEGORIES, SEARCH_PROVIDERS } from '../core/tool-schemas.js';

/**
 * Generate OpenAPI 3.0 schema for the API
 */
export function generateOpenAPISchema(requestUrl: string): unknown {
  const origin = new URL(requestUrl).origin;

  return {
    openapi: '3.0.0',
    info: {
      title: 'MCP DadosBR API',
      description: 'Brazilian public data lookup API for CNPJ (companies) and CEP (postal codes) with advanced search capabilities',
      version: SERVER_VERSION
    },
    servers: [{ url: origin }],
    security: [
      {
        'ApiKeyAuth': []
      },
      {
        'BearerAuth': []
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication via X-API-Key header.'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: "API key for authentication via 'Authorization: Bearer <key>' header."
        }
      }
    },
    paths: {
      '/cnpj/{cnpj}': {
        get: {
          summary: 'Look up CNPJ company data',
          security: [
            { 'ApiKeyAuth': [] },
            { 'BearerAuth': [] }
          ],
          parameters: [{
            name: 'cnpj',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'CNPJ number (with or without formatting)'
          }],
          responses: {
            '200': { description: 'Company information' },
            '404': { description: 'CNPJ not found' },
            '401': { description: 'Unauthorized - API key required' },
            '429': { description: 'Rate limit exceeded' }
          }
        }
      },
      '/cep/{cep}': {
        get: {
          summary: 'Look up CEP postal code data',
          security: [
            { 'ApiKeyAuth': [] },
            { 'BearerAuth': [] }
          ],
          parameters: [{
            name: 'cep',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'CEP postal code (with or without formatting)'
          }],
          responses: {
            '200': { description: 'Address information' },
            '404': { description: 'CEP not found' },
            '401': { description: 'Unauthorized - API key required' },
            '429': { description: 'Rate limit exceeded' }
          }
        }
      },
      '/search': {
        post: {
          summary: 'Search the web for Brazilian company information',
          security: [
            { 'ApiKeyAuth': [] },
            { 'BearerAuth': [] }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Search query with optional operators (site:, intext:, filetype:, etc.)'
                    },
                    max_results: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 20,
                      default: 5,
                      description: 'Maximum number of results to return'
                    }
                  },
                  required: ['query']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Search results' },
            '400': { description: 'Invalid request' },
            '401': { description: 'Unauthorized - API key required' },
            '429': { description: 'Rate limit exceeded' }
          }
        }
      },
      '/intelligence': {
        post: {
          summary: 'Intelligent search for Brazilian company information',
          security: [
            { 'ApiKeyAuth': [] },
            { 'BearerAuth': [] }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cnpj: {
                      type: 'string',
                      description: 'Brazilian CNPJ number (with or without formatting)'
                    },
                    categories: {
                      type: 'array',
                      minItems: 1,
                      maxItems: 10,
                      items: {
                        type: 'string',
                        enum: [...DORK_CATEGORIES]
                      },
                      description: 'Search categories to include'
                    },
                    provider: {
                      type: 'string',
                      enum: [...SEARCH_PROVIDERS],
                      default: 'tavily',
                      description: 'Search provider to use (server-configured API key required)'
                    },
                    max_results_per_query: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 10,
                      default: 5,
                      description: 'Maximum results per search query'
                    },
                    max_queries: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 20,
                      default: 10,
                      description: 'Maximum number of search queries'
                    },
                    max_results: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 10,
                      description: 'Maximum results per search query (alias for max_results_per_query)'
                    }
                  },
                  required: ['cnpj']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Intelligence search results' },
            '400': { description: 'Invalid request' },
            '401': { description: 'Unauthorized - API key required' },
            '429': { description: 'Rate limit exceeded' }
          }
        }
      },
      '/thinking': {
        post: {
          summary: 'Structured reasoning and problem-solving',
          security: [
            { 'ApiKeyAuth': [] },
            { 'BearerAuth': [] }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    thought: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 10000,
                      description: 'Current thinking step'
                    },
                    nextThoughtNeeded: {
                      type: 'boolean',
                      description: 'Whether another thought step is needed'
                    },
                    thoughtNumber: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000,
                      description: 'Current thought number'
                    },
                    totalThoughts: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000,
                      description: 'Estimated total thoughts needed'
                    },
                    isRevision: {
                      type: 'boolean',
                      description: 'Whether this thought revises previous thinking'
                    },
                    revisesThought: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000,
                      description: 'Which thought is being reconsidered'
                    },
                    branchFromThought: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000,
                      description: 'Branching point thought number'
                    },
                    branchId: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100,
                      description: 'Branch identifier'
                    },
                    needsMoreThoughts: {
                      type: 'boolean',
                      description: 'If more thoughts are needed'
                    }
                  },
                  required: ['thought', 'nextThoughtNeeded', 'thoughtNumber', 'totalThoughts']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Thinking result' },
            '400': { description: 'Invalid request' },
            '401': { description: 'Unauthorized - API key required' },
            '429': { description: 'Rate limit exceeded' }
          }
        }
      },
      '/mcp': {
        post: {
          summary: 'MCP JSON-RPC endpoint',
          description: 'Model Context Protocol JSON-RPC endpoint for AI assistants',
          security: [
            { 'ApiKeyAuth': [] },
            { 'BearerAuth': [] }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jsonrpc: { type: 'string', enum: ['2.0'] },
                    id: { type: ['string', 'number', 'null'] },
                    method: { type: 'string' },
                    params: { type: 'object' }
                  },
                  required: ['jsonrpc', 'method']
                }
              }
            }
          },
          responses: {
            '200': { description: 'MCP response' },
            '400': { description: 'Invalid request' },
            '401': { description: 'Unauthorized - API key required' }
          }
        }
      },
      '/sse': {
        get: {
          summary: 'MCP Server-Sent Events endpoint',
          description: 'Model Context Protocol streaming endpoint for real-time communication',
          security: [
            { 'ApiKeyAuth': [] },
            { 'BearerAuth': [] }
          ],
          responses: {
            '200': { description: 'SSE stream established' },
            '400': { description: 'Invalid request' },
            '401': { description: 'Unauthorized - API key required' }
          }
        }
      }
    }
  };
}

/**
 * Handle /openapi.json endpoint
 */
export function handleOpenAPIEndpoint(request: Request, env?: Env): Response {
  const schema = generateOpenAPISchema(request.url);

  return new Response(JSON.stringify(schema), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request, env, { isPublic: true }),
    },
  });
}
