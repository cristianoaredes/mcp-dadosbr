# Assessment Findings — `mcp-dadosbr`

- **Revisão base:** `6c74db6` (branch `main`)
- **Data:** `2026-11-20`
- **Autonomia:** `L2`
- **Stack:** `TypeScript / Node.js / MCP`
- **Dimensões executadas (8):** `security`, `agentic-security`, `reliability`, `performance`, `architecture`, `test-coverage`, `observability`, `dependency`
- **Dimensões puladas (3):**
  - `compliance-br` (`--compliance`): pulada por decisão do operador (recomendada pelo gate de superfície devido à jurisdição BR e fontes públicas com dados cadastrais/QSA/sanções).
  - `martech` (`--martech`): pulada — sem flag `--martech` e sem superfície de tracking/analytics/marketing detectada.
  - `inventory` (`--inventory`): pulada — sem flag `--inventory`.

---

## Medição Mecânica (`audit-measure.py` + medição complementar da stack)

> `audit-measure.py --root . --json` reportou `mede_o_framework: false`. Dimensões cujos checks são auto-auditorias do framework ou dependem de artefatos Python permanecem explicitamente como `nao_medido` ou `quebrado` no coletor (nunca reportadas como `limpo`).

| Dimensão | Estado no Coletor (`audit-measure.py`) | Detalhes do Coletor | Medição Complementar da Stack |
|---|---|---|---|
| `security` | `nao_medido` | 5 auto-auditorias do framework (`piso-safety`, `tool-allowlist`, `permissoes-de-agente`, `piso-dos-consumidores`, `paridade-do-instalado`) | `secret-scan.sh` limpo (0 segredos); `gitleaks detect --no-git` (4,77 MB) 0 leaks; varredura P11 0 ocorrências; `apps/` 0 `innerHTML`/XSS; inspeção manual em `lib/` e `.github/workflows/` |
| `agentic-security` | `quebrado` | `apply-heuristic.py --heuristic agentic-security` falhou (TCK-0239: caminho `antigravity-cli/.../core/` não encontrado fora do repo do framework) | Inspeção direta da superfície MCP (23 tools em `lib/tools/`, `lib/core/`, `lib/adapters/`, `.archagents/`) |
| `reliability` | `limpo` | `runs-zumbis: 0`, `retro-validate: 12/12 ok` (governança do backlog) | Inspeção de `http-client.ts`, `circuit-breaker.ts`, `sse.ts`, `cli.ts`, `search-providers.ts`, `tools/legal.ts`, `rate-limit.ts`, `cache.ts` |
| `performance` | `limpo` | `duracao-dos-runs`: mediana `433.5s`, p95 `833.794s`, max `1254.0s` em 12 runs | Inspeção de paginação/cache/concorrência em `lib/tools/` |
| `architecture` | `achado` + `nao_medido` | `cobertura-do-as-is`: `apps/` e `infra/` sem entrada no REGISTRY; `procedencia-de-doc` e `tickets-reivindicados` limpos; 5 auto-auditorias `nao_medido`; `elo-de-supersede-de-adr` `nao_medido` (nenhum ADR em `.archagents/09-decisions/`) | Análise de grafo de imports em `lib/` (1 ciclo), contratos e artefatos órfãos |
| `test-coverage` | `nao_medido` | `cobertura-de-teste`: sem `.coverage.json` Python | `npm test` 286/286 PASS; `unittest` (`infra/runner`) 23/23 PASS; `tsc --noEmit` + `tsc -p tsconfig.worker.json --noEmit` 0 erros; `@vitest/coverage-v8` ausente (`MODULE_NOT_FOUND`); mapa de imports de `test/unit/*.test.ts` |
| `observability` | `achado` | `cobertura-do-reflect`: `routes_coverage: no_data`, `cost_coverage: no_data`; `independencia-de-verify`: limpo 12/12 | Inspeção de `logger.ts`, `tracing.ts`, `tools.ts`, `mcp-server.ts`, `auth.ts`, `cloudflare.ts` |
| `dependency` | `nao_medido` | `pip-check` (auto-auditoria do framework) | `npm audit --omit=dev --json` = 20 vulns (`0C / 14H / 2M / 4L`); `npm audit --json` total = 38 vulns (`3C / 27H / 4M / 4L`); varredura de imports de runtime |

---

## Resumo dos Achados

| ID | Dimensão | Severidade | Título | Ticket |
|---|---|---|---|---|
| `FND-0001` | `security` | `high` | Bypass de autenticação em `/mcp` e `/sse`, OAuth inseguro (Open Redirect + tokens sem verificação) e CORS `*` no Cloudflare Worker | `TCK-0013` |
| `FND-0002` | `security` | `high` | Bypass da proteção SSRF em `resolveApiConfig(overrides)` e adapter Smithery, `localhost`/`127.0.0.1` permitidos em produção e path traversal em `fipe_veiculos` | `TCK-0014` |
| `FND-0003` | `security` | `medium` | Transporte HTTP/SSE do CLI sem endurecimento (bind `0.0.0.0`, CORS `*`, headers de segurança ausentes, `sessionId` em objeto com protótipo e sem teto de sessões) + `cloudflare-deploy.yml` sem `permissions:` | `TCK-0015` |
| `FND-0004` | `agentic-security` | `high` | Ausência de validação de input em runtime em 21 de 23 tools MCP, parâmetro `api_key` no schema de `cnpj_intelligence` e falta de artefatos verificáveis de governança agêntica | `TCK-0016` |
| `FND-0005` | `agentic-security` | `high` | Estado global compartilhado e vazamento de traces/PII em `sequentialthinking`, `cnpj_search` e `cnpj_intelligence` + ausência de rate limit no dispatcher MCP/`stdio` | `TCK-0017` |
| `FND-0006` | `reliability` | `high` | Circuit breaker inoperante em `httpJson` (callback nunca lança exceção + instância única para 8 upstreams) e vazamento de `setTimeout` por requisição | `TCK-0018` |
| `FND-0007` | `reliability` | `high` | Chamadas `fetch()` sem timeout explícito (`PerplexityProvider`, `datajud_processos`, `bnmp_mandados`, `procurados_lookup`), falso negativo silencioso em `procurados_lookup` e timer/trabalho vazado em `executeIntelligence` | `TCK-0019` |
| `FND-0008` | `reliability` | `medium` | Ciclo de vida SSE quebrado no Worker (`finally` cancela ping/timeout na hora), graceful shutdown quebrado no CLI, `setInterval` vazado no `RateLimiter` e race/crescimento ilimitado em KV | `TCK-0020` |
| `FND-0009` | `dependency` | `high` | 20 vulnerabilidades em dependências de runtime (14 `high`) e dependências mortas em `dependencies` (`agents`, `@smithery/sdk`, `workers-mcp`, `async-mutex`) | `TCK-0021` |
| `FND-0010` | `dependency` | `medium` | 3 vulnerabilidades `critical` e 13 `high` adicionais em `devDependencies` (`vitest`, `@vitest/ui`, `vite`, `wrangler`, `handlebars`, `rollup`) e divergência de versão do `wrangler` no CI | `TCK-0022` |
| `FND-0011` | `performance` | `medium` | Ausência de paginação/cache em `ibge_localidades` (`municipios`) e nas tools governamentais/financeiras + raspagem sequencial sem cache em `procurados_lookup` | `TCK-0023` |
| `FND-0012` | `architecture` | `medium` | Ciclo `core ↔ tools`, divergência de contrato em `cnpj_intelligence`, artefatos órfãos e cobertura AS-IS cega para `apps/` e `infra/` | `TCK-0024` |
| `FND-0013` | `observability` | `medium` | Logger estruturado e tracing (`logger.ts`/`tracing.ts`) são código morto com risco `stdout`, métricas quebradas (`cacheHits` sempre 0, reset por conexão SSE) e ausência de audit log em auth/tools | `TCK-0025` |
| `FND-0014` | `test-coverage` | `high` | Módulos críticos sem testes unitários (`auth`, `oauth`, `http-client`, `workers`, `smithery`, `legal`/`company`), 4 suítes que não importam código de produção, `test:coverage` quebrado e sleeps reais | `TCK-0026` |

---

## Findings Detalhados

### FND-0001 — Bypass de autenticação em `/mcp` e `/sse`, OAuth inseguro (Open Redirect + tokens sem verificação) e CORS `*` no Cloudflare Worker

- **Categoria:** `security`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0013`
- **Evidência:**
  - `lib/workers/auth.ts:L24-L33`
  - `lib/workers/auth.ts:L49`
  - `lib/workers/oauth.ts:L12-L51`
  - `lib/workers/oauth.ts:L69-L106`
  - `lib/workers/oauth.ts:L171-L218`
  - `lib/workers/oauth.ts:L237`
  - `lib/adapters/cloudflare.ts:L33-L38`

#### Descrição
No Cloudflare Worker, `authenticateRequest` pula a verificação de `MCP_API_KEY` para `/mcp` e `/sse` (além de `/health`, `/oauth/*`, `/.well-known/*` e `/openapi.json`), permitindo que qualquer cliente não autenticado execute todas as 23 ferramentas MCP — inclusive chamadas que consomem quotas pagas (`TAVILY_API_KEY`, `PERPLEXITY_API_KEY`) ou chaves governamentais (`TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`) mesmo quando `MCP_API_KEY` está configurada. Nos endpoints REST em que `MCP_API_KEY` é exigida, a comparação `providedKey !== expectedApiKey` (`lib/workers/auth.ts:L49`) não é constant-time.

Adicionalmente, os endpoints OAuth do Worker apresentam múltiplas falhas: `handleOAuthAuthorize` redireciona (`302 Location`) para qualquer `redirect_uri` recebido via query string sem validação de allowlist nem tratamento para URLs malformadas (Open Redirect, CWE-601); `handleOAuthToken` aceita qualquer string em `code` sem validação de emissão, PKCE ou autenticação de cliente, retornando um `id_token` fictício (`jwt_<hex>`) em desacordo com `id_token_signing_alg_values_supported: ['RS256']` anunciado em `handleOAuthDiscovery`; e `handleOAuthRegister` não persiste clientes nem valida `redirect_uris`. Por fim, `corsHeaders` define `Access-Control-Allow-Origin: *` globalmente (inclusive sobre rotas autenticadas) e omite `Authorization` e `X-API-Key` de `Access-Control-Allow-Headers`.

#### Impacto
Exposição não autenticada da superfície completa de execução MCP no Worker, abuso de API keys pagas do operador, vetor de Open Redirect/phishing via `/oauth/authorize`, emissão de tokens sem lastro real em `/oauth/token` e política CORS permissiva em rotas protegidas.

#### Mitigação sugerida
Exigir autenticação (`MCP_API_KEY` via comparação constant-time ou token OAuth validado e persistido em KV) em `/mcp` e `/sse`; validar `redirect_uri` contra lista/esquema permitido com tratamento de erro 400 para URLs inválidas; implementar verificação real de authorization code/PKCE/client credentials ou desabilitar o fluxo OAuth fictício; restringir `Access-Control-Allow-Origin` para rotas autenticadas e incluir `Authorization` e `X-API-Key` nos headers permitidos quando aplicável.

---

### FND-0002 — Bypass da proteção SSRF em `resolveApiConfig(overrides)` e adapter Smithery, `localhost`/`127.0.0.1` permitidos em produção e path traversal em `fipe_veiculos`

- **Categoria:** `security`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0014`
- **Evidência:**
  - `lib/config/index.ts:L17-L35`
  - `lib/config/index.ts:L48-L57`
  - `lib/config/index.ts:L149-L163`
  - `lib/adapters/smithery.ts:L8-L35`
  - `lib/tools/financial.ts:L81-L83`

#### Descrição
`resolveApiConfig(overrides)` aplica os `overrides` após `loadApiConfiguration()` sem reexecutar `validateUrl()` nem `normalizeBaseUrl()`, permitindo que chamadores passem URLs arbitrárias (`http://`, hosts internos ou externos não autorizados) e ainda recebam `base.authHeaders` mesclados na configuração resultante. O adapter Smithery (`lib/adapters/smithery.ts`) aceita qualquer `z.string().url()` no `configSchema` (inclusive definindo o default `https://opencnpj.org/api/v1`, que não corresponde a `api.opencnpj.org` em `ALLOWED_CNPJ_HOSTS`) e repassa direto para `resolveApiConfig(config)`.

Além disso, `validateUrl()` em `lib/config/index.ts` permite `localhost` e `127.0.0.1` incondicionalmente (sem verificar ambiente de desenvolvimento) e o predicado `parsed.hostname.endsWith('.localhost')` aceita subdomínios arbitrários de `localhost` sem bloquear `username`/`password` na URL ou portas inesperadas. Em `lib/tools/financial.ts`, `executeFipe` interpola `args.tipo` diretamente em `${FIPE_API}/marcas/v1/${tipo}` sem `encodeURIComponent` nem validação runtime da allowlist (`carros | motos | caminhoes`), possibilitando path traversal no path da requisição upstream.

#### Impacto
Contorno da proteção SSRF com possível exfiltração de `authHeaders` para hosts controlados pelo chamador, acesso indevido a serviços locais em loopback em produção e manipulação de caminho na API FIPE.

#### Mitigação sugerida
Reexecutar `validateUrl()` e `normalizeBaseUrl()` sobre as URLs finais dentro de `resolveApiConfig(overrides)`; alinhar `smithery.ts` à allowlist/default de `lib/config/index.ts`; restringir `localhost`/`127.0.0.1` apenas a ambiente não produtivo (ou flag explícita), rejeitar credenciais embutidas (`url.username`/`url.password`) em `validateUrl()` e remover wildcard de subdomínio para `localhost`; validar `tipo` contra allowlist explícita em `executeFipe`.

---

### FND-0003 — Transporte HTTP/SSE do CLI sem endurecimento (bind `0.0.0.0`, CORS `*`, headers de segurança ausentes, `sessionId` em objeto com protótipo e sem teto de sessões) + `cloudflare-deploy.yml` sem `permissions:`

- **Categoria:** `security`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0015`
- **Evidência:**
  - `lib/adapters/cli.ts:L82-L90`
  - `lib/adapters/cli.ts:L133`
  - `lib/adapters/cli.ts:L176`
  - `lib/adapters/cli.ts:L206-L225`
  - `lib/adapters/cli.ts:L234-L239`
  - `.github/workflows/cloudflare-deploy.yml:L27-L36`

#### Descrição
No modo `http` do CLI (`lib/adapters/cli.ts`), `app.listen(port)` não especifica interface de bind (escutando em `0.0.0.0`/`::`), define `Access-Control-Allow-Origin: *`, não valida headers `Host` ou `Origin` contra DNS rebinding/CSRF local, não configura headers de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`) e mantém `x-powered-by` ativo. Além disso, `transports` é um objeto simples `{}` indexado diretamente por `req.query.sessionId as string` (sujeito a chaves de `Object.prototype` como `toString` e `constructor`, podendo lançar erro 500 ao chamar `.transport`) e não possui limite máximo de sessões SSE simultâneas.

No pipeline de entrega contínua, `.github/workflows/cloudflare-deploy.yml` não declara bloco `permissions:` explícito (menor privilégio) nem `persist-credentials: false` em `actions/checkout@v4`.

#### Impacto
Exposição do servidor local HTTP/SSE na rede local e vulnerabilidade a DNS rebinding/CSRF via navegador, consumo ilimitado de sessões SSE/memória no processo CLI e token `GITHUB_TOKEN` com permissões padrão herdadas no workflow de deploy Cloudflare.

#### Mitigação sugerida
Fazer bind padrão em `127.0.0.1` no CLI HTTP (com host configurável via env), validar `Host`/`Origin`, restringir CORS e adicionar headers defensivos (`app.disable('x-powered-by')`, `X-Content-Type-Options: nosniff`); substituir `Record<string, TransportSession>` por `Map<string, TransportSession>` com limite máximo de sessões e validação de `sessionId` como string; declarar `permissions: { contents: read }` e `persist-credentials: false` em `cloudflare-deploy.yml`.

---

### FND-0004 — Ausência de validação de input em runtime em 21 de 23 tools MCP, parâmetro `api_key` no schema de `cnpj_intelligence` e falta de artefatos verificáveis de governança agêntica

- **Categoria:** `agentic-security`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0016`
- **Evidência:**
  - `lib/tools/core.ts:L79-L82`
  - `lib/tools/core.ts:L87-L104`
  - `lib/core/intelligence.ts:L441-L444`
  - `lib/tools/government.ts:L60`
  - `lib/tools/government.ts:L80-L81`
  - `lib/tools/government.ts:L300-L302`
  - `lib/tools/company.ts:L40-L41`
  - `lib/tools/company.ts:L71-L72`
  - `lib/tools/company.ts:L149-L150`
  - `lib/tools/legal.ts:L28-L29`
  - `lib/tools/legal.ts:L100`
  - `lib/tools/legal.ts:L138`
  - `lib/tools/legal.ts:L190`
  - `.archagents/07-security-compliance.md:L1-L14`

#### Descrição
Apenas 2 de 23 ferramentas (`cnpj_lookup` e `cep_lookup`) validam argumentos em runtime com `zod`; as outras 21 confiam em `args as ...` (type assertion em compile-time apenas). Chamadas com parâmetros ausentes, tipos errados ou limites fora de faixa (ex.: `max_results`, `size`, `tamanho` negativos/gigantes, `query`/`nome`/`cpf` não strings causando `.replace`/`.toUpperCase` crashes) chegam diretamente aos handlers e às APIs upstream. Em particular, `cnpj_intelligence` ainda expõe `api_key` em `inputSchema` (`lib/tools/core.ts:L96` e `lib/core/intelligence.ts:L441-L444`) contrariando a política explícita em `lib/core/search.ts:L39` de nunca aceitar chave do cliente.

Adicionalmente, apesar de o projeto expor um servidor MCP com 23 tools, não existem os artefatos verificáveis em máquina previstos pela heurística `agentic-security` e por `SAFETY.md §SC-9` (`.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json` ausentes).

#### Impacto
Execução de tools com inputs não validados pelo servidor (amplificação de queries/paginação, crashes por erro de tipo, superfície confusa incentivando o LLM a passar credenciais via argumento) e ausência de catálogo/allowlist verificável em máquina para governança agêntica.

#### Mitigação sugerida
Adicionar schemas Zod validados em runtime para todas as 23 tools (idealmente centralizados no `registerTool`), impondo limites mínimos/máximos de paginação e tamanho; remover `api_key` do schema e da interface pública de `cnpj_intelligence`; versionar `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json` com as 23 tools registradas.

---

### FND-0005 — Estado global compartilhado e vazamento de traces/PII em `sequentialthinking`, `cnpj_search` e `cnpj_intelligence` + ausência de rate limit no dispatcher MCP/`stdio`

- **Categoria:** `agentic-security`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0017`
- **Evidência:**
  - `lib/tools/core.ts:L110`
  - `lib/core/sequential-thinking.ts:L28-L29`
  - `lib/core/sequential-thinking.ts:L102-L116`
  - `lib/core/search.ts:L31-L33`
  - `lib/core/search.ts:L46-L48`
  - `lib/core/search.ts:L73-L75`
  - `lib/core/search.ts:L86-L88`
  - `lib/core/intelligence.ts:L182`
  - `lib/core/intelligence.ts:L213`
  - `lib/core/intelligence.ts:L258`
  - `lib/core/intelligence.ts:L354`
  - `lib/adapters/cli.ts:L241-L246`
  - `lib/core/mcp-server.ts:L109-L179`

#### Descrição
`thinkingProcessor` é instanciado como singleton de módulo em `lib/tools/core.ts:L110` e compartilhado entre todas as conexões SSE do CLI e requisições do Cloudflare Worker. Isso mistura `thoughtHistory` e `branches` entre sessões/usuários distintos (vazamento cross-tenant de raciocínio), cresce sem limite em memória, armazena `branches` em um objeto simples `{}` (vulnerável a chaves de `Object.prototype` como `__proto__`/`constructor`) e imprime na íntegra cada `thought` em `stderr` por padrão (`DISABLE_THOUGHT_LOGGING !== "true"`).

De forma paralela, `executeSearch` (`lib/core/search.ts`) e `executeIntelligenceInternal` (`lib/core/intelligence.ts`) logam em `stderr` a `query` completa sem truncamento, CNPJ, razão social e todas as dorks geradas (que podem conter nomes de sócios/PII). Por fim, o dispatcher MCP em `lib/core/mcp-server.ts` e o transporte `stdio` não impõem rate limiting por sessão contra loops descontrolados de chamadas de LLM (`MCP-005` / `AGENTIC-001`).

#### Impacto
Contaminação de contexto e vazamento de linhas de raciocínio entre clientes concorrentes no mesmo processo/isolate, crescimento ilimitado de memória, exposição de termos de busca/CNPJ/sócios/pensamentos completos em logs sem política de retenção/redação e risco de loop de tool calls sem freio no protocolo MCP.

#### Mitigação sugerida
Escopar `SequentialThinkingProcessor` por sessão/servidor (com teto de histórico e `Map` para `branches`), desabilitar logging de conteúdo de `thought` por padrão em produção ou mascarar conteúdo; truncar/mascarar `query`, CNPJ, razão social e dorks nos logs de `search.ts` e `intelligence.ts`; aplicar rate limiting configurável na camada de execução de tools (`mcp-server.ts` / `tools.ts`) cobrindo também `stdio`.

---

### FND-0006 — Circuit breaker inoperante em `httpJson` (callback nunca lança exceção + instância única para 8 upstreams) e vazamento de `setTimeout` por requisição

- **Categoria:** `reliability`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0018`
- **Evidência:**
  - `lib/infrastructure/http/circuit-breaker.ts:L53-L60`
  - `lib/core/http-client.ts:L7-L11`
  - `lib/core/http-client.ts:L16`
  - `lib/core/http-client.ts:L43-L56`
  - `lib/core/http-client.ts:L70-L117`

#### Descrição
`CircuitBreaker.execute()` só incrementa `failures` e transiciona para `OPEN` quando `fn()` lança exceção (`catch`). Entretanto, dentro de `httpJson()`, o callback passado a `circuitBreaker.execute()` captura todas as respostas HTTP `>= 400` e todas as exceções (`AbortError`, erros de rede) e retorna `{ ok: false, error }`. Como não há throw, `CircuitBreaker.execute()` executa `this.onSuccess()` mesmo diante de HTTP 500/502/503/504/429, timeouts ou falhas de rede — mantendo o circuit breaker permanentemente `CLOSED` (inoperante).

Além disso, existe apenas uma instância global de `circuitBreaker` compartilhada entre 8 APIs upstream independentes (CNPJ, CEP, IBGE, Transparência, PNCP, Querido Diário, Bacen, FIPE, RDAP, OAB, CNES); cada chamada cria `setTimeout(() => controller.abort(), timeoutMs)` sem `clearTimeout()` em `finally` (vazando um timer de 8 s por requisição bem-sucedida ou com erro rápido); a mensagem de timeout está fixa como `"request timeout after 8 seconds"` ignorando `timeoutMs`; `RETRY_STATUS_CODES` está declarado sem uso e `executeWithRetry` aplica backoff exponencial determinístico sem jitter.

#### Impacto
Ausência real de proteção contra falhas em cascata nas integrações externas, acoplamento de disponibilidade entre provedores independentes caso o circuit breaker seja corrigido sem particionamento por host, vazamento de timers no event loop e risco de thundering herd em retries sem jitter.

#### Mitigação sugerida
Particionar o `CircuitBreaker` por origem/hostname do upstream, fazer o callback sinalizar falhas transientes ao circuit breaker antes de converter para `HttpResponse`, sempre limpar o timer de timeout em `finally`, interpolar `timeoutMs` na mensagem de erro, usar `RETRY_STATUS_CODES` de forma consistente e adicionar jitter ao backoff exponencial.

---

### FND-0007 — Chamadas `fetch()` sem timeout explícito (`PerplexityProvider`, `datajud_processos`, `bnmp_mandados`, `procurados_lookup`), falso negativo silencioso em `procurados_lookup` e timer/trabalho vazado em `executeIntelligence`

- **Categoria:** `reliability`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0019`
- **Evidência:**
  - `lib/core/search-providers.ts:L58-L65`
  - `lib/core/search-providers.ts:L128-L147`
  - `lib/tools/legal.ts:L32-L35`
  - `lib/tools/legal.ts:L104-L106`
  - `lib/tools/legal.ts:L143-L169`
  - `lib/core/intelligence.ts:L156-L169`

#### Descrição
Diversas integrações externas ignoram `httpJson()` e chamam `fetch()` diretamente sem `AbortController` nem timeout: `PerplexityProvider.search` (`lib/core/search-providers.ts:L128-L147`), `executeDatajud` (`lib/tools/legal.ts:L32-L35`), `executeBnmp` (`lib/tools/legal.ts:L104-L106`) e as 13 chamadas sequenciais em `executeProcurados` (`lib/tools/legal.ts:L143-L161`), além de `TavilyProvider.search` delegar ao SDK sem timeout controlado.

Em `executeProcurados` (`procurados_lookup`), respostas `!resp.ok` e exceções de rede são silenciosamente ignoradas (`continue`/`catch`) sem contabilização de falhas, retornando `status: "NOT_FOUND"` quando todas ou parte das páginas falham — produzindo falsos negativos em verificação de antecedentes criminais (`REL-007`). Por fim, `executeIntelligence` (`lib/core/intelligence.ts:L156-L169`) cria `timeoutPromise` com `setTimeout` que nunca recebe `clearTimeout` quando a execução termina antes do limite, e em caso de estouro de timeout não cancela as buscas em andamento.

#### Impacto
Requisições penduradas indefinidamente em caso de indisponibilidade de upstream, falso negativo silencioso (`NOT_FOUND`) em consulta de procurados federais quando o portal do MJSP falha, vazamento de timers de 25 s e trabalho residual em background em `cnpj_intelligence`.

#### Mitigação sugerida
Aplicar `AbortSignal.timeout` / `AbortController` (com `clearTimeout` em `finally`) em `PerplexityProvider`, `executeDatajud`, `executeBnmp`, `executeProcurados` e envelope de timeout na chamada Tavily; em `procurados_lookup`, retornar erro explícito ou status parcial/inconclusivo quando páginas falharem em vez de `NOT_FOUND`; limpar o `timeoutPromise` de `executeIntelligence` em `finally` e propagar `AbortSignal` para interromper buscas após timeout.

---

### FND-0008 — Ciclo de vida SSE quebrado no Worker (`finally` cancela ping/timeout na hora), graceful shutdown quebrado no CLI, `setInterval` vazado no `RateLimiter` e race/crescimento ilimitado em KV

- **Categoria:** `reliability`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0020`
- **Evidência:**
  - `lib/workers/sse.ts:L60-L199`
  - `lib/adapters/cli.ts:L157-L163`
  - `lib/adapters/cli.ts:L235`
  - `lib/adapters/cli.ts:L249-L254`
  - `lib/infrastructure/rate-limiter.ts:L26`
  - `lib/workers/rate-limit.ts:L36-L39`
  - `lib/workers/rate-limit.ts:L50-L104`
  - `lib/core/cache.ts:L139-L147`
  - `wrangler.toml:L39-L45`
  - `wrangler.toml:L61-L68`

#### Descrição
Em `lib/workers/sse.ts`, a função assíncrona imediata agenda `pingInterval = setInterval(...)` e `timeoutHandle = setTimeout(...)` de forma não bloqueante e entra imediatamente no bloco `finally` (`L188-L198`), que executa `clearInterval(pingInterval)` e `clearTimeout(timeoutHandle)` logo após a abertura do stream — cancelando o heartbeat e o fechamento por timeout instantaneamente e deixando o `writer` aberto.

No CLI (`lib/adapters/cli.ts`), o listener global `process.on("SIGTERM", cleanup)` (`L254`) executa `process.exit(0)` imediatamente sem drenar o `http.Server` retornado por `app.listen` (`L235`) nem aguardar o fechamento ordenado das sessões SSE. Em `lib/infrastructure/rate-limiter.ts:L26`, o construtor cria um `setInterval` sem guardar referência, sem `.unref()` e sem método `dispose()`/`close()`. No Worker, `checkRateLimit` (`lib/workers/rate-limit.ts`) faz leitura-modificação-escrita não atômica em KV (`get` seguido de `put` sem `expirationTtl`), confia em `X-Forwarded-For` forjável quando `CF-Connecting-IP` não está presente, e `KVCache.set` (`lib/core/cache.ts:L139-L147`) também persiste entradas sem `expirationTtl` mesmo com `MCP_CACHE` e `MCP_KV` apontando para o mesmo namespace ID em `wrangler.toml`.

#### Impacto
Streams SSE no Worker sem heartbeat nem auto-encerramento correto, encerramento abrupto de conexões HTTP/SSE no CLI sob `SIGTERM`, timer órfão impedindo cleanup limpo do `RateLimiter`, bypass/corrida em rate limit e acúmulo permanente de chaves expiradas no KV do Cloudflare.

#### Mitigação sugerida
Reestruturar `handleSSEEndpoint` para manter `pingInterval` e `timeoutHandle` ativos até o fechamento real ou erro do stream; unificar handlers de `SIGINT`/`SIGTERM` no CLI drenando `server.close()` e sessões SSE antes de encerrar; adicionar `.unref()` e método `destroy()`/`dispose()` no `RateLimiter`; configurar `expirationTtl` em `KVCache.set` e `checkRateLimit` (além de avaliar Rate Limiting binding nativo/DO e uso de `CF-Connecting-IP` confiável).

---

### FND-0009 — 20 vulnerabilidades em dependências de runtime (14 `high`) e dependências mortas em `dependencies` (`agents`, `@smithery/sdk`, `workers-mcp`, `async-mutex`)

- **Categoria:** `dependency`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0021`
- **Evidência:**
  - `package.json:L49-L58`
  - `package-lock.json`
  - `lib/workers/mcp-agent.ts:L6`
  - `wrangler.toml:L7-L9`
  - `.github/workflows/ci.yml:L18-L78`
  - Saída `npm audit --omit=dev --json`: 20 vulnerabilidades (`0 critical`, `14 high`, `2 moderate`, `4 low`)

#### Descrição
`npm audit --omit=dev --json` reporta 20 vulnerabilidades na árvore de dependências de produção, incluindo 14 de severidade `high` (3 diretas: `zod@^3.23.8` [`GHSA-mrhx-c7xc-m3w5`], `@smithery/sdk@^1.7.4` e `agents@^0.2.21` [`GHSA-r7x9-8ph7-w8cg`, `GHSA-cvhv-6xm6-c3v4`]; além de transitivas como `path-to-regexp` via `express`, `lodash`, `fast-uri`, `js-yaml`, `markdown-it`, `linkify-it`, `nanoid`, `picomatch`, `tmp`, `underscore`, `ajv` e `uuid`).

Inspeção de imports confirma que `@smithery/sdk`, `workers-mcp` e `async-mutex` têm 0 usos em `lib/`, `apps/` e `scripts/`. Já `agents` é importado exclusivamente por `lib/workers/mcp-agent.ts`, que não é referenciado pelo entrypoint `lib/workers/worker.ts` e cuja classe Durable Object (`DadosBRMCP`) foi explicitamente removida na migração `v2` de `wrangler.toml:L7-L9`. Além disso, `.github/workflows/ci.yml` não executa `npm audit` no pipeline.

#### Impacto
Distribuição e instalação em runtime de dependências vulneráveis (incluindo ReDoS, Prototype Pollution, IDOR/XSS via SDKs não utilizados e Path Traversal em transitivas) aumentando a superfície de ataque e o peso do pacote publicado no npm.

#### Mitigação sugerida
Remover dependências de runtime sem uso (`@smithery/sdk`, `workers-mcp`, `async-mutex` e `agents`, junto à remoção/descontinuação de `lib/workers/mcp-agent.ts` e decisão sobre `lib/adapters/smithery.ts`), atualizar `zod`, `express` e lockfile (`npm audit fix` / upgrades compatíveis) para sanear as 14 vulnerabilidades `high` de runtime, e adicionar passo de auditoria (`npm audit --omit=dev --audit-level=high`) em `.github/workflows/ci.yml`.

---

### FND-0010 — 3 vulnerabilidades `critical` e 13 `high` adicionais em `devDependencies` (`vitest`, `@vitest/ui`, `vite`, `wrangler`, `handlebars`, `rollup`) e divergência de versão do `wrangler` no CI

- **Categoria:** `dependency`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0022`
- **Evidência:**
  - `package.json:L60-L74`
  - `package-lock.json`
  - `.github/workflows/cloudflare-deploy.yml:L66`
  - Saída `npm audit --json`: 38 vulnerabilidades totais (`3 critical`, `27 high`, `4 moderate`, `4 low`)

#### Descrição
Além das 20 vulnerabilidades de runtime, `npm audit --json` identifica 18 vulnerabilidades adicionais em `devDependencies` — incluindo 3 `critical` (`@vitest/ui@4.0.8`, `vitest@4.0.8` [`GHSA-5xrq-8626-4rwp`], `handlebars` [`GHSA-2w6w-674q-4c4q`]) e 13 `high` (`vite@7.2.2` [`GHSA-p9ff-h696-f583`], `wrangler@4.40.2` [`GHSA-36p8-mvp6-cv38`], `rollup`, `miniflare`, `undici`, `ws`, `sharp`, `postcss`, `brace-expansion`, `defu`, `flatted`, `minimatch`, `source-map-js`).

Em paralelo, `.github/workflows/cloudflare-deploy.yml:L66` fixa `wranglerVersion: "3.95.0"` enquanto `package.json:L73` declara `"wrangler": "^4.40.2"`, gerando divergência de major entre o ambiente local e o deploy automatizado. (Severidade calibrada como `medium` porque `devDependencies` não são distribuídas ao consumidor final em produção.)

#### Impacto
Risco de segurança em ambientes locais de desenvolvimento e runners de CI/CD (especialmente execução arbitrária/leitura de arquivos caso `@vitest/ui` ou `vite` dev server sejam expostos) e risco de incompatibilidade de comportamento entre `wrangler` 3.x e 4.x no deploy.

#### Mitigação sugerida
Atualizar `vitest`, `@vitest/ui`, `vite`, `wrangler` e transitivas no `package.json`/`package-lock.json` para versões corrigidas (revalidando `npm test` e `npm run build`), e alinhar `wranglerVersion` em `.github/workflows/cloudflare-deploy.yml` com a versão validada em `package.json`.

---

### FND-0011 — Ausência de paginação/cache em `ibge_localidades` (`municipios`) e nas tools governamentais/financeiras + raspagem sequencial sem cache em `procurados_lookup`

- **Categoria:** `performance`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0023`
- **Evidência:**
  - `lib/tools/government.ts:L20-L38`
  - `lib/tools/government.ts:L46`
  - `lib/tools/government.ts:L75-L110`
  - `lib/tools/government.ts:L142-L192`
  - `lib/tools/government.ts:L225-L319`
  - `lib/tools/financial.ts:L16-L89`
  - `lib/tools/company.ts:L156-L160`
  - `lib/tools/legal.ts:L141-L161`

#### Descrição
`ibge_localidades({ tipo: "municipios" })` busca e serializa integralmente os ~5.570 municípios brasileiros em uma única resposta JSON sem paginação, filtro no handler nem cache — produzindo payloads muito acima de 10 KB que pressionam o limite de contexto de clientes LLM (`MCP-003` / `PERF-003`).

Além disso, nenhuma ferramenta em `lib/tools/government.ts`, `lib/tools/financial.ts` ou `lib/tools/legal.ts` utiliza a instância de `cache` passada para `executeTool()`; `executeDeepProfile` (`lib/tools/company.ts:L156-L160`) chama `httpJson()` diretamente para `cnpj_data` ignorando `lookup()`/`cache`/`deduplicate`; e `executeProcurados` (`lib/tools/legal.ts:L141-L161`) executa 13 requisições HTTP sequenciais em loop a cada chamada sem qualquer cache da lista. (Calibrado como `medium` por ausência de profile de produção anexado ao repositório.)

#### Impacto
Latência elevada em consultas repetidas ou orquestradas (`company_deep_profile`, `procurados_lookup`), risco de estourar limites de tokens/rate-limit de APIs públicas sem cache e respostas gigantes em `ibge_localidades`.

#### Mitigação sugerida
Adicionar parâmetros opcionais de busca/paginação (`limit`/`offset` ou filtro) preservando compatibilidade para clientes existentes e cachear dados estáticos/semi-estáticos (`ibge_localidades`, `fipe_veiculos`, `bacen_taxas`, lista de `procurados_lookup`) na camada `cache`; reutilizar `lookup()` em `executeDeepProfile` e paralelizar com limite controlado a coleta de `procurados_lookup` quando houver miss de cache.

---

### FND-0012 — Ciclo `core ↔ tools`, divergência de contrato em `cnpj_intelligence`, artefatos órfãos e cobertura AS-IS cega para `apps/` e `infra/`

- **Categoria:** `architecture`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0024`
- **Evidência:**
  - `lib/core/intelligence.ts:L5`
  - `lib/core/intelligence.ts:L62-L63`
  - `lib/core/intelligence.ts:L192-L200`
  - `lib/core/intelligence.ts:L217`
  - `lib/core/intelligence.ts:L244`
  - `lib/core/intelligence.ts:L389-L448`
  - `lib/tools/core.ts:L88-L104`
  - `lib/workers/rest.ts:L167`
  - `scripts/mcp-client.js:L205-L206`
  - `lib/config/index.ts:L13`
  - `lib/workers/worker.ts:L45-L47`
  - `lib/workers/worker.ts:L129`
  - `lib/workers/worker.ts:L143`
  - `lib/workers/mcp-agent.ts`
  - `test/unit/search.test.ts.patch`
  - `package.json:L30`
  - `.archagents/_meta.json:L8`
  - Saída `audit-measure.py`: `cobertura-do-as-is` (`apps/` e `infra/` sem entrada no REGISTRY) e `elo-de-supersede-de-adr` (0 ADRs em `.archagents/09-decisions/`)

#### Descrição
O grafo de imports em `lib/` contém uma dependência circular envolvendo módulo core: `lib/core/intelligence.ts` importa `lookup` de `lib/tools/core.ts`, enquanto `lib/tools/core.ts` importa dinamicamente `lib/core/intelligence.ts` (`ARCH-003`).

Em `cnpj_intelligence`, há divergência de contrato em múltiplos pontos: o schema registrado em `lib/tools/core.ts:L90-L99` declara `max_results`, o schema não exportado/não utilizado `CNPJ_INTELLIGENCE_TOOL` em `lib/core/intelligence.ts:L389-L448` declara `max_results_per_query`/`max_queries`, os chamadores (`lib/workers/rest.ts:L167`, `scripts/mcp-client.js:L205-L206`) enviam snake_case (`max_results_per_query`, `max_queries`), e `executeIntelligenceInternal` lê `options.maxResultsPerQuery` e `options.maxQueries` em camelCase — fazendo opções enviadas por clientes MCP/REST serem silenciosamente ignoradas. Além disso, `executeIntelligenceInternal` usa `options.cnpj` sem normalização na chave de cache (`L192`).

Outros desvios arquiteturais/estruturais confirmados: `SERVER_VERSION` em `lib/config/index.ts:L13` e `lib/workers/worker.ts:L129` está fixado em `"1.0.0"` em contraste com `"0.6.0"` em `package.json`; `lib/workers/worker.ts:L45-L47` injeta apenas `TAVILY_API_KEY` (omitindo `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`) e lista apenas 5 de 23 tools em `GET /`; existem artefatos órfãos/quebrados (`lib/workers/mcp-agent.ts`, `test/unit/search.test.ts.patch`, script `test:sse` em `package.json:L30` apontando para `examples/sse-client.js` inexistente); e na governança AS-IS (`audit-measure.py`), `apps/` e `infra/` não são reivindicados no registro AS-IS, `baseline_commit` permanece em `9e74ba5` e `.archagents/09-decisions/` não possui ADRs registrados.

#### Impacto
Parâmetros de consulta de `cnpj_intelligence` ignorados silenciosamente, comportamento divergente entre CLI e Worker nas ferramentas que dependem de chaves em `process.env`, versões anunciadas inconsistentes, acoplamento cíclico dificultando modularidade/testes e cegueira parcial da cobertura AS-IS sobre `apps/` e `infra/`.

#### Mitigação sugerida
Extrair `lookup` compartilhado para um módulo de serviço/core sem dependência de `lib/tools/`; unificar schema e handler de `cnpj_intelligence` com normalização do CNPJ antes do lookup/cache; sincronizar `SERVER_VERSION` com `package.json` e injeção de env vars no Worker; remover `test/unit/search.test.ts.patch`, código morto (`mcp-agent.ts`) e script `test:sse` quebrado; atualizar docs AS-IS (`00`–`10` + `_meta.json` cobrindo `apps/` e `infra/`) e registrar ADRs em `.archagents/09-decisions/`.

---

### FND-0013 — Logger estruturado e tracing (`logger.ts`/`tracing.ts`) são código morto com risco `stdout`, métricas quebradas (`cacheHits` sempre 0, reset por conexão SSE) e ausência de audit log em auth/tools

- **Categoria:** `observability`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0025`
- **Evidência:**
  - `lib/infrastructure/logger.ts:L68`
  - `lib/infrastructure/logger.ts:L74`
  - `lib/infrastructure/tracing.ts:L16`
  - `lib/core/tools.ts:L36`
  - `lib/core/tools.ts:L68`
  - `lib/core/tools.ts:L80-L88`
  - `lib/core/mcp-server.ts:L75`
  - `lib/adapters/cli.ts:L190`
  - `lib/workers/auth.ts:L18-L72`
  - `lib/adapters/cloudflare.ts:L50-L66`
  - Saída `audit-measure.py`: `cobertura-do-reflect` (`routes_coverage: no_data`, `cost_coverage: no_data`)

#### Descrição
`lib/infrastructure/logger.ts` e `lib/infrastructure/tracing.ts` possuem 0 importadores no código de produção; toda a aplicação usa `console.error`/`console.log` ad-hoc. Adicionalmente, `Logger.debug` e `Logger.info` (`logger.ts:L68,L74`) escrevem via `console.log` em `stdout`, o que corromperia o protocolo JSON-RPC no transporte `stdio` se conectados como estão, e `generateRequestId` (`tracing.ts:L16`) usa `Math.random()`.

Na camada de métricas (`lib/core/tools.ts`), `executeTool` sempre chama `recordMetrics(elapsed, false, ...)` — mantendo `cacheHits` perpetuamente em `0`; `resetMetrics()` não zera `lastMetricsLog` (impedindo novos logs periódicos a cada 100 requests após um reset); e `createMCPServer()` invoca `resetMetrics()` a cada nova conexão SSE em `lib/adapters/cli.ts:L190`, zerando os contadores globais. Ainda, `lib/workers/auth.ts` não gera audit log estruturado para tentativas 401 nem há correlation ID propagado nas execuções de tools, e `handleHealthCheck()` (`lib/adapters/cloudflare.ts:L50-L66`) retorna `{ status: "healthy" }` estático sem testar KV. No coletor de governança, `cobertura-do-reflect` apontou `routes_coverage: no_data` e `cost_coverage: no_data`.

#### Impacto
Incapacidade de correlacionar erros entre transporte, auth, execução de tools e chamadas upstream, métricas de cache e throughput imprecisas/resetadas em runtime, ausência de trilha de auditoria em falhas de autenticação e health check do Worker incapaz de sinalizar degradação de KV.

#### Mitigação sugerida
Direcionar todos os níveis de `Logger` para `stderr` em runtime Node (ou manter saída compatível com Workers) e usar `crypto.randomUUID()`/`getRandomValues` em `generateRequestId`; propagar `RequestContext`/`requestId` em HTTP/SSE/MCP/tools; corrigir `recordMetrics` (reportando hits de cache reais e resetando `lastMetricsLog`, sem resetar métricas globais por conexão SSE); registrar eventos 401 e métricas RED por tool; adicionar checagem opcional/rápida de KV em `/health`.

---

### FND-0014 — Módulos críticos sem testes unitários (`auth`, `oauth`, `http-client`, `workers`, `smithery`, `legal`/`company`), 4 suítes que não importam código de produção, `test:coverage` quebrado e sleeps reais

- **Categoria:** `test-coverage`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0026`
- **Evidência:**
  - `vitest.config.ts:L81-L102`
  - `package.json:L21`
  - `package.json:L60-L74`
  - `test/unit/sse.test.ts:L1-L2`
  - `test/unit/concurrency.test.ts:L1-L44`
  - `test/unit/deduplication.test.ts:L1-L96`
  - `test/unit/intelligence.test.ts:L1-L36`
  - `test/unit/circuit-breaker.test.ts:L81`
  - `test/unit/circuit-breaker.test.ts:L100`
  - `test/unit/circuit-breaker.test.ts:L187`

#### Descrição
Módulos críticos de segurança, rede e orquestração possuem zero testes unitários dedicados: `lib/workers/{auth,oauth,rate-limit,worker,rest,sse}.ts`, `lib/adapters/{cloudflare,smithery}.ts`, `lib/core/{http-client,sequential-thinking}.ts`, e `lib/tools/{legal,company,osint,health}.ts`. Além disso, `vitest.config.ts:L90-L91` exclui explicitamente `lib/workers/` e `lib/adapters/cloudflare.ts` dos thresholds de cobertura.

Quatro suítes em `test/unit/` (`sse.test.ts`, `concurrency.test.ts`, `deduplication.test.ts`, `intelligence.test.ts`) duplicam implementações locais nos arquivos de teste em vez de importar e exercitar os módulos reais de `lib/`, permitindo que defeitos reais (como o `finally` em `lib/workers/sse.ts`, bugs de contrato em `lib/core/intelligence.ts` e o circuit breaker inoperante em `lib/core/http-client.ts`) passem despercebidos com 286/286 testes verdes. O script `npm run test:coverage` está quebrado por ausência de `@vitest/coverage-v8` (`MODULE_NOT_FOUND`), e `circuit-breaker.test.ts` e `concurrency.test.ts` ainda usam `setTimeout` reais (~3,3 s dos ~3,6 s totais da suíte).

#### Impacto
Falsa sensação de segurança na regressão (suítes não exercitam código real em áreas críticas), ausência de proteção automatizada para autenticação, OAuth, SSE, retries/circuit-breaker e SSRF overrides, e impossibilidade de medir cobertura via `npm run test:coverage`.

#### Mitigação sugerida
Adicionar testes unitários importando diretamente os módulos reais de `auth`, `oauth`, `rate-limit`, `sse`, `cloudflare`, `worker`, `http-client`, `smithery`, `sequential-thinking` e `tools/{legal,company}` (incluindo cenários de erro/bypass); refatorar `sse.test.ts`, `concurrency.test.ts`, `deduplication.test.ts` e `intelligence.test.ts` para importar as implementações de `lib/`; instalar/alinhar `@vitest/coverage-v8` (avaliando revisão das exclusões em `vitest.config.ts`) e migrar `circuit-breaker.test.ts`/`concurrency.test.ts` para fake timers.

*(Nota: os 14 findings da auditoria inicial `6c74db6` — `FND-0001` a `FND-0014` — foram remediados e encerrados nos tickets `TCK-0013`–`TCK-0029` até a revisão `a3a2e12`.)*

---

## Re-auditoria Pós-Remediação — Revisão `a3a2e12` (2026-11-21, `--compliance`)

- **Revisão base:** `a3a2e12` (branch `main`, pós-integração local de `TCK-0013`–`TCK-0029`)
- **Data:** `2026-11-21`
- **Autonomia:** `L2`
- **Dimensões executadas (9):** `security`, `agentic-security`, `reliability`, `performance`, `architecture`, `test-coverage`, `observability`, `dependency`, `compliance-br`
- **Dimensões puladas (2):**
  - `martech` (`--martech`): pulada — sem flag `--martech` e sem superfície de tracking/analytics/marketing detectada.
  - `inventory` (`--inventory`): pulada — sem flag `--inventory`.

### Controles Transversais (`P11`, `SC-6`, `SC-9`)

- **`P11` (Prompt injection no repositório):** `0` ocorrências maliciosas (`.github/copilot-instructions.md:L141-L142` possui apenas tags literais residuais benignas de geração antiga).
- **`SC-6` (Secrets no código/infra):** `secret-scan.sh` sobre todos os arquivos rastreados de `lib/`, `apps/`, `scripts/`, `infra/`, `.github/` retornou **0 segredos expostos**.
- **`SC-9` (Allowlist & Capabilities):** `.archagents/_capabilities.json:L1-L20` e `.archagents/mcp-tool-allowlist.json:L1-L270` cobrem as 23 tools MCP (divergência menor de texto em `mcp-tool-allowlist.json:L56` mapeada em `FND-0021`).

### Medição Mecânica (`audit-measure.py` + medição complementar da stack)

> `audit-measure.py --root . --json` retornou `mede_o_framework: false`. Nenhuma dimensão reportada como `nao_medido` ou `parcial` pelo coletor é declarada `limpo`.

| Dimensão | Estado no Coletor (`audit-measure.py`) | Detalhes do Coletor | Medição Complementar da Stack (`a3a2e12`) |
|---|---|---|---|
| `security` | `nao_medido` | 5 auto-auditorias do framework | `secret-scan.sh` 0 segredos; `rg` 0 `eval`/`innerHTML`/`Math.random`; inspeção direta de `lib/adapters/cli-http.ts`, `lib/workers/rest.ts`, `lib/adapters/cloudflare.ts` |
| `agentic-security` | `nao_exec` (`apply-heuristic.py` aponta caminho antigo do framework) | Fora do repo do framework (TCK-0239) | Inspeção direta de `mcp-tool-allowlist.json`, `lib/core/search-providers.ts`, `lib/tools/osint.ts`, `lib/tools/legal.ts`, `lib/core/mcp-server.ts` |
| `reliability` | `limpo` | `runs-zumbis: 0`, `retro-validate: 29/29 ok` | Inspeção de código pós-`TCK-0018`–`0020` sem novos achados (`0`) |
| `performance` | `limpo` | `duracao-dos-runs`: mediana `304.0s`, p95 `580.0s`, max `1254.0s` em `30` runs | Inspeção pós-`TCK-0023` sem novos achados (`0`) |
| `architecture` | `achado` + `nao_medido` | `cobertura-do-as-is`: `apps/` e `infra/` ausentes do `REGISTRY` fixo do framework (`03-modules` `sem-suspeita`, ADR supersede `limpo` 2 ADRs, claimed `limpo` 8); 4 auto-auditorias `nao_medido` | Inspeção de contratos REST/OpenAPI (`rest.ts`, `openapi.ts`, `types.ts`), módulos órfãos e docs |
| `test-coverage` | `nao_medido` | `cobertura-de-teste`: sem `.coverage.json` Python | `npm run test:coverage`: **31 arquivos, 442/442 testes PASS**, V8 **`91.32% Stmts / 83.57% Branch / 93.25% Funcs / 92.09% Lines`** (thresholds `85/80/85/85`); `tsc`, `tsc.worker`, `build`, `build:worker`, `test:transport` PASS; lacunas residuais em `cli-http.ts` (`77.3%`) e `mcp-server.ts` (`36.36%` funcs) |
| `observability` | `achado` | `independencia-de-verify`: `limpo` (`p10: ok=31 achado=0`); `cobertura-do-reflect`: `routes_coverage`/`cost_coverage` `no_data` (telemetria do harness) | Inspeção de propagação `X-Request-Id` em `worker.ts`/`rest.ts`/`cli-http.ts` e logs ad-hoc residuais em `rate-limit.ts`/`search.ts`/`intelligence.ts` |
| `dependency` | `nao_medido` | `pip-check` (auto-auditoria do framework) | `npm ci` (`508` pkgs), `npm audit --omit=dev --json` = **0 vulns (`prod: 98`)**, `npm audit --json` total = **0 vulns (`total: 638`)** (`0` novos achados) |
| `compliance-br` | *sem coletor automático* | Heurística opt-in `--compliance` | Auditoria direta LGPD + Marco Civil em tools de dados pessoais, cache, transferência internacional, logs e documentação |

### Resumo dos Novos Achados (`a3a2e12`)

| ID | Dimensão | Severidade | Título | Ticket |
|---|---|---|---|---|
| `FND-0015` | `compliance-br` | `high` | Ausência de minimização de dados pessoais, chaves de cache em claro com CPF/nomes penais e ausência de eliminação por titular no cache | `TCK-0030` |
| `FND-0016` | `compliance-br` | `medium` | Transferência internacional não divulgada e sem opt-out de PII de sócios (`QSA`) e pessoas físicas para provedores externos (`Tavily`/`Perplexity`) | `TCK-0031` |
| `FND-0017` | `compliance-br` | `medium` | Registro de `clientIp` em claro em logs (`auth.ts`, `cli-http.ts`) e alegação incorreta de conformidade LGPD automática em `docs/pt-br/desenvolvimento/metricas.md` | `TCK-0032` |
| `FND-0018` | `compliance-br` | `medium` | Ausência de política LGPD/canal DPO (`Art. 41`), plano de incidente ANPD (`Art. 48`) e salvaguarda contra homônimos/decisão automatizada em ferramentas penais | `TCK-0033` |
| `FND-0019` | `security` | `medium` | Transporte HTTP/SSE do CLI (`lib/adapters/cli-http.ts`) sem autenticação (`MCP_API_KEY`) quando exposto fora de loopback (`0.0.0.0`/`::`) | `TCK-0034` |
| `FND-0020` | `security` | `low` | Endpoints REST do Worker retornam `error.message` bruto como HTTP `500` em JSON inválido/exceções e `cloudflare.ts` omite headers defensivos extras | `TCK-0035` |
| `FND-0021` | `agentic-security` | `medium` | Ausência de delimitação anti-prompt-injection indireta e limite de tamanho em outputs externos e em `strategic_osint_prompt` + ajuste de metadado `allowlist` | `TCK-0036` |
| `FND-0022` | `architecture` | `medium` | Divergência de contrato REST/OpenAPI do Worker (`rest.ts`, `openapi.ts`, `types.ts`, `404` unreachable, `decodeURIComponent`) e artefatos/docs obsoletos residuais | `TCK-0037` |
| `FND-0023` | `observability` | `medium` | Correlação `X-Request-Id` quebrada em REST (`worker.ts` → `rest.ts`) e `POST /messages` → `mcp-server.ts`, além de logs não estruturados residuais | `TCK-0038` |
| `FND-0024` | `test-coverage` | `medium` | Fluxos de runtime/segurança em `cli-http.ts` (`429`, `413`, `400`, `extraAllowedHosts`, SSE/shutdown) e handlers/erros em `mcp-server.ts` sem testes unitários no Vitest | `TCK-0039` |

*(Atualização pós-remediação Wave 2 — `feature/audit-remediation-wave2`: `FND-0018` a `FND-0024` foram remediados, verificados em contexto independente `P10` e encerrados nos tickets `TCK-0033`–`TCK-0039`. `FND-0015`, `FND-0016` e `FND-0017` — tickets `TCK-0030`, `TCK-0031` e `TCK-0032` — foram mantidos em `raw` por solicitação explícita do operador.)*

---

### FND-0015 — Ausência de minimização de dados pessoais, chaves de cache em claro com CPF/nomes penais e ausência de eliminação por titular no cache

- **Categoria:** `compliance-br`
- **Severidade:** `high`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0030`
- **Evidência:**
  - `lib/core/lookup.ts:L63-L76`
  - `lib/tools/government.ts:L187-L206`
  - `lib/tools/legal.ts:L40,L59,L100,L109,L139,L160,L205,L376-L378,L462,L472`
  - `lib/tools/health.ts:L24,L33`
  - `lib/core/search.ts:L24,L71-L73`
  - `lib/core/cache.ts:L37-L52,L178-L181`
  - `lib/config/index.ts:L199`
  - `lib/types/index.ts:L59-L72`

#### Descrição
Tools cadastrais e jurídico-penais persistem dados pessoais em cache (`MemoryCache` e Cloudflare `KVCache`) usando chaves legíveis em texto claro contendo CPF (`transparencia:${url}` com `?cpf=...`), nomes completos de advogados/partes/procurados (`oab:${url}`, `bnmp:${url}`, `procurados:entries:v1`, `datajud:${url}`) e queries OSINT (`search:${query}:${maxResults}`), retornando payloads completos sem minimização de campos de pessoa física (e mantendo expiração lazy em `MemoryCache` sem teto para `MCP_CACHE_TTL` nem método `delete(key)` na interface `Cache`/`KVCache`).

#### Impacto
Risco de exposição e retenção injustificada de dados pessoais sensíveis/penais/cadastrais em memória ou KV de borda sem mecanismo técnico de eliminação por titular (**LGPD Art. 6º III, Art. 15, Art. 16, Art. 18 VI e Art. 46**).

#### Mitigação sugerida
Hashear chaves de cache com CPF/nomes/queries (SHA-256 com prefixo de domínio), impor TTL curto ou bypass de cache para consultas penais/CPF (`bnmp_mandados`, `procurados_lookup`, `servidores`), adicionar `delete(key)` em `Cache`/`KVCache` e teto máximo para `MCP_CACHE_TTL`, além de opção de minimização de QSA/contatos em `cnpj_lookup`.

---

### FND-0016 — Transferência internacional não divulgada e sem opt-out de PII de sócios (`QSA`) e pessoas físicas para provedores externos (`Tavily`/`Perplexity`)

- **Categoria:** `compliance-br`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0031`
- **Evidência:**
  - `lib/core/dork-templates.ts:L180-L203,L279-L292,L447-L465`
  - `lib/core/intelligence.ts:L263-L323`
  - `lib/core/search-providers.ts:L79-L86,L168-L188`
  - `lib/tools/company.ts:L202-L204`
  - `lib/tools/osint.ts:L29,L53,L74,L84`
  - `README.md:L117-L119,L284-L295`

#### Descrição
Com as categorias padrão, `cnpj_intelligence` extrai até 3 nomes de sócios do QSA e gera dorks nominais (`"${nomeSocio}" site:linkedin.com`, redes sociais e portais judiciais), enviando os nomes para `Tavily` ou `Perplexity` (servidores nos EUA), comportamento análogo ao fluxo padrão `include_news = true` em `company_deep_profile` e às instruções de `strategic_osint_prompt`, sem aviso ou opt-out explícito documentado.

#### Impacto
Transferência internacional automática de dados pessoais de terceiros fora do Brasil sem transparência ao usuário nem registro de salvaguardas/cláusulas padrão (**LGPD Art. 33, Art. 6º I/III e Art. 7º §§3º-4º**).

#### Mitigação sugerida
Documentar a transferência internacional para Tavily/Perplexity/Cloudflare na documentação e aviso de privacidade; adicionar flag/configuração para desabilitar envio de nomes de pessoas físicas (`partners`/`social_media`) ou exigir opt-in explícito para dorks nominais.

---

### FND-0017 — Registro de `clientIp` em claro em logs (`auth.ts`, `cli-http.ts`) e alegação incorreta de conformidade LGPD automática em `docs/pt-br/desenvolvimento/metricas.md`

- **Categoria:** `compliance-br`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0032`
- **Evidência:**
  - `lib/workers/auth.ts:L71-L84`
  - `lib/adapters/cli-http.ts:L322-L327`
  - `docs/pt-br/desenvolvimento/metricas.md:L11,L179-L183`
  - `lib/infrastructure/logger.ts:L55-L108`
  - `lib/shared/log-redaction.ts:L17-L32`

#### Descrição
`auth.ts:L81` registra `CF-Connecting-IP` bruto no evento `auth.unauthorized`, e `cli-http.ts:L322` grava `clientId` bruto sempre que `NODE_ENV !== "production"` (situação padrão em execuções CLI/Docker sem `NODE_ENV=production`). Paralelamente, `docs/pt-br/desenvolvimento/metricas.md:L11,L179-L183` declara `LGPD Compliant: ✅` afirmando mascaramento automático no `Logger` de telefone, API keys e objetos aninhados — comportamento inexistente em `lib/infrastructure/logger.ts` e apenas parcial via `maskSensitiveText`.

#### Impacto
Exposição de endereços IP (dado pessoal sob **LGPD Art. 5º I**, guarda regulada pelo **Marco Civil Art. 15**) em logs sem política de retenção e falsa garantia documental de conformidade automática ao operador.

#### Mitigação sugerida
Mascarar/pseudonimizar `clientIp` em `auth.ts` e `cli-http.ts` por padrão (independente de `NODE_ENV`), e corrigir `docs/pt-br/desenvolvimento/metricas.md` alinhando-o à implementação real.

---

### FND-0018 — Ausência de política LGPD/canal DPO (`Art. 41`), plano de incidente ANPD (`Art. 48`) e salvaguarda contra homônimos/decisão automatizada em ferramentas penais

- **Categoria:** `compliance-br`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0033`
- **Evidência:**
  - `lib/tools/legal.ts:L239-L250,L276,L398`
  - `lib/workers/worker.ts:L96-L132`
  - `lib/workers/openapi.ts:L14-L21`
  - `.archagents/07-security-compliance.md:L1-L5`
  - `.archagents/10-runbooks.md:L1-L35`

#### Descrição
Faltam aviso LGPD/Política de Privacidade, canal de contato do Encarregado (DPO — Art. 41) para a instância pública e procedimento operacional de notificação de incidentes à ANPD e titulares (Art. 48) em `.archagents/10-runbooks.md`. Adicionalmente, `procurados_lookup` faz correspondência por substring parcial do nome sem CPF ou data de nascimento e retorna alertas direcionados a `due diligence` e `security screening` sem ressalva explícita de risco de homônimos e revisão humana (**LGPD Art. 6º I/V, Art. 7º §§3º-4º, Art. 20**).

#### Impacto
Risco de falsos positivos contra homônimos em decisões automatizadas de triagem e ausência de transparência e governança de incidentes LGPD exigidos na operação pública brasileira.

#### Mitigação sugerida
Adicionar política de privacidade / aviso LGPD (`PRIVACY.md` + `README.md` + metadado em `GET /` do Worker), incluir fluxo de incidente ANPD (Art. 48) em `.archagents/10-runbooks.md`, e acrescentar aviso estruturado de homônimo/revisão humana nos retornos de `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos`.

---

### FND-0019 — Transporte HTTP/SSE do CLI (`lib/adapters/cli-http.ts`) sem autenticação (`MCP_API_KEY`) quando exposto fora de loopback (`0.0.0.0`/`::`)

- **Categoria:** `security`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0034`
- **Evidência:**
  - `lib/adapters/cli.ts:L118-L148`
  - `lib/adapters/cli-http.ts:L212-L275,L385-L502`
  - `README.md:L135`

#### Descrição
Ao configurar `MCP_HTTP_HOST=0.0.0.0` (ou `::`) para deploy em rede/Docker/VPS, `cli.ts` apenas emite um warning em `stderr` e `createCliHttpApp()` não exige nem suporta `MCP_API_KEY` nas rotas `/mcp` e `/messages`, diferente do Cloudflare Worker (`lib/workers/auth.ts`).

#### Impacto
Em deploy remoto via CLI Node, qualquer cliente que atinja a porta HTTP com `Host` permitido consome as 23 tools MCP e eventuais chaves pagas configuradas no servidor sem autenticação.

#### Mitigação sugerida
Implementar autenticação Bearer/`X-API-Key` (comparação constant-time via `MCP_API_KEY`) em `createCliHttpApp()`, exigindo-a em modo fail-closed sempre que `host` não for loopback (`127.0.0.1`, `localhost`, `::1`).

---

### FND-0020 — Endpoints REST do Worker retornam `error.message` bruto como HTTP `500` em JSON inválido/exceções e `cloudflare.ts` omite headers defensivos extras

- **Categoria:** `security`
- **Severidade:** `low`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0035`
- **Evidência:**
  - `lib/workers/rest.ts:L59-L73,L84,L126-L137,L148,L190-L201,L212,L243-L254`
  - `lib/adapters/cloudflare.ts:L67-L75`
  - `lib/adapters/cli-http.ts:L231-L236`

#### Descrição
Nos 4 handlers de `lib/workers/rest.ts`, erros de `await request.json()` caem no `catch` geral respondendo HTTP `500` com `error.message` bruto em vez de `400 Invalid JSON payload`, e exceções internas também devolvem `error.message` ao cliente. Já `cloudflare.ts` define `X-Content-Type-Options: nosniff`, mas omite `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store`.

#### Impacto
Vazamento menor de detalhes de exceção / status HTTP impróprio (`500` em payload malformado) e ausência de defesa contra caching intermediário/navegador de respostas com dados pessoais.

#### Mitigação sugerida
Tratar parsing JSON em bloco dedicado retornando `400` limpo, sanitizar mensagens em `500` no `rest.ts`, e adicionar `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Cache-Control: no-store` às respostas do Worker em `cloudflare.ts`.

---

### FND-0021 — Ausência de delimitação anti-prompt-injection indireta e limite de tamanho em outputs externos e em `strategic_osint_prompt` + ajuste de metadado `allowlist`

- **Categoria:** `agentic-security`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0036`
- **Evidência:**
  - `lib/core/search-providers.ts:L96-L105,L209-L223`
  - `lib/tools/legal.ts:L221-L237`
  - `lib/tools/osint.ts:L95-L114`
  - `lib/core/mcp-server.ts:L212-L220`
  - `lib/adapters/cloudflare.ts:L290-L302`
  - `.archagents/mcp-tool-allowlist.json:L56` vs `lib/core/tool-schemas.ts:L59`

#### Descrição
Snippets externos (`Tavily`/`Perplexity`, raspagem `procurados_lookup`) são devolvidos diretamente no payload ao modelo sem marcação explícita de conteúdo externo não-confiável (`untrusted data`), `strategic_osint_prompt` interpola `context` livre (`<= 2000` chars) sem delimitadores de dados dentro do prompt instrucional, não há teto máximo de tamanho de resposta JSON antes de enviar ao cliente MCP, e `mcp-tool-allowlist.json:L56` menciona `"bounded to 10 queries"` quando o schema permite `20`.

#### Impacto
Superfície residual de prompt injection indireta via resultados web/HTML ou parâmetro `context` e risco de estouro de janela de contexto do agente em respostas extensas.

#### Mitigação sugerida
Aplicar delimitação de dados não-confiáveis / truncamento limitado em resultados externos e na interpolação de `context` em `strategic_osint_prompt`, impor limite defensivo de payload textual em `mcp-server.ts`/`cloudflare.ts` e alinhar o texto descritivo em `mcp-tool-allowlist.json:L56`.

---

### FND-0022 — Divergência de contrato REST/OpenAPI do Worker (`rest.ts`, `openapi.ts`, `types.ts`, `404` unreachable, `decodeURIComponent`) e artefatos/docs obsoletos residuais

- **Categoria:** `architecture`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0037`
- **Evidência:**
  - `lib/workers/openapi.ts:L151,L194-L217`
  - `lib/workers/rest.ts:L43,L149-L168`
  - `lib/workers/types.ts:L33-L46`
  - `lib/workers/worker.ts:L136-L140`
  - `lib/workers/tokens.ts:L1-L17`, `smithery.config.js:L1-L9`
  - `lib/core/dork-templates.ts:L521-L540`, `lib/config/timeouts.ts:L117-L131`
  - `.archagents/03-modules.md:L9`, `test/manual/test-manual.js:L1-L28`, `docs/CONFIGURATION.md:L138-L139`, `CLAUDE.md:L166-L167`, `.github/workflows/cloudflare-deploy.yml:L117-L120`

#### Descrição
O contrato REST/OpenAPI do Worker ainda lista 6 categorias OSINT em `/intelligence` (vs 10 em `DORK_CATEGORIES`), ignora `provider`/`max_results`, define `ThinkingRequestBody` incompatível com `SequentialThinkingSchema`, nunca retorna `404` em `rest.ts:L43` (`'Not found'` não casa `"CNPJ not found"`/`"CEP not found"`) e `worker.ts:L138` não decodifica `%2F` em `/cnpj/...`. Restam ainda `lib/workers/tokens.ts`, `smithery.config.js` (citando `@smithery/sdk`), funções mortas em `dork-templates.ts`/`timeouts.ts`, citação a `crypto.ts` inexistente em `.archagents/03-modules.md:L9`, scripts manuais desatualizados e docs secundárias obsoletas. *(Nota adicional no coletor: `apps/` e `infra/` não pertencem ao `REGISTRY` fixo de `audit-asis-coverage.py` no harness.)*

#### Impacto
Deriva entre OpenAPI/REST e ferramentas MCP, falhas ao consultar CNPJs URL-encoded via REST, erro `400` em vez de `404` e atrito de manutenção por código/docs legados.

#### Mitigação sugerida
Unificar schemas de `rest.ts`/`openapi.ts`/`types.ts` com `DORK_CATEGORIES`/`SEARCH_PROVIDERS`/`SequentialThinkingSchema`, corrigir `404` + `decodeURIComponent`, remover código morto (`tokens.ts`, `smithery.config.js` e exports órfãos) e sincronizar `.archagents/03-modules.md:L9` + docs/scripts.

---

### FND-0023 — Correlação `X-Request-Id` quebrada em REST (`worker.ts` → `rest.ts`) e `POST /messages` → `mcp-server.ts`, além de logs não estruturados residuais

- **Categoria:** `observability`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0038`
- **Evidência:**
  - `lib/workers/worker.ts:L139,L144,L148,L152`
  - `lib/workers/rest.ts:L33,L107,L171,L224`
  - `lib/adapters/cli-http.ts:L450-L454,L489` vs `lib/core/mcp-server.ts:L144`
  - `lib/workers/rate-limit.ts:L146`
  - `lib/core/search.ts:L34,L49,L76,L89`
  - `lib/core/intelligence.ts:L195,L224-L450`
  - `lib/core/tools.ts:L138`

#### Descrição
`worker.ts` extrai `requestContext`, mas os 4 endpoints REST de `lib/workers/rest.ts` chamam `handleMCPRequest(mcpRequest, env)` sem `requestContext` (gerando um `req_<uuid>` diferente nos logs de `tools.ts`); de modo análogo, `POST /messages` em `cli-http.ts` não correlaciona o ID HTTP com `CallToolRequestSchema` em `mcp-server.ts`. Adicionalmente, `rate-limit.ts:L146`, `search.ts` e `intelligence.ts` ainda usam `console.error` ad-hoc sem `Logger` JSON/correlação, e `tool.executed` fica restrito a `DEBUG`. *(Nota no coletor: `cobertura-do-reflect` segue acusando `routes_coverage`/`cost_coverage` `no_data` como telemetria do harness `codebase-ops`.)*

#### Impacto
Impossibilidade de correlacionar uma requisição REST do Worker ou `POST /messages` do CLI até os logs internos de execução da tool no diagnóstico de incidentes.

#### Mitigação sugerida
Repassar `requestContext` de `worker.ts` → `rest.ts` → `handleMCPRequest`, adotar `createLogger` em `rate-limit.ts`/`search.ts`/`intelligence.ts`, avaliar `AsyncLocalStorage` (ou contexto por sessão) entre `cli-http.ts` e `mcp-server.ts`, e logar trilha básica `INFO` de chamadas sem PII.

---

### FND-0024 — Fluxos de runtime/segurança em `cli-http.ts` (`429`, `413`, `400`, `extraAllowedHosts`, SSE/shutdown) e handlers/erros em `mcp-server.ts` sem testes unitários no Vitest

- **Categoria:** `test-coverage`
- **Severidade:** `medium`
- **Confiança:** `confirmed`
- **Ticket:** `TCK-0039`
- **Evidência:**
  - `lib/adapters/cli-http.ts:L49-L55,L134-L143,L292-L335,L406-L498,L590-L593` (`77.3%` stmts, `70.28%` branch em `test:coverage`)
  - `lib/core/mcp-server.ts:L116-L139,L239-L256` (`78.68%` stmts, `36.36%` funcs em `test:coverage`)

#### Descrição
Embora a suíte global alcance `91.32%` stmts (`85/85/80/85` ratchet), os ramos defensivos `429` (`rateLimitMiddleware`), `413` (`>1mb`), `400` (JSON inválido), `extraAllowedHosts`, roundtrip `GET /mcp` + `POST /messages` + `transport.onclose` e timeout de `createGracefulShutdown` em `cli-http.ts`, bem como `ListTools`/`ListResources`/`ReadResource` e o `catch` inesperado em `mcp-server.ts`, ainda têm `0` hits unitários dentro da suíte Vitest.

#### Impacto
Risco de regressão silenciosa em controles de segurança/DoS do transporte HTTP/SSE local do CLI e no tratamento de erros/MCP Apps de `mcp-server.ts` sem detecção unitária rápida.

#### Mitigação sugerida
Expandir `test/unit/cli-http-security.test.ts` (ou nova suíte dedicada) cobrindo `429`, `413`, `400`, `extraAllowedHosts`, handshake/fechamento SSE em `GET /mcp`/`POST /messages`, timeout do shutdown e todos os handlers/exceções de `createMCPServer()`.
