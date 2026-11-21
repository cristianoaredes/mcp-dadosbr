---
id: BRF-0001
slug: pacote-fontes-transversais-v070
title: "Pacote v0.7.0 de fontes públicas transversais Worker-safe e reparo de fallbacks no mcp-dadosbr"
created_at: "2026-11-21T12:41:00-03:00"
status: promoted
linked_discovery: DSC-0001
linked_spec: SPC-0001
external_refs: []
---

# BRF-0001 — Pacote v0.7.0 de fontes públicas transversais Worker-safe e reparo de fallbacks no mcp-dadosbr

## Problema / oportunidade

O `mcp-dadosbr` (`v0.6.0`, `a1a90e9`) é o conector transversal do ecossistema `@aredes.me/*` para cadastro, fiscalização e referências econômicas por chave (`CNPJ`, `CPF`, `CEP`, código IBGE, CNAE, moeda/data). Hoje ele apresenta três lacunas mensuráveis:
1. `lista_suja_lookup` (`lib/tools/legal.ts:L479-L519`) recebe HTTP `405` HTML na rota atual do Portal da Transparência, mesmo havendo o CSV oficial aberto do MTE com apenas `76 KB` (`243ms`).
2. `consumidor_reclamacoes` (`lib/tools/company.ts:L124-L163`) executa chamada HTTP contra uma página protegida por challenge anti-bot JS F5 (`common.js?matcher`) e cai sempre no fallback manual.
3. Faltam consultas chaveadas transversais gratuitas e sem API key — como Certidões Consolidadas TCU (`certidoes-apf.apps.tcu.gov.br`), classificação oficial CNAE (`IBGE v2`) + NCM (`BrasilAPI`), validação SFN/Pix (`banks`, `pix`, `cvm/corretoras`), feriados/DDD, PTAX histórica + Boletim Focus (`BCB Olinda`) e PIB/população municipal (`IBGE Agregados v3`) — que potencializam o cruzamento com `mcp-camara-deputados`, `mcp-senado` e os futuros MCPs (`mcp-tse`, `mcp-orcamento`, `mcp-mercado-capitais`, `mcp-ambiental-agro`).

Ao mesmo tempo, o Discovery (`DSC-0001`) comprovou que o dataset de Embargos do IBAMA (`215 MB` CSV / `329 MB` JSON, sem endpoint WFS JSON ativo) **estouraria a memória do Cloudflare Worker (`128 MB`)**, devendo ficar fora do `mcp-dadosbr`.

## Opções exploradas

### Opção A — Pacote Transversal Completo Worker-Safe (`29` tools, effort `L`)
- **Escopo:**
  - **Reparo de tools existentes (+0 tools):**
    - `lista_suja_lookup`: passar a consultar e filtrar o CSV oficial do MTE (`cadastro_de_empregadores.csv`, `~76 KB`), mantendo `lgpd_notice`, cache em memória/KV e fallback guiado apenas em falha real de rede;
    - `consumidor_reclamacoes`: eliminar a requisição inútil contra o challenge anti-bot HTML e devolver imediatamente orientação estruturada + links oficiais (sem tentar contornar proteção anti-bot).
  - **6 novas tools sem chave e Worker-safe:**
    1. `tcu_certidoes`: consulta consolidada PJ no TCU (Licitantes Inidôneos, CNJ Improbidade, CEIS, CNEP) por CNPJ + integração no `company_deep_profile`;
    2. `cnae_ncm_lookup`: descrição e notas oficiais do CNAE (IBGE `v2`) + consulta de NCM (BrasilAPI `ncm/v1`);
    3. `sistema_financeiro_lookup`: bancos COMPE/ISPB (`banks/v1`), participantes do Pix (`pix/v1/participants`) e corretoras CVM (`cvm/corretoras/v1`) com filtro e paginação;
    4. `feriados_ddd_lookup`: feriados nacionais por ano (`feriados/v1`) e UFs/cidades por DDD (`ddd/v1`);
    5. `bcb_olinda`: PTAX histórica por data específica e Expectativas de Mercado (Boletim Focus) via OData BCB, mantendo `bacen_taxas` e seu MCP App intocados;
    6. `ibge_indicadores`: população estimada (agregado `6579`) e PIB municipal (agregado `5938`) via IBGE `v3`.
  - Atualização de allowlist (`lib/config/`, `.archagents/mcp-tool-allowlist.json`), rotas Worker/OpenAPI e documentação `.archagents/`.
- **Prós:** Máximo ganho de inteligência transversal para `v0.7.0` em uma única release coerente (`29` tools), zero dependência de novas API keys, 100% compatível com Node e Cloudflare Worker, e abre caminho limpo para os novos MCPs da Etapa 2.
- **Contras:** Escopo `L` (exige decomposição em subtickets na fase de Spec); requer tratamento cuidadoso de encoding CSV (MTE), timeout do TCU (`~5.6s`) e paginação/cap nos payloads de `~180-192 KB` da BrasilAPI.
- **Esforço:** `L` · **Riscos:** instabilidade pontual do serviço público do TCU ou mudança futura na URL fixa do CSV do MTE (mitigável com fallback explícito e mensagem de proveniência).

### Opção B — Pacote Enxuto Auditoria de Fornecedores (`26` tools, effort `M`)
- **Escopo:** Reparos de `lista_suja_lookup` e `consumidor_reclamacoes` + apenas 3 novas tools focadas em auditoria imediata de empresas/fornecedores (`tcu_certidoes`, `cnae_ncm_lookup` e `feriados_ddd_lookup`). Deixa `sistema_financeiro_lookup`, `bcb_olinda` e `ibge_indicadores` fora desta versão.
- **Prós:** Menor superfície de alteração, entrega e revisão mais rápidas, mantém catálogo em `26` tools.
- **Contras:** Deixa lacunas econômicas/municipais relevantes (PTAX em data de nota fiscal, verificação de participantes Pix/ISPB e indicadores per capita de municípios do IBGE).
- **Esforço:** `M` · **Riscos:** exigir uma segunda onda rápida logo em seguida antes de iniciar os novos MCPs.

### Opção C — Pacote Completo + 2 Novos MCP Apps Visuais (`29` tools + `7` MCP Apps, effort `XL`)
- **Escopo:** Tudo da Opção A mais a construção de 2 novos painéis HTML autônomos (`ui://dadosbr/certidoes-tcu.html` e `ui://dadosbr/indicadores-ibge.html`) em `apps/` e `scripts/build-apps.mjs`.
- **Prós:** Experiência visual interativa para TCU e séries municipais em hosts compatíveis com MCP Apps.
- **Contras:** Eleva o esforço para `XL`, aumenta a complexidade de UI/testes de transporte e atrasa o início da Etapa 2 (criação dos novos MCPs copiados).
- **Esforço:** `XL` · **Riscos:** desbalancear o foco entre utilidade de dados na API e polimento visual nesta fase.

### Opção N — Não fazer / adiar
- **Escopo:** Congelar `mcp-dadosbr` na `v0.6.0` (`23` tools) e iniciar direto a cópia de um repositório base para criar os novos MCPs.
- **Custo de oportunidade:** Mantém `lista_suja_lookup` retornando fallback de HTTP `405` mesmo existindo CSV oficial de `76 KB`, e deixa `mcp-dadosbr` sem Certidões Consolidadas TCU, CNAE/NCM e PTAX/IBGE ao servir os novos MCPs.

## Perguntas abertas

1. Na Etapa 1 (`mcp-dadosbr v0.7.0`), seguimos com a **Opção A (29 tools, completa Worker-safe)**, **Opção B (26 tools, enxuta)**, **Opção C (com novos MCP Apps)** ou **Opção N**?
2. Na Etapa 2 (novos MCPs criados a partir da cópia de um existente), qual servidor base copiar — `mcp-dadosbr` (Node + Worker + `.archagents`) ou `trello-mcp-server` / `elearning-platform-mcp` (Node stdio + Streamable HTTP sem Worker) — e quais novos MCPs criar primeiro (`mcp-tse` + `mcp-orcamento`, ou incluir também `mcp-mercado-capitais` / `mcp-ambiental-agro`)?

## Fontes / Discovery

- [DSC-0001 — Discovery de APIs públicas transversais e limites Cloudflare Worker para o mcp-dadosbr v0.7.0](../discoveries/DSC-0001-expansao-fontes-transversais-v070.md)
- `.archagents/02-architecture.md` (`ADR-0002`, paridade Node + Cloudflare Worker)
- `lib/tools/legal.ts:L479-L519` (`lista_suja_lookup`) e `lib/tools/company.ts:L124-L163` (`consumidor_reclamacoes`)

## Recomendação preliminar

Recomenda-se a **Opção A — Pacote Transversal Completo Worker-Safe (`29` tools, `effort: L`)** para a `v0.7.0` do `mcp-dadosbr`:
- Resolve a pendência real de `lista_suja_lookup` (`76 KB` CSV MTE) e torna `consumidor_reclamacoes` honesto/instantâneo sem bater no anti-bot;
- Entrega as 6 novas APIs sem chave já comprovadas em HTTP `200`, respeitando o teto de memória do Cloudflare Worker (`<128 MB`) e o orçamento de contexto (`<=29` tools);
- Deixa datasets pesados/geoespaciais (`IBAMA 215-329 MB`) e fluxos de domínio profundos (`TSE`, `Transferegov/SICONFI/ObrasGov`, `CVM Fundos/Cias`) para os novos MCPs da Etapa 2, preferencialmente copiando `mcp-dadosbr` como molde para `mcp-tse` e `mcp-orcamento` primeiro (ou usando o molde Node Streamable HTTP caso algum novo MCP precise de ETL/banco local fora de Worker).

## Decisão
Aprovada a Opção A (29 tools Worker-safe) pelo operador em 2026-11-21T12:57:51-03:00; promovida para `SPC-0001`. Etapa 2 definida para clonar `mcp-dadosbr` gerando `mcp-tse` e `mcp-orcamento` após conclusão da `v0.7.0`.
