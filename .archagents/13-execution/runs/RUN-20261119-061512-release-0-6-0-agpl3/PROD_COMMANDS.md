# Comandos manuais de publicação — Release `0.6.0` (`AGPL-3.0-only`)

> **Alçada humana (`SAFETY.md` SC-2 & §ship):** merge em `main`, disparo de publicação no npm, criação de tag `v0.6.0` e GitHub Release nunca são executados automaticamente pelo agente.

## 1. Merge do PR da candidata `0.6.0`

Após o CI do PR passar e revisão humana, faça o merge do PR do `TCK-0010` em `main` pelo GitHub.

## 2. Confirmar CI verde no SHA exato de `main`

Aguarde o workflow `CI/CD Pipeline` (`push` em `main`, runner efêmero `dadosbr-ci-<run_id>` na VPS) concluir com `success` no SHA do merge:

```bash
gh run list --workflow ci.yml --branch main --limit 3
```

Anote o `DATABASE_ID` (`CI_RUN_ID`) do run verde cujo `headSha` coincide exatamente com `origin/main`.

## 3. Disparar publicação no npm (`Publish npm release`)

Garanta o runner efêmero `dadosbr-release-<run_id>` disponível na VPS e dispare o workflow manual informando o `CI_RUN_ID` verificado no passo 2:

```bash
gh workflow run release.yml --ref main -f ci_run_id=<CI_RUN_ID>
gh run list --workflow release.yml --branch main --limit 3
```

O workflow valida o SHA exato do CI, empacota e instala o tarball `0.6.0`, verifica `0.6.0 > 0.5.0`, publica `@aredes.me/mcp-dadosbr@0.6.0` como `latest` no npm e revalida a instalação limpa diretamente do registro.

## 4. Conferir registro npm e criar GitHub Release `v0.6.0`

```bash
npm view @aredes.me/mcp-dadosbr@0.6.0 version license dist.integrity
npm view @aredes.me/mcp-dadosbr dist-tags
```

Com o pacote `0.6.0` publicado sob `AGPL-3.0-only`, crie a tag e o GitHub Release apontando para o mesmo SHA verificado de `main` (opcionalmente anexando o tarball gerado pelo workflow):

```bash
MAIN_SHA=$(git ls-remote origin refs/heads/main | awk '{print $1}')
gh release create v0.6.0 \
  --target "$MAIN_SHA" \
  --title "v0.6.0 — GNU AGPL-3.0 & Orqo README" \
  --notes-file <(awk '/^## \[0\.6\.0\]/,/^## \[0\.5\.0\]/' CHANGELOG.md | sed '$d')
```
