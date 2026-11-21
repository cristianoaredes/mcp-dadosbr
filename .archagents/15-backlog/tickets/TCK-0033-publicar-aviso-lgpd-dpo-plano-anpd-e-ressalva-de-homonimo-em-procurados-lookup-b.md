---
id: TCK-0033
slug: publicar-aviso-lgpd-dpo-plano-anpd-e-ressalva-de-homonimo-em-procurados-lookup-b
title: "Publicar aviso LGPD/DPO, plano ANPD e ressalva de homonimo em procurados_lookup/bnmp"
source: audit
created_at: 2026-11-21T13:09:41Z
created_by: ops
updated_at: 2026-11-21T14:02:26Z
status: done
severity: medium
category: compliance-br
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0018
linked_designs:
  - DES-0029
linked_runs:
  - RUN-20261121-134533-tck-0033
linked_verifications:
  - VER-20261121-135811-tck-0033
linked_docs:
  - .archagents/10-runbooks.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance:
  - check: "test -f PRIVACY.md && grep -q \"Art. 20\" PRIVACY.md && grep -q \"Art. 41\" PRIVACY.md && grep -q \"MCP_DPO_CONTACT\" README.md && grep -q \"Art. 48\" .archagents/10-runbooks.md && echo DOCS_COMPLIANCE_OK"
    expect: DOCS_COMPLIANCE_OK
  - check: "npx vitest run test/unit/compliance-lgpd-notice.test.ts && echo COMPLIANCE_TESTS_OK"
    expect: COMPLIANCE_TESTS_OK
  - check: "npm run test && echo FULL_TESTS_OK"
    expect: FULL_TESTS_OK
  - check: "npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit && echo TYPECHECK_OK"
    expect: TYPECHECK_OK
depth_decision:
  workflow: lightweight
  design: lightweight
  verify: completo
  source: routing-classifier
  classified_at: 2026-11-21T13:45:09Z
---
# TCK-0033 - Publicar aviso LGPD/DPO, plano ANPD e ressalva de homonimo em procurados_lookup/bnmp

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0018`** (`compliance-br`, `medium`).

**Problema:** Faltam aviso de privacidade (`PRIVACY.md` / transparência LGPD) e canal do Encarregado/DPO (Art. 41) expostos no `README.md` e em `GET /`, protocolo documentado de notificação de incidentes à ANPD (Art. 48) em runbooks e ressalva padronizada de risco de homônimos e revisão humana (Art. 20) em ferramentas sensíveis (`procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup`, `datajud_processos`).

**Evidências (`a3a2e12`):**
- `lib/tools/legal.ts:L239-L250,L276,L398`
- `lib/workers/worker.ts:L96-L132`
- `lib/workers/openapi.ts:L14-L21`
- `.archagents/07-security-compliance.md:L1-L5`
- `.archagents/10-runbooks.md:L1-L35`

**Mitigação sugerida:**
- Publicar `PRIVACY.md` / aviso LGPD e canal do DPO (Art. 41) no `README.md` e em `GET /` (`worker.ts`).
- Documentar protocolo de notificação à ANPD (Art. 48) em `.archagents/10-runbooks.md`.
- Incluir ressalva explícita de risco de homônimos e necessidade de revisão humana (Art. 20) em `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos`.

## Falsificador

Antes do fix, `lib/tools/legal.ts:L239-L250,L276,L398` retorna resultados de mandados/procurados sem ressalva explícita de homônimo e revisão humana (Art. 20), `lib/workers/worker.ts:L96-L132` / `openapi.ts:L14-L21` não referenciam aviso LGPD/canal DPO (Art. 41) e `.archagents/10-runbooks.md:L1-L35` não contém procedimento de notificação à ANPD (Art. 48).

## Log de transicoes

- 2026-11-21T13:09:41Z - **raw** - criado via scripts/ops/ticket/create.py.
- 2026-11-21T13:45:09Z - **triaged** - triaged in wave 1 parallel remediation [aceite reescrito: 4 critério(s)] [depth_decision do routing-classifier: workflow lightweight, design lightweight, verify completo]
- 2026-11-21T13:45:33Z - **designed** - DES-0029 created
- 2026-11-21T13:45:41Z - **executing** - executing TCK-0033
- 2026-11-21T13:51:24Z - **verifying** - implementation and tests passing, ready for P10 verify
- 2026-11-21T14:02:26Z - **done** - P10 verify approved-with-notes (3905ef10) + judge pass
