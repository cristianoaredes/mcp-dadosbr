---
id: SPC-0001
slug: pacote-fontes-transversais-v070
title: "Expansão v0.7.0 de fontes públicas transversais Worker-safe (29 tools) e reparo de fallbacks"
created_at: "2026-11-21T13:01:00-03:00"
status: compiled
linked_brief: BRF-0001
linked_discovery: DSC-0001
module_of: null
approved_by: "cristiano 2026-11-21T12:57:51-03:00"
linked_tickets:
  - TCK-0040
  - TCK-0041
  - TCK-0042
  - TCK-0043
  - TCK-0044
external_refs: []
external_sync: []
effort: L
security_sensitive: true
acceptance:
  - check: "npm run build && npm run build:worker"
  - check: "node -e \"import('./build/lib/core/tools.js').then(m => { const names = m.TOOL_DEFINITIONS.map(t => t.name); const req = ['tcu_certidoes','cnae_ncm_lookup','sistema_financeiro_lookup','feriados_ddd_lookup','bcb_olinda','ibge_indicadores']; if (names.length !== 29 || !req.every(r => names.includes(r))) process.exit(1); console.log('TOOLS_OK:' + names.length); })\""
    expect: "TOOLS_OK:29"
  - check: "node -e \"import('node:fs').then(fs => { const allow = JSON.parse(fs.readFileSync('.archagents/mcp-tool-allowlist.json','utf8')); const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); const names = allow.entries.map(t => t.name); if (pkg.version !== '0.7.0' || names.length !== 29) process.exit(1); console.log('ALLOWLIST_AND_VERSION_OK'); })\""
    expect: "ALLOWLIST_AND_VERSION_OK"
  - check: "npx vitest run"
  - check: "npm run test:transport"
  - check: "rg -q 'cadastro_de_empregadores\\.csv' lib/ && ! rg -q 'consumidor\\.gov\\.br/pages/indicador/empresa/listar' lib/tools/company.ts"
---

# SPC-0001 — Expansão v0.7.0 de fontes públicas transversais Worker-safe (29 tools) e reparo de fallbacks

## Problema

Na versão `0.6.0` (`a1a90e9`), o `mcp-dadosbr` atua como a camada transversal por entidade (`CNPJ`, `CPF`, `CEP`, código IBGE, domínio, indicadores) do portfólio `@aredes.me/*`, mas apresenta três lacunas objetivas para auditoria de empresas, compras públicas e cruzamento com servidores especializados (`mcp-camara-deputados`, `mcp-senado` e futuros `mcp-tse` e `mcp-orcamento`):

1. `lista_suja_lookup` (`lib/tools/legal.ts:L479-L519`) consulta uma rota do Portal da Transparência que devolve HTTP `405 Method Not Allowed` (`text/html`), caindo sempre em links manuais apesar de o MTE publicar oficialmente o CSV aberto `cadastro_de_empregadores.csv` com ~76 KB (`243ms` medidos em `DSC-0001`).
2. `consumidor_reclamacoes` (`lib/tools/company.ts:L124-L163`) executa uma requisição HTTP contra `consumidor.gov.br` que devolve HTML protegido por challenge anti-bot JS F5 (`/common.js?matcher`), desperdiçando latência antes de retornar o mesmo fallback estático.
3. Faltam seis consultas públicas transversais gratuitas, sem API key e compatíveis com o orçamento de memória do Cloudflare Worker (`<128 MB`, `ADR-0002`): certidões consolidadas PJ no TCU, classificação oficial CNAE (`IBGE v2`) e NCM (`BrasilAPI`), validação do Sistema Financeiro/Pix/Corretoras (`BrasilAPI`), feriados nacionais e DDD (`BrasilAPI`), PTAX histórica e Expectativas Focus (`BCB Olinda`), e população/PIB municipal (`IBGE Agregados v3`).

## Usuários e jornadas

- **Agentes de IA em hosts MCP (Node `stdio`/`HTTP+SSE` e Cloudflare Worker):** invocam `tcu_certidoes`, `cnae_ncm_lookup`, `sistema_financeiro_lookup`, `feriados_ddd_lookup`, `bcb_olinda` e `ibge_indicadores` diretamente ou via `company_deep_profile` sem exigir novas variáveis de ambiente.
- **Analistas de compliance, due diligence e auditoria pública:** verificam se um CNPJ fornecedor está na Lista Suja do MTE, se possui sanções/inidoneidade no TCU/CNJ/CEIS/CNEP, se o CNAE/NCM condiz com o gasto, se a instituição Pix/ISPB e o DDD cadastral são legítimos, e qual a PTAX exata na data de uma nota fiscal ou população/PIB do município.
- **Exceções e falhas upstream:** em erro HTTP ou timeout dos órgãos públicos, as ferramentas retornam erro explícito ou fallback estruturado com proveniência (`url`, `fetchedAt`) e orientação oficial, sem inventar dados e sem contornar CAPTCHAs ou proteções anti-bot.

## Solução proposta

1. **Reparo de fallbacks existentes (+0 tools):**
   - `lista_suja_lookup` passa a baixar, decodificar defensivamente, cachear e filtrar o CSV aberto oficial do MTE (`cadastro_de_empregadores.csv`, ~76 KB) por CNPJ, CPF ou razão social/empregador, mantendo sanitização agêntica (`UNTRUSTED_EXTERNAL_DATA_NOTICE` / `sanitizeUntrustedText`), aviso LGPD (`lgpd_notice`) e fallback para links oficiais somente em caso de indisponibilidade real ou mudança estrutural de cabeçalho.
   - `consumidor_reclamacoes` deixa de disparar requisição HTTP inútil contra o challenge JS F5 e retorna imediatamente resultado guiado honesto com links oficiais de consulta pública no Consumidor.gov.br e Dados Abertos.
2. **Seis novas ferramentas transversais sem chave e Worker-safe (+6 tools -> total 29 tools):**
   - `tcu_certidoes`: consulta a API pública de Certidões Consolidadas PJ do TCU (`certidoes-apf.apps.tcu.gov.br`, contemplando Licitantes Inidôneos TCU, Improbidade Administrativa CNJ, CEIS e CNEP) por CNPJ, com timeout calibrado, `lgpd_notice`, cache e integração opcional em `company_deep_profile` (degradação graciosa se falhar).
   - `cnae_ncm_lookup`: consulta a hierarquia e notas explicativas de CNAE na API IBGE `v2` e busca códigos/descrições NCM na BrasilAPI `ncm/v1`.
   - `sistema_financeiro_lookup`: consulta bancos por código COMPE/ISPB (`brasilapi.com.br/api/banks/v1`), participantes do Pix (`pix/v1/participants`) e corretoras CVM (`cvm/corretoras/v1`) com filtro por CNPJ/ISPB/nome e paginação limitada para manter a saída compacta.
   - `feriados_ddd_lookup`: consulta feriados nacionais por ano (`feriados/v1/{ano}`) e UF/municípios por código DDD (`ddd/v1/{ddd}`) via BrasilAPI.
   - `bcb_olinda`: consulta cotação PTAX histórica por data e Expectativas de Mercado (Boletim Focus) via API OData Olinda do Banco Central (`olinda.bcb.gov.br`), preservando `bacen_taxas` e seu MCP App `ui://dadosbr/banco-central.html` intactos.
   - `ibge_indicadores`: consulta população residente estimada (agregado `6579`, variável `9324`) e PIB municipal a preços correntes (agregado `5938`, variável `37`) via IBGE Agregados `v3` por município/UF, preservando `ibge_localidades` e seu MCP App intactos.
3. **Paridade v0.7.0, allowlists e governança:**
   - Atualizar o catálogo para 29 tools em Node (`stdio` e `HTTP/SSE`) e Cloudflare Worker (`/`, `/health`, `/openapi.json`), propagar a versão `0.7.0` (`package.json`, constantes e adapters), atualizar allowlists (`SC-9` em `.archagents/mcp-tool-allowlist.json` e hosts HTTPS se necessário), cobrir com testes unitários (`vitest run`) e de transporte (`test:transport`), e atualizar a documentação canônica em `README.md` e `.archagents/`.

## Discovery e fontes

- `DSC-0001` (`.archagents/12-inception/discoveries/DSC-0001-expansao-fontes-transversais-v070.md`) — medições HTTP reais em `2026-11-21` comprovando HTTP `200` em MTE CSV (`76 KB`), TCU (`1,3 KB`), BrasilAPI (`banks`, `pix`, `ncm`, `cvm/corretoras`, `ddd`, `feriados`), IBGE CNAE `v2` / Agregados `v3` e BCB Olinda OData; além de comprovar bloqueio F5 em `consumidor.gov.br` e incompatibilidade Worker OOM do IBAMA Embargos (`215 MB` / `329 MB`).
- `BRF-0001` (`.archagents/12-inception/briefs/BRF-0001-pacote-fontes-transversais-v070.md`) — decisão humana aprovando a Opção A em `2026-11-21T12:57:51-03:00`.
- Docs AS-IS: `.archagents/00-overview.md`, `.archagents/01-business-domain.md`, `.archagents/02-architecture.md` (`ADR-0001`, `ADR-0002`), `.archagents/03-modules.md`, `.archagents/05-integrations.md` e `.archagents/07-security-compliance.md`.

## Não-escopo

- **Datasets volumosos incompatíveis com Cloudflare Worker (`128 MB` RAM):** Embargos e Autos do IBAMA (`215 MB` CSV / `329 MB` JSON, WFS `404`), reservados para o candidato dedicado `@aredes.me/mcp-ambiental-agro` em etapa futura.
- **Contorno de CAPTCHA ou proteção anti-bot:** `oab_advogado`, `bnmp_mandados` e `consumidor_reclamacoes` permanecem com fallback guiado honesto, sem qualquer automação ou bypass de challenge.
- **Ferramentas legislativas:** Câmara dos Deputados e Senado Federal já possuem servidores MCP dedicados no ecossistema.
- **Criação dos novos repositórios MCP (`mcp-tse` e `mcp-orcamento`):** compõem a Etapa 2, que será executada após a entrega da `v0.7.0` usando `mcp-dadosbr` atualizado como molde base.
- **Novos painéis HTML MCP Apps:** permanecem exclusivamente os 5 MCP Apps HTML existentes nesta release.

## Riscos

- Latência elevada (~5,6s observados em `DSC-0001`) ou indisponibilidade intermitente no serviço público de Certidões do TCU (`certidoes-apf.apps.tcu.gov.br`) → mitigação: timeout HTTP calibrado (>=8-10s), cache por CNPJ e degradação graciosa em `company_deep_profile` sem derrubar as demais fontes.
- Alteração de encoding (`ISO-8859-1`/`Windows-1252` vs `UTF-8`) ou mudança de colunas no CSV `cadastro_de_empregadores.csv` do MTE → mitigação: decodificação defensiva com fallback para `latin1`/`utf-8`, validação explícita de cabeçalho esperado e fallback guiado para URLs oficiais se o formato mudar.
- Payloads completos de participantes Pix (~180 KB) e corretoras CVM (~192 KB) excederem o teto de saída JSON (`MCP_MAX_TOOL_OUTPUT_CHARS`) ou sobrecarregarem a janela do LLM → mitigação: filtro em servidor por CNPJ, ISPB, código ou nome e paginação obrigatória (`page`/`limit`) com limite máximo antes da serialização.
- Ampliação da superfície agêntica (+6 tools consumindo texto externo) e tratamento de dados pessoais/sancionatórios (CPF/CNPJ em Lista Suja e TCU) → mitigação: aplicar `sanitizeUntrustedText` e `UNTRUSTED_EXTERNAL_DATA_NOTICE` sobre dados externos, anexar `lgpd_notice` (`compliance-notices.ts`) em `lista_suja_lookup` e `tcu_certidoes`, e atualizar `.archagents/mcp-tool-allowlist.json` (`SC-9`) para exatamente 29 entradas revisadas.

## Decomposição

- **Unit 1 — Integridade Societária & Reparo de Fallbacks** (blocked_by: []; files: lib/tools/legal.ts, lib/tools/company.ts, lib/shared/mte-lista-suja.ts, lib/shared/tcu.ts): Repara `lista_suja_lookup` consumindo o CSV oficial aberto do MTE (~76 KB) com cache e `lgpd_notice`, saneia `consumidor_reclamacoes` sem requisição HTTP contra anti-bot, e implementa `tcu_certidoes` integrada ao `company_deep_profile`.
- **Unit 2 — Classificação Fiscal, Sistema Financeiro & Calendário/DDD** (blocked_by: []; files: lib/tools/fiscal-banking.ts): Implementa `cnae_ncm_lookup` (IBGE CNAE `v2` + BrasilAPI NCM), `sistema_financeiro_lookup` (BrasilAPI bancos, participantes Pix e corretoras CVM com filtro e paginação) e `feriados_ddd_lookup` (BrasilAPI feriados nacionais e DDD).
- **Unit 3 — Macroeconomia BCB Olinda & Indicadores Municipais IBGE** (blocked_by: []; files: lib/tools/financial.ts, lib/tools/government.ts, lib/shared/olinda.ts): Implementa `bcb_olinda` (PTAX histórica por data e Expectativas Focus via OData BCB preservando `bacen_taxas` e seu MCP App) e `ibge_indicadores` (População estimada `6579` e PIB Municipal `5938` via IBGE Agregados `v3`).
- **Unit 4 — Catálogo v0.7.0, Allowlists, Paridade Worker/OpenAPI & Documentação** (blocked_by: Unit 1, Unit 2, Unit 3; files: lib/tools/index.ts, lib/core/tool-schemas.ts, lib/config/index.ts, lib/shared/utils/constants.ts, lib/workers/openapi.ts, package.json, .archagents/mcp-tool-allowlist.json, README.md, .archagents/00-overview.md, .archagents/01-business-domain.md, .archagents/03-modules.md, .archagents/05-integrations.md, .archagents/07-security-compliance.md): Registra as 29 ferramentas em Node e Cloudflare Worker, atualiza versão para `0.7.0`, allowlists SSRF e `SC-9`, testes de transporte e documentação canônica.

## Spec self-review

- Placeholder scan: ok — zero placeholders angulares ou campos pendentes de clarificação na especificação.
- Consistência interna: ok — catálogo exato de 29 ferramentas (23 existentes + 6 novas sem chave) e 5 MCP Apps alinhado entre critérios de aceitação, solução proposta, não-escopo e decomposição.
- Escopo focado: ok — esforço `L` decomposto em 4 unidades com superfícies de arquivos disjuntas e 100% compatível com Cloudflare Worker (`<128 MB` RAM) sem tocar nos escopos dos novos MCPs (`mcp-tse`, `mcp-orcamento`).
- Ambiguidades restantes: nenhuma — Opção A (Etapa 1) e molde/prioridade da Etapa 2 (`mcp-dadosbr` -> `mcp-tse` e `mcp-orcamento`) foram explicitamente decididos pelo operador no Gate Humano de Direção.
