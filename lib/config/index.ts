import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ApiConfig, ServerConfig, ConfigFile } from "../types/index.js";
import { TIMEOUTS } from "./timeouts.js";
import { CACHE } from "../shared/utils/constants.js";

// Default API URLs
export const DEFAULT_CNPJ_URL = "https://api.opencnpj.org/";
export const DEFAULT_CEP_URL = "https://opencep.com/v1/";

// Constants
export const SERVER_NAME = "mcp-dadosbr";
export const SERVER_VERSION = "1.0.0";

// Allowed API hosts (SSRF protection)
// Only these production hosts can be used for CNPJ and CEP APIs
export const ALLOWED_CNPJ_HOSTS: readonly string[] = [
  "api.opencnpj.org",
  "www.receitaws.com.br",
  "receitaws.com.br",
  "brasilapi.com.br",
  "publica.cnpj.ws",
  "minhareceita.org",
];

export const ALLOWED_CEP_HOSTS: readonly string[] = [
  "opencep.com",
  "viacep.com.br",
  "brasilapi.com.br",
  "cep.awesomeapi.com.br",
];

const DEV_LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1"]);

function isLocalhostAllowed(): boolean {
  const nodeEnv = typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
  return nodeEnv === "development" || nodeEnv === "test";
}

function sanitizeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}

/**
 * Validates URL for SSRF protection
 * @param url - URL to validate
 * @param allowedHosts - List of allowed hostnames
 * @returns true if URL is valid and host is allowed
 */
export function validateUrl(url: string, allowedHosts: readonly string[]): boolean {
  if (typeof url !== "string" || !url.trim()) {
    console.error("[Security] Rejected empty or non-string URL");
    return false;
  }

  try {
    const parsed = new URL(url);

    // Reject URLs with embedded credentials to avoid credential confusion and secret leakage
    if (parsed.username || parsed.password) {
      console.error(
        `[Security] Rejected URL with embedded credentials: ${parsed.protocol}//${parsed.host}`
      );
      return false;
    }

    // Loopback is only permitted in explicit development/test environments over HTTP(S)
    if (DEV_LOCALHOST_HOSTS.has(parsed.hostname)) {
      if (!isLocalhostAllowed()) {
        console.error(
          `[Security] Rejected loopback URL outside development/test: ${parsed.hostname}`
        );
        return false;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        console.error(
          `[Security] Rejected non-HTTP(S) loopback URL: ${parsed.protocol}//${parsed.host}`
        );
        return false;
      }
      return true;
    }

    // Only HTTPS allowed for non-loopback hosts
    if (parsed.protocol !== "https:") {
      console.error(`[Security] Rejected non-HTTPS URL: ${sanitizeUrlForLog(url)}`);
      return false;
    }

    // Check if host is in allowlist (exact match or subdomain of non-loopback host)
    const isAllowed = allowedHosts.some((allowed) => {
      return parsed.hostname === allowed || parsed.hostname.endsWith(`.${allowed}`);
    });

    if (!isAllowed) {
      console.error(`[Security] Rejected URL with non-allowed host: ${parsed.hostname}`);
      console.error(`[Security] Allowed hosts: ${allowedHosts.join(", ")}`);
      return false;
    }

    return true;
  } catch {
    console.error(`[Security] Invalid URL format: ${sanitizeUrlForLog(url)}`);
    return false;
  }
}

export function isAllowedCnpjUrl(url: string): boolean {
  return validateUrl(url, ALLOWED_CNPJ_HOSTS);
}

export function isAllowedCepUrl(url: string): boolean {
  return validateUrl(url, ALLOWED_CEP_HOSTS);
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url : url + "/";
}

function validateAndNormalizeApiConfig(config: ApiConfig): ApiConfig {
  if (!validateUrl(config.cnpjBaseUrl, ALLOWED_CNPJ_HOSTS)) {
    throw new Error(
      `Invalid or disallowed CNPJ API URL: ${sanitizeUrlForLog(config.cnpjBaseUrl)}. ` +
      `Allowed hosts: ${ALLOWED_CNPJ_HOSTS.join(", ")}`
    );
  }
  if (!validateUrl(config.cepBaseUrl, ALLOWED_CEP_HOSTS)) {
    throw new Error(
      `Invalid or disallowed CEP API URL: ${sanitizeUrlForLog(config.cepBaseUrl)}. ` +
      `Allowed hosts: ${ALLOWED_CEP_HOSTS.join(", ")}`
    );
  }

  return {
    ...config,
    cnpjBaseUrl: normalizeBaseUrl(config.cnpjBaseUrl),
    cepBaseUrl: normalizeBaseUrl(config.cepBaseUrl),
  };
}

// Configuration loading with hierarchy: env vars > config file > defaults
function loadApiConfiguration(): ApiConfig {
  const config: ApiConfig = {
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
  } catch {
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
  return validateAndNormalizeApiConfig(config);
}

export function loadServerConfiguration(): ServerConfig {
  return {
    transport: process.env.MCP_TRANSPORT || "stdio",
    httpPort: parseInt(process.env.MCP_HTTP_PORT || "3000"),
    cacheSize: parseInt(process.env.MCP_CACHE_SIZE || String(CACHE.DEFAULT_SIZE)),
    cacheTTL: parseInt(process.env.MCP_CACHE_TTL || String(CACHE.DEFAULT_TTL_MS)),
    apiTimeout: parseInt(process.env.MCP_API_TIMEOUT || String(TIMEOUTS.HTTP_REQUEST_MS)),
  };
}

export function resolveApiConfig(overrides?: Partial<ApiConfig>): ApiConfig {
  const base = loadApiConfiguration();
  if (!overrides) return base;
  const merged: ApiConfig = {
    ...base,
    ...(overrides.cnpjBaseUrl !== undefined ? { cnpjBaseUrl: overrides.cnpjBaseUrl } : {}),
    ...(overrides.cepBaseUrl !== undefined ? { cepBaseUrl: overrides.cepBaseUrl } : {}),
  };
  if (base.authHeaders || overrides.authHeaders) {
    merged.authHeaders = {
      ...(base.authHeaders ?? {}),
      ...(overrides.authHeaders ?? {}),
    };
  }
  return validateAndNormalizeApiConfig(merged);
}
