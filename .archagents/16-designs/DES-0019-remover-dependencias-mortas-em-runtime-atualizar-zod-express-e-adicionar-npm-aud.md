---
id: DES-0019
slug: remover-dependencias-mortas-em-runtime-atualizar-zod-express-e-adicionar-npm-aud
title: "Remover dependencias mortas em runtime, atualizar zod/express e adicionar npm audit prod no CI"
created_at: 2026-11-20T17:54:56Z
status: approved
ticket: TCK-0021
type: design
scope_files_new:
  - test/unit/dependency-hygiene.test.ts
scope_files_modified:
  - package.json
  - package-lock.json
  - lib/adapters/smithery.ts
  - lib/core/registry.ts
  - lib/core/tool-schemas.ts
  - .github/workflows/ci.yml
  - .archagents/06-infra-devops.md
  - .archagents/07-security-compliance.md
scope_files_deleted:
  - lib/workers/mcp-agent.ts
blast_radius: medium
playbook: .archagents/16-designs/playbooks/DES-0019-playbook.md
acceptance_delta: unchanged
---
# DES-0019 - Remover dependencias mortas em runtime, atualizar zod/express e adicionar npm audit prod no CI

## Problema

`package.json` declara dependências de produção não utilizadas (`agents`, `@smithery/sdk`, `workers-mcp`, `async-mutex`) e mantém `zod@^3.23.8` e `express@^5.0.1` com lockfile defasado, resultando em 20 vulnerabilidades de produção (`0 critical`, `14 high`, `2 moderate`, `4 low`). `lib/workers/mcp-agent.ts` é o único consumidor de `agents/mcp`, mas sua classe `DadosBRMCP` já foi removida em `wrangler.toml:L9` e nenhum módulo vivo o importa. `.github/workflows/ci.yml` não possui gate de `npm audit` para dependências de produção.

## Supply-Chain Threat Model

| ID | Ameaça / Risco | Superfície | Contramedida |
|---|---|---|---|
| T1 | Superfície de ataque desnecessária em produção | `@smithery/sdk`, `workers-mcp`, `async-mutex`, `agents` publicados no pacote npm e expostos a CVEs (`GHSA-r7x9-8ph7-w8cg`, etc.) | Remover as 4 dependências de `package.json` e deletar o arquivo morto `lib/workers/mcp-agent.ts` |
| T2 | CVEs em dependências diretas e transitivas de runtime | `zod@^3.23.8` (`GHSA-mrhx-c7xc-m3w5`), `express`/`path-to-regexp`, `fast-uri`, `ajv`, `uuid` | Atualizar `zod@^4.6.7` e `express@^5.3.0`, adaptar tipagens Zod v4 em `smithery.ts`, `registry.ts` e `tool-schemas.ts`, e executar `npm audit fix --omit=dev` (sem `--force`) se necessário |
| T3 | Reprodutibilidade quebrada / mutação indevida de `$MAIN` | Symlink `WT/node_modules -> MAIN/node_modules` contaminando `$MAIN` ao executar `npm install` | Remover o symlink `$WT/node_modules` ANTES de `npm install`, gerar `node_modules/` isolado em `$WT` e validar com `npm ci` |
| T4 | Regressão silenciosa de CVEs em futuras releases | `.github/workflows/ci.yml` sem gate de auditoria | Adicionar `npm audit --omit=dev --audit-level=high` no job `lint` de `.github/workflows/ci.yml` |
| T5 | Vazamento de artefato morto em `build/` ou `npm pack` | `build/lib/workers/mcp-agent.js` remanescente ou quebra Zod v4 em schemas | Limpar `build/` antes do build final e validar `npm pack --dry-run --json` + suíte completa + `test:transport` |

## Solucao

- Deletar `lib/workers/mcp-agent.ts`; preservar `lib/adapters/smithery.ts` e `lib/index.ts`.
- Limpar `dependencies` em `package.json` mantendo apenas `@modelcontextprotocol/sdk`, `chalk`, `express@^5.3.0`, `tavily` e `zod@^4.6.7` (sem tocar `devDependencies`, escopo de `TCK-0022`).
- Adaptar API Zod v4 em `lib/adapters/smithery.ts` (`z.record(z.string(), z.string())`), `lib/core/registry.ts` (`ZodType`) e `lib/core/tool-schemas.ts` (`ZodType` e `{ error: "..." }` em `FipeSchema`).
- Desfazer symlink `node_modules` na worktree, regenerar `package-lock.json` e `node_modules/` isolados em `$WT` e confirmar `npm ci` e `npm audit --omit=dev --audit-level=high` verdes.
- Adicionar gate `Audit production dependencies` ao `.github/workflows/ci.yml`, criar `test/unit/dependency-hygiene.test.ts` e sincronizar `.archagents/06-infra-devops.md` e `.archagents/07-security-compliance.md`.

## Mudancas

- `lib/workers/mcp-agent.ts` (removido)
- `package.json` & `package-lock.json` (dependências mortas removidas; `zod`/`express` + transitivas atualizadas)
- `lib/adapters/smithery.ts`, `lib/core/registry.ts`, `lib/core/tool-schemas.ts` (compatibilidade Zod v4)
- `.github/workflows/ci.yml` (step `npm audit --omit=dev --audit-level=high`)
- `test/unit/dependency-hygiene.test.ts` (novo)
- `.archagents/06-infra-devops.md` & `.archagents/07-security-compliance.md` (documentação sincronizada)

## Criterios de sucesso

- [ ] `npm audit --omit=dev --audit-level=high && echo AUDIT_PROD_OK` passa sem vulnerabilidades high/critical.
- [ ] `npm test` passa integralmente com Zod v4.
- [ ] `tsc`, `tsc.worker`, `build`, `build:worker`, `test:transport`, `npm ci` e `npm pack --dry-run` passam sem `mcp-agent.js`.
