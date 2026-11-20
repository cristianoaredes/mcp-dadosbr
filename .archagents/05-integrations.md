# Integrações

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

- **CNPJ e CEP (configuráveis com allowlist SSRF):** padrão `https://api.opencnpj.org/` e `https://opencep.com/v1/`, com hosts adicionais permitidos em `lib/config/index.ts` (ReceitaWS, BrasilAPI, CNPJ.ws, Minha Receita, ViaCEP, AwesomeAPI).
- **IBGE Localidades:** `https://servicodados.ibge.gov.br/api/v1/localidades` (sem chave). Em `TCK-0023` (`FND-0011`), `ibge_localidades` passou a cachear a lista bruta por URL (`ibge:${url}`), suportar filtros opcionais em memória (`id` e `nome` acento/case-insensitive) e paginação opcional (`page`/`limit`, retornando `{ items, pagination, filter? }` apenas quando `page`/`limit` são informados e mantendo array bruto legado + `structuredContent.source` para MCP Apps quando omitidos).
- **PNCP (Publicações):** `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao` (sem chave), com HTTP 204 tratado como página vazia no modo filtrado (`options.noContent` em `lib/core/http-client.ts`) e cache apenas de respostas `ok: true` preservando `source`.
- **Querido Diário (Open Knowledge Brasil):** `https://api.queridodiario.org.br/gazettes` (sem chave), com cache de sucessos preservando `source`.
- **Banco Central (BCData/SGS):** `https://api.bcb.gov.br/dados/serie/bcdata.sgs` para séries 432, 433, 1, 21619 e 12 (sem chave), com cache de sucessos preservando `source`.
- **FIPE (via BrasilAPI):** `https://brasilapi.com.br/api/fipe` (sem chave), com cache de sucessos em `fipe:preco:*` e `fipe:marcas:*`.
- **Portal da Transparência / CEIS / CNEP / CEPIM:** `https://api.portaldatransparencia.gov.br/api-de-dados` exige `TRANSPARENCIA_API_KEY` (com fallback para URLs manuais em `ceis_cnep_lookup`). A checagem de API key ocorre sempre antes da leitura do cache, as chaves de cache nunca incluem segredos e respostas com falhas parciais (`errors.length > 0`) ou fallbacks nunca são cacheadas.
- **Reuso de `lookup()` e caching nas demais tools read-heavy (`TCK-0023`):** `company_deep_profile` (`lib/tools/company.ts`) reutiliza `lookup("cnpj", ...)` (`cache` + `deduplicate`) e propaga `cache` aos sub-lookups; `domain_whois`, `consumidor_reclamacoes`, `datajud_processos`, `oab_advogado`, `bnmp_mandados`, `lista_suja_lookup` e `cnes_saude` cacheiam apenas sucessos reais (`ok: true`, jamais fallbacks/CAPTCHAs/erros e com `DATAJUD_API_KEY` validada antes do cache).

## Resiliência HTTP (`lib/core/http-client.ts`)

- **Circuit breaker particionado por origem (`getUpstreamKey`):** cada origem upstream (`new URL(url).origin.toLowerCase()`, com teto LRU/FIFO de `100` origens e remoção prioritária de instâncias `CLOSED`) possui `CircuitBreaker` isolado (`failureThreshold: 5`, `resetTimeoutMs: TIMEOUTS.CIRCUIT_BREAKER_RESET_MS`, `halfOpenMaxAttempts: 3`). Respostas 4xx não-429 (`400`/`401`/`403`/`404`) não disparam retry nem abrem o disjuntor; falhas transientes (`RETRY_STATUS_CODES`, `>= 500`, timeouts e erros de rede) são sinalizadas internamente para contabilização do circuit breaker antes de mapear `HttpResponse`.
- **Timeout limpo e dinâmico:** `AbortController` com `clearTimeout` garantido em bloco `finally` e mensagem com duração dinâmica (`formatTimeoutMessage(timeoutMs)`).
- **Retry com Equal Jitter:** aplicável a `RETRY_STATUS_CODES` (`429, 500, 502, 503, 504`) e erros de rede, com atraso `[base/2, base]` (`calculateBackoffDelayMs`), interrompendo retries imediatamente se o circuit breaker abrir.
- **Timeouts e cancelamento em clientes externos (`lib/shared/utils/timeout.ts`, `search-providers.ts`, `legal.ts`, `intelligence.ts`):**
  - `PerplexityProvider` (`createTimeoutController`) e `TavilyProvider` (`raceWithTimeoutAndSignal`) aplicam `TIMEOUTS.SEARCH_REQUEST_MS` (default `10s`) e propagam `AbortSignal` com cleanup em `finally`.
  - `datajud_processos` e `bnmp_mandados` (`lib/tools/legal.ts`) limitam `fetch` com `TIMEOUTS.HTTP_REQUEST_MS`; em timeout no BNMP, o fallback marca `timed_out: true`.
  - `procurados_lookup` (`executeProcurados`) aplica concorrência limitada (`PROCURADOS_CONCURRENCY = 4` via `executeWithConcurrencyLimit`), timeout por página (`TIMEOUTS.HTTP_REQUEST_MS`) e deadline agregado (`totalCtrl`, `Math.max(HTTP_REQUEST_MS, INTELLIGENCE_TOTAL_MS)`), contabilizando `pages_checked`/`pages_failed` para evitar falsos negativos silenciosos (`NOT_FOUND` só com `pages_failed === 0`, `INCONCLUSIVE` com `partial: true` se houver falhas parciais sem match, e `{ ok: false }` se todas as 13 páginas falharem). O cache integral da lista (`PROCURADOS_CACHE_KEY = "procurados:entries:v1"`) só é gravado quando todas as 13 páginas obtêm sucesso (`pages_failed === 0`).
  - `executeIntelligence` limpa seu timer de 25 s em `finally` e propaga `AbortController.signal` ao scheduler concorrente e aos search providers.

Disponibilidade, limites de taxa e cobertura efetiva de cada provedor ficam **a confirmar** no ambiente de uso.

## Fontes

- `lib/config/index.ts:L7-L35`
- `lib/core/tool-schemas.ts:L96-L108`
- `lib/core/mcp-server.ts:L184-L205`
- `lib/tools/government.ts:L1-L486`
- `lib/tools/financial.ts:L1-L149`
- `lib/tools/company.ts:L74-L238`
- `lib/tools/health.ts:L1-L58`
- `lib/core/http-client.ts:L1-L278`
- `lib/shared/utils/timeout.ts:L1-L138`
- `lib/core/search-providers.ts:L1-L296`
- `lib/core/intelligence.ts:L1-L523`
- `lib/tools/legal.ts:L1-L504`
