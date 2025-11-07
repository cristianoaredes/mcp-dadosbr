/**
 * OpenAPI schema generation for ChatGPT integration
 */

import { corsHeaders } from '../adapters/cloudflare.js';

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
      version: '1.0.0'
    },
    servers: [{ url: origin }],
    security: [
      {
        'OAuth2': ['mcp']
      },
      {
        'ApiKeyAuth': []
      }
    ],
    components: {
      securitySchemes: {
        OAuth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: `${origin}/oauth/authorize`,
              tokenUrl: `${origin}/oauth/token`,
              scopes: {
                'mcp': 'Access to MCP DadosBR tools',
                'openid': 'OpenID Connect',
                'profile': 'User profile information'
              }
            }
          }
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication. Can also be provided via \'Authorization: Bearer <key>\' header.'
        }
      }
    },
    paths: {
      '/cnpj/{cnpj}': {
        get: {
          summary: 'Look up CNPJ company data',
          security: [
            { 'OAuth2': ['mcp'] },
            { 'ApiKeyAuth': [] }
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
            { 'OAuth2': ['mcp'] },
            { 'ApiKeyAuth': [] }
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
            { 'OAuth2': ['mcp'] },
            { 'ApiKeyAuth': [] }
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
            { 'OAuth2': ['mcp'] },
            { 'ApiKeyAuth': [] }
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
                      items: {
                        type: 'string',
                        enum: ['government', 'legal', 'news', 'documents', 'social', 'partners']
                      },
                      description: 'Search categories to include'
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
            { 'OAuth2': ['mcp'] },
            { 'ApiKeyAuth': [] }
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
                      description: 'Current thinking step'
                    },
                    nextThoughtNeeded: {
                      type: 'boolean',
                      description: 'Whether another thought step is needed'
                    },
                    thoughtNumber: {
                      type: 'integer',
                      minimum: 1,
                      description: 'Current thought number'
                    },
                    totalThoughts: {
                      type: 'integer',
                      minimum: 1,
                      description: 'Estimated total thoughts needed'
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
          security: [], // No authentication required for MCP protocol
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
            '400': { description: 'Invalid request' }
          }
        }
      },
      '/sse': {
        get: {
          summary: 'MCP Server-Sent Events endpoint',
          description: 'Model Context Protocol streaming endpoint for real-time communication',
          security: [], // No authentication required for MCP protocol
          responses: {
            '200': { description: 'SSE stream established' },
            '400': { description: 'Invalid request' }
          }
        }
      }
    }
  };
}

/**
 * Handle /openapi.json endpoint
 */
export function handleOpenAPIEndpoint(request: Request): Response {
  const schema = generateOpenAPISchema(request.url);

  return new Response(JSON.stringify(schema), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
