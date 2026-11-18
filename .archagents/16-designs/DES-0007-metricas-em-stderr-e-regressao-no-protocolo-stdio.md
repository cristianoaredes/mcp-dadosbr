---
id: DES-0007
slug: metricas-em-stderr-e-regressao-no-protocolo-stdio
title: "Métricas em stderr e regressão no protocolo stdio"
created_at: 2026-11-18T03:13:25Z
status: approved
ticket: TCK-0007
type: design
scope_files_new: []
scope_files_modified: [lib/core/tools.ts, test/integration/transports.mjs]
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0007-playbook.md
acceptance_delta: unchanged
---
# DES-0007 — Métricas em stderr e regressão no protocolo stdio

O stdout do servidor Node em stdio é o fluxo JSON-RPC. Redirecionar a métrica de diagnóstico para stderr conserva a mensagem e libera o stdout para o protocolo.

Exercitar 101 chamadas locais de validação de CPF via cliente MCP real. Detectar todo erro de transporte e verificar o resultado das chamadas. Confirmar a falha antes da correção e aprovação após recompilar.
