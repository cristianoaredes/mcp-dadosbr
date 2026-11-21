---
id: DES-0039
slug: implementar-bcb-olinda-ptax-e-focus-e-ibge-indicadores-populacao-e-pib
title: "Implementar bcb_olinda (PTAX e Focus) e ibge_indicadores (Populacao e PIB)"
created_at: 2026-11-21T16:24:39Z
status: approved
ticket: TCK-0043
type: design
scope_files_new:
  - lib/shared/olinda-ibge-schemas.ts
  - lib/tools/olinda.ts
  - lib/tools/ibge-indicadores.ts
  - test/unit/olinda-ibge-indicadores-v070.test.ts
scope_files_modified: []
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0039-playbook.md
acceptance_delta: unchanged
---
# DES-0039 - Implementar bcb_olinda (PTAX e Focus) e ibge_indicadores (Populacao e PIB)

## Problema

`bacen_taxas` e `ibge_localidades` possuem MCP Apps ligados (`banco-central.html` e `ibge-localidades.html`) e não cobrem PTAX histórica por data exata (com resolução de feriados/fins de semana), Expectativas de Mercado do Boletim Focus (OData Olinda) nem população residente e PIB municipal (`IBGE Agregados v3`).

## Solucao

1. **`lib/shared/olinda-ibge-schemas.ts` (somente `zod`, sem `node:*`):**
   - `BcbOlindaSchema` com enum estrito de moedas (`USD`, `EUR`, `GBP`, `JPY`, `CHF`, `CAD`, `AUD`), enum estrito de indicadores Focus (`IPCA`, `Selic`, `PIB Total`, `Câmbio`, `IGP-M`), data `YYYY-MM-DD` e `ano_referencia` (`2020..2035`).
   - `IbgeIndicadoresSchema` validando `codigo_ibge` (`2` dígitos UF ou `7` dígitos município), `indicador` (`populacao | pib | todos`) e `periodo` (`-1`, `-\d{1,2}` ou `YYYY`).
2. **`lib/tools/olinda.ts` (`bcb_olinda`):**
   - `consulta=ptax`: calcula janela `[data - 7 dias, data]` em formato `MM-DD-YYYY`, consulta `CotacaoDolarPeriodo` (`USD`) ou `CotacaoMoedaPeriodo` (outras moedas) ordenado decrescente (`$top=5&$format=json`), seleciona a cotação efetiva mais recente <= `data` e informa `exact_date_match: boolean`, cacheado em `olinda:ptax:{moeda}:{data}`.
   - `consulta=focus`: consulta `ExpectativasMercadoAnuais` com `$filter` derivado exclusivamente de enums validados pelo Zod (`Indicador eq '...'`), ordenado por `Data desc`, `$top=10`, cacheado em `olinda:focus:{indicador}:{ano}`.
   - Exporta `BCB_OLINDA_TOOL` e `registerOlindaTool()` sem auto-executar top-level na Wave 1.
3. **`lib/tools/ibge-indicadores.ts` (`ibge_indicadores`):**
   - Mapeia `codigo_ibge.length === 2` para `N3[codigo]` e `7` dígitos para `N6[codigo]`.
   - Consulta paralelo/opcional agregado `6579` variável `9324` (População) e/ou agregado `5938` variável `37` (PIB Mil Reais) na API IBGE `v3`, estruturando `localidade`, `unidade`, `serie` e `latest_period` / `latest_value` (além de `pib_per_capita_estimado_reais` quando `todos` e mesmo ano ou referência informada).
   - Exporta `IBGE_INDICADORES_TOOL` e `registerIbgeIndicadoresTool()` sem auto-executar top-level na Wave 1.

## Threat Model

- **OData Injection:** `Indicador`, `moeda` e `ano_referencia` são restritos a enums literais e inteiros no Zod antes de montar `$filter`, sem interpolação livre de usuário.
- **Path / Query Injection:** `codigo_ibge` e `periodo` aceitam somente formatos numéricos estritos.
- **Prompt Injection & Worker parity:** textos externos higienizados com `sanitizeUntrustedText` + `UNTRUSTED_EXTERNAL_DATA_NOTICE`; zero imports `node:*`.

## Mudancas

- Novos: `lib/shared/olinda-ibge-schemas.ts`, `lib/tools/olinda.ts`, `lib/tools/ibge-indicadores.ts`, `test/unit/olinda-ibge-indicadores-v070.test.ts`

## Criterios de sucesso

- [ ] `npx vitest run test/unit/olinda-ibge-indicadores-v070.test.ts` passa cobrindo PTAX útil/feriado, EUR, Focus, IBGE N3/N6, cache e erros.
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` passa sem erros.
- [ ] `registerOlindaTool` e `registerIbgeIndicadoresTool` exportadas sem mutar `bacen_taxas` ou `ibge_localidades`.
