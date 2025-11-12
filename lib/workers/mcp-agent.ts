/**
 * DadosBR MCP Agent for Cloudflare Workers
 * Uses Cloudflare's agents SDK with Durable Objects for persistent state
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOOL_DEFINITIONS, executeTool } from "../core/tools.js";
import { resolveApiConfig, SERVER_VERSION } from "../config/index.js";
import { KVCache } from "../core/cache.js";
import { TIMEOUTS } from "../config/timeouts.js";
import { CACHE } from "../shared/utils/constants.js";
import type { Cache, ApiConfig } from "../types/index.js";

/**
 * Environment bindings for DadosBR MCP Agent
 */
export interface DadosBRMCPEnv {
  MCP_CACHE?: KVNamespace;
  MCP_KV?: KVNamespace;
  MCP_TRANSPORT?: string;
  MCP_HTTP_PORT?: string;
  MCP_CACHE_SIZE?: string;
  MCP_CACHE_TTL?: string;
  MCP_API_KEY?: string;
  MCP_DISABLE_RATE_LIMIT?: string;
  TAVILY_API_KEY?: string;
}

/**
 * DadosBR MCP Agent
 * Extends McpAgent to provide Brazilian public data access (CNPJ/CEP)
 */
export class DadosBRMCP extends McpAgent<DadosBRMCPEnv> {
  server = new McpServer({
    name: "mcp-dadosbr",
    version: SERVER_VERSION,
  });

  protected declare env: DadosBRMCPEnv;
  private cache: Cache | null = null;
  private apiConfig: ApiConfig | null = null;

  /**
   * Initialize the MCP server and register all tools
   */
  async init() {
    console.log('[DadosBRMCP] Initializing server...');

    // Inject Cloudflare Workers environment variables into process.env
    // This allows tools to access secrets like TAVILY_API_KEY
    if (this.env.TAVILY_API_KEY) {
      process.env.TAVILY_API_KEY = this.env.TAVILY_API_KEY;
    }

    // Resolve API configuration
    this.apiConfig = resolveApiConfig();

    // Initialize cache if KV namespace is available
    if (this.env.MCP_CACHE) {
      const cacheTTL = parseInt(this.env.MCP_CACHE_TTL || String(CACHE.DEFAULT_TTL_MS));
      this.cache = new KVCache(this.env.MCP_CACHE, cacheTTL);
      console.log('[DadosBRMCP] KV Cache initialized with TTL:', cacheTTL);
    }

    // Register all tools
    await this.registerTools();

    console.log('[DadosBRMCP] Server initialized successfully');
  }

  /**
   * Register all tools with the MCP server
   */
  private async registerTools() {
    if (!this.apiConfig) {
      throw new Error('API config not initialized');
    }

    const apiConfig = this.apiConfig;
    const cache = this.cache;

    for (const tool of TOOL_DEFINITIONS) {
      // Register tool with name, description and handler
      this.server.tool(
        tool.name,
        tool.description,
        async (args: unknown) => {
          try {
            const result = await executeTool(tool.name, args, apiConfig, cache || undefined);

            // Format result for MCP response
            if (result.ok) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(result.data, null, 2),
                  },
                ],
              };
            } else {
              throw new Error(result.error || "Tool execution failed");
            }
          } catch (error) {
            console.error(`[DadosBRMCP] Tool ${tool.name} error:`, error);
            throw error;
          }
        }
      );
    }

    console.log(`[DadosBRMCP] Registered ${TOOL_DEFINITIONS.length} tools`);
  }
}

/**
 * Export the mounted MCP agent for Cloudflare Workers
 * This is the default export that Wrangler expects
 */
export default DadosBRMCP.mount("/sse");
