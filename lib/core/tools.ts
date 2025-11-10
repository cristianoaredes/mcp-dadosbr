import {
  CnpjSchema,
  CepSchema,
  CpfSchema,
  formatCpf,
  formatCnpj,
  formatCep,
  normalizeCpf,
  normalizeCnpj,
  normalizeCep,
  validateCpfChecksum,
  validateCnpjChecksum
} from "./validation.js";
import { httpJson } from "./http-client.js";
import { Cache, LookupResult, Metrics, ApiConfig } from "../types/index.js";
import { SEARCH_TOOL, executeSearch } from "./search.js";
import {
  SEQUENTIAL_THINKING_TOOL,
  SequentialThinkingProcessor,
} from "./sequential-thinking.js";
import type { IntelligenceOptions } from "./intelligence.js";
import { TIMEOUTS } from "../config/timeouts.js";
import * as BrasilAPI from "./brasilapi-providers.js";
import * as ViaCEP from "./viacep-provider.js";

let metrics: Metrics = {
  requests: 0,
  cacheHits: 0,
  errors: 0,
  totalTime: 0,
  startTime: Date.now(),
};

// Simple performance monitoring
function logPerformanceMetrics(): void {
  const uptime = Date.now() - metrics.startTime;
  const avgResponseTime = metrics.requests > 0 ? metrics.totalTime / metrics.requests : 0;
  const cacheHitRate = metrics.requests > 0 ? (metrics.cacheHits / metrics.requests) * 100 : 0;

  console.error(`[metrics] Uptime: ${Math.round(uptime / 1000)}s | Requests: ${metrics.requests} | Cache Hit Rate: ${cacheHitRate.toFixed(1)}% | Avg Response: ${avgResponseTime.toFixed(0)}ms | Errors: ${metrics.errors}`);
}

// Log metrics every 100 requests
let lastMetricsLog = 0;

function recordMetrics(elapsed: number, fromCache: boolean, error: boolean) {
  metrics.requests++;
  metrics.totalTime += elapsed;
  if (fromCache) metrics.cacheHits++;
  if (error) metrics.errors++;

  // Log metrics every 10 requests (simple monitoring)
  if (metrics.requests - lastMetricsLog >= 10) {
    logPerformanceMetrics();
    lastMetricsLog = metrics.requests;
  }
}

// Request deduplication to prevent concurrent identical API calls

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
}

const pendingRequests = new Map<string, PendingRequest>();

async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Check if request is already pending
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing.promise;
  }

  // Create timeout to prevent stale entries
  const timeoutId = setTimeout(() => {
    pendingRequests.delete(key);
    console.error(`[WARN] Deduplication timeout for key: ${key} (after ${TIMEOUTS.DEDUP_TIMEOUT_MS}ms)`);
  }, TIMEOUTS.DEDUP_TIMEOUT_MS);

  // Execute function and cleanup
  const promise = fn()
    .finally(() => {
      clearTimeout(timeoutId);
      pendingRequests.delete(key);
    });

  // Store with metadata
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
    timeoutId
  });

  return promise;
}

export async function lookup(
  type: "cnpj" | "cep",
  input: string,
  apiConfig: ApiConfig,
  cache?: Cache
): Promise<LookupResult> {
  const startTime = Date.now();
  const baseUrl = type === "cnpj" ? apiConfig.cnpjBaseUrl : apiConfig.cepBaseUrl;
  const cacheKey = `${type}:${baseUrl}:${input}`;
  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  // Check cache first
  if (cache) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      const elapsed = Date.now() - startTime;
      recordMetrics(elapsed, true, false);
      console.log(
        `[${new Date().toISOString()}] [${type}_lookup] [${input}] [cache_hit] [${elapsed}ms] [${transportMode}] [${baseUrl}]`
      );
      return { ok: true, data: cached };
    }
  }

  // Use deduplication to prevent concurrent identical API calls
  return await deduplicate(cacheKey, async () => {
    const apiUrl = `${baseUrl}${input}`;
    const result = await httpJson(apiUrl, apiConfig.authHeaders);
    const elapsed = Date.now() - startTime;

    if (result.ok && result.data) {
      const responseData = {
        ...result.data,
        source: result.source,
        fetchedAt: new Date().toISOString(),
      };

      if (cache) {
        await cache.set(cacheKey, responseData);
      }

      recordMetrics(elapsed, false, false);
      console.log(
        `[${new Date().toISOString()}] [${type}_lookup] [${input}] [success] [${elapsed}ms] [${transportMode}] [${baseUrl}]`
      );
      return { ok: true, data: responseData };
    } else {
      const errorMessage =
        result.error === "not found"
          ? `${type.toUpperCase()} not found`
          : result.error || "unknown error";
      recordMetrics(elapsed, false, true);
      console.log(
        `[${new Date().toISOString()}] [${type}_lookup] [${input}] [error: ${errorMessage}] [${elapsed}ms] [${transportMode}] [${baseUrl}]`
      );
      return { ok: false, error: errorMessage };
    }
  });
}

// Sequential Thinking processor instance
const thinkingProcessor = new SequentialThinkingProcessor();

// Tool definitions for MCP
export const TOOL_DEFINITIONS = [
  {
    name: "cnpj_lookup",
    description: "Look up Brazilian company information by CNPJ number",
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "Brazilian CNPJ number (with or without formatting)",
        },
      },
      required: ["cnpj"],
    },
  },
  {
    name: "cep_lookup",
    description: "Look up Brazilian postal code information by CEP",
    inputSchema: {
      type: "object",
      properties: {
        cep: {
          type: "string",
          description: "Brazilian CEP postal code (with or without formatting)",
        },
      },
      required: ["cep"],
    },
  },
  SEARCH_TOOL,
  SEQUENTIAL_THINKING_TOOL,
  // Validation tools
  {
    name: "cpf_validate",
    description: "Validate and format Brazilian CPF (Cadastro de Pessoas Físicas)",
    inputSchema: {
      type: "object",
      properties: {
        cpf: {
          type: "string",
          description: "CPF number to validate (with or without formatting)",
        },
      },
      required: ["cpf"],
    },
  },
  {
    name: "cnpj_validate",
    description: "Validate and format Brazilian CNPJ (Cadastro Nacional de Pessoa Jurídica)",
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "CNPJ number to validate (with or without formatting)",
        },
      },
      required: ["cnpj"],
    },
  },
  {
    name: "cep_validate",
    description: "Validate and format Brazilian CEP (postal code)",
    inputSchema: {
      type: "object",
      properties: {
        cep: {
          type: "string",
          description: "CEP to validate (with or without formatting)",
        },
      },
      required: ["cep"],
    },
  },
  // BrasilAPI tools
  {
    name: "banco_lookup",
    description: "Look up Brazilian bank information by bank code",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Bank code (e.g., '001' for Banco do Brasil, '341' for Itaú)",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "bancos_list",
    description: "List all Brazilian banks with their codes and names",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "feriados_nacionais",
    description: "Get Brazilian national holidays for a given year",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Year to get holidays (e.g., 2024)",
        },
      },
      required: ["year"],
    },
  },
  {
    name: "ddd_lookup",
    description: "Look up Brazilian cities by area code (DDD)",
    inputSchema: {
      type: "object",
      properties: {
        ddd: {
          type: "string",
          description: "Area code (DDD) - 2 digits (e.g., '11' for São Paulo)",
        },
      },
      required: ["ddd"],
    },
  },
  {
    name: "ibge_uf",
    description: "Get information about a Brazilian state (UF) from IBGE",
    inputSchema: {
      type: "object",
      properties: {
        uf: {
          type: "string",
          description: "State code (UF) - 2 letters (e.g., 'SP', 'RJ', 'MG')",
        },
      },
      required: ["uf"],
    },
  },
  {
    name: "ibge_municipios",
    description: "Get list of municipalities (cities) in a Brazilian state from IBGE",
    inputSchema: {
      type: "object",
      properties: {
        uf: {
          type: "string",
          description: "State code (UF) - 2 letters (e.g., 'SP', 'RJ', 'MG')",
        },
      },
      required: ["uf"],
    },
  },
  {
    name: "isbn_lookup",
    description: "Look up book information by ISBN",
    inputSchema: {
      type: "object",
      properties: {
        isbn: {
          type: "string",
          description: "ISBN number (10 or 13 digits, with or without hyphens)",
        },
      },
      required: ["isbn"],
    },
  },
  {
    name: "ncm_lookup",
    description: "Look up NCM (Nomenclatura Comum do Mercosul) information",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "NCM code (8 digits)",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "fipe_marcas",
    description: "Get list of vehicle brands from FIPE table",
    inputSchema: {
      type: "object",
      properties: {
        tipo: {
          type: "string",
          enum: ["carros", "motos", "caminhoes"],
          description: "Vehicle type: 'carros' (cars), 'motos' (motorcycles), 'caminhoes' (trucks)",
        },
      },
      required: ["tipo"],
    },
  },
  {
    name: "fipe_preco",
    description: "Get vehicle price from FIPE table by FIPE code",
    inputSchema: {
      type: "object",
      properties: {
        codigo_fipe: {
          type: "string",
          description: "FIPE code of the vehicle (format: XXXXXX-X)",
        },
      },
      required: ["codigo_fipe"],
    },
  },
  {
    name: "taxa_lookup",
    description: "Get Brazilian economic rates (SELIC, CDI, IPCA, etc) from official sources",
    inputSchema: {
      type: "object",
      properties: {
        nome: {
          type: "string",
          description: "Tax/rate name (e.g., 'selic', 'cdi'). If omitted, returns all available rates",
        },
      },
    },
  },
  {
    name: "cnpj_intelligence",
    description:
      "Intelligent automatic search about a Brazilian company using CNPJ.",
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "Brazilian CNPJ number (with or without formatting)",
        },
        categories: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "government",
              "legal",
              "news",
              "documents",
              "social",
              "partners",
            ],
          },
          description: "Search categories to include (default: all)",
        },
        provider: {
          type: "string",
          enum: ["duckduckgo", "tavily"],
          description:
            "Search provider to use (default: duckduckgo with automatic fallback)",
          default: "duckduckgo",
        },
        max_results_per_query: {
          type: "number",
          description: "Maximum results per search query (default: 5)",
          minimum: 1,
          maximum: 10,
          default: 5,
        },
        max_queries: {
          type: "number",
          description: "Maximum number of search queries to execute (default: 10)",
          minimum: 1,
          maximum: 20,
          default: 10,
        },
        api_key: {
          type: "string",
          description: "Optional Tavily API key (if not provided, uses server configuration)",
        },
      },
      required: ["cnpj"],
    },
  },
];

// Tool execution logic
export async function executeTool(
  name: string,
  args: unknown,
  apiConfig: ApiConfig,
  cache?: Cache
): Promise<LookupResult> {
  if (name === "cnpj_lookup") {
    const parsed = CnpjSchema.parse(args);
    return await lookup("cnpj", parsed.cnpj, apiConfig, cache);
  } else if (name === "cep_lookup") {
    const parsed = CepSchema.parse(args);
    return await lookup("cep", parsed.cep, apiConfig, cache);
  } else if (name === "cnpj_search") {
    const searchArgs = args as { query: string; max_results?: number };
    const { query, max_results = 5 } = searchArgs;
    return await executeSearch(query, max_results, cache);
  } else if (name === "sequentialthinking") {
    const result = thinkingProcessor.processThought(args);
    return result;
  } else if (name === "cnpj_intelligence") {
    const { executeIntelligence } = await import("./intelligence.js");
    return await executeIntelligence(
      args as IntelligenceOptions,
      apiConfig,
      cache
    );
  }
  // Validation tools
  else if (name === "cpf_validate") {
    const { cpf } = args as { cpf: string };
    const normalized = normalizeCpf(cpf);
    const isValid = validateCpfChecksum(normalized);
    return {
      ok: true,
      data: {
        cpf: cpf,
        normalized: normalized,
        formatted: isValid ? formatCpf(normalized) : normalized,
        valid: isValid,
        message: isValid ? "CPF is valid" : "Invalid CPF: checksum verification failed"
      }
    };
  } else if (name === "cnpj_validate") {
    const { cnpj } = args as { cnpj: string };
    const normalized = normalizeCnpj(cnpj);
    const isValid = validateCnpjChecksum(normalized);
    return {
      ok: true,
      data: {
        cnpj: cnpj,
        normalized: normalized,
        formatted: isValid ? formatCnpj(normalized) : normalized,
        valid: isValid,
        message: isValid ? "CNPJ is valid" : "Invalid CNPJ: checksum verification failed"
      }
    };
  } else if (name === "cep_validate") {
    const { cep } = args as { cep: string };
    const normalized = normalizeCep(cep);
    const isValid = normalized.length === 8 && /^\d{8}$/.test(normalized);
    return {
      ok: true,
      data: {
        cep: cep,
        normalized: normalized,
        formatted: isValid ? formatCep(normalized) : normalized,
        valid: isValid,
        message: isValid ? "CEP format is valid" : "Invalid CEP: must be 8 digits"
      }
    };
  }
  // BrasilAPI tools
  else if (name === "banco_lookup") {
    const { code } = args as { code: string };
    const result = await BrasilAPI.fetchBank(code);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "bancos_list") {
    const result = await BrasilAPI.fetchAllBanks();
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "feriados_nacionais") {
    const { year } = args as { year: number };
    const result = await BrasilAPI.fetchHolidays(year);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "ddd_lookup") {
    const { ddd } = args as { ddd: string };
    const result = await BrasilAPI.fetchDDD(ddd);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "ibge_uf") {
    const { uf } = args as { uf: string };
    const result = await BrasilAPI.fetchIBGEState(uf);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "ibge_municipios") {
    const { uf } = args as { uf: string };
    const result = await BrasilAPI.fetchIBGEMunicipalities(uf);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "isbn_lookup") {
    const { isbn } = args as { isbn: string };
    const result = await BrasilAPI.fetchISBN(isbn);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "ncm_lookup") {
    const { code } = args as { code: string };
    const result = await BrasilAPI.fetchNCM(code);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "fipe_marcas") {
    const { tipo } = args as { tipo: "carros" | "motos" | "caminhoes" };
    const result = await BrasilAPI.fetchFIPEBrands(tipo);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "fipe_preco") {
    const { codigo_fipe } = args as { codigo_fipe: string };
    const result = await BrasilAPI.fetchFIPEPrice(codigo_fipe);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else if (name === "taxa_lookup") {
    const { nome } = args as { nome?: string };
    const result = await BrasilAPI.fetchTaxas(nome);
    if (result.ok) {
      return { ok: true, data: result.value };
    } else {
      return { ok: false, error: result.error };
    }
  } else {
    throw new Error(`Unknown tool: ${name}`);
  }
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function resetMetrics(): void {
  metrics = {
    requests: 0,
    cacheHits: 0,
    errors: 0,
    totalTime: 0,
    startTime: Date.now(),
  };
}
