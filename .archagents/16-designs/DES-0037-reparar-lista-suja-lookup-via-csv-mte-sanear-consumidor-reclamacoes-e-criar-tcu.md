---
id: DES-0037
slug: reparar-lista-suja-lookup-via-csv-mte-sanear-consumidor-reclamacoes-e-criar-tcu
title: "Reparar lista_suja_lookup via CSV MTE, sanear consumidor_reclamacoes e criar tcu_certidoes"
created_at: 2026-11-21T16:24:38Z
status: approved
ticket: TCK-0041
type: design
scope_files_new:
  - lib/shared/mte-lista-suja.ts
  - lib/shared/tcu-schema.ts
  - lib/tools/tcu.ts
  - test/unit/tcu-mte-v070.test.ts
scope_files_modified:
  - lib/tools/legal.ts
  - lib/tools/company.ts
  - test/unit/tools-company-health-osint-legal.test.ts
  - test/unit/performance-cache-pagination.test.ts
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0037-playbook.md
acceptance_delta: unchanged
---
# DES-0037 - Reparar lista_suja_lookup via CSV MTE, sanear consumidor_reclamacoes e criar tcu_certidoes

## Problema

1. `lista_suja_lookup` (`lib/tools/legal.ts:L479-L519`) consulta rota do Portal da Transparência que retorna HTTP `405` HTML, apesar do CSV oficial aberto do MTE (`cadastro_de_empregadores.csv`, ~76 KB) existir em HTTPS público.
2. `consumidor_reclamacoes` (`lib/tools/company.ts:L124-L163`) executa chamada HTTP contra URL protegida por challenge anti-bot JS F5, desperdiçando rede antes do fallback.
3. Falta integração gratuita das Certidões Consolidadas PJ do TCU (`certidoes-apf.apps.tcu.gov.br`, TCU Inidôneos + CNJ CNIA + CEIS + CNEP).

## Solucao

1. **`lib/shared/mte-lista-suja.ts` (Web-standard, zero `node:*`, zero imports de `core`/`tools`):**
   - `decodeMteCsv(buffer)` tenta `TextDecoder("utf-8", { fatal: true })` com fallback `iso-8859-1`.
   - `parseMteListaSujaCsv(text)` analisa separador `;` com suporte a aspas, valida cabeçalho (`Empregador`, `CNPJ/CPF`), sanitiza texto via `sanitizeUntrustedText` e normaliza `cnpj_cpf_digits` / `normalized_employer`.
   - `matchMteListaSuja(entries, query)` filtra por dígitos (`>= 8` dígitos) ou tokens normalizados NFD (cap de 50 matches).
2. **`lib/tools/legal.ts` (`executeListaSuja`):**
   - Usa cache `LISTA_SUJA_CACHE_KEY` somente para lista parseada válida (`200` + cabeçalho válido), retorna `FOUND`/`NOT_FOUND` + `lgpd_notice` (`HOMONYM_HUMAN_REVIEW_NOTICE`) + `UNTRUSTED_EXTERNAL_DATA_NOTICE`, e cai no fallback `manual_urls` em erro de rede/formato sem cachear erro.
3. **`lib/tools/company.ts` (`executeConsumidor` & `executeDeepProfile`):**
   - `executeConsumidor`: remove `httpJson(searchUrl)` e retorna imediatamente fallback guiado honesto sem chamadas `fetch`.
   - `executeDeepProfile`: quando `include_government === true`, aciona `executeTcuCertidoes` preenchendo `results.tcu_certidoes` (degradação graciosa para `null` em falha).
4. **`lib/shared/tcu-schema.ts` & `lib/tools/tcu.ts`:**
   - `TcuCertidoesSchema` valida CNPJ mod-11 (`.strict()`).
   - `executeTcuCertidoes` consulta `certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes/{cnpj}?seEmitirPDF=false` (`timeoutMs = 10_000`), cacheia `tcu_certidoes:{cnpj}`, sanitiza campos e anexa `UNTRUSTED_EXTERNAL_DATA_NOTICE` + `lgpd_notice`. Exporta `TCU_CERTIDOES_TOOL` e `registerTcuTool()` sem auto-executar top-level nesta wave.

## Threat Model

- **Dados externos não confiáveis / Prompt Injection:** CSV do MTE e campos JSON do TCU são sanitizados via `sanitizeUntrustedText` e marcados com `UNTRUSTED_EXTERNAL_DATA_NOTICE`.
- **LGPD & homonímia:** respostas nominais e cadastrais de sanção recebem `attachLgpdNotice(..., HOMONYM_HUMAN_REVIEW_NOTICE)` e chaves de cache usam prefixos estruturados.
- **Anti-bot compliance:** zero automação ou contorno do challenge F5 em `consumidor.gov.br`.
- **SSRF / Worker runtime:** URLs fixas HTTPS oficiais, timeout explícito `10_000ms` e zero imports `node:*`.

## Mudancas

- Novos: `lib/shared/mte-lista-suja.ts`, `lib/shared/tcu-schema.ts`, `lib/tools/tcu.ts`, `test/unit/tcu-mte-v070.test.ts`
- Modificados: `lib/tools/legal.ts`, `lib/tools/company.ts`, `test/unit/tools-company-health-osint-legal.test.ts`, `test/unit/performance-cache-pagination.test.ts`

## Criterios de sucesso

- [ ] `npx vitest run test/unit/tcu-mte-v070.test.ts test/unit/tools-company-health-osint-legal.test.ts test/unit/performance-cache-pagination.test.ts` passa.
- [ ] `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit` passa sem erros.
- [ ] CSV do MTE integrado e `consumidor_reclamacoes` livre de requisição ao endpoint anti-bot.
