---
id: TCK-0031
slug: documentar-transferencia-internacional-lgpd-e-adicionar-opt-out-de-pii-de-socios
title: "Documentar transferencia internacional LGPD e adicionar opt-out de PII de socios (QSA) em OSINT"
source: audit
created_at: 2026-11-21T13:09:40Z
created_by: ops
updated_at: 2026-11-21T13:09:40Z
status: raw
severity: medium
category: compliance-br
effort: M
flow: normal
ceremony: full
business_impact: ""
linked_findings:
  - FND-0016
linked_designs: []
linked_runs: []
linked_verifications: []
linked_docs:
  - .archagents/07-security-compliance.md
external_refs: []
external_sync: []
blocks: []
blocked_by: []
related: []
acceptance: []
---
# TCK-0031 - Documentar transferencia internacional LGPD e adicionar opt-out de PII de socios (QSA) em OSINT

## Contexto

Criado via `scripts/ops/ticket/create.py` a partir de `source=audit` (re-auditoria pós-remediação na revisão `a3a2e12`, `--compliance`), vinculado a **`FND-0016`** (`compliance-br`, `medium`).

**Problema:** Fluxos de OSINT/inteligência enviam dorks nominais de sócios (QSA/redes sociais) para provedores de busca externos (Tavily, Perplexity) sem flag de opt-out/opt-in dedicada, e a documentação não explicita o enquadramento de transferência internacional de dados (LGPD Art. 33) envolvendo Tavily, Perplexity e Cloudflare.

**Evidências (`a3a2e12`):**
- `lib/core/dork-templates.ts:L180-L203,L279-L292,L447-L465`
- `lib/core/intelligence.ts:L263-L323`
- `lib/core/search-providers.ts:L79-L86,L168-L188`
- `lib/tools/company.ts:L202-L204`
- `lib/tools/osint.ts:L29,L53,L74,L84`
- `README.md:L117-L119,L284-L295`

**Mitigação sugerida:**
- Documentar transferência internacional de dados (LGPD Art. 33) para Tavily, Perplexity e Cloudflare.
- Adicionar flag/configuração para desabilitar dorks nominais de sócios (`partners`/`social_media`) ou exigir opt-in explícito.

## Falsificador

Antes do fix, `lib/core/dork-templates.ts:L180-L203,L279-L292,L447-L465`, `lib/core/intelligence.ts:L263-L323` e `lib/core/search-providers.ts:L79-L86,L168-L188` constroem e disparam queries nominais de sócios a provedores externos sem opt-out/opt-in dedicado, e `README.md:L117-L119,L284-L295` omite documentação de transferência internacional LGPD Art. 33.

## Log de transicoes

- 2026-11-21T13:09:40Z - **raw** - criado via scripts/ops/ticket/create.py.
