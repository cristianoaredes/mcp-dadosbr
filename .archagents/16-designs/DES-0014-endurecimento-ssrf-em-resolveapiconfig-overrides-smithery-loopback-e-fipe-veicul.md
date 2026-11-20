---
id: DES-0014
slug: endurecimento-ssrf-em-resolveapiconfig-overrides-smithery-loopback-e-fipe-veicul
title: "Endurecimento SSRF em resolveApiConfig(overrides), Smithery, loopback e fipe_veiculos"
created_at: 2026-11-20T16:27:12Z
status: approved
ticket: TCK-0014
type: design
scope_files_new:
  - test/unit/smithery-fipe-security.test.ts
scope_files_modified:
  - lib/config/index.ts
  - lib/adapters/smithery.ts
  - lib/tools/financial.ts
  - test/unit/config.test.ts
  - .archagents/07-security-compliance.md
scope_files_deleted: []
blast_radius: medium
security_sensitive: true
playbook: .archagents/16-designs/playbooks/DES-0014-playbook.md
acceptance_delta: unchanged
---
# DES-0014 - Endurecimento SSRF em resolveApiConfig(overrides), Smithery, loopback e fipe_veiculos

## Problema (`FND-0002`)

Quatro brechas inter-relacionadas ampliam a superfície de SSRF e manipulação de URL no servidor MCP:
1. `resolveApiConfig(overrides)` (`lib/config/index.ts:L149-L163`) aplica `overrides` após `loadApiConfiguration()` sem chamar `validateUrl()` nem `normalizeBaseUrl()`, permitindo injetar destinos internos/arbitrários (como `169.254.169.254` ou host atacante) herdando `base.authHeaders`.
2. `lib/adapters/smithery.ts:L8-L35` aceita qualquer `z.string().url()` no `configSchema` e ainda usa default `"https://opencnpj.org/api/v1"`, ausente de `ALLOWED_CNPJ_HOSTS` (`"api.opencnpj.org"`), além de passar `config` direto a `resolveApiConfig(config)`.
3. `ALLOWED_CNPJ_HOSTS` e `ALLOWED_CEP_HOSTS` (`lib/config/index.ts:L17-L35`) incluem `"localhost"` e `"127.0.0.1"` sem restringir ao ambiente de desenvolvimento/teste; o match `endsWith('.' + allowed)` (`L56`) abre `.localhost` / `.127.0.0.1`; não há bloqueio de protocolo não HTTP(S) em loopback (`file://localhost`) nem de credenciais embutidas (`user:pass@`), que também vazam em logs/erros.
4. `executeFipe` (`lib/tools/financial.ts:L74-L83`) interpola `tipo` diretamente em `${FIPE_API}/marcas/v1/${tipo}` sem allowlist nem encoding, possibilitando path traversal para outros endpoints da BrasilAPI.

## Decisões de Design

1. **Allowlists de produção e helper fail-closed para loopback (`lib/config/index.ts`):**
   - Exportar `DEFAULT_CNPJ_URL`, `DEFAULT_CEP_URL`, `ALLOWED_CNPJ_HOSTS` e `ALLOWED_CEP_HOSTS` contendo exclusivamente os hosts públicos HTTPS esperados (sem `localhost`/`127.0.0.1`).
   - Isolar loopback em `DEV_LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1"])` liberado exclusivamente via `isLocalhostAllowed()` quando `process?.env?.NODE_ENV === "development" || process?.env?.NODE_ENV === "test"` — garantindo comportamento **fail-closed** quando `NODE_ENV === "production"` ou quando `NODE_ENV` não está definido (ex.: Cloudflare Workers / `wrangler.toml`), preservando compatibilidade com os testes existentes em Vitest (`NODE_ENV="test"`).
   - Em `validateUrl(url, allowedHosts)`: rejeitar não-string/vazio, rejeitar `parsed.username || parsed.password`, validar em loopback apenas match exato + protocolo `http:`/`https:`, e para não-loopback exigir `https:` e match exato ou subdomínio de `allowedHosts`.
   - Sanitizar URLs em logs e mensagens de erro (`sanitizeUrlForLog`) removendo credenciais embutidas e query strings.
   - Extrair `validateAndNormalizeApiConfig(config)` e invocá-la tanto ao fim de `loadApiConfiguration()` quanto ao fim de `resolveApiConfig(overrides)` (merging explícito de `cnpjBaseUrl`/`cepBaseUrl` definidos e `authHeaders`).
2. **Alinhamento do adaptador Smithery (`lib/adapters/smithery.ts`):**
   - Usar `DEFAULT_CNPJ_URL` (`https://api.opencnpj.org/`), `DEFAULT_CEP_URL` (`https://opencep.com/v1/`), e refinar `configSchema` com `isAllowedCnpjUrl` e `isAllowedCepUrl`; `createServer` continua delegando para `resolveApiConfig(config)` (fail-closed mesmo se chamador pular `configSchema`).
3. **Validação estrita em `fipe_veiculos` (`lib/tools/financial.ts`):**
   - Validar `tipo` contra `ALLOWED_FIPE_TYPES = new Set(["carros", "motos", "caminhoes"])` antes de chamar `httpJson` e usar `encodeURIComponent(tipo)`.
   - Validar `codigo_fipe` trimado com regex estrito `/^[0-9]+(?:-[0-9]+)?$/` antes de chamar `httpJson` e usar `encodeURIComponent(trimmed)`, bloqueando path traversal (`../`) e query/fragment smuggling (`?`, `#`, `%`).

## Threat Model (`T1`–`T5`)

| ID | Ameaça | Vetor / Superfície | Controle / Mitigação | Verificação |
|---|---|---|---|---|
| `T1` | SSRF + exfiltração de `authHeaders` via overrides | `resolveApiConfig({ cnpjBaseUrl: "https://169.254.169.254/..." })` herda `base.authHeaders` sem validar host/HTTPS | `validateAndNormalizeApiConfig(merged)` valida e normaliza `cnpjBaseUrl` e `cepBaseUrl` após o merge em `resolveApiConfig(overrides)` | Testes em `test/unit/config.test.ts` com metadata, host externo, `http://`, string vazia e trailing slash |
| `T2` | SSRF e default inconsistente no adaptador Smithery | `configSchema` aceita qualquer `.url()` ou `createServer({ config })` recebe host interno | `configSchema` refina com `isAllowedCnpjUrl`/`isAllowedCepUrl` e defaults `DEFAULT_CNPJ_URL`/`DEFAULT_CEP_URL`; `createServer` chama `resolveApiConfig(config)` | `test/unit/smithery-fipe-security.test.ts` testando `configSchema.safeParse` e `createServer` |
| `T3` | SSRF em loopback fora de dev/test e bypass via subdomínio/esquema | `NODE_ENV=production` ou `NODE_ENV` ausente (Worker), `evil.localhost`, `foo.127.0.0.1`, `[::1]`, `file://localhost/...` | `isLocalhostAllowed()` só libera loopback exato quando `NODE_ENV === "development" \|\| "test"` e protocolo `http:`/`https:`; allowlists não contêm `localhost`/`127.0.0.1` | Testes explícitos de `NODE_ENV` = `production`, `undefined`, `development`, `test`, `.localhost`, `[::1]` e `file://localhost` |
| `T4` | Confusão de credenciais e vazamento em logs/erros | URL `https://secretUser:secretPass@api.opencnpj.org/` | Rejeição antecipada de `parsed.username \|\| parsed.password` + `sanitizeUrlForLog` omitindo userinfo e query string | Testes verificando rejeição e ausência de `secretUser`/`secretPass` na mensagem de erro |
| `T5` | Path traversal / smuggling em `fipe_veiculos` | `tipo: "../../cnpj/v1/..."`, `tipo: "carros?foo=bar"`, `codigo_fipe: "../../..."` | `ALLOWED_FIPE_TYPES` + regex `/^[0-9]+(?:-[0-9]+)?$/` + `encodeURIComponent` antes de `httpJson` | `test/unit/smithery-fipe-security.test.ts` com spy em `fetch` assegurando zero chamadas em inputs maliciosos |

## Plano de Verificação e Rollback

- **Verificação:** `npx vitest run test/unit/config.test.ts test/unit/smithery-fipe-security.test.ts`, `npm test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json --noEmit`, `npm run build`, `npm run build:worker`, `git diff --check`, `secret-scan.sh`, `verify-run.py`, `criteria-check.py` e revisão adversarial independente em contexto fresco.
- **Rollback:** Todas as alterações ficam isoladas na branch empilhada `bugfix/TCK-0014-ssrf-overrides-smithery-fipe` no worktree; reversível com `git revert <sha>` ou descarte da branch sem afetar `main` nem `TCK-0013`.

## Criterios de sucesso

- [ ] Todos os 3 critérios de `acceptance:` do `TCK-0014` passam via `criteria-check.py`.
- [ ] Zero achados bloqueantes na verificação adversarial independente em contexto fresco e `pipeline-judge.py` aprovado (`overall != REJECTED`, `safety >= 70`).
