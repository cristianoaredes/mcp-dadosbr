// Core MCP server interfaces
export interface ApiConfig {
  cnpjBaseUrl: string;
  cepBaseUrl: string;
  authHeaders?: Record<string, string>;
}

export interface ServerConfig {
  transport: string;
  httpPort: number;
  cacheSize: number;
  cacheTTL: number;
  apiTimeout: number;
}

// Configuration file structure
export interface ConfigFile {
  apiUrls?: {
    cnpj?: string;
    cep?: string;
  };
  auth?: {
    headers?: Record<string, string>;
  };
}

// HTTP Response interface
export interface HttpResponse {
  ok: boolean;
  data?: any;
  error?: string;
  source: string;
}

// Tool execution result
export interface LookupResult {
  ok: boolean;
  data?: any;
  error?: string;
}

// Metrics tracking
export interface Metrics {
  requests: number;
  cacheHits: number;
  errors: number;
  totalTime: number;
  startTime: number;
}

// Cache interfaces
export interface CacheEntry {
  data: any;
  expires: number;
}

export interface Cache {
  get(key: string): Promise<any> | any;
  set(key: string, data: any): Promise<void> | void;
  clear?(): Promise<void> | void;
}

// MCP Request/Response for Cloudflare Workers
export interface MCPRequest {
  jsonrpc: string;
  id: string | number | null;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
