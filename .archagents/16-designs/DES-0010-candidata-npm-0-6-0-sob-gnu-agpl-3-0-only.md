---
id: DES-0010
slug: candidata-npm-0-6-0-sob-gnu-agpl-3-0-only
title: "Candidata npm 0.6.0 sob GNU AGPL-3.0-only"
created_at: 2026-11-19T06:14:30Z
status: approved
ticket: TCK-0010
type: design
scope_files_new: []
scope_files_modified:
  - package.json
  - package-lock.json
  - smithery.yaml
  - CHANGELOG.md
  - README.md
  - NOTICE.md
  - .archagents/00-overview.md
  - .archagents/_meta.json
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0010-playbook.md
acceptance_delta: unchanged
---
# DES-0010 - Candidata npm 0.6.0 sob GNU AGPL-3.0-only

## Problema

O PR #21 (`TCK-0009`) migrou o repositório para `AGPL-3.0-only`, mas `package.json:3` e `package-lock.json:3,9` ainda declaram `0.5.0` (versão já publicada no npm sob licença MIT) e `smithery.yaml:5` ainda declara `0.3.1`. Publicar o primeiro pacote npm sob `AGPL-3.0-only` exige versão nova acima de `0.5.0` com changelog, manifestos consistentes e prova de instalação limpa do tarball.

## Solução

- Adotar bump SemVer minor para **`0.6.0`** (em vez de patch `0.5.1`), evitando que consumidores com `^0.5.0` recebam uma mudança de licença MIT → `AGPL-3.0-only` automaticamente, e satisfazendo a guarda SemVer de `.github/workflows/release.yml` (`0.6.0 > 0.5.0`).
- Atualizar `version` para `0.6.0` em `package.json`, `package-lock.json` (`version` e `packages[""].version`) e `smithery.yaml`.
- Registrar `## [0.6.0] - 2026-11-19` em `CHANGELOG.md` destacando a mudança de licença para `AGPL-3.0-only` (`LICENSE` verbatim + `NOTICE.md`), a reescrita do `README.md` no padrão Orqo e a sincronização documental AS-IS.
- Alinhar a nota de transição de licença em `NOTICE.md` e `README.md` (`<= 0.5.0` sob MIT; `0.6.0+` sob `AGPL-3.0-only`), sem afirmar que `0.6.0` já está publicado no npm antes da execução real do workflow de release.
- Atualizar `.archagents/00-overview.md` e `.archagents/_meta.json` (`package.json` `sha1`).
- Validar a candidata empacotando `0.6.0` com `npm pack`, instalando o tarball em diretório temporário limpo e executando `npm run test:transport` sobre o binário instalado (espelhando `.github/workflows/release.yml:L64-L70`).

## Alternativas consideradas e recusadas

- **Bump patch `0.5.1`:** recusado — em SemVer `0.x.y`, `^0.5.0` aceita `0.5.1`, o que relicenciaria silenciosamente consumidores MIT para `AGPL-3.0-only`.

## Mudanças

- `package.json`, `package-lock.json`, `smithery.yaml` (`0.6.0`)
- `CHANGELOG.md` (nova seção `0.6.0`)
- `README.md`, `NOTICE.md` (nota de transição `0.5.0` → `0.6.0`)
- `.archagents/00-overview.md`, `.archagents/_meta.json`

## Critérios de sucesso

- [ ] Todos os manifestos e `CHANGELOG.md` consistentes em `0.6.0` / `AGPL-3.0-only`.
- [ ] `npm ci`, `npm run build`, `npm test`, `npm run test:transport`, `npm run build:worker` e instalação limpa do tarball `0.6.0` aprovados.
- [ ] Verificação independente em contexto limpo aprova a candidata sem bloqueadores.
