import { z } from "zod";
import { createMCPServer } from "../core/mcp-server.js";
import { MemoryCache } from "../core/cache.js";
import {
  DEFAULT_CEP_URL,
  DEFAULT_CNPJ_URL,
  isAllowedCepUrl,
  isAllowedCnpjUrl,
  resolveApiConfig,
} from "../config/index.js";
import { ApiConfig } from "../types/index.js";
import { CACHE } from "../shared/utils/constants.js";

export const configSchema = z
  .object({
    cnpjBaseUrl: z
      .string()
      .url()
      .refine(isAllowedCnpjUrl, {
        message: "Disallowed CNPJ API URL (must be an allowlisted HTTPS host)",
      })
      .describe(`Custom CNPJ API base URL (default: ${DEFAULT_CNPJ_URL})`)
      .default(DEFAULT_CNPJ_URL),
    cepBaseUrl: z
      .string()
      .url()
      .refine(isAllowedCepUrl, {
        message: "Disallowed CEP API URL (must be an allowlisted HTTPS host)",
      })
      .describe(`Custom CEP API base URL (default: ${DEFAULT_CEP_URL})`)
      .default(DEFAULT_CEP_URL),
    authHeaders: z
      .record(z.string(), z.string())
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
