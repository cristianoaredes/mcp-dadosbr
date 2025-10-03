# MCP DadosBR Usage Examples

_Comprehensive examples for using MCP DadosBR in different scenarios_

## Table of Contents

- [Basic Usage](#basic-usage)
- [Real-World Scenarios](#real-world-scenarios)
- [Integration Patterns](#integration-patterns)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Advanced Features](#advanced-features)

---

## Basic Usage

### CNPJ Lookup Examples

#### Valid CNPJ Formats

```json
// Formatted CNPJ
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "cnpj_lookup",
    "arguments": {
      "cnpj": "11.222.333/0001-81"
    }
  }
}

// Unformatted CNPJ
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "cnpj_lookup",
    "arguments": {
      "cnpj": "11222333000181"
    }
  }
}
```

#### Expected Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"cnpj\": \"11222333000181\",\n  \"razao_social\": \"EMPRESA EXEMPLO LTDA\",\n  \"nome_fantasia\": \"Empresa Exemplo\",\n  \"situacao_cadastral\": \"ATIVA\",\n  \"data_situacao_cadastral\": \"2020-01-15\",\n  \"motivo_situacao_cadastral\": \"SEM MOTIVO\",\n  \"nome_cidade_exterior\": null,\n  \"codigo_natureza_juridica\": \"206\",\n  \"data_inicio_atividade\": \"2020-01-15\",\n  \"cnae_fiscal\": \"6201501\",\n  \"cnae_fiscal_descricao\": \"Desenvolvimento de programas de computador sob encomenda\",\n  \"descricao_tipo_logradouro\": \"RUA\",\n  \"logradouro\": \"EXEMPLO\",\n  \"numero\": \"123\",\n  \"complemento\": \"SALA 1\",\n  \"bairro\": \"CENTRO\",\n  \"cep\": \"01310100\",\n  \"uf\": \"SP\",\n  \"codigo_municipio\": \"7107\",\n  \"municipio\": \"SAO PAULO\",\n  \"ddd_telefone_1\": \"11987654321\",\n  \"ddd_telefone_2\": null,\n  \"ddd_fax\": null,\n  \"qualificacao_do_responsavel\": \"49\",\n  \"capital_social\": \"10000.00\",\n  \"porte\": \"05\",\n  \"opcao_pelo_simples\": \"NAO\",\n  \"data_opcao_pelo_simples\": null,\n  \"data_exclusao_do_simples\": null,\n  \"opcao_pelo_mei\": \"NAO\",\n  \"situacao_especial\": null,\n  \"data_situacao_especial\": null,\n  \"source\": \"OpenCNPJ\",\n  \"fetchedAt\": \"2024-09-27T20:30:45.123Z\"\n}"
      }
    ]
  }
}
```

### CEP Lookup Examples

#### Valid CEP Formats

```json
// Formatted CEP
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "cep_lookup",
    "arguments": {
      "cep": "01310-100"
    }
  }
}

// Unformatted CEP
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "cep_lookup",
    "arguments": {
      "cep": "01310100"
    }
  }
}
```

#### Expected Response

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"cep\": \"01310-100\",\n  \"logradouro\": \"Avenida Paulista\",\n  \"complemento\": \"lado ímpar\",\n  \"bairro\": \"Bela Vista\",\n  \"localidade\": \"São Paulo\",\n  \"uf\": \"SP\",\n  \"ibge\": \"3550308\",\n  \"gia\": \"1004\",\n  \"ddd\": \"11\",\n  \"siafi\": \"7107\",\n  \"source\": \"OpenCEP\",\n  \"fetchedAt\": \"2024-09-27T20:30:45.456Z\"\n}"
      }
    ]
  }
}
```

---

## Real-World Scenarios

### 1. Company Due Diligence

**Scenario**: Verify company information before business partnership

```javascript
// Claude Desktop conversation example
"I need to verify information about a potential business partner.
Can you look up CNPJ 12.345.678/0001-90 and tell me:
1. Company legal name
2. Business status
3. Main activity (CNAE)
4. Address
5. Capital amount"

// MCP DadosBR will automatically fetch the data and Claude will analyze it
```

**Expected Analysis**:

```
Based on the CNPJ lookup for 12.345.678/0001-90:

1. **Legal Name**: EMPRESA EXEMPLO LTDA
2. **Business Status**: ATIVA (Active)
3. **Main Activity**: 6201501 - Desenvolvimento de programas de computador sob encomenda (Custom software development)
4. **Address**: RUA EXEMPLO, 123, SALA 1, CENTRO, SÃO PAULO - SP, CEP 01310-100
5. **Capital**: R$ 10,000.00

The company appears to be an active software development company based in São Paulo with modest capital. The registration is current and in good standing.
```

### 2. Address Validation for E-commerce

**Scenario**: Validate customer shipping address

```javascript
// Continue.dev in VSCode
"@dadosbr I need to validate this shipping address: CEP 04038-001.
Can you confirm the correct address details?"

// Response will include full address information for validation
```

### 3. Market Research

**Scenario**: Analyze companies in a specific region

```javascript
// Custom application using TypeScript client
const companies = [
  "11.222.333/0001-81",
  "22.333.444/0001-92",
  "33.444.555/0001-03",
];

const results = await Promise.all(
  companies.map((cnpj) => client.lookupCNPJ(cnpj))
);

// Analyze results for market research
const activeCompanies = results.filter(
  (r) => r.ok && r.data.situacao_cadastral === "ATIVA"
);

const byState = activeCompanies.reduce((acc, company) => {
  const uf = company.data.uf;
  acc[uf] = (acc[uf] || 0) + 1;
  return acc;
}, {});

console.log("Active companies by state:", byState);
```

### 4. Logistics Route Planning

**Scenario**: Plan delivery routes using CEP data

```python
# Python client for logistics application
import asyncio
from dadosbr_client import DadosBRClient

async def plan_delivery_route(ceps):
    client = DadosBRClient()
    await client.connect()

    addresses = []
    for cep in ceps:
        result = await client.lookup_cep(cep)
        if result.get('result', {}).get('content'):
            data = json.loads(result['result']['content'][0]['text'])
            addresses.append({
                'cep': cep,
                'city': data.get('localidade'),
                'state': data.get('uf'),
                'neighborhood': data.get('bairro')
            })

    # Group by city for efficient routing
    by_city = {}
    for addr in addresses:
        city = addr['city']
        if city not in by_city:
            by_city[city] = []
        by_city[city].append(addr)

    await client.disconnect()
    return by_city

# Usage
ceps = ["01310-100", "04038-001", "05508-900"]
route_plan = await plan_delivery_route(ceps)
```

---

## Integration Patterns

### 1. Batch Processing Pattern

```typescript
class BatchProcessor {
  private client: DadosBRClient;
  private batchSize = 10;
  private delay = 1000; // 1 second between batches

  async processCNPJBatch(cnpjs: string[]) {
    const results = [];

    for (let i = 0; i < cnpjs.length; i += this.batchSize) {
      const batch = cnpjs.slice(i, i + this.batchSize);

      const batchResults = await Promise.all(
        batch.map((cnpj) => this.client.lookupCNPJ(cnpj))
      );

      results.push(...batchResults);

      // Delay between batches to respect rate limits
      if (i + this.batchSize < cnpjs.length) {
        await new Promise((resolve) => setTimeout(resolve, this.delay));
      }
    }

    return results;
  }
}
```

### 2. Caching Pattern

```typescript
class CachedDadosBRClient {
  private client: DadosBRClient;
  private cache = new Map<string, any>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  async lookupCNPJWithCache(cnpj: string) {
    const cacheKey = `cnpj:${cnpj}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const result = await this.client.lookupCNPJ(cnpj);

    if (result.ok) {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result;
  }
}
```

### 3. Retry Pattern

```typescript
class ResilientDadosBRClient {
  private client: DadosBRClient;
  private maxRetries = 3;
  private baseDelay = 1000;

  async lookupWithRetry(type: "cnpj" | "cep", value: string) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (type === "cnpj") {
          return await this.client.lookupCNPJ(value);
        } else {
          return await this.client.lookupCEP(value);
        }
      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
```

---

## Performance Optimization

### 1. Connection Pooling

```typescript
class ConnectionPool {
  private clients: DadosBRClient[] = [];
  private available: DadosBRClient[] = [];
  private poolSize = 5;

  async initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const client = new DadosBRClient();
      await client.connect();
      this.clients.push(client);
      this.available.push(client);
    }
  }

  async getClient(): Promise<DadosBRClient> {
    while (this.available.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return this.available.pop()!;
  }

  releaseClient(client: DadosBRClient) {
    this.available.push(client);
  }

  async destroy() {
    await Promise.all(this.clients.map((client) => client.disconnect()));
  }
}
```

### 2. Request Deduplication

The MCP DadosBR server includes built-in request deduplication that automatically prevents concurrent identical API calls:

```typescript
// Built-in deduplication in lib/core/tools.ts
const pendingRequests = new Map<string, Promise<any>>();

async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const promise = fn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

// Usage in lookup function
return await deduplicate(cacheKey, async () => {
  // API call logic here
});
```

This means multiple concurrent requests for the same CNPJ/CEP will automatically share a single API call and result.

**Key Benefits**:
- Reduces API load and costs
- Improves response times for concurrent requests
- Prevents rate limiting issues
- Works across all transport modes (stdio, HTTP)

````

### 3. Parallel Processing

```typescript
async function processCompaniesInParallel(cnpjs: string[], concurrency = 5) {
  const client = new DadosBRClient();
  await client.connect();

  const results = [];
  const executing = [];

  for (const cnpj of cnpjs) {
    const promise = client.lookupCNPJ(cnpj).then((result) => ({
      cnpj,
      result,
    }));

    results.push(promise);

    if (results.length >= concurrency) {
      executing.push(results.shift()!);
    }
  }

  // Wait for all to complete
  const allResults = await Promise.all([...executing, ...results]);

  await client.disconnect();
  return allResults;
}
````

---

## Error Handling

### 1. Comprehensive Error Handling

```typescript
interface LookupResult<T> {
  success: boolean;
  data?: T;
  error?: {
    type: "validation" | "network" | "api" | "timeout" | "unknown";
    message: string;
    code?: string;
    retryable: boolean;
  };
}

class RobustDadosBRClient {
  private client: DadosBRClient;

  async safeLookupCNPJ(cnpj: string): Promise<LookupResult<any>> {
    try {
      // Validate input format
      if (!this.isValidCNPJ(cnpj)) {
        return {
          success: false,
          error: {
            type: "validation",
            message: "Invalid CNPJ format",
            retryable: false,
          },
        };
      }

      const result = await this.client.lookupCNPJ(cnpj);

      if (result.error) {
        return this.handleAPIError(result.error);
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return this.handleException(error);
    }
  }

  private handleAPIError(error: string): LookupResult<any> {
    if (error.includes("not found")) {
      return {
        success: false,
        error: {
          type: "api",
          message: "CNPJ not found in database",
          retryable: false,
        },
      };
    }

    if (error.includes("rate limited")) {
      return {
        success: false,
        error: {
          type: "api",
          message: "Rate limit exceeded",
          retryable: true,
        },
      };
    }

    if (error.includes("timeout")) {
      return {
        success: false,
        error: {
          type: "timeout",
          message: "Request timeout",
          retryable: true,
        },
      };
    }

    return {
      success: false,
      error: {
        type: "api",
        message: error,
        retryable: true,
      },
    };
  }

  private handleException(error: any): LookupResult<any> {
    if (error.code === "ECONNREFUSED") {
      return {
        success: false,
        error: {
          type: "network",
          message: "Cannot connect to MCP server",
          retryable: true,
        },
      };
    }

    return {
      success: false,
      error: {
        type: "unknown",
        message: error.message || "Unknown error occurred",
        retryable: false,
      },
    };
  }

  private isValidCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, "");
    return cleaned.length === 14 && /^\d{14}$/.test(cleaned);
  }
}
```

### 2. Circuit Breaker Pattern

The MCP DadosBR server includes a built-in circuit breaker that protects against API failures:

```typescript
// Built-in circuit breaker in lib/core/http-client.ts
let failures = 0,
  lastFailure = 0,
  cbState: "CLOSED" | "OPEN" = "CLOSED";

async function withCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  if (cbState === "OPEN" && Date.now() - lastFailure < 30000)
    throw new Error("Circuit breaker is OPEN");
  if (cbState === "OPEN") cbState = "CLOSED";

  try {
    const result = await fn();
    failures = 0;
    cbState = "CLOSED";
    return result;
  } catch (error) {
    failures++;
    lastFailure = Date.now();
    if (failures >= 5) cbState = "OPEN";
    throw error;
  }
}
```

The circuit breaker automatically:

- **Failure Tracking**: Monitors consecutive API failures
- **Threshold Protection**: Opens after 5 consecutive failures
- **Recovery Window**: 30-second cooldown period
- **Automatic Recovery**: Attempts to close circuit after cooldown
- **Global Protection**: Protects all API endpoints (CNPJ, CEP, custom)
- **Graceful Degradation**: Returns meaningful error messages during outages

---

## Advanced Features

### 1. Monitoring and Metrics

The MCP DadosBR server includes built-in metrics collection:

```typescript
// Built-in metrics in lib/core/tools.ts
let metrics = {
  requests: 0,
  cacheHits: 0,
  errors: 0,
  totalTime: 0,
  startTime: Date.now(),
};

function recordMetrics(elapsed: number, fromCache: boolean, error: boolean) {
  metrics.requests++;
  metrics.totalTime += elapsed;
  if (fromCache) metrics.cacheHits++;
  if (error) metrics.errors++;
}
```

Metrics are automatically collected for:

- **Total requests**: Count of all API calls
- **Cache hits**: Number of requests served from cache
- **Errors**: Count of failed requests
- **Response times**: Total and average processing time
- **Cache hit rate**: Percentage of requests served from cache
- **Error rate**: Percentage of failed requests
- **Uptime**: Server operational duration

The metrics can be accessed programmatically and are logged with each request for monitoring and observability.

### 2. Configuration Management

```typescript
interface ClientConfig {
  serverPath?: string;
  httpUrl?: string;
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  circuitBreakerEnabled?: boolean;
  circuitBreakerThreshold?: number;
  customApiUrls?: {
    cnpj?: string;
    cep?: string;
  };
  authHeaders?: Record<string, string>;
}

class ConfigurableDadosBRClient {
  private config: Required<ClientConfig>;
  private client: DadosBRClient;

  constructor(config: ClientConfig = {}) {
    this.config = {
      serverPath: "/path/to/server.js",
      httpUrl: "http://localhost:3000/mcp",
      timeout: 8000,
      retries: 3,
      cacheEnabled: true,
      cacheTTL: 300000,
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5,
      customApiUrls: {},
      authHeaders: {},
      ...config,
    };
  }

  async connect() {
    if (this.config.httpUrl) {
      this.client = new HTTPDadosBRClient(this.config.httpUrl);
    } else {
      this.client = new DadosBRClient(this.config.serverPath);
    }

    await this.client.connect();
  }

  // Apply configuration to all operations
  async lookupCNPJ(cnpj: string) {
    let operation = () => this.client.lookupCNPJ(cnpj);

    if (this.config.cacheEnabled) {
      operation = this.withCache(operation, `cnpj:${cnpj}`);
    }

    if (this.config.retries > 0) {
      operation = this.withRetry(operation, this.config.retries);
    }

    if (this.config.circuitBreakerEnabled) {
      operation = this.withCircuitBreaker(operation);
    }

    return operation();
  }
}
```

### 3. Streaming Results

```typescript
class StreamingDadosBRClient {
  private client: DadosBRClient;

  async *lookupCNPJStream(cnpjs: string[]) {
    for (const cnpj of cnpjs) {
      try {
        const result = await this.client.lookupCNPJ(cnpj);
        yield { cnpj, result, error: null };
      } catch (error) {
        yield { cnpj, result: null, error };
      }
    }
  }

  async *lookupCEPStream(ceps: string[]) {
    for (const cep of ceps) {
      try {
        const result = await this.client.lookupCEP(cep);
        yield { cep, result, error: null };
      } catch (error) {
        yield { cep, result: null, error };
      }
    }
  }
}

// Usage
const client = new StreamingDadosBRClient();
const cnpjs = ["11.222.333/0001-81", "22.333.444/0001-92"];

for await (const { cnpj, result, error } of client.lookupCNPJStream(cnpjs)) {
  if (error) {
    console.error(`Failed to lookup ${cnpj}:`, error);
  } else {
    console.log(`${cnpj}:`, result.data?.razao_social);
  }
}
```

---

## Best Practices

### 1. Resource Management

```typescript
class ManagedDadosBRClient {
  private client: DadosBRClient;
  private connected = false;

  async connect() {
    if (!this.connected) {
      this.client = new DadosBRClient();
      await this.client.connect();
      this.connected = true;

      // Setup cleanup on process exit
      process.on("SIGINT", () => this.disconnect());
      process.on("SIGTERM", () => this.disconnect());
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  // Ensure connection before operations
  async lookupCNPJ(cnpj: string) {
    await this.connect();
    return this.client.lookupCNPJ(cnpj);
  }
}
```

### 2. Input Validation

```typescript
class ValidatedDadosBRClient {
  private client: DadosBRClient;

  async lookupCNPJ(cnpj: string) {
    // Normalize and validate
    const normalized = this.normalizeCNPJ(cnpj);
    if (!this.isValidCNPJ(normalized)) {
      throw new Error("Invalid CNPJ format");
    }

    return this.client.lookupCNPJ(normalized);
  }

  async lookupCEP(cep: string) {
    // Normalize and validate
    const normalized = this.normalizeCEP(cep);
    if (!this.isValidCEP(normalized)) {
      throw new Error("Invalid CEP format");
    }

    return this.client.lookupCEP(normalized);
  }

  private normalizeCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, "");
  }

  private normalizeCEP(cep: string): string {
    return cep.replace(/\D/g, "");
  }

  private isValidCNPJ(cnpj: string): boolean {
    return cnpj.length === 14 && /^\d{14}$/.test(cnpj);
  }

  private isValidCEP(cep: string): boolean {
    return cep.length === 8 && /^\d{8}$/.test(cep);
  }
}
```

### 3. Logging and Debugging

```typescript
class LoggingDadosBRClient {
  private client: DadosBRClient;
  private logger: (message: string, data?: any) => void;

  constructor(logger = console.log) {
    this.logger = logger;
  }

  async lookupCNPJ(cnpj: string) {
    const startTime = Date.now();
    this.logger(`Starting CNPJ lookup for: ${cnpj}`);

    try {
      const result = await this.client.lookupCNPJ(cnpj);
      const elapsed = Date.now() - startTime;

      this.logger(`CNPJ lookup completed in ${elapsed}ms`, {
        cnpj,
        success: result.ok,
        cached: elapsed < 100,
      });

      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger(`CNPJ lookup failed after ${elapsed}ms`, {
        cnpj,
        error: error.message,
      });
      throw error;
    }
  }
}
```

These examples demonstrate the flexibility and power of MCP DadosBR in various real-world scenarios. The server's built-in features like caching, request deduplication, and circuit breaking make it suitable for production use, while the simple API makes it easy to integrate into any application.
