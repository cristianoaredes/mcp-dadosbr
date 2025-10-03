# GitHub Secrets Setup Guide

> **Guia completo para configurar os secrets necessários no GitHub Actions**

## 📋 Visão Geral

Para que o pipeline de CI/CD funcione corretamente, você precisa configurar os seguintes secrets no GitHub:

| Secret | Obrigatório | Usado em | Descrição |
|--------|-------------|----------|-----------|
| `CLOUDFLARE_API_TOKEN` | ✅ Sim | Deploy Cloudflare | Token de API do Cloudflare com permissões específicas |
| `NPM_TOKEN` | ✅ Sim | Publish NPM | Token de automação do NPM para publicação |
| `GITHUB_TOKEN` | Automático | Release GitHub | Gerado automaticamente pelo GitHub Actions |

---

## 🔑 1. Cloudflare API Token

### Por que é necessário?

O token permite que o GitHub Actions faça deploy do worker no Cloudflare Workers automaticamente.

### Permissões Necessárias

⚠️ **IMPORTANTE**: O token DEVE ter TODAS estas permissões:

| Recurso | Permissão | Tipo | Crítico |
|---------|-----------|------|---------|
| **Account** | Workers Scripts | Edit | ✅ |
| **Account** | Workers KV Storage | Edit | ✅ |
| **Account** | Account Settings | Read | ✅ |
| **User** | User Details | Read | ⭐ **SIM** |
| **User** | Memberships | Read | ⭐ **SIM** |

> 💡 A permissão `User Details:Read` é essencial. Sem ela, você verá o erro:
> ```
> Authentication error [code: 10000]
> Unable to retrieve email for this user. Are you missing the 
> `User->User Details->Read` permission?
> ```

### Passo a Passo: Criar Token

1. **Acesse o Cloudflare Dashboard**
   ```
   https://dash.cloudflare.com/profile/api-tokens
   ```

2. **Clique em "Create Token"**

3. **Escolha "Create Custom Token"**
   - Não use templates prontos, eles não têm todas as permissões

4. **Configure o Token**

   **Nome do Token**: (sugestão)
   ```
   GitHub Actions - MCP DadosBR Deploy
   ```

   **Permissions**:
   ```
   Account → Workers Scripts → Edit
   Account → Workers KV Storage → Edit
   Account → Account Settings → Read
   User → User Details → Read
   User → Memberships → Read
   ```

   **Account Resources**:
   ```
   Include → [Selecione sua conta Cloudflare]
   ```

   **Zone Resources**: (opcional)
   ```
   All zones
   ```
   ou
   ```
   Specific zone → aredes.me
   ```

   **Client IP Address Filtering**: (opcional, para mais segurança)
   ```
   # IPs do GitHub Actions (adicione se quiser restringir)
   # Veja: https://api.github.com/meta
   ```

   **TTL** (Time to Live):
   ```
   # Opções:
   - No expiration (recomendado para CI/CD)
   - Custom expiration (se sua org requer rotação de tokens)
   ```

5. **Continue to summary**
   - Revise todas as permissões
   - Confirme que `User Details:Read` está presente

6. **Create Token**
   - Copie o token imediatamente
   - Formato: `1234567890abcdef1234567890abcdef1234567890`
   - ⚠️ **Ele só é mostrado UMA VEZ!**

7. **Salve com segurança**
   - Use um gerenciador de senhas
   - Ou adicione diretamente no GitHub (próximo passo)

### Passo a Passo: Adicionar ao GitHub

1. **Acesse seu repositório no GitHub**
   ```
   https://github.com/SEU_USUARIO/mcp-dadosbr
   ```

2. **Vá para Settings → Secrets and variables → Actions**
   ```
   https://github.com/SEU_USUARIO/mcp-dadosbr/settings/secrets/actions
   ```

3. **Clique em "New repository secret"**

4. **Preencha**:
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Secret**: Cole o token do Cloudflare
   
5. **Clique em "Add secret"**

### Validação

**Teste local** (opcional):
```bash
# Configure o token temporariamente
export CLOUDFLARE_API_TOKEN="seu-token-aqui"

# Verifique se funciona
npx wrangler whoami

# Output esperado:
# ✅ You are logged in with an API Token, associated with the email...
# ┌─────────────────────────────────┬──────────────────────────────────┐
# │ Account Name                     │ Account ID                       │
# ├─────────────────────────────────┼──────────────────────────────────┤
# │ Seu Nome                         │ abc123...                        │
# └─────────────────────────────────┴──────────────────────────────────┘
```

---

## 📦 2. NPM Token

### Por que é necessário?

Permite que o GitHub Actions publique automaticamente novas versões no NPM Registry.

### Tipo de Token

Use token do tipo **Automation** (recomendado para CI/CD):
- Não expira automaticamente
- Pode fazer publish
- Sem 2FA challenges

### Passo a Passo: Criar Token

1. **Acesse NPM**
   ```
   https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   ```

2. **Clique em "Generate New Token"**

3. **Escolha o tipo**:
   - Selecione: **Automation**
   
4. **Configure o token**:
   
   **Token name**: (sugestão)
   ```
   GitHub Actions - MCP DadosBR Publish
   ```

   **Expiration**: (opcional)
   ```
   No expiration  # Recomendado para CI/CD
   ```
   ou
   ```
   Custom expiration  # Se sua org requer rotação
   ```

5. **Generate Token**
   - Copie o token
   - Formato: `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Verificar Permissões no Escopo

Se estiver publicando scoped package (`@aredes.me/mcp-dadosbr`):

```bash
# Verificar se você tem acesso ao escopo
npm access ls-packages @aredes.me

# Output esperado:
# {
#   "@aredes.me/mcp-dadosbr": "read-write"
# }

# Se não tiver acesso, peça ao owner do escopo para adicionar você:
npm owner add SEU_USERNAME @aredes.me/mcp-dadosbr
```

### Passo a Passo: Adicionar ao GitHub

1. **Acesse Settings → Secrets → Actions**
   ```
   https://github.com/SEU_USUARIO/mcp-dadosbr/settings/secrets/actions
   ```

2. **New repository secret**

3. **Preencha**:
   - **Name**: `NPM_TOKEN`
   - **Secret**: Cole o token do NPM

4. **Add secret**

### Validação

**Teste local** (opcional):
```bash
# Configure o token
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc

# Teste (dry-run, não publica de verdade)
npm publish --dry-run

# Output esperado:
# npm notice package: @aredes.me/mcp-dadosbr@0.3.1
# npm notice === Tarball Contents ===
# npm notice 1.2kB  package.json
# npm notice 3.4kB  README.md
# ...
# npm notice Publishing to https://registry.npmjs.org/ with tag latest
```

---

## 🤖 3. GITHUB_TOKEN (Automático)

### O que é?

Token gerado automaticamente pelo GitHub Actions para cada workflow run.

### Quando é usado?

- Criar GitHub Releases
- Fazer commits automáticos (changelog, version bumps)
- Fazer push de tags
- Comentar em issues/PRs

### Permissões

Já está configurado no workflow com as permissões corretas:

```yaml
permissions:
  contents: write      # Para criar releases e fazer commits
  packages: write      # Para publicar packages
  id-token: write      # Para autenticação
```

### ✅ Não precisa configurar!

O `GITHUB_TOKEN` é injetado automaticamente. Você vai vê-lo nos workflows como:

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## ✅ Checklist Final

Antes de fazer um release, verifique:

### Cloudflare API Token
- [ ] Token criado no Cloudflare Dashboard
- [ ] Permissão `Workers Scripts:Edit` ✅
- [ ] Permissão `Workers KV Storage:Edit` ✅
- [ ] Permissão `User Details:Read` ✅ **CRÍTICO**
- [ ] Secret `CLOUDFLARE_API_TOKEN` adicionado no GitHub
- [ ] Testado com `wrangler whoami` (opcional)

### NPM Token
- [ ] Token criado no NPM (tipo: Automation)
- [ ] Acesso ao escopo `@aredes.me` verificado
- [ ] Secret `NPM_TOKEN` adicionado no GitHub
- [ ] Testado com `npm publish --dry-run` (opcional)

### Repository Settings
- [ ] Workflows habilitados em Settings → Actions → General
- [ ] Permissões de workflow configuradas:
  ```
  Workflow permissions: Read and write permissions ✅
  Allow GitHub Actions to create and approve pull requests ✅
  ```

### Package Configuration
- [ ] `package.json` tem `publishConfig.access: "public"`
- [ ] Versão no `package.json` corresponde à tag que será criada
- [ ] `.npmignore` configurado corretamente

---

## 🔄 Rotação de Tokens (Boas Práticas)

### Quando Rotacionar

- **Cloudflare**: A cada 90-180 dias (ou conforme política da empresa)
- **NPM**: A cada 180-365 dias (ou se comprometido)

### Como Rotacionar

1. **Criar novo token** (mesmas permissões)
2. **Atualizar GitHub Secret**:
   ```
   Settings → Secrets → Actions → [Nome do Secret] → Update
   ```
3. **Testar com workflow manual**
4. **Revogar token antigo** (só depois de confirmar que novo funciona)

### Automação (Opcional)

Para organizações, considere:
- Usar GitHub Secrets no nível de **Organization** (compartilhado entre repos)
- Implementar rotação automática com scripts
- Usar vault services (HashiCorp Vault, AWS Secrets Manager, etc.)

---

## 🚨 Troubleshooting

### Erro: "Secret not found"

**Sintoma**:
```yaml
Error: Input required and not supplied: apiToken
```

**Causa**: Secret não foi configurado ou nome está errado

**Solução**:
1. Verifique se secret existe: Settings → Secrets → Actions
2. Confirme que o nome é exatamente `CLOUDFLARE_API_TOKEN` (case-sensitive)
3. Re-run o workflow após adicionar o secret

### Erro: "Authentication failed" (Cloudflare)

**Sintoma**:
```
Authentication error [code: 10000]
```

**Causa**: Token sem permissão `User Details:Read`

**Solução**: Veja [CICD_TROUBLESHOOTING.md](./CICD_TROUBLESHOOTING.md#erro-de-autenticação-cloudflare)

### Erro: "403 Forbidden" (NPM)

**Sintoma**:
```
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@aredes.me%2fmcp-dadosbr
```

**Causa**: Token inválido ou sem permissão no escopo

**Soluções**:
1. Verificar se token é do tipo **Automation**
2. Verificar acesso ao escopo: `npm access ls-packages @aredes.me`
3. Regenerar token se necessário

### Secret não está sendo usado

**Sintoma**: Workflow não usa o secret configurado

**Causa**: Sintaxe incorreta no workflow

**Correto**:
```yaml
- name: Deploy to Cloudflare
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}  # ✅
```

**Errado**:
```yaml
    apiToken: $CLOUDFLARE_API_TOKEN  # ❌ Faltam ${{ secrets. }}
    apiToken: ${secrets.CLOUDFLARE_API_TOKEN}  # ❌ Sintaxe errada
```

---

## 📚 Recursos Adicionais

### Documentação Oficial

- **GitHub Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Cloudflare API Tokens**: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- **NPM Tokens**: https://docs.npmjs.com/creating-and-viewing-access-tokens
- **Wrangler CI/CD**: https://developers.cloudflare.com/workers/wrangler/ci-cd/

### Documentação do Projeto

- **[CI/CD Troubleshooting](./CICD_TROUBLESHOOTING.md)**: Soluções para erros comuns
- **[Release Guide](../RELEASING.md)**: Processo completo de release
- **[Contributing](../CONTRIBUTING.md)**: Como contribuir

### Ferramentas Úteis

```bash
# GitHub CLI (gerenciar secrets)
gh secret list
gh secret set CLOUDFLARE_API_TOKEN < token.txt

# Verificar tokens
npx wrangler whoami
npm whoami
```

---

## 🔐 Segurança

### ✅ Boas Práticas

- ✅ Use tokens com permissões mínimas necessárias
- ✅ Configure TTL/expiração quando possível
- ✅ Monitore uso dos tokens (audit logs)
- ✅ Revogue tokens antigos/não usados
- ✅ Nunca comite tokens no código (use .env em .gitignore)
- ✅ Use Organization Secrets para múltiplos repos

### ❌ Nunca Faça

- ❌ Compartilhe tokens em chat/email
- ❌ Use tokens pessoais em produção
- ❌ Dê permissões além do necessário
- ❌ Mantenha tokens sem expiração indefinidamente
- ❌ Reutilize tokens entre ambientes (dev/prod)

---

**Última atualização**: Outubro 2025  
**Versão**: 1.0.0

**Precisa de ajuda?** Abra uma issue: https://github.com/cristianoaredes/mcp-dadosbr/issues
