---
id: DES-0029
slug: aviso-lgpd-dpo-anpd-e-homonimo-em-ferramentas-juridicas
title: "Publicar aviso LGPD/DPO, plano ANPD e ressalva de homonimo em ferramentas juridicas"
created_at: 2026-11-21T13:45:30Z
status: approved
ticket: TCK-0033
type: design
scope_files_new:
  - PRIVACY.md
  - lib/shared/compliance-notices.ts
  - test/unit/compliance-lgpd-notice.test.ts
scope_files_modified:
  - README.md
  - .archagents/10-runbooks.md
  - lib/workers/worker.ts
  - lib/workers/openapi.ts
  - lib/tools/legal.ts
  - lib/tools/government.ts
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0029-playbook.md
acceptance_delta: unchanged
---
# DES-0029 - Publicar aviso LGPD/DPO, plano ANPD e ressalva de homonimo em ferramentas juridicas

## Problema

`FND-0018` / `TCK-0033`: faltam política de privacidade LGPD (`PRIVACY.md`), exposição do canal do Encarregado / DPO (LGPD Art. 41) em `README.md`, `GET /` (`lib/workers/worker.ts`) e `OpenAPI` (`lib/workers/openapi.ts`), procedimento operacional de notificação de incidentes à ANPD e titulares (LGPD Art. 48 / Resolução CD/ANPD nº 15/2024) em `.archagents/10-runbooks.md`, e ressalva estruturada contra homônimos e decisões automatizadas sem revisão humana (LGPD Art. 20) nos retornos de `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos`.

## Solucao

1. **Política de Privacidade e Transparência (`PRIVACY.md`, `README.md`):** publicar `PRIVACY.md` cobrindo escopo de dados públicos consultados sob demanda, bases legais/finalidade (LGPD Art. 6º I/III/V e Art. 7º), direitos do titular (Art. 18) e diferença entre repasse efêmero e cache local/KV, transparência de provedores externos (Tavily, Perplexity, Cloudflare Workers), salvaguardas contra homônimos e revisão humana (Art. 20), e canal do Encarregado/DPO (Art. 41) configurável via `MCP_DPO_CONTACT` + canal público do repositório. Referenciar `PRIVACY.md` e `MCP_DPO_CONTACT` na seção `## Privacidade e LGPD` de `README.md`.
2. **Runbook de Incidente ANPD (`.archagents/10-runbooks.md`):** acrescentar seção `## Resposta a Incidentes de Segurança e Notificação à ANPD (LGPD Art. 48)` cobrindo triagem, contenção, avaliação de risco/dano aos titulares, comunicação à ANPD e aos titulares em prazo razoável conforme Resolução CD/ANPD nº 15/2024, preservação de evidências e post-mortem.
3. **Metadados de Privacidade/DPO no Worker (`lib/workers/worker.ts`, `lib/workers/openapi.ts`):** expor objeto `privacy` (`policy` e `dpo_contact` com leitura opcional de `env.MCP_DPO_CONTACT`) no JSON de `GET /` (sem alterar `lib/adapters/cloudflare.ts`) e adicionar `contact` + `'x-privacy-policy'` no objeto `info` de `generateOpenAPISchema()`.
4. **Ressalva LGPD Art. 20 em Ferramentas Sensíveis (`lib/shared/compliance-notices.ts`, `lib/tools/legal.ts`, `lib/tools/government.ts`):** criar módulo Web-standard `lib/shared/compliance-notices.ts` (zero imports Node-only) exportando `HOMONYM_HUMAN_REVIEW_NOTICE`, e anexar `lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE` preservando integralmente chaves/valores existentes nos retornos de `executeDatajud`, `executeBnmp`, `executeProcurados` (sem alterar `parseProcuradosHtml`) e `executeCeisCnep` (inclusive retornos de cache e fallback).
5. **Testes Unitários (`test/unit/compliance-lgpd-notice.test.ts`):** cobrir presença e conteúdo LGPD (Art. 20/41/48) em `PRIVACY.md` e `.archagents/10-runbooks.md`, `GET /` (default e `MCP_DPO_CONTACT`) e `generateOpenAPISchema`, e `lgpd_notice` em `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos`.

## Criterios de sucesso

- [x] `PRIVACY.md` criado e `README.md` + `.archagents/10-runbooks.md` atualizados com LGPD Art. 20, Art. 41 e Art. 48.
- [x] `GET /` (`worker.ts`) e `generateOpenAPISchema` (`openapi.ts`) expõem URL da política e contato do DPO.
- [x] `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos` incluem `lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE` preservando todas as chaves existentes.
- [x] `npm run test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit` e `secret-scan.sh` passam integralmente.

## Rollback

Reverter o commit da branch `feat/TCK-0033-lgpd-privacy-dpo-homonym-notice` (`git revert <sha>`) ou restaurar os arquivos modificados e remover `PRIVACY.md`, `lib/shared/compliance-notices.ts` e `test/unit/compliance-lgpd-notice.test.ts`; nenhuma migração de banco, schema persistente ou infraestrutura é alterada.
