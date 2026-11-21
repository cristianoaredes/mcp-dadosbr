---
ticket: TCK-0025
scope: TCK-0013..TCK-0029
run_id: RUN-20261120-210540-tck-0025
verify_id: VER-20261120-211659-tck-0025
prr_id: PRR-0029
checked_at: "2026-11-21T12:48:15Z"
status: pass
---
# Ship Gate — TCK-0013..TCK-0029 (`RUN-20261120-210540-tck-0025`)

1. **Verify approved:** PASS — [`VER-20261120-211659-tck-0025.md`](file:///Users/cristiano/workspace/aredes/projetos/mcp-servers/.worktrees/audit-remediation/.archagents/14-verify/reports/VER-20261120-211659-tck-0025.md) (`approved-with-notes`, contexto `fresh`, `verified_by: subagent-fresh-context-7d38a097`), e VER reports equivalentes presentes para todos os tickets `TCK-0013`–`TCK-0029`.
2. **Zero secrets:** PASS — `bash "$CBOPS/secret-scan.sh"` executado em cada commit empilhado (`5414f6e`..`5426e92`) e no commit do Ship Gate; nenhuma credencial real exposta.
3. **Compliance:** N/A no escopo atual (`compliance_required` ausente nos tickets `TCK-0013`–`TCK-0029`; auditoria `--compliance` agendada pós-merge conforme solicitação do operador).
4. **Docs sync:** PASS — `.archagents/{00-overview,02-architecture,03-modules,05-integrations,06-infra-devops,07-security-compliance,08-conventions,10-runbooks}.md`, `ADR-0001`, `ADR-0002`, `_meta.json` (`29/29 done`, `active_runs: 0`, `health_score: 60.0`) e `.index.db` sincronizados. `ops/validate.py --root "$WT" --json` = **`8/8 ok: true`**.
5. **Critérios de sucesso:** PASS — `criteria-check.py` **`4/4 pass`** em `TCK-0025` e checklist de `DES-0028` / `DES-0028-playbook.md` atendido.
6. **Auto-approval check (informativo, GAP-005/TCK-0418):** N/A (`auto-approve.py` retornou `ERROR: Ticket não encontrado: TCK-0025` ao procurar tickets a partir do diretório de instalação da skill em vez de `CBOPS_REPO_ROOT`); merge em `main`, tags e release permanecem humanos (`SAFETY.md §ship`).
7. **Suite-green gate:** PASS (fresco em `2026-11-21T12:48Z`):
   - `npm run test`: `31` arquivos, **`442/442`** testes passando.
   - `npm run test:coverage`: **`91.32% Stmts | 83.57% Branch | 93.25% Funcs | 92.09% Lines`** (acima do ratchet `85/85/80/85`).
   - `npx tsc --noEmit && npx tsc -p tsconfig.worker.json --noEmit`: exit `0`.
   - `npm run build && npm run build:worker && npm run test:transport`: exit `0` (`23` tools em `stdio` e `HTTP/SSE`, `5` MCP Apps, `101` chamadas `stdio` sem erro).
   - `npm audit --omit=dev --audit-level=high`: exit `0` (`found 0 vulnerabilities`).
8. **Agentic-security & Allowlist (`SC-9`):** PASS — `.archagents/_capabilities.json` e `.archagents/mcp-tool-allowlist.json` presentes cobrindo as 23 ferramentas registradas com validação Zod `.safeParse()` em `lib/core/registry.ts`. (Nota: `apply-heuristic.py` do skill instalado procura heurísticas em `core/02-intake/heuristics/`, enquanto o arquivo `02-intake/heuristics/agentic-security.md` existe no skill; auditoria dedicada seguirá pós-merge via `/ops-audit --compliance`.)
9. **Post-Release Report (`PRR-0029`):** PASS — [`.archagents/17-observability/post-release/PRR-0029.md`](file:///Users/cristiano/workspace/aredes/projetos/mcp-servers/.worktrees/audit-remediation/.archagents/17-observability/post-release/PRR-0029.md) gerado; métricas de produção pendentes da janela pós-merge/deploy (*a confirmar* em runtime remoto).
