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
