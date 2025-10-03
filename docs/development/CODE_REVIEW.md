# 🔍 Code Review Completo - MCP DadosBR

**Data:** 30/09/2025  
**Versão Analisada:** 0.2.0 (branch: feature/sequential-thinking-search)  
**Revisor:** Análise Automatizada + Manual

---

## 📊 Sumário Executivo

- **Total de Issues Identificados:** 13
- **Críticos (🔴):** 3
- **Altos (🟡):** 6  
- **Médios/Baixos (🟢):** 4
- **Issues Corrigidos:** 3
- **Issues Pendentes:** 10

**Prioridade de Correção:** CRÍTICO → ALTO → MÉDIO → BAIXO

---

## 🔴 CRÍTICO - Issues de Segurança e Concorrência

### ✅ Issue #1: Circuit Breaker Não Thread-Safe [CORRIGIDO]

**Arquivo:** `lib/core/http-client.ts:6-8`  
**Severidade:** 🔴 CRÍTICA  
**Status:** ✅ **CORRIGIDO**

**Problema:**
```typescript
// ❌ Variáveis globais mutáveis sem sincronização
let failures = 0;
let lastFailure = 0;
let cbState: "CLOSED" | "OPEN" = "CLOSED";
```

**Impacto:**
- Race conditions em requisições concorrentes
- Contagem incorreta de falhas
- Estados inconsistentes do circuit breaker
- Pode causar falhas em cascata não detectadas

**Solução Implementada:**
- ✅ Novo arquivo: `lib/infrastructure/http/circuit-breaker.ts`
- ✅ Implementação thread-safe como classe
- ✅ Estado HALF_OPEN implementado
- ✅ Métricas encapsuladas
- ✅ 35 testes unitários criados

**Código Corrigido:**
```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';
  // ... estado encapsulado
}
```

---

### Issue #2: Cache Não Thread-Safe

**Arquivo:** `lib/core/cache.ts:4-9`  
**Severidade:** 🟡 MÉDIA  
**Status:** ⚠️ **PENDENTE**

**Problema:**
```typescript
// ❌ Map sem synchronization
private cache = new Map<string, CacheEntry>();
private accessOrder = new Map<string, number>();
```

**Impacto:**
- Corrupção de dados em ambiente multi-threaded
- Perda de entradas do cache
- LRU incorreto sob concorrência

**Solução Recomendada:**
```typescript
import { AsyncLock } from 'async-mutex';

export class ThreadSafeMemoryCache implements Cache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private lock = new AsyncLock();
  
  async get(key: string): Promise<any | null> {
    return this.lock.runExclusive(async () => {
      // ... operação atômica
    });
  }
}
```

**Dependência adicional:**
```bash
npm install async-mutex
```

---

### ✅ Issue #3: Secrets em Logs [CORRIGIDO]

**Arquivo:** `lib/core/intelligence.ts`, `lib/core/tools.ts`  
**Severidade:** 🟡 MÉDIA  
**Status:** ✅ **CORRIGIDO**

**Problema:**
```typescript
// ⚠️ Logs podem expor dados sensíveis
console.error(`[intelligence] [${options.cnpj}] Company: ${companyData.razao_social}`);
```

**Impacto:**
- Vazamento de CNPJ, razão social, CPF de sócios
- Dados sensíveis em arquivos de log
- Violação de LGPD

**Solução Implementada:**
- ✅ Novo arquivo: `lib/infrastructure/telemetry/logger.ts`
- ✅ Sanitização automática de PII
- ✅ Máscaramento de CNPJ: `00.000.***/$$01-91`
- ✅ Remoção de API keys, tokens, emails, CPF, telefones
- ✅ Método conveniente `logger.cnpjOperation()`

**Exemplo de Uso:**
```typescript
import { logger } from '../infrastructure/telemetry/logger';

// Automaticamente mascara dados sensíveis
logger.cnpjOperation('lookup', '00.000.000/0001-91', {
  status: 'success',
  company: 'Banco do Brasil S.A.'
});

// Output: { cnpj: '00.000.***/$$01-91', ... }
```

---

## ⚡ ALTO - Problemas de Performance

### Issue #4: Rate Limiting por Instância

**Arquivo:** `lib/core/search-providers.ts:21-23`  
**Severidade:** 🟡 MÉDIA  
**Status:** ⚠️ **PENDENTE**

**Problema:**
```typescript
// ❌ Rate limit não é global entre instâncias
private lastRequestTime = 0;
private minRequestInterval = 3000;
```

**Impacto:**
- Múltiplas instâncias podem violar rate limits externos
- Ban por DuckDuckGo
- Perda de funcionalidade

**Solução Recomendada:**
```typescript
// Usar KV storage ou Redis para rate limiting global
export class GlobalRateLimiter {
  constructor(private storage: KVNamespace | RedisClient) {}
  
  async checkLimit(key: string, intervalMs: number): Promise<boolean> {
    const lastRequest = await this.storage.get(key);
    if (lastRequest && Date.now() - parseInt(lastRequest) < intervalMs) {
      return false;
    }
    await this.storage.put(key, Date.now().toString());
    return true;
  }
}
```

---

### Issue #5: Sem Timeout Total

**Arquivo:** `lib/core/intelligence.ts:65-75`  
**Severidade:** 🟡 MÉDIA  
**Status:** ⚠️ **PENDENTE**

**Problema:**
```typescript
// ❌ Loop pode demorar indefinidamente
for (const dork of selectedDorks) {
  await provider.search(dork.query, maxResultsPerQuery);
}
```

**Impacto:**
- Operações podem travar por minutos
- Timeout de MCP client (30s default)
- Má experiência do usuário

**Solução Recomendada:**
```typescript
export async function executeIntelligence(
  options: IntelligenceOptions,
  apiConfig: ApiConfig,
  cache?: Cache
): Promise<LookupResult> {
  const TOTAL_TIMEOUT_MS = 25000; // 25s (antes do timeout do MCP)
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new TimeoutError('Intelligence search timed out', TOTAL_TIMEOUT_MS)), 
    TOTAL_TIMEOUT_MS)
  );
  
  const searchPromise = (async () => {
    // ... lógica existente
  })();
  
  return Promise.race([searchPromise, timeoutPromise]);
}
```

---

### Issue #6: Cleanup Ineficiente

**Arquivo:** `lib/core/cache.ts:35-42`  
**Severidade:** 🟡 MÉDIA  
**Status:** ⚠️ **PENDENTE**

**Problema:**
```typescript
// ⚠️ O(n) a cada operação de get/set
private cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of this.cache.entries()) {
    if (now > entry.expires) {
      this.cache.delete(key);
    }
  }
}
```

**Impacto:**
- Degrada performance com cache grande (256+ entries)
- Cada get/set faz full scan
- Pode adicionar 10-50ms de latência

**Solução Recomendada:**
```typescript
// Opção 1: Lazy expiration (não cleanup proativo)
get(key: string): any | null {
  const entry = this.cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expires) {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    return null;
  }
  
  return entry.data;
}

// Opção 2: Background cleanup com intervalo
private startBackgroundCleanup(): void {
  setInterval(() => this.cleanup(), 60000); // 1 min
}
```

---

## 🐛 MÉDIO - Bugs e Code Smells

### Issue #7: Silenciar Erros

**Arquivo:** `lib/core/search-providers.ts:60-63`  
**Severidade:** 🟡 MÉDIA  
**Status:** ⚠️ **PENDENTE**

**Problema:**
```typescript
// ❌ Retorna [] em vez de propagar erro
catch (error: any) {
  console.error(`[DuckDuckGo] Search failed: ${error.message}`);
  return [];
}
```

**Impacto:**
- Falhas silenciosas difíceis de debugar
- Usuário não sabe por que não há resultados
- Logs ignorados em produção

**Solução Recomendada:**
```typescript
import { Result, NotFoundError, RateLimitError } from '../../shared/types/result';

async search(query: string, maxResults: number = 5): Promise<Result<SearchResult[], Error>> {
  await this.rateLimit();

  try {
    const searchResults = await duckSearch(query, {
      safeSearch: 0,
      locale: 'br-br'
    });

    const limitedResults = searchResults.results.slice(0, maxResults);
    const mapped = limitedResults.map(r => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || ''
    }));
    
    return Result.ok(mapped);
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('detected an anomaly')) {
      return Result.err(new RateLimitError('DuckDuckGo rate limit exceeded'));
    }
    return Result.err(error);
  }
}
```

---

### Issue #8: SerpAPI Não Implementado

**Arquivo:** `lib/core/search-providers.ts:130-138`  
**Severidade:** 🟢 BAIXA  
**Status:** ⚠️ **PENDENTE**

**Problema:**
```typescript
// ❌ Feature anunciada mas não funciona
async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  console.warn('[SerpAPI] Not yet implemented');
  return [];
}
```

**Impacto:**
- Documentação enganosa
- Usuários esperam funcionalidade que não existe
- Código morto

**Solução 1: Implementar**
```typescript
async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!this.apiKey) {
    throw new Error('SerpAPI key not configured');
  }

  const response = await fetch(
    `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${this.apiKey}&num=${maxResults}`
  );
  
  const data = await response.json();
  
  return data.organic_results.map((r: any) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet
  }));
}
```

**Solução 2: Remover**
- Remover `SerpAPIProvider` completamente
- Atualizar documentação
- Remover de `ProviderType`

---

### Issue #9: Validação Fraca

**Arquivo:** `lib/core/dork-templates.ts:14-17`  
**Severidade:** 🟡 MÉDIA  
**Status:** ⚠️ **PENDENTE**

**Problema:**
```typescript
// ⚠️ Aceita múltiplos formatos sem validação
const cnpj = cnpjData.cnpj || cnpjData.taxId || '';
const razaoSocial = cnpjData.razao_social || cnpjData.company?.name || '';
```

**Impacto:**
- Bugs sutis com APIs diferentes
- Dorks mal formados
- Falhas silenciosas

**Solução Recomendada:**
```typescript
import { z } from 'zod';

const CnpjDataSchema = z.union([
  // OpenCNPJ format
  z.object({
    cnpj: z.string(),
    razao_social: z.string(),
    nome_fantasia: z.string().optional(),
    qsa: z.array(z.object({
      nome_socio: z.string()
    })).optional()
  }),
  // CNPJA format
  z.object({
    taxId: z.string(),
    company: z.object({
      name: z.string(),
      members: z.array(z.object({
        person: z.object({
          name: z.string()
        })
      })).optional()
    })
  })
]);

export function buildDorks(cnpjData: unknown, categories?: DorkCategory[]): DorkTemplate[] {
  // Validate and normalize
  const validated = CnpjDataSchema.parse(cnpjData);
  
  // Normalize to single format
  const normalized = 'cnpj' in validated ? {
    cnpj: validated.cnpj,
    razaoSocial: validated.razao_social,
    nomeFantasia: validated.nome_fantasia,
    socios: validated.qsa?.map(s => s.nome_socio) || []
  } : {
    cnpj: validated.taxId,
    razaoSocial: validated.company.name,
    nomeFantasia: '',
    socios: validated.company.members?.map(m => m.person.name) || []
  };
  
  // Build dorks with normalized data
  // ...
}
```

---

### Issue #10: Magic Numbers

**Arquivo:** Vários  
**Severidade:** 🟢 BAIXA  
**Status:** ⚠️ **PENDENTE**

**Problemas:**
```typescript
// lib/core/search-providers.ts:23
private minRequestInterval = 3000; // 3 seconds

// lib/core/http-client.ts:8
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 3,
});

// lib/core/cache.ts:8
constructor(maxSize = 256, ttl = 60000) {
```

**Solução Recomendada:**
```typescript
// lib/shared/utils/constants.ts
export const CONFIG = {
  RATE_LIMIT: {
    DUCKDUCKGO_INTERVAL_MS: 3000,
    TAVILY_INTERVAL_MS: 0,
  },
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD: 5,
    RESET_TIMEOUT_MS: 30000,
    HALF_OPEN_MAX_ATTEMPTS: 3,
  },
  CACHE: {
    DEFAULT_SIZE: 256,
    DEFAULT_TTL_MS: 60000,
  },
  TIMEOUTS: {
    HTTP_REQUEST_MS: 8000,
    INTELLIGENCE_TOTAL_MS: 25000,
  }
} as const;
```

---

### Issue #11: Error Handling Inconsistente

**Arquivos:** Vários  
**Severidade:** 🟡 MÉDIA  
**Status:** ✅ **PARCIALMENTE CORRIGIDO** (Result type criado)

**Problema:**
- `tools.ts` retorna `{ ok: false, error }`
- `search-providers.ts` lança exceptions
- `search-providers.ts` retorna `[]`

**Solução Implementada:**
- ✅ Criado `lib/shared/types/result.ts`
- ⚠️ Código existente ainda não migrado

**Próximos Passos:**
1. Migrar todas as funções para usar `Result<T, E>`
2. Remover pattern `{ ok: boolean }`
3. Padronizar error types

---

### Issue #12: Falta de Type Safety

**Arquivos:** Vários  
**Severidade:** 🟢 BAIXA  
**Status:** ⚠️ **PENDENTE**

**Problemas:**
```typescript
catch (error: any) { }
const socio: any = ...
private kv: any
```

**Solução Recomendada:**
```typescript
// Usar unknown em vez de any
catch (error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
}

// Tipar corretamente
const socio: Socio = ...
private kv: KVNamespace
```

---

### Issue #13: Dependência Circular Potencial

**Arquivos:** `lib/core/tools.ts`, `lib/core/search.ts`, `lib/core/intelligence.ts`  
**Severidade:** 🟢 BAIXA  
**Status:** ⚠️ **PENDENTE**

**Problema:**
- Importações circulares podem causar `undefined` em runtime

**Solução:** Reorganização arquitetural (ver seção abaixo)

---

## ✅ Melhorias Implementadas

### 1. Circuit Breaker Thread-Safe
- ✅ Arquivo: `lib/infrastructure/http/circuit-breaker.ts`
- ✅ 100+ linhas de código
- ✅ Estados: CLOSED, OPEN, HALF_OPEN
- ✅ Métricas encapsuladas
- ✅ 35 testes unitários

### 2. Result<T, E> Type
- ✅ Arquivo: `lib/shared/types/result.ts`
- ✅ Functional error handling
- ✅ Domain errors: ValidationError, NotFoundError, RateLimitError, etc
- ✅ Helpers: map, flatMap, match, unwrap

### 3. Logger com PII Sanitization
- ✅ Arquivo: `lib/infrastructure/telemetry/logger.ts`
- ✅ Máscaramento automático de CNPJ, CPF, emails
- ✅ Remoção de API keys e tokens
- ✅ Métodos convenientes: `cnpjOperation()`, `apiCall()`

### 4. Suite de Testes
- ✅ Framework: Vitest 2.0
- ✅ Configuração: `vitest.config.ts`
- ✅ 35 testes para Circuit Breaker
- ✅ Coverage thresholds: 80% lines, 75% branches

---

## 🏗️ Reorganização Arquitetural Recomendada

**Status:** ⚠️ PLANEJADO (não implementado por tempo)

### Estrutura Proposta

```
lib/
├── domain/              # Regras de negócio puras
│   ├── entities/
│   ├── repositories/   # Interfaces (ports)
│   └── services/
│
├── application/         # Casos de uso
│   ├── use-cases/
│   └── dto/
│
├── infrastructure/      # Implementações técnicas
│   ├── cache/
│   ├── http/
│   ├── search-providers/
│   ├── repositories/
│   └── telemetry/
│
├── presentation/        # Interfaces externas
│   ├── mcp/
│   ├── cli/
│   ├── http/
│   └── cloudflare/
│
└── shared/             # Código compartilhado
    ├── types/
    ├── utils/
    └── config/
```

**Benefícios:**
- ✅ Separation of Concerns
- ✅ Testabilidade
- ✅ Dependency Rule
- ✅ Manutenibilidade

---

## 📊 Métricas de Qualidade

### Antes das Correções
- **Thread Safety:** ❌ Circuit breaker não thread-safe
- **Security:** ⚠️ PII em logs
- **Error Handling:** ⚠️ Inconsistente
- **Tests:** ⚠️ Apenas testes manuais
- **Code Coverage:** 0%

### Depois das Correções
- **Thread Safety:** ✅ Circuit breaker corrigido
- **Security:** ✅ Logger com sanitização
- **Error Handling:** 🟡 Result type criado (migração pendente)
- **Tests:** ✅ 35 unit tests, framework configurado
- **Code Coverage:** 🎯 Target 80%+ (a medir)

---

## 📋 Checklist de Correções

### Implementadas ✅
- [x] Circuit Breaker thread-safe
- [x] Logger com PII sanitization
- [x] Result<T,E> type
- [x] Suite de testes (vitest)
- [x] 35 testes para Circuit Breaker
- [x] Documentação de code review

### Pendentes ⚠️
- [ ] Cache thread-safe (Issue #2)
- [ ] Rate limiting global (Issue #4)
- [ ] Timeout total para intelligence (Issue #5)
- [ ] Otimizar cache cleanup (Issue #6)
- [ ] Propagar erros (não silenciar) (Issue #7)
- [ ] Implementar ou remover SerpAPI (Issue #8)
- [ ] Validação forte com Zod (Issue #9)
- [ ] Extrair magic numbers (Issue #10)
- [ ] Migrar para Result type (Issue #11)
- [ ] Melhorar type safety (Issue #12)
- [ ] Reorganização arquitetural (Issue #13)

---

## 🚀 Próximos Passos Recomendados

### Curto Prazo (1-2 dias)
1. Instalar dependências: `npm install`
2. Rodar testes: `npm test`
3. Verificar coverage: `npm run test:coverage`
4. Corrigir Issues #2, #5, #7 (críticos para produção)

### Médio Prazo (1 semana)
5. Implementar Issues #4, #6, #9
6. Migrar código para usar Result type
7. Adicionar mais testes (target: 90% coverage)
8. Implementar ou documentar limitações do SerpAPI

### Longo Prazo (2-4 semanas)
9. Reorganização arquitetural completa
10. Testes de integração end-to-end
11. Benchmarks de performance
12. Documentação técnica completa

---

## 📞 Contato

Para dúvidas sobre este code review:
- **Email:** cristiano@aredes.me
- **GitHub:** @cristianoaredes
- **Issues:** https://github.com/cristianoaredes/mcp-dadosbr/issues

---

**Data do Review:** 30/09/2025  
**Próxima Revisão Recomendada:** Após implementar fixes pendentes
