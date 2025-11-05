import { z } from "zod";
import { createMCPServer } from "../core/mcp-server.js";
import { MemoryCache } from "../core/cache.js";
import { resolveApiConfig } from "../config/index.js";
import { ApiConfig } from "../types/index.js";
import { CACHE } from "../shared/utils/constants.js";

export const configSchema = z
  .object({
    cnpjBaseUrl: z
      .string()
      .url()
      .describe("Custom CNPJ API base URL (default: https://opencnpj.org/api/v1)")
      .default("https://opencnpj.org/api/v1")
      .optional(),
    cepBaseUrl: z
      .string()
      .url()
      .describe("Custom CEP API base URL (default: https://opencep.com/v1)")
      .default("https://opencep.com/v1")
      .optional(),
    authHeaders: z
      .record(z.string())
      .describe("Extra headers for API requests (optional)")
      .optional(),
  })
  .describe("Optional configuration - uses default Brazilian public APIs if not specified");

interface CreateServerOptions {
  config?: Partial<ApiConfig>;
}

export default function createServer({ config }: CreateServerOptions = {}) {
  // Resolve API configuration with overrides
  const apiConfig = resolveApiConfig(config);

  // Create cache with default settings
  const cache = new MemoryCache(CACHE.DEFAULT_SIZE, CACHE.DEFAULT_TTL_MS);

  // Create and return MCP server
  const server = createMCPServer({ apiConfig, cache });
  return server;
}
