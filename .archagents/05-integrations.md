# Integrações

Base revisada: `133dbd5` (`0.7.0`, `SPC-0001`; base inicial: `037dae4c`).

- **CNPJ e CEP (configuráveis com allowlist SSRF):** padrão `https://api.opencnpj.org/` e `https://opencep.com/v1/`, com hosts adicionais permitidos em `lib/config/index.ts` (ReceitaWS, BrasilAPI, CNPJ.ws, Minha Receita, ViaCEP, AwesomeAPI).
- **IBGE Localidades & Indicadores:** `https://servicodados.ibge.gov.br/api/v1/localidades` (sem chave) para regiões/UFs/municípios (com filtro acento/case-insensitive e paginação opcional em `TCK-0023`); `https://servicodados.ibge.gov.br/api/v2/cnae` para hierarquia CNAE `v2` (`cnae_ncm_lookup`); e `https://servicodados.ibge.gov.br/api/v3/agregados` para População (`6579/9324`) e PIB (`5938/37`) por UF (`N3`) ou município (`N6`) em `ibge_indicadores`.
- **PNCP (Publicações & Busca):** `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao` (modo filtrado com `modalidade_id`, HTTP 204 tratado como página vazia via `options.noContent` em `lib/core/http-client.ts` e cache preservando `source`) e `https://pncp.gov.br/api/search/` (busca por palavra-chave sem `modalidade_id`, com `orgao_cnpj` normalizado via `pncpCnpj`).
- **CNES (DataSUS):** `https://apidadosabertos.saude.gov.br/cnes/{estabelecimentos,profissionais}` (sem chave), com normalização de sigla UF de 2 letras para código IBGE via `UF_TO_IBGE_CODE` em `lib/tools/health.ts`.
- **Querido Diário (Open Knowledge Brasil):** `https://api.queridodiario.org.br/gazettes` (sem chave), com cache de sucessos preservando `source`.
- **Banco Central (BCData/SGS & Olinda OData):** `https://api.bcb.gov.br/dados/serie/bcdata.sgs` para séries 432, 433, 1, 21619 e 12 (`bacen_taxas`, sem chave); e `https://olinda.bcb.gov.br/olinda/servico/{PTAX,Expectativas}/versao/v1/odata` para cotações PTAX históricas e Expectativas Focus (`bcb_olinda`, sem chave).
- **BrasilAPI (FIPE, NCM, SFN/Pix/Corretoras CVM, Feriados & DDD):** `https://brasilapi.com.br/api/{fipe,ncm/v1,banks/v1,pix/v1/participants,cvm/corretoras/v1,feriados/v1,ddd/v1}` (sem chave), com cache e paginação server-side nas listas extensas (`pix`, `corretoras`).
- **TCU Certidões Consolidadas & MTE Lista Suja CSV:** `https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes` (TCU Inidôneos, CNJ CNIA, CEIS, CNEP com timeout `10_000ms`, sem chave, integrada a `company_deep_profile`) e CSV oficial aberto do MTE `https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/areas-de-atuacao/cadastro_de_empregadores.csv` (~76 KB, parse UTF-8/ISO-8859-1 em `lista_suja_lookup`).
- **Portal da Transparência / CEIS / CNEP / CEPIM:** `https://api.portaldatransparencia.gov.br/api-de-dados` exige `TRANSPARENCIA_API_KEY` (com fallback para URLs manuais em `ceis_cnep_lookup`). A checagem de API key ocorre sempre antes da leitura do cache, as chaves de cache nunca incluem segredos e respostas com falhas parciais (`errors.length > 0`) ou fallbacks nunca são cacheadas.
- **Reuso de `lookup()`, anti-bot e caching (`TCK-0023`, `SPC-0001`):** `company_deep_profile` (`lib/tools/company.ts`) reutiliza `lookup("cnpj", ...)` (`cache` + `deduplicate`) e aciona `executeTcuCertidoes` + sub-lookups com propagação de `cache`; `consumidor_reclamacoes` retorna fallback guiado sem chamadas `fetch` devido ao challenge anti-bot JS F5 do portal; `domain_whois`, `datajud_processos`, `oab_advogado`, `bnmp_mandados`, `lista_suja_lookup`, `tcu_certidoes`, `cnes_saude`, `cnae_ncm_lookup`, `sistema_financeiro_lookup`, `feriados_ddd_lookup`, `bcb_olinda` e `ibge_indicadores` cacheiam apenas sucessos reais (`ok: true`, jamais fallbacks/CAPTCHAs/erros/`[]`).

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
- `lib/tools/legal.ts:L1-L563`
- `lib/shared/mte-lista-suja.ts:L1-L301`
- `lib/tools/tcu.ts:L1-L186`
- `lib/tools/fiscal-banking.ts:L1-L915`
- `lib/tools/olinda.ts:L1-L456`
- `lib/tools/ibge-indicadores.ts:L1-L520`
