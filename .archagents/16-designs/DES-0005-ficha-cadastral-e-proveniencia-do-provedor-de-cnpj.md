---
id: DES-0005
slug: ficha-cadastral-e-proveniencia-do-provedor-de-cnpj
title: "Ficha cadastral e proveniência do provedor de CNPJ"
created_at: 2026-11-18T02:01:50Z
status: approved
ticket: TCK-0005
type: design
scope_files_new: [apps/cnpj/, lib/shared/cnpj-profile.ts, test/unit/cnpj-app.test.ts]
scope_files_modified: [lib/core/mcp-server.ts, scripts/build-apps.mjs, test/integration/transports.mjs, .github/workflows/ci.yml, README.md]
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0005-playbook.md
acceptance_delta: unchanged
---
# DES-0005 - Ficha cadastral e proveniência do provedor de CNPJ

## Decisão

A ficha projeta os campos de identificação, situação, CNAEs, endereço e proveniência da resposta existente de `cnpj_lookup`. A resposta textual e a validação numérica permanecem as mesmas. A projeção reconhece o resultado plano ou aninhado dos provedores configuráveis e não atribui atualização/fonte quando ausente. Cliente Node oferece o recurso, Worker mantém resposta textual.

## Critérios

Validar a ficha com respostas reais, empate de CNPJ, mudanças no formulário, erros, campos ausentes, fallback e catálogo nos dois transportes. O CI precisa passar na VPS antes do merge.
