import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ApiConfig, ServerConfig, ConfigFile } from "../types/index.js";

// Default API URLs
const DEFAULT_CNPJ_URL = "https://api.opencnpj.org/";
const DEFAULT_CEP_URL = "https://opencep.com/v1/";

// Constants
export const SERVER_NAME = "mcp-dadosbr";
export const SERVER_VERSION = "1.0.0";

// Allowed API hosts (SSRF protection)
// Only these hosts can be used for CNPJ and CEP APIs
const ALLOWED_CNPJ_HOSTS = [
  "api.opencnpj.org",
  "www.receitaws.com.br",
  "receitaws.com.br",
  "brasilapi.com.br",
  "publica.cnpj.ws",
  "minhareceita.org",
  "localhost", // Allow localhost for development/testing
  "127.0.0.1",
];

const ALLOWED_CEP_HOSTS = [
  "opencep.com",
  "viacep.com.br",
  "brasilapi.com.br",
  "cep.awesomeapi.com.br",
  "localhost", // Allow localhost for development/testing
  "127.0.0.1",
];

/**
 * Validates URL for SSRF protection
 * @param url - URL to validate
 * @param allowedHosts - List of allowed hostnames
 * @returns true if URL is valid and host is allowed
 */
function validateUrl(url: string, allowedHosts: string[]): boolean {
  try {
    const parsed = new URL(url);

    // Only HTTPS allowed (except localhost for development)
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (!isLocalhost && parsed.protocol !== "https:") {
      console.error(`[Security] Rejected non-HTTPS URL: ${url}`);
      return false;
    }

    // Check if host is in allowlist
    const isAllowed = allowedHosts.some(allowed => {
      return parsed.hostname === allowed || parsed.hostname.endsWith(`.${allowed}`);
    });

    if (!isAllowed) {
      console.error(`[Security] Rejected URL with non-allowed host: ${parsed.hostname}`);
      console.error(`[Security] Allowed hosts: ${allowedHosts.join(", ")}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[Security] Invalid URL format: ${url}`);
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

  // Validate and normalize URLs with SSRF protection
  if (!validateUrl(config.cnpjBaseUrl, ALLOWED_CNPJ_HOSTS)) {
    throw new Error(
      `Invalid or disallowed CNPJ API URL: ${config.cnpjBaseUrl}. ` +
      `Allowed hosts: ${ALLOWED_CNPJ_HOSTS.join(", ")}`
    );
  }
  if (!validateUrl(config.cepBaseUrl, ALLOWED_CEP_HOSTS)) {
    throw new Error(
      `Invalid or disallowed CEP API URL: ${config.cepBaseUrl}. ` +
      `Allowed hosts: ${ALLOWED_CEP_HOSTS.join(", ")}`
    );
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
