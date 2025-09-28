import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ApiConfig, ServerConfig, ConfigFile } from "../types/index.js";

// Default API URLs
const DEFAULT_CNPJ_URL = "https://api.opencnpj.org/";
const DEFAULT_CEP_URL = "https://opencep.com/v1/";

// Constants
export const SERVER_NAME = "mcp-dadosbr";
export const SERVER_VERSION = "1.0.0";

// URL validation and normalization functions
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url : url + "/";
}

// Configuration loading with hierarchy: env vars > config file > defaults
function loadApiConfiguration(): ApiConfig {
  let config: ApiConfig = {
    cnpjBaseUrl: DEFAULT_CNPJ_URL,
    cepBaseUrl: DEFAULT_CEP_URL,
  };

  // Try to load from config file first
  try {
    const configPath = resolve(process.cwd(), ".mcprc.json");
    const configFile: ConfigFile = JSON.parse(
      readFileSync(configPath, "utf-8")
    );

    if (configFile.apiUrls?.cnpj) {
      config.cnpjBaseUrl = configFile.apiUrls.cnpj;
    }
    if (configFile.apiUrls?.cep) {
      config.cepBaseUrl = configFile.apiUrls.cep;
    }
    if (configFile.auth?.headers) {
      config.authHeaders = configFile.auth.headers;
    }
  } catch (error) {
    // Config file doesn't exist or is invalid, continue with defaults
  }

  // Environment variables override config file
  if (process.env.CNPJ_API_BASE_URL) {
    config.cnpjBaseUrl = process.env.CNPJ_API_BASE_URL;
  }
  if (process.env.CEP_API_BASE_URL) {
    config.cepBaseUrl = process.env.CEP_API_BASE_URL;
  }

  // Handle authentication from environment variables
  if (process.env.API_KEY_HEADER && process.env.API_KEY_VALUE) {
    config.authHeaders = {
      ...config.authHeaders,
      [process.env.API_KEY_HEADER]: process.env.API_KEY_VALUE,
    };
  }

  // Validate and normalize URLs
  if (!validateUrl(config.cnpjBaseUrl)) {
    throw new Error(`Invalid CNPJ API URL: ${config.cnpjBaseUrl}`);
  }
  if (!validateUrl(config.cepBaseUrl)) {
    throw new Error(`Invalid CEP API URL: ${config.cepBaseUrl}`);
  }

  config.cnpjBaseUrl = normalizeBaseUrl(config.cnpjBaseUrl);
  config.cepBaseUrl = normalizeBaseUrl(config.cepBaseUrl);

  return config;
}

export function loadServerConfiguration(): ServerConfig {
  return {
    transport: process.env.MCP_TRANSPORT || "stdio",
    httpPort: parseInt(process.env.MCP_HTTP_PORT || "3000"),
    cacheSize: parseInt(process.env.MCP_CACHE_SIZE || "256"),
    cacheTTL: parseInt(process.env.MCP_CACHE_TTL || "60000"),
    apiTimeout: parseInt(process.env.MCP_API_TIMEOUT || "8000"),
  };
}

export function resolveApiConfig(overrides?: Partial<ApiConfig>): ApiConfig {
  const base = loadApiConfiguration();
  if (!overrides) return base;
  const merged: ApiConfig = {
    ...base,
    ...overrides,
  };
  if (base.authHeaders || overrides.authHeaders) {
    merged.authHeaders = {
      ...(base.authHeaders ?? {}),
      ...(overrides.authHeaders ?? {}),
    };
  }
  return merged;
}
