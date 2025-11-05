# 🚀 Plano de Melhorias - MCP DadosBR

> **Data da Análise:** 2025-11-05
> **Versão Atual:** 0.3.5
> **Branch:** claude/codebase-overview-011CUp4BP2L341QvyfQfVHjh

---

## 📋 Sumário Executivo

Este documento consolida uma análise exaustiva do codebase MCP DadosBR e define um plano de ação priorizado para melhorar segurança, qualidade, performance e manutenibilidade.

### Métricas Atuais
- **Linhas de Código:** ~3,500
- **Arquivos Fonte:** ~20
- **Testes Unitários:** 88 (100% pass rate)
- **Cobertura de Testes:** 60%
- **Vulnerabilidades de Segurança:** 8 moderate (dependências)
- **Dependências Desatualizadas:** 9
- **Problemas Críticos Identificados:** 8

---

## 🎯 Objetivos Principais

1. **Segurança:** Eliminar vulnerabilidades críticas e melhorar práticas de segurança
2. **Qualidade:** Melhorar type safety, tratamento de erros e code organization
3. **Testes:** Aumentar cobertura para 80%+ e adicionar testes críticos faltantes
4. **Performance:** Otimizar operações lentas e implementar melhorias de cache
5. **Manutenibilidade:** Refatorar código complexo e melhorar documentação

---

## 🔴 PRIORIDADE 1 - CRÍTICO (Implementar Imediatamente)

### 1.1 Segurança - Implementar Validação de Checksum CNPJ
**Arquivo:** `lib/core/validation.ts`
**Problema:** Validação atual aceita CNPJs inválidos (ex: "11111111111111")
**Impacto:** Dados inválidos passam pela validação
**Esforço:** 2 horas

**Implementação:**
```typescript
export function validateCnpjChecksum(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;

  // Rejeitar CNPJs com todos dígitos iguais
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // Calcular primeiro dígito verificador
  let sum = 0;
  let multiplier = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }
  const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  // Calcular segundo dígito verificador
  sum = 0;
  multiplier = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }
  const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  return parseInt(digits[12]) === digit1 && parseInt(digits[13]) === digit2;
}
```

---

### 1.2 Segurança - Remover Logs DEBUG de Produção
**Arquivo:** `lib/adapters/cli.ts` (linhas 87-144)
**Problema:** Logs `[DEBUG]` expõem session IDs e estado interno
**Impacto:** Vazamento de informações sensíveis
**Esforço:** 30 minutos

**Implementação:**
```typescript
// Adicionar gate de ambiente
const DEBUG = process.env.NODE_ENV !== 'production';

if (DEBUG) {
  console.error('[DEBUG] Session created:', sessionId);
}
```

---

### 1.3 Segurança - Corrigir Geração de Tokens OAuth
**Arquivo:** `lib/workers/worker.ts` (linhas 408, 428)
**Problema:** Tokens previsíveis: `"mcp_access_granted_" + Date.now()`
**Impacto:** Tokens podem ser forjados
**Esforço:** 1 hora

**Implementação:**
```typescript
function generateSecureToken(prefix: string = 'mcp'): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  const token = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${token}`;
}

// Uso
const code = generateSecureToken('access');
const token = generateSecureToken('bearer');
```

---

### 1.4 Segurança - Remover Aceitação de API Key do Cliente
**Arquivo:** `lib/core/search.ts` (linha 15)
**Problema:** `executeSearch()` aceita `apiKey` de clientes
**Impacto:** Possível injeção de API keys maliciosas
**Esforço:** 1 hora

**Implementação:**
```typescript
// Remover parâmetro apiKey da assinatura
export async function executeSearch(
  query: string,
  options?: SearchOptions
): Promise<SearchResult> {
  // Usar apenas API key configurada no servidor
  const apiKey = getConfig().tavilyApiKey;
  if (!apiKey) {
    return Result.err(new Error('Tavily API key not configured'));
  }
  // ...
}
```

---

### 1.5 Segurança - Validar URLs de API Customizadas (SSRF)
**Arquivo:** `lib/config/index.ts` (linhas 28-82)
**Problema:** Aceita qualquer URL em `CNPJ_API_BASE_URL` e `CEP_API_BASE_URL`
**Impacto:** Vulnerabilidade SSRF (Server-Side Request Forgery)
**Esforço:** 2 horas

**Implementação:**
```typescript
const ALLOWED_API_HOSTS = [
  'api.opencnpj.org',
  'opencep.com',
  'brasilapi.com.br',
  'receitaws.com.br'
];

function validateApiUrl(url: string, allowedHosts: string[]): boolean {
  try {
    const parsed = new URL(url);

    // Apenas HTTPS
    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed');
    }

    // Verificar host na allowlist
    if (!allowedHosts.some(host => parsed.hostname.endsWith(host))) {
      throw new Error(`Host ${parsed.hostname} is not in allowlist`);
    }

    return true;
  } catch (error) {
    throw new Error(`Invalid API URL: ${error.message}`);
  }
}
```

---

### 1.6 Bugs - Corrigir Race Condition em Deduplicação
**Arquivo:** `lib/core/tools.ts` (linhas 44-51)
**Problema:** Map `pendingRequests` pode ter entradas obsoletas
**Impacto:** Memory leak e resultados incorretos
**Esforço:** 1 hora

**Implementação:**
```typescript
const DEDUP_TIMEOUT = 30000; // 30 segundos

function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing.promise;
  }

  const timeout = setTimeout(() => {
    pendingRequests.delete(key);
    console.warn(`[WARN] Deduplication timeout for key: ${key}`);
  }, DEDUP_TIMEOUT);

  const promise = fn()
    .finally(() => {
      clearTimeout(timeout);
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, { promise, timestamp: Date.now() });
  return promise;
}
```

---

### 1.7 Segurança - Implementar Rate Limiting Local
**Arquivo:** `lib/adapters/cli.ts`
**Problema:** Instâncias locais não têm rate limiting
**Impacto:** Abuso de APIs externas, custos inesperados
**Esforço:** 3 horas

**Implementação:**
```typescript
import { RateLimiter } from '../infrastructure/rate-limiter';

const rateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minuto
  maxRequests: 30   // 30 requisições por minuto
});

// Aplicar no handler de mensagens
app.post('/messages', async (req, res) => {
  const clientId = req.ip || 'default';

  if (!rateLimiter.checkLimit(clientId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Try again later.'
    });
  }

  // Processar mensagem...
});
```

---

### 1.8 Qualidade - Categorizar Erros Adequadamente
**Arquivo:** `lib/core/mcp-server.ts` (linhas 49-56)
**Problema:** Todos os erros convertidos para texto genérico
**Impacto:** Cliente não consegue distinguir tipos de erro
**Esforço:** 2 horas

**Implementação:**
```typescript
// Definir códigos de erro JSON-RPC
enum ErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Códigos customizados
  VALIDATION_ERROR = -32001,
  AUTHENTICATION_ERROR = -32002,
  RATE_LIMIT_ERROR = -32003,
  EXTERNAL_API_ERROR = -32004
}

function categorizeError(error: Error): { code: number; message: string } {
  if (error instanceof ValidationError) {
    return { code: ErrorCode.VALIDATION_ERROR, message: error.message };
  }
  if (error instanceof AuthenticationError) {
    return { code: ErrorCode.AUTHENTICATION_ERROR, message: 'Authentication failed' };
  }
  if (error instanceof RateLimitError) {
    return { code: ErrorCode.RATE_LIMIT_ERROR, message: 'Rate limit exceeded' };
  }
  return { code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' };
}
```

---

## 🟠 PRIORIDADE 2 - ALTA (Implementar Logo)

### 2.1 Qualidade - Refatorar worker.ts (1023 linhas)
**Arquivo:** `lib/workers/worker.ts`
**Problema:** Arquivo monolítico com muitas responsabilidades
**Impacto:** Difícil manter e testar
**Esforço:** 8 horas

**Estrutura Proposta:**
```
lib/workers/
├── worker.ts                 # Entry point (50 linhas)
├── handlers/
│   ├── mcp-handler.ts       # MCP JSON-RPC endpoint
│   ├── rest-handler.ts      # REST API endpoints
│   ├── oauth-handler.ts     # OAuth flow
│   └── health-handler.ts    # Health check
├── middleware/
│   ├── auth.ts              # API key authentication
│   ├── rate-limiter.ts      # Rate limiting logic
│   └── cors.ts              # CORS headers
└── schemas/
    └── openapi.ts           # OpenAPI specification
```

---

### 2.2 Testes - Adicionar Testes para Search
**Arquivo:** Criar `test/unit/search.test.ts`
**Problema:** Funcionalidade de busca não tem testes
**Impacto:** Mudanças podem quebrar sem detecção
**Esforço:** 4 horas

**Casos de Teste:**
- Busca básica com Tavily
- Busca com maxResults diferentes
- Tratamento de erro de API
- Timeout de busca
- Cache hit/miss
- API key inválida

---

### 2.3 Testes - Adicionar Testes para Intelligence
**Arquivo:** Criar `test/unit/intelligence.test.ts`
**Problema:** Lógica complexa de intelligence não testada
**Impacto:** Bugs em filtering e dork generation
**Esforço:** 6 horas

**Casos de Teste:**
- Geração de dorks para cada categoria
- Filtragem de CNPJ (true positives/negatives)
- Timeout handling
- Resultado consolidado
- Error handling

---

### 2.4 Testes - Adicionar Testes para Cache
**Arquivo:** Criar `test/unit/cache.test.ts`
**Problema:** LRU e TTL não testados
**Impacto:** Bugs de cache passam despercebidos
**Esforço:** 3 horas

**Casos de Teste:**
- LRU eviction
- TTL expiration
- Cache hit/miss
- Concurrent access
- Background cleanup
- KVCache adapter

---

### 2.5 Qualidade - Eliminar Tipos `any`
**Arquivos:** `lib/core/dork-templates.ts`, `lib/core/intelligence.ts`
**Problema:** Uso de `any` perde type safety
**Impacto:** Erros de tipo não detectados em compile time
**Esforço:** 3 horas

**Implementação:**
```typescript
// lib/types/cnpj.ts
export interface CnpjData {
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  data_situacao_cadastral?: string;
  cnae_fiscal?: string;
  cnae_fiscal_descricao?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
  };
  qsa?: QsaMember[];
}

export interface QsaMember {
  nome?: string;
  qualificacao?: string;
}

// Usar em dork-templates.ts
export function buildDorks(
  cnpjData: CnpjData,
  categories?: DorkCategory[]
): DorkTemplate[] {
  // Agora temos type safety completo
}
```

---

### 2.6 Documentação - Documentar Variáveis de Ambiente
**Arquivo:** Criar `.env.example` completo
**Problema:** Apenas 5 variáveis documentadas, faltam muitas
**Impacto:** Usuários não sabem opções disponíveis
**Esforço:** 1 hora

**Conteúdo:**
```bash
# Transport Configuration
MCP_TRANSPORT=stdio                    # stdio | http (default: stdio)
MCP_HTTP_PORT=3000                     # HTTP port (default: 3000)

# Cache Configuration
MCP_CACHE_SIZE=256                     # Cache size in entries (default: 256)
MCP_CACHE_TTL=60000                    # Cache TTL in milliseconds (default: 60000)
MCP_CACHE_BACKGROUND_CLEANUP=true     # Enable background cleanup (default: true)

# API Configuration
MCP_API_TIMEOUT=8000                   # API request timeout in ms (default: 8000)
CNPJ_API_BASE_URL=https://...         # Custom CNPJ API endpoint
CEP_API_BASE_URL=https://...          # Custom CEP API endpoint

# Authentication (Optional)
API_KEY_HEADER=X-API-Key              # Header name for API key
API_KEY_VALUE=your-secret-key         # Your API key value

# Search Configuration (Required for search features)
TAVILY_API_KEY=tvly-...               # Tavily API key (get at tavily.com)

# Cloudflare Workers (Production)
MCP_API_KEY=your-cf-api-key           # API key for Workers endpoint
MCP_DISABLE_RATE_LIMIT=false          # Disable rate limiting (default: false)

# Logging & Debugging
NODE_ENV=production                    # Environment (development | production)
DISABLE_THOUGHT_LOGGING=false         # Disable sequential thinking logs
LOG_LEVEL=info                         # Log level (debug | info | warn | error)
```

---

### 2.7 Performance - Implementar Limite de Concorrência em Intelligence
**Arquivo:** `lib/core/intelligence.ts` (linhas 140-173)
**Problema:** Todas as queries executam sequencialmente ou sem limite
**Impacto:** Pode sobrecarregar API Tavily
**Esforço:** 2 horas

**Implementação:**
```typescript
async function executeWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 3
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then(
      value => results.push({ status: 'fulfilled', value }),
      reason => results.push({ status: 'rejected', reason })
    );

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(0, executing.findIndex(p => p === promise));
    }
  }

  await Promise.all(executing);
  return results;
}
```

---

### 2.8 Performance - Corrigir Filtragem CNPJ
**Arquivo:** `lib/core/intelligence.ts` (linhas 44-48, 53-59)
**Problema:** Filtragem pode dar falso positivo
**Impacto:** Resultados irrelevantes incluídos
**Esforço:** 2 horas

**Implementação:**
```typescript
function containsCnpj(text: string, cnpj: string): boolean {
  const normalizedCnpj = cnpj.replace(/\D/g, '');

  // Buscar CNPJ formatado ou não formatado
  const patterns = [
    normalizedCnpj, // 12345678000190
    normalizedCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') // 12.345.678/0001-90
  ];

  return patterns.some(pattern => text.includes(pattern));
}
```

---

### 2.9 Qualidade - Implementar Request Tracing
**Arquivos:** Todos os handlers
**Problema:** Sem correlation ID para rastrear requests
**Impacto:** Difícil debugar problemas
**Esforço:** 4 horas

**Implementação:**
```typescript
// lib/infrastructure/tracing.ts
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export class RequestContext {
  constructor(public readonly requestId: string) {}

  log(level: string, message: string, data?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      level,
      message,
      ...data
    }));
  }
}

// Usar em todos os handlers
const requestId = generateRequestId();
const ctx = new RequestContext(requestId);
ctx.log('info', 'Processing CNPJ lookup', { cnpj });
```

---

### 2.10 Qualidade - Centralizar Configuração de Timeout
**Arquivos:** `lib/core/http-client.ts`, `lib/core/intelligence.ts`, `constants.ts`
**Problema:** Timeouts hardcoded em vários lugares
**Impacto:** Inconsistência e difícil manter
**Esforço:** 1 hora

**Implementação:**
```typescript
// lib/config/timeouts.ts
import { getConfig } from './index';

export const TIMEOUTS = {
  get HTTP_REQUEST_MS() {
    return parseInt(process.env.MCP_API_TIMEOUT || '8000');
  },
  get INTELLIGENCE_TOTAL_MS() {
    return parseInt(process.env.MCP_INTELLIGENCE_TIMEOUT || '25000');
  },
  get SEARCH_REQUEST_MS() {
    return parseInt(process.env.MCP_SEARCH_TIMEOUT || '10000');
  }
};
```

---

## 🟡 PRIORIDADE 3 - MÉDIA (Implementar Quando Possível)

### 3.1 Performance - Otimizar LRU Cache
**Arquivo:** `lib/core/cache.ts` (linhas 79-92)
**Problema:** Eviction é O(n), linear search
**Impacto:** Performance ruim com cache grande
**Esforço:** 3 horas

**Implementação:**
```typescript
class MemoryCache implements Cache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Set<string>(); // Manter ordem de acesso

  set(key: string, value: unknown, ttl?: number): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remover o primeiro elemento (mais antigo)
      const oldestKey = this.accessOrder.values().next().value;
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }

    this.cache.set(key, { value, expiresAt: Date.now() + (ttl || this.ttl) });

    // Atualizar ordem de acesso
    this.accessOrder.delete(key);
    this.accessOrder.add(key);
  }
}
```

---

### 3.2 Performance - Reutilizar Dados de Empresa em Intelligence
**Arquivo:** `lib/core/intelligence.ts`
**Problema:** Se CNPJ foi consultado recentemente, busca novamente
**Impacto:** Chamada API redundante
**Esforço:** 2 horas

**Implementação:**
```typescript
export async function executeIntelligence(
  cnpj: string,
  options?: IntelligenceOptions,
  cachedCompanyData?: CnpjData // Novo parâmetro opcional
): Promise<IntelligenceResult> {
  let companyData = cachedCompanyData;

  if (!companyData) {
    // Tentar buscar do cache primeiro
    const cacheKey = `cnpj:${cnpj}`;
    companyData = await cache.get<CnpjData>(cacheKey);

    if (!companyData) {
      // Buscar da API apenas se necessário
      companyData = await fetchCnpjData(cnpj);
      await cache.set(cacheKey, companyData);
    }
  }

  // Continuar com intelligence...
}
```

---

### 3.3 Performance - Cachear Resultados de Busca Completos
**Arquivo:** `lib/core/search.ts`
**Problema:** Cache inclui maxResults na chave, queries similares não compartilham
**Impacto:** Mais cache misses do que necessário
**Esforço:** 2 horas

**Implementação:**
```typescript
export async function executeSearch(
  query: string,
  options?: SearchOptions
): Promise<SearchResult> {
  const maxResults = options?.maxResults || 10;

  // Cache key sem maxResults
  const cacheKey = `search:${query}`;

  let results = await cache.get<SearchResult>(cacheKey);

  if (!results) {
    // Buscar sempre com maxResults alto para cachear mais
    results = await provider.search(query, { maxResults: 20 });
    await cache.set(cacheKey, results);
  }

  // Truncar resultados conforme solicitado
  return {
    ...results,
    results: results.results.slice(0, maxResults)
  };
}
```

---

### 3.4 Qualidade - Remover Dependências Não Utilizadas
**Arquivo:** `package.json`
**Problema:** `duck-duck-scrape` não é usado
**Impacto:** Bundle size desnecessário
**Esforço:** 30 minutos

**Ação:**
```bash
npm uninstall duck-duck-scrape
```

---

### 3.5 Qualidade - Consolidar Definições de Tipos
**Arquivos:** Vários
**Problema:** Tipos espalhados em múltiplos arquivos
**Impacto:** Difícil encontrar tipos
**Esforço:** 3 horas

**Estrutura Proposta:**
```
lib/types/
├── index.ts           # Re-exports
├── cnpj.ts           # CnpjData, QsaMember
├── cep.ts            # CepData
├── search.ts         # SearchOptions, SearchResult
├── intelligence.ts   # IntelligenceOptions, IntelligenceResult
├── cache.ts          # Cache interface, CacheEntry
├── errors.ts         # Custom error classes
└── config.ts         # Configuration types
```

---

### 3.6 Qualidade - Implementar Níveis de Log Adequados
**Arquivos:** Todos os módulos
**Problema:** Usa `console.error()` para tudo
**Impacto:** Não dá para filtrar por severidade
**Esforço:** 4 horas

**Implementação:**
```typescript
// lib/infrastructure/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}

  debug(message: string, data?: any) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(JSON.stringify({ level: 'debug', message, ...data }));
    }
  }

  info(message: string, data?: any) {
    if (this.level <= LogLevel.INFO) {
      console.log(JSON.stringify({ level: 'info', message, ...data }));
    }
  }

  warn(message: string, data?: any) {
    if (this.level <= LogLevel.WARN) {
      console.warn(JSON.stringify({ level: 'warn', message, ...data }));
    }
  }

  error(message: string, data?: any) {
    if (this.level <= LogLevel.ERROR) {
      console.error(JSON.stringify({ level: 'error', message, ...data }));
    }
  }
}

const logger = new Logger(
  process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO
);
export default logger;
```

---

### 3.7 Qualidade - Adicionar Configuração de Cache por Categoria
**Arquivo:** `lib/config/index.ts`
**Problema:** TTL único para todos os tipos de dados
**Impacto:** Dados de empresa poderiam ter TTL maior
**Esforço:** 2 horas

**Implementação:**
```typescript
export interface CacheTTLConfig {
  cnpj: number;      // 5 minutos (dados relativamente estáveis)
  cep: number;       // 10 minutos (dados muito estáveis)
  search: number;    // 1 minuto (resultados de busca mudam rápido)
  intelligence: number; // 30 segundos (resultados de intelligence mudam)
}

export const DEFAULT_CACHE_TTL: CacheTTLConfig = {
  cnpj: 300000,
  cep: 600000,
  search: 60000,
  intelligence: 30000
};

// Usar nos métodos set
await cache.set(key, data, DEFAULT_CACHE_TTL.cnpj);
```

---

### 3.8 Performance - Memoizar Geração de Dorks
**Arquivo:** `lib/core/intelligence.ts`
**Problema:** Dorks gerados repetidamente para mesmo CNPJ
**Impacto:** CPU desperdiçado
**Esforço:** 1 hora

**Implementação:**
```typescript
const dorkCache = new Map<string, DorkTemplate[]>();

function buildDorksWithMemo(cnpjData: CnpjData, categories?: DorkCategory[]): DorkTemplate[] {
  const cacheKey = `${cnpjData.cnpj}:${categories?.join(',') || 'all'}`;

  if (dorkCache.has(cacheKey)) {
    return dorkCache.get(cacheKey)!;
  }

  const dorks = buildDorks(cnpjData, categories);
  dorkCache.set(cacheKey, dorks);

  // Limpar cache se ficar muito grande
  if (dorkCache.size > 1000) {
    const firstKey = dorkCache.keys().next().value;
    dorkCache.delete(firstKey);
  }

  return dorks;
}
```

---

### 3.9 Qualidade - Remover Constantes Não Utilizadas
**Arquivo:** `lib/shared/utils/constants.ts`
**Problema:** Constantes DuckDuckGo não usadas (provider removido)
**Impacto:** Código morto confunde
**Esforço:** 15 minutos

**Ação:**
```typescript
// Remover:
// - RATE_LIMIT.DUCKDUCKGO_INTERVAL_MS
// - Outras referências a DuckDuckGo
```

---

## 🟢 PRIORIDADE 4 - BAIXA (Nice to Have)

### 4.1 Performance - Implementar Connection Pooling
**Arquivo:** `lib/core/http-client.ts`
**Problema:** Cada request cria novo AbortController
**Impacto:** Overhead de memória
**Esforço:** 3 horas

---

### 4.2 Observabilidade - Logging Estruturado
**Arquivos:** Todos
**Problema:** Logs não estruturados
**Impacto:** Difícil analisar logs em produção
**Esforço:** 5 horas

---

### 4.3 Performance - Otimizar Bundle Size
**Arquivo:** `tsconfig.worker.json`
**Problema:** Sem tree-shaking configurado
**Impacto:** Worker bundle maior que necessário
**Esforço:** 2 horas

---

### 4.4 Documentação - Architecture Decision Records (ADRs)
**Arquivo:** Criar `docs/adr/`
**Problema:** Decisões arquiteturais não documentadas
**Impacto:** Novos contribuidores não entendem decisões
**Esforço:** 4 horas

---

### 4.5 Configuração - Health Check Configurável
**Arquivo:** `lib/workers/worker.ts`
**Problema:** Health check não pode ser desabilitado
**Impacto:** Flexibilidade limitada
**Esforço:** 1 hora

---

### 4.6 Segurança - Melhorar Configuração OAuth
**Arquivo:** `lib/workers/worker.ts`
**Problema:** OAuth hardcoded, não customizável
**Impacto:** Inflexível para diferentes casos de uso
**Esforço:** 3 horas

---

## 🔧 DEPENDÊNCIAS - Atualizações e Correções

### Vulnerabilidades de Segurança (8 moderate)

#### D.1 conventional-changelog-cli
**Versão Atual:** 5.0.0
**Versão Corrigida:** 4.1.0
**Vulnerabilidade:** Argument Injection (GHSA-vh25-5764-9wcr)
**Ação:** Downgrade para versão segura

```bash
npm install --save-dev conventional-changelog-cli@4.1.0
```

#### D.2 esbuild (via vite)
**Versão Atual:** ≤0.24.2
**Versão Corrigida:** >0.24.2
**Vulnerabilidade:** SSRF em dev server (GHSA-67mh-4wv8-2f99)
**Ação:** Atualizar vite para trazer esbuild atualizado

```bash
npm install --save-dev vite@latest
```

#### D.3 vite
**Versão Atual:** 5.2.6 - 5.4.20
**Versão Corrigida:** >6.1.6
**Vulnerabilidade:** Path traversal (GHSA-93m4-6634-74q7)
**Ação:** Atualizar para versão corrigida

```bash
npm install --save-dev vite@^6.1.7
```

---

### Dependências Desatualizadas

#### D.4 zod
**Versão Atual:** ^3.23.8
**Versão Latest:** 4.1.12
**Breaking Change:** Sim (major version)
**Ação:** Avaliar breaking changes e migrar

```bash
npm install zod@^4.1.12
```

**Nota:** Verificar breaking changes em https://github.com/colinhacks/zod/releases

#### D.5 @genkit-ai/mcp
**Versão Atual:** ^1.21.0
**Versão Latest:** 1.22.0
**Ação:** Atualizar para versão mais recente

```bash
npm install @genkit-ai/mcp@^1.22.0
```

#### D.6 @modelcontextprotocol/sdk
**Versão Atual:** ^1.18.2
**Versão Latest:** 1.21.0
**Ação:** Atualizar para versão mais recente

```bash
npm install @modelcontextprotocol/sdk@^1.21.0
```

#### D.7 @smithery/sdk
**Versão Atual:** ^1.6.6
**Versão Latest:** 1.7.4
**Ação:** Atualizar para versão mais recente

```bash
npm install @smithery/sdk@^1.7.4
```

#### D.8 express
**Versão Atual:** ^5.0.1
**Versão Latest:** 5.1.0
**Nota:** Express 5 ainda em beta, considerar estabilidade
**Ação:** Atualizar para 5.1.0 ou considerar downgrade para 4.x estável

```bash
npm install express@^5.1.0
# OU
npm install express@^4.18.2
```

---

## 📊 BUILD & CI/CD - Melhorias

### B.1 Consolidar Workflows CI/CD
**Arquivos:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`
**Problema:** Workflows duplicados, testes rodando 2x
**Impacto:** Waste de recursos, inconsistência
**Esforço:** 2 horas

**Ação:** Criar workflow único com jobs condicionais

---

### B.2 Implementar Build Caching
**Arquivo:** `.github/workflows/ci.yml`
**Problema:** Dependencies instaladas fresh toda vez
**Impacto:** CI lento (2-3 minutos só install)
**Esforço:** 30 minutos

**Implementação:**
```yaml
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

---

### B.3 Validar Build do Worker
**Arquivo:** `.github/workflows/ci.yml`
**Problema:** Apenas verifica tamanho, não valida sintaxe
**Impacto:** Worker quebrado pode ser deployado
**Esforço:** 1 hora

**Implementação:**
```yaml
- name: Validate worker syntax
  run: |
    node -c build/lib/workers/worker.js
    npm run test:integration
```

---

### B.4 Versioning Automático
**Arquivo:** `package.json`
**Problema:** Versão hardcoded, deve ser manual
**Impacto:** Esquecer de atualizar, inconsistências
**Esforço:** 1 hora

**Ação:** Usar `npm version` nos scripts

```json
{
  "scripts": {
    "version:patch": "npm version patch -m 'chore: bump version to %s'",
    "version:minor": "npm version minor -m 'feat: bump version to %s'",
    "version:major": "npm version major -m 'feat!: bump version to %s'"
  }
}
```

---

### B.5 Documentar Secrets Necessários
**Arquivo:** Criar `docs/CI_SECRETS.md`
**Problema:** Secrets não documentados
**Impacto:** Setup de CI difícil
**Esforço:** 30 minutos

**Conteúdo:**
```markdown
# CI/CD Secrets Required

## GitHub Secrets

### NPM Publishing
- `NPM_TOKEN`: NPM access token for publishing packages

### Cloudflare Workers
- `CLOUDFLARE_API_TOKEN`: API token for Cloudflare
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### External Services
- `TAVILY_API_KEY`: Tavily API key for tests

## How to Setup
1. Go to Repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add each secret listed above
```

---

## 📈 Métricas de Progresso

### Cobertura de Testes
- **Atual:** 60%
- **Meta:** 80%+
- **Prioridade:** Alta

### Type Safety
- **Atual:** ~85% (vários `any`)
- **Meta:** 95%+
- **Prioridade:** Alta

### Bundle Size (Worker)
- **Atual:** ~250KB
- **Meta:** <200KB
- **Prioridade:** Média

### Vulnerabilidades
- **Atual:** 8 moderate
- **Meta:** 0
- **Prioridade:** Crítica

---

## 🗓️ Cronograma Sugerido

### Sprint 1 (Semana 1) - Segurança Crítica
- ✅ P1.1: Validação CNPJ checksum
- ✅ P1.2: Remover DEBUG logs
- ✅ P1.3: Tokens OAuth seguros
- ✅ P1.4: Remover API key do cliente
- ✅ P1.5: Validar URLs customizadas (SSRF)
- ✅ P1.6: Corrigir race condition
- ✅ P1.7: Rate limiting local
- ✅ P1.8: Categorizar erros

**Tempo Estimado:** 12 horas

---

### Sprint 2 (Semana 2) - Qualidade e Testes
- ✅ P2.2: Testes para Search
- ✅ P2.3: Testes para Intelligence
- ✅ P2.4: Testes para Cache
- ✅ P2.5: Eliminar tipos `any`
- ✅ P2.6: Documentar env vars
- ✅ D.1-D.8: Atualizar dependências

**Tempo Estimado:** 18 horas

---

### Sprint 3 (Semana 3) - Performance e Refactoring
- ✅ P2.1: Refatorar worker.ts
- ✅ P2.7: Limite de concorrência
- ✅ P2.8: Corrigir filtragem CNPJ
- ✅ P2.9: Request tracing
- ✅ P2.10: Centralizar timeouts
- ✅ P3.1: Otimizar LRU cache

**Tempo Estimado:** 20 horas

---

### Sprint 4 (Semana 4) - Melhorias Finais
- ✅ P3.2-P3.9: Melhorias de performance e qualidade
- ✅ B.1-B.5: Melhorias de CI/CD
- ✅ P4.x: Nice-to-have items (tempo permitindo)

**Tempo Estimado:** 15 horas

---

## ✅ Checklist de Validação

Após cada sprint, validar:

### Segurança
- [ ] Todas as vulnerabilidades resolvidas (`npm audit` clean)
- [ ] API keys não expostas em logs
- [ ] Rate limiting funcionando
- [ ] SSRF protection implementado
- [ ] Tokens gerados com crypto seguro

### Testes
- [ ] Cobertura ≥ 80%
- [ ] Todos os testes passando
- [ ] Testes de segurança adicionados
- [ ] Testes de integração completos

### Qualidade
- [ ] Zero tipos `any` (ou apenas quando absolutamente necessário)
- [ ] ESLint sem warnings
- [ ] TypeScript strict mode sem erros
- [ ] Código refatorado e modular

### Performance
- [ ] LRU cache otimizado
- [ ] Concurrency limiting implementado
- [ ] Bundle size ≤ 200KB
- [ ] Timeouts configuráveis

### Documentação
- [ ] `.env.example` completo
- [ ] CI secrets documentados
- [ ] ADRs criados para decisões principais
- [ ] README atualizado

### CI/CD
- [ ] Build caching funcionando
- [ ] Workflows consolidados
- [ ] Worker validation automática
- [ ] Versioning automático

---

## 🎯 Resultados Esperados

Após implementar este plano:

1. **Segurança:** Sistema robusto contra ataques comuns (SSRF, injection, etc.)
2. **Qualidade:** Código type-safe, bem testado e fácil de manter
3. **Performance:** Operações otimizadas, cache eficiente
4. **Confiabilidade:** Testes abrangentes, CI/CD robusto
5. **Manutenibilidade:** Código modular, bem documentado, fácil de estender

---

## 📝 Notas Finais

Este plano é um guia vivo e deve ser atualizado conforme o projeto evolui. Prioridades podem mudar baseado em:

- Feedback de usuários
- Descoberta de novos bugs
- Mudanças nos requisitos
- Novas vulnerabilidades descobertas

**Próximos Passos:**
1. Revisar e aprovar este plano
2. Criar issues no GitHub para cada item
3. Começar implementação pela Sprint 1 (Segurança Crítica)
4. Acompanhar progresso semanalmente

---

**Documento criado por:** Claude Code Agent
**Data:** 2025-11-05
**Versão:** 1.0
**Status:** Aguardando Aprovação
