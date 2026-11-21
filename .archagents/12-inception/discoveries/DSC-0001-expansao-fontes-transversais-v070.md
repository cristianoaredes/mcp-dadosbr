---
id: DSC-0001
slug: expansao-fontes-transversais-v070
title: "Discovery de APIs públicas transversais e limites Cloudflare Worker para o mcp-dadosbr v0.7.0"
created_at: "2026-11-21T12:40:00-03:00"
status: decided
linked_brief: BRF-0001
linked_spec: SPC-0001
sources:
  - .archagents/00-overview.md
  - .archagents/01-business-domain.md
  - .archagents/02-architecture.md
  - .archagents/05-integrations.md
external_refs: []
external_sync: []
---

# DSC-0001 — Discovery de APIs públicas transversais e limites Cloudflare Worker para o mcp-dadosbr v0.7.0

## Contexto

O ecossistema `@aredes.me/*` já possui servidores especializados para o Legislativo (`mcp-camara-deputados` e `mcp-senado`), enquanto o `mcp-dadosbr` (`v0.6.0`, base `a1a90e9`, 23 tools e 5 MCP Apps) atua como a camada transversal de consulta por entidade (`CNPJ`, `CPF`, `CEP`, código IBGE, domínio, datas/taxas) para due diligence, compras públicas e auditoria.

Duas restrições arquiteturais guiam esta expansão:
1. **Orçamento de tools:** manter o catálogo enxuto (teto prático de ~29 tools) para preservar precisão de roteamento nos hosts LLM e economizar janela de contexto.
2. **Paridade Node <-> Cloudflare Worker (`ADR-0002`, `.archagents/02-architecture.md:L70-L72`):** toda consulta do `mcp-dadosbr` executa de forma *stateless* na borda (`128 MB` de RAM no Worker, sem disco local e sem banco indexado). Fontes que dependam de *dumps* volumosos ou indexação pesada devem ficar fora do `mcp-dadosbr`, tornando-se candidatas a novos MCPs dedicados na Etapa 2 (copiando um molde existente).

Além disso, a auditoria ao vivo de `2026-11-21` mostrou 2 ferramentas atualmente presas em fallbacks manuais sem CAPTCHA (`lista_suja_lookup` retornando HTTP `405` HTML em `lib/tools/legal.ts:L479-L519` e `consumidor_reclamacoes` recebendo HTML SPA em `lib/tools/company.ts:L124-L163`).

## Fontes consultadas

Medições HTTP reais executadas em `2026-11-21` (sem API key, a partir do workspace local):

1. **MTE Lista Suja CSV oficial** (`https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/areas-de-atuacao/cadastro_de_empregadores.csv`)
   - Medição: HTTP `200`, `text/csv`, `76.472` bytes (`~76 KB`), `243ms`.
   - Veredito: **APROVADA** — corrige o HTTP `405` atual de `lista_suja_lookup` (`lib/tools/legal.ts:L479-L519`) e cabe com folga na memória do Cloudflare Worker.
2. **Consumidor.gov.br & Dados Abertos MJSP**
   - Medição (`https://www.consumidor.gov.br/pages/dadosabertos/externo/`): HTTP `200`, `text/html;charset=UTF-8`, `18.082` bytes com challenge JS anti-bot (`/common.js?matcher`); `https://dados.mj.gov.br/api/3/action/package_search?q=consumidor.gov.br` falhou conexão (`TypeError: fetch failed`).
   - Veredito: **BLOQUEIO UPSTREAM CONFIRMADO** — não contornar anti-bot; manter fallback guiado honesto em `consumidor_reclamacoes` (`lib/tools/company.ts:L124-L163`) evitando requisição HTTP inútil contra o challenge HTML.
3. **TCU Certidões Consolidadas PJ** (`https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes/00000000000191?seEmitirPDF=false`)
   - Medição: HTTP `200`, `application/json`, `1.349` bytes, `5.660ms`.
   - Veredito: **APROVADA** — consolida Licitantes Inidôneos (TCU), Improbidade Administrativa (CNJ), CEIS e CNEP por CNPJ sem API key (requer cache e timeout calibrado para ~6-8s).
4. **IBAMA Dados Abertos — Embargos** (`dadosabertos.ibama.gov.br/api/3/action/package_search?q=embargo`)
   - Medição: `termo_de_embargo.csv` possui `215.211.807` bytes (`215 MB`), `termo_de_embargo.json` possui `329.709.149` bytes (`329 MB`), e GeoServer WFS (`https://pamgia.ibama.gov.br/geoservicos/ows?service=WFS&...&outputFormat=application/json`) retornou HTTP `404`.
   - Veredito: **REPROVADA PARA WORKER STATELESS** — causaria OOM (`>128 MB`) no Cloudflare Worker; redirecionada como candidata a novo MCP dedicado (`@aredes.me/mcp-ambiental-agro`) com ingestão/índice próprio.
5. **BrasilAPI complementar** (`https://brasilapi.com.br/api/...` — já usada em `fipe_veiculos`, `lib/tools/financial.ts:L88-L149`)
   - `banks/v1/1`: HTTP `200`, `593 B`, `170ms`
   - `pix/v1/participants`: HTTP `200`, `180.314 B`, `97ms`
   - `ncm/v1/27101259`: HTTP `200`, `154 B`, `3.096ms`
   - `cvm/corretoras/v1`: HTTP `200`, `192.872 B`, `154ms`
   - `ddd/v1/11`: HTTP `200`, `922 B`, `96ms`
   - `feriados/v1/2026`: HTTP `200`, `1.247 B`, `42ms`
   - Veredito: **APROVADAS** (paylods `pix/v1/participants` e `cvm/corretoras/v1` em ~180-192 KB exigem filtro + paginação/cap para respeitar `MCP_MAX_TOOL_OUTPUT_CHARS`).
6. **IBGE CNAE `v2` & Agregados `v3`**
   - `https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/6201501`: HTTP `200`, `3.152 B`, `113ms`
   - `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[3550308]`: HTTP `200`, `248 B`, `51ms`
   - `https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/-1/variaveis/37?localidades=N6[3550308]`: HTTP `200`, `262 B`, `495ms`
   - Veredito: **APROVADAS**.
7. **Banco Central Olinda OData**
   - `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/...`: HTTP `200`, `124 B`, `186ms`
   - `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=2&$orderby=Data%20desc&$format=json`: HTTP `200`, `632 B`, `1.929ms`
   - Veredito: **APROVADAS**.
8. **Repositórios irmãos no workspace (`/Users/cristiano/workspace/aredes/projetos/mcp-servers/`)**
   - Candidatos a molde base para Etapa 2: `mcp-dadosbr` (`Node stdio/HTTP+SSE + Cloudflare Worker + MCP Apps + codebase-ops`), `trello-mcp-server` (`Node stdio + Streamable HTTP, OAuth/Bearer, per-tool scopes`) e `elearning-platform-mcp` (`Node stdio + Streamable HTTP, PAT auth`).

## Hipóteses

- **H1 (Lista Suja MTE em CSV de 76 KB):** O CSV `cadastro_de_empregadores.csv` pode ser baixado e cacheado na memória/KV do `mcp-dadosbr` sem estourar limites do Cloudflare Worker, devolvendo dados reais em `lista_suja_lookup`. -> *Como validar:* parser CSV com fixture + smoke live testando retorno estruturado e encoding (`UTF-8`/Windows-1252) em `lista_suja_lookup`.
- **H2 (TCU Certidões com latência ~5.6s):** O endpoint `certidoes-apf.apps.tcu.gov.br` exige timeout ajustado (>=8-10s), cache por CNPJ e tratamento explícito de falha/timeout sem derrubar `company_deep_profile`. -> *Como validar:* integração no `httpJson` com `timeout` dedicado e teste de degradação graciosa em `company_deep_profile`.
- **H3 (Listas Pix 180 KB e Corretoras CVM 192 KB dentro do teto MCP):** Filtrar por CNPJ/ISPB/nome e paginar o resultado antes de serializar mantém a resposta bem abaixo do cap `MCP_MAX_TOOL_OUTPUT_CHARS` (`lib/shared/agentic-guard.ts`). -> *Como validar:* testes unitários cobrindo filtro, paginação e bound de output em `sistema_financeiro_lookup`.
- **H4 (Fronteira de portfólio):** Manter `mcp-dadosbr` em 26-29 tools *stateless* preserva performance e clareza para LLMs, deixando domínios profundos ou com ingestão pesada (TSE, Orçamento/Obras, Mercado de Capitais CVM, Ambiental/Comex IBAMA) para os novos MCPs copiados na Etapa 2. -> *Como validar:* aprovação humana no Gate de Direção de `BRF-0001`.

## Perguntas

### Q1 — Qual escopo devemos aprovar para a `v0.7.0` do `mcp-dadosbr` (Etapa 1)?
- (a) **Opção A (Recomendada):** Completo Worker-safe (`29` tools) — reparar `lista_suja_lookup` (CSV MTE) e sanear `consumidor_reclamacoes`, + 6 novas tools sem chave (`tcu_certidoes`, `cnae_ncm_lookup`, `sistema_financeiro_lookup`, `feriados_ddd_lookup`, `bcb_olinda`, `ibge_indicadores`).
- (b) **Opção B:** Enxuto Fornecedores (`26` tools) — reparar `lista_suja_lookup`/`consumidor_reclamacoes` + apenas `tcu_certidoes`, `cnae_ncm_lookup` e `feriados_ddd_lookup`.
- (c) **Opção C:** Completo + 2 novos MCP Apps HTML (`29` tools + `7` MCP Apps visuais para TCU e IBGE Indicadores).
- (d) **Opção N:** Adiar a `v0.7.0` do `mcp-dadosbr` e partir direto para os novos MCPs da Etapa 2.
[Answer]: (a) Opção A — Completo Worker-safe (29 tools: fix Lista Suja/Consumidor + TCU, CNAE/NCM, SFN/Pix, Feriados/DDD, BCB Olinda e IBGE Indicadores).

### Q2 — Para a Etapa 2 (novos MCPs por cópia), qual molde base devemos copiar e quais servidores instanciar primeiro?
- (a) Copiar o `mcp-dadosbr` (inclui CLI stdio/HTTP+SSE, Cloudflare Worker, testes Vitest e governança `codebase-ops`) e iniciar pelos 2 principais: `mcp-tse` e `mcp-orcamento`.
- (b) Copiar `trello-mcp-server` ou `elearning-platform-mcp` (Node stdio + Streamable HTTP sem Worker) e iniciar pelos 2 principais: `mcp-tse` e `mcp-orcamento`.
- (c) Copiar o `mcp-dadosbr` e já instanciar o esqueleto dos 4 candidatos (`mcp-tse`, `mcp-orcamento`, `mcp-mercado-capitais` e `mcp-ambiental-agro`).
- (d) Outra combinação (descreva).
[Answer]: (a) Usar mcp-dadosbr como molde (Node + Cloudflare Worker + codebase-ops) e criar mcp-tse e mcp-orcamento.

## Opções

### Opção A — Pacote Transversal Completo Worker-Safe (`29` tools, effort `L`)
Repara `lista_suja_lookup` (CSV oficial MTE de `76 KB`), ajusta `consumidor_reclamacoes` para não bater no anti-bot HTML F5, e adiciona 6 novas tools sem chave e testadas em HTTP `200`: `tcu_certidoes`, `cnae_ncm_lookup`, `sistema_financeiro_lookup`, `feriados_ddd_lookup`, `bcb_olinda` e `ibge_indicadores`.
- Prós: fecha auditoria de fornecedores (TCU, CNAE/NCM, Lista Suja, DDD/Feriados, SFN/Pix) e indicadores econômicos/municipais mantendo paridade Node + Cloudflare Worker (`128 MB`).
- Contras: eleva o catálogo de 23 para 29 tools (próximo do teto prático de ~30) e requer cuidado com encoding do CSV do MTE (`latin1`/`utf-8`) e latência de ~5.6s do TCU.
- Esforço: `L` · Riscos: latência intermitente do `certidoes-apf.apps.tcu.gov.br` e mudanças de layout no CSV do MTE.

### Opção B — Pacote Enxuto Auditoria de Fornecedores (`26` tools, effort `M`)
Aplica os reparos de `lista_suja_lookup`/`consumidor_reclamacoes` e inclui apenas 3 tools voltadas à validação imediata de CNPJ/fornecedores (`tcu_certidoes`, `cnae_ncm_lookup`, `feriados_ddd_lookup`), postergando `sistema_financeiro_lookup`, `bcb_olinda` e `ibge_indicadores`.
- Prós: menor risco de regressão, entrega mais rápida e catálogo mais leve (`26` tools).
- Contras: deixa de fora PTAX histórica por data/Focus (`bcb_olinda`), validação de Pix/ISPB (`sistema_financeiro_lookup`) e PIB/população municipal (`ibge_indicadores`).
- Esforço: `M` · Riscos: retrabalho de release se logo em seguida precisarmos de PTAX e IBGE per capita.

### Opção C — Completo + 2 Novos MCP Apps HTML (`29` tools + `7` MCP Apps, effort `XL`)
Inclui todo o escopo da Opção A acrescido de 2 interfaces visuais HTML autônomas (`ui://dadosbr/certidoes-tcu.html` e `ui://dadosbr/indicadores-ibge.html`).
- Prós: experiência visual rica nos hosts compatíveis com MCP Apps.
- Contras: aumenta significativamente o escopo e esforço (`XL`) de frontend/build (`scripts/build-apps.mjs`) e atrasa o início da Etapa 2 (novos MCPs).
- Esforço: `XL` · Riscos: atrasar o roadmap dos novos MCPs.

### Opção N — Não fazer / adiar
Manter `mcp-dadosbr` em `v0.6.0` (`23` tools) e iniciar imediatamente a criação dos novos MCPs.
- Custo de oportunidade: mantém `lista_suja_lookup` quebrada em HTTP `405`, deixa de integrar certidões consolidadas gratuitas do TCU e não entrega o enriquecimento transversal de CNAE/NCM/PTAX antes de ligar os novos MCPs.

## Decisão
Aprovada pelo operador em `2026-11-21T12:57:51-03:00`: seguir para `BRF-0001` -> `SPC-0001` com a **Opção A (29 tools Worker-safe)** na Etapa 1 (`mcp-dadosbr v0.7.0`), e fixar o próprio `mcp-dadosbr` como molde base para instanciar `mcp-tse` e `mcp-orcamento` na Etapa 2.
