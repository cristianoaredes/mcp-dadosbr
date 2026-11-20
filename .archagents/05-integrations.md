# Integrações

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

- **CNPJ e CEP (configuráveis com allowlist SSRF):** padrão `https://api.opencnpj.org/` e `https://opencep.com/v1/`, com hosts adicionais permitidos em `lib/config/index.ts` (ReceitaWS, BrasilAPI, CNPJ.ws, Minha Receita, ViaCEP, AwesomeAPI).
- **IBGE Localidades:** `https://servicodados.ibge.gov.br/api/v1/localidades` (sem chave).
- **PNCP (Publicações):** `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao` (sem chave), com HTTP 204 tratado como página vazia no modo filtrado (`options.noContent` em `lib/core/http-client.ts`).
- **Querido Diário (Open Knowledge Brasil):** `https://api.queridodiario.org.br/gazettes` (sem chave).
- **Banco Central (BCData/SGS):** `https://api.bcb.gov.br/dados/serie/bcdata.sgs` para séries 432, 433, 1, 21619 e 12 (sem chave).
- **FIPE (via BrasilAPI):** `https://brasilapi.com.br/api/fipe` (sem chave).
- **Portal da Transparência / CEIS / CNEP / CEPIM:** `https://api.portaldatransparencia.gov.br/api-de-dados` exige `TRANSPARENCIA_API_KEY` (com fallback para URLs manuais em `ceis_cnep_lookup`).

## Resiliência HTTP (`lib/core/http-client.ts`)

- **Circuit breaker particionado por origem (`getUpstreamKey`):** cada origem upstream (`new URL(url).origin.toLowerCase()`, com teto LRU/FIFO de `100` origens e remoção prioritária de instâncias `CLOSED`) possui `CircuitBreaker` isolado (`failureThreshold: 5`, `resetTimeoutMs: TIMEOUTS.CIRCUIT_BREAKER_RESET_MS`, `halfOpenMaxAttempts: 3`). Respostas 4xx não-429 (`400`/`401`/`403`/`404`) não disparam retry nem abrem o disjuntor; falhas transientes (`RETRY_STATUS_CODES`, `>= 500`, timeouts e erros de rede) são sinalizadas internamente para contabilização do circuit breaker antes de mapear `HttpResponse`.
- **Timeout limpo e dinâmico:** `AbortController` com `clearTimeout` garantido em bloco `finally` e mensagem com duração dinâmica (`formatTimeoutMessage(timeoutMs)`).
- **Retry com Equal Jitter:** aplicável a `RETRY_STATUS_CODES` (`429, 500, 502, 503, 504`) e erros de rede, com atraso `[base/2, base]` (`calculateBackoffDelayMs`), interrompendo retries imediatamente se o circuit breaker abrir.

Disponibilidade, limites de taxa e cobertura efetiva de cada provedor ficam **a confirmar** no ambiente de uso.

## Fontes

- `lib/config/index.ts:L7-L35`
- `lib/tools/government.ts:L12-L79`
- `lib/tools/government.ts:L213-L319`
- `lib/tools/financial.ts:L13-L89`
- `lib/core/http-client.ts:L1-L278`
