---
status: completed
run_id: RUN-20261121-134533-tck-0033
ticket: TCK-0033
design: DES-0029
start_time: 2026-11-21T13:45:33Z
end_time: 2026-11-21T14:01:14Z
environment: dev
mode: live
operator: ops
commits: []
files_modified:
  - PRIVACY.md
  - README.md
  - .archagents/10-runbooks.md
  - lib/workers/worker.ts
  - lib/workers/openapi.ts
  - lib/shared/compliance-notices.ts
  - lib/tools/legal.ts
  - lib/tools/government.ts
  - test/unit/compliance-lgpd-notice.test.ts
test_result:
  status: pass
  summary: "5/5 targeted (test/unit/compliance-lgpd-notice.test.ts), 447/447 Vitest (32 files), V8 coverage 91.38% stmts / 83.75% branch / 93.26% funcs / 92.11% lines, tsc + tsc.worker exit 0, secret-scan clean"
---
# RUN-20261121-134533-tck-0033 - TCK-0033 (`FND-0018`)

## Resumo executivo

Execução completa da remediação de compliance LGPD (`FND-0018` / `DES-0029`):

1. **`PRIVACY.md` e `README.md`**: publicada política de privacidade detalhando escopo de fontes públicas consultadas sob demanda, princípios e bases legais para operadores (LGPD Art. 6º I/III/V e Art. 7º), direitos do titular (Art. 18) e diferença entre repasse efêmero e cache em memória/`MCP_CACHE` KV, transparência sobre provedores externos (Tavily, Perplexity e Cloudflare Workers), salvaguardas contra homônimos e decisões automatizadas (Art. 20) e canal do Encarregado / DPO (Art. 41) configurável via `MCP_DPO_CONTACT` + canais do repositório (sem e-mail pessoal inventado). Adicionada seção `## Privacidade e LGPD` em `README.md`.
2. **`.archagents/10-runbooks.md`**: adicionada seção `## Resposta a Incidentes de Segurança e Notificação à ANPD (LGPD Art. 48)` cobrindo triagem, contenção, preservação de evidências, avaliação de risco/dano aos titulares, comunicação à ANPD e aos titulares conforme Resolução CD/ANPD nº 15/2024 e post-mortem.
3. **`lib/workers/worker.ts` e `lib/workers/openapi.ts`**: adicionado objeto `privacy` (`policy` + `dpo_contact` lendo `env.MCP_DPO_CONTACT` com fallback `'See PRIVACY.md (LGPD Art. 41)'`) na resposta de `GET /` (sem editar `lib/adapters/cloudflare.ts`) e adicionados `info.contact` + `info['x-privacy-policy']` em `generateOpenAPISchema()`.
4. **`lib/shared/compliance-notices.ts`, `lib/tools/legal.ts` e `lib/tools/government.ts`**: criado módulo Web-standard (zero imports Node-only) exportando `HOMONYM_HUMAN_REVIEW_NOTICE` e `attachLgpdNotice()`, anexando `lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE` nos retornos (inclusive cache hits e fallbacks) de `executeDatajud`, `executeBnmp`, `executeProcurados` (sem alterar `parseProcuradosHtml`) e `executeCeisCnep`, preservando todas as chaves e valores existentes.
5. **`test/unit/compliance-lgpd-notice.test.ts`**: criada suíte unitária cobrindo documentação LGPD/ANPD, `GET /` (default, whitespace e `MCP_DPO_CONTACT`), `generateOpenAPISchema`, módulo Web-standard e `lgpd_notice` em `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos`.

## Evidence Gate

| Check | Esperado | Obtido | Status |
|---|---|---|---|
| `test -f PRIVACY.md && grep -q "Art. 20" PRIVACY.md && grep -q "Art. 41" PRIVACY.md && grep -q "MCP_DPO_CONTACT" README.md && grep -q "Art. 48" .archagents/10-runbooks.md && echo DOCS_COMPLIANCE_OK` | `DOCS_COMPLIANCE_OK` | `DOCS_COMPLIANCE_OK` | PASS |
| `npx vitest run test/unit/compliance-lgpd-notice.test.ts && echo COMPLIANCE_TESTS_OK` | `COMPLIANCE_TESTS_OK` | `Test Files 1 passed (1), Tests 5 passed (5)` (`COMPLIANCE_TESTS_OK`) | PASS |
| `npm run test && echo FULL_TESTS_OK` | `FULL_TESTS_OK` | `Test Files 32 passed (32), Tests 447 passed (447)` (`FULL_TESTS_OK`) | PASS |
| `npm run test:coverage` | `>= 85/85/80/85` | `91.38% Stmts \| 83.75% Branch \| 93.26% Funcs \| 92.11% Lines` (32 files, 447 tests) | PASS |
| `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK` | `TYPECHECK_OK` | Exit `0` (`TYPECHECK_OK`) | PASS |
| `git ls-files lib apps scripts infra .github \| xargs bash "$CBOPS/secret-scan.sh"` (+ arquivos novos) | `No secrets detected` | `✅ No secrets detected.` (ambas execuções) | PASS |
| `python3 "$CBOPS/cbctl.py" learn consult TCK-0033 --run RUN-20261121-134533-tck-0033` | Advisory lessons | `1 lição(ões) [cross-ticket (advisory)]: Precisou de 2 iterações (re-execução)` | OK |
