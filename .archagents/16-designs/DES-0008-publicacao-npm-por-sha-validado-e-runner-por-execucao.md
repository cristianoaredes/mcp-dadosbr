---
id: DES-0008
slug: publicacao-npm-por-sha-validado-e-runner-por-execucao
title: "Publicação npm por SHA validado e runner por execução"
created_at: 2026-11-18T03:19:07Z
status: approved
ticket: TCK-0008
type: design
scope_files_new: []
scope_files_modified: [.github/workflows/ci.yml, .github/workflows/release.yml, package.json, package-lock.json, README.md, CHANGELOG.md, test/integration/transports.mjs, .archagents/06-infra-devops.md, .archagents/10-runbooks.md]
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0008-playbook.md
acceptance_delta: unchanged
---
# DES-0008 — Publicação npm por SHA validado e runner por execução

O CI preserva a matriz Node e a verificação do build Worker. Cada execução recebe um rótulo exclusivo. Publicação dev exige solicitação manual e resultados verdes. O release npm 0.5.0 exige CI bem-sucedido para o SHA de main, um tarball instalado e testado e credencial npm válida. Publicação npm e Cloudflare têm fluxos independentes.

Criar o GitHub Release apontando para o commit testado, com o tarball verificado. O README mantém a instalação pelo código-fonte.
