import { z } from "zod";
import { createMCPServer } from "../core/mcp-server.js";
import { MemoryCache } from "../core/cache.js";
import { resolveApiConfig } from "../config/index.js";
import { ApiConfig } from "../types/index.js";

export const configSchema = z
  .object({
    cnpjBaseUrl: z
      .string()
      .url()
      .describe("Custom CNPJ API base URL")
      .optional(),
    cepBaseUrl: z
      .string()
      .url()
      .describe("Custom CEP API base URL")
      .optional(),
    authHeaders: z
      .record(z.string())
      .describe("Extra headers merged into outbound API requests")
      .optional(),
  })
  .describe("Optional overrides for external API configuration");

interface CreateServerOptions {
  config?: Partial<ApiConfig>;
}

export default function createServer({ config }: CreateServerOptions = {}) {
  // Resolve API configuration with overrides
  const apiConfig = resolveApiConfig(config);
  
  // Create cache with default settings
  const cache = new MemoryCache(256, 60000);
  
  // Create and return MCP server
  const server = createMCPServer({ apiConfig, cache });
  return server;
}
