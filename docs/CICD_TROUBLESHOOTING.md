# CI/CD Troubleshooting Guide

> **Soluções para problemas comuns no pipeline de CI/CD do MCP DadosBR**

## 📋 Índice

- [Erro de Autenticação Cloudflare](#erro-de-autenticação-cloudflare)
- [Falhas no Build do Worker](#falhas-no-build-do-worker)
- [Problemas de Publicação NPM](#problemas-de-publicação-npm)
- [Erros de Release GitHub](#erros-de-release-github)

---

## 🔴 Erro de Autenticação Cloudflare

### Sintoma

```
✘ [ERROR] A request to the Cloudflare API (/memberships) failed.
  Authentication error [code: 10000]

📎 It looks like you are authenticating Wrangler via a custom API token 
   set in an environment variable.
   Please ensure it has the correct permissions for this operation.

👋 You are logged in with an User API Token. 
   Unable to retrieve email for this user. 
   Are you missing the `User->User Details->Read` permission?
```

### Causa Raiz

O **API Token do Cloudflare** configurado no GitHub Secrets não possui a permissão `User Details:Read`, que é necessária para o Wrangler autenticar e fazer deploy.

### ✅ Solução

#### Passo 1: Criar Novo API Token (Recomendado)

1. **Acesse o Cloudflare Dashboard**:
   - URL: https://dash.cloudflare.com/profile/api-tokens

2. **Crie um novo token**:
   - Clique em **"Create Token"**
   - Escolha **"Create Custom Token"**

3. **Configure as permissões necessárias**:

   | Permissão | Recurso | Acesso |
   |-----------|---------|--------|
   | Account | Workers Scripts | Edit |
   | Account | Workers KV Storage | Edit |
   | User | User Details | Read |

4. **Defina o escopo**:
   - **Account Resources**: Selecione sua conta Cloudflare
   - **Zone Resources**: All zones (ou específico se preferir)

5. **Configurações adicionais** (opcional):
   - **IP Filtering**: Adicione IPs do GitHub Actions se quiser restringir
   - **TTL**: Defina validade do token (ou deixe sem expiração)

6. **Copie o token gerado**:
   ```
   Exemplo: 1234567890abcdef1234567890abcdef1234567890
   ```
   ⚠️ **IMPORTANTE**: Salve o token imediatamente, ele só é mostrado uma vez!

#### Passo 2: Atualizar GitHub Secret

1. **Acesse as configurações do repositório**:
   - Vá para: `https://github.com/SEU_USUARIO/mcp-dadosbr/settings/secrets/actions`

2. **Atualize o secret existente**:
   - Encontre `CLOUDFLARE_API_TOKEN`
   - Clique em **"Update"**
   - Cole o novo token
   - Clique em **"Update secret"**

   **OU crie novo se não existir**:
   - Clique em **"New repository secret"**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: Cole o token
   - Clique em **"Add secret"**

#### Passo 3: Verificar a Configuração

1. **Teste localmente** (opcional):
   ```bash
   # Configure o token localmente
   export CLOUDFLARE_API_TOKEN="seu-token-aqui"
   
   # Teste o wrangler
   npx wrangler whoami
   
   # Deve mostrar:
   # ✅ You are logged in with an API Token
   # ┌─────────────────────────────────┬──────────────────────────────────┐
   # │ Account Name                     │ Account ID                       │
   # ├─────────────────────────────────┼──────────────────────────────────┤
   # │ Seu Nome / Empresa              │ abc123...                        │
   # └─────────────────────────────────┴──────────────────────────────────┘
   ```

2. **Disparar workflow manualmente**:
   - Vá para: `Actions` → `Deploy to Cloudflare Workers`
   - Clique em **"Run workflow"**
   - Selecione environment: `staging` ou `production`
   - Clique em **"Run workflow"**

3. **Verificar se deploy passou**:
   - O job deve completar sem erros de autenticação
   - Verifique o endpoint: https://mcp-dadosbr.aredes.me/health

### 🔧 Solução Alternativa: Editar Token Existente

Se você já tem um token e quer apenas adicionar a permissão:

1. Acesse: https://dash.cloudflare.com/profile/api-tokens
2. Encontre o token atual (pelo nome ou últimos 4 dígitos)
3. Clique em **"Edit"**
4. Em **Permissions**, adicione:
   - **User** → **User Details** → **Read**
5. Clique em **"Continue to summary"**
6. Clique em **"Update Token"**
7. **NÃO precisa atualizar o GitHub Secret** (token permanece o mesmo)

### 📝 Checklist de Verificação

- [ ] Token tem permissão `Workers Scripts:Edit`
- [ ] Token tem permissão `Workers KV Storage:Edit`
- [ ] Token tem permissão `User Details:Read` ⭐ **CRÍTICO**
- [ ] Secret `CLOUDFLARE_API_TOKEN` está configurado no GitHub
- [ ] Token não está expirado
- [ ] Conta Cloudflare tem Workers habilitado

---

## 🔴 Falhas no Build do Worker

### Sintoma

```
❌ Worker build failed - dist/worker.js not found
```

### Causas Possíveis

1. **Caminho de output incorreto**: `tsconfig.worker.json` com `outDir` errado
2. **Imports com extensão errada**: ESM requer `.js` extension
3. **Dependências incompatíveis**: Packages que não funcionam no Workers runtime

### ✅ Soluções

#### 1. Verificar TypeScript Config

**Arquivo: `tsconfig.worker.json`**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./build",           // ✅ Correto
    "lib": ["ES2022", "WebWorker"],
    "types": ["@cloudflare/workers-types"],
    "module": "ES2022",
    "moduleResolution": "bundler"
  },
  "include": ["lib/**/*"]
}
```

**Verificar no `wrangler.toml`**:
```toml
main = "build/lib/workers/worker.js"  # ✅ Deve corresponder ao outDir
```

#### 2. Corrigir Imports (ESM)

❌ **Errado**:
```typescript
import { something } from './file';     // Sem extensão
import { other } from './file.ts';      // Extensão .ts
```

✅ **Correto**:
```typescript
import { something } from './file.js';  // Extensão .js (ESM)
import { other } from './file.js';
```

#### 3. Build Local para Debugging

```bash
# Limpar build anterior
rm -rf build/ dist/

# Build para Workers
npm run build:worker

# Verificar output
ls -la build/lib/workers/

# Deve mostrar:
# worker.js
# worker.d.ts (se declarationMap: true)

# Testar localmente
npx wrangler dev
```

---

## 🔴 Problemas de Publicação NPM

### Sintoma

```
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@aredes.me%2fmcp-dadosbr
npm ERR! You do not have permission to publish "@aredes.me/mcp-dadosbr"
```

### Causas e Soluções

#### 1. Token NPM Inválido ou Expirado

**Solução**:
1. Acesse: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Crie novo token:
   - Type: **Automation** (para CI/CD)
   - Expiration: Escolha validade apropriada
3. Copie o token (formato: `npm_xxxxxxxxxxxxxxxxxxxx`)
4. Atualize GitHub Secret `NPM_TOKEN`

#### 2. Escopo @aredes.me Não Autorizado

**Verificar package.json**:
```json
{
  "name": "@aredes.me/mcp-dadosbr",
  "publishConfig": {
    "access": "public"  // ✅ Necessário para scoped packages
  }
}
```

**Verificar se você tem permissão no escopo**:
```bash
npm access ls-packages @aredes.me
# Deve listar: @aredes.me/mcp-dadosbr: read-write
```

#### 3. Versão Já Publicada

**Sintoma**: `Cannot publish over existing version`

**Solução**: Incrementar versão no `package.json`
```bash
# Patch (0.3.1 → 0.3.2)
npm version patch

# Minor (0.3.1 → 0.4.0)
npm version minor

# Major (0.3.1 → 1.0.0)
npm version major

# Commit e push da nova tag
git push && git push --tags
```

---

## 🔴 Erros de Release GitHub

### Sintoma 1: Version Mismatch

```
❌ Version mismatch!
   package.json: 0.3.0
   Git tag:      0.3.1
```

**Causa**: Tag criada não corresponde à versão no `package.json`

**Solução**:
```bash
# 1. Atualizar package.json primeiro
npm version 0.3.1 --no-git-tag-version

# 2. Commit
git add package.json
git commit -m "chore: bump version to 0.3.1"

# 3. Criar tag
git tag v0.3.1

# 4. Push
git push && git push --tags
```

### Sintoma 2: Release Já Existe

```
⚠️ Release v0.3.1 already exists, deleting...
```

**Causa**: Tag foi recriada/refeita

**Solução Automática**: O workflow já deleta e recria (veja código abaixo)

**Se quiser fazer manualmente**:
```bash
# Deletar release remoto
gh release delete v0.3.1 --yes

# Deletar tag remota
git push --delete origin v0.3.1

# Deletar tag local
git tag -d v0.3.1

# Recriar tag
git tag v0.3.1

# Push novamente
git push --tags
```

### Sintoma 3: Changelog Vazio

**Causa**: Nenhum commit convencional desde último release

**Solução**: Garantir commits seguem padrão:
```bash
# ✅ Correto
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update README"

# ❌ Errado
git commit -m "updated stuff"
git commit -m "changes"
```

**Tipos de commit válidos**:
- `feat`: Nova feature
- `fix`: Bug fix
- `docs`: Documentação
- `style`: Formatação
- `refactor`: Refatoração
- `perf`: Performance
- `test`: Testes
- `chore`: Manutenção

---

## 🛠️ Comandos Úteis de Debugging

### Verificar Secrets no GitHub

```bash
# Listar secrets (não mostra valores)
gh secret list

# Output esperado:
# CLOUDFLARE_API_TOKEN  Updated 2024-10-01
# NPM_TOKEN             Updated 2024-10-01
```

### Testar Workflows Localmente

```bash
# Instalar act (GitHub Actions local runner)
brew install act  # macOS
# ou
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Rodar workflow localmente
act -j test  # Roda apenas job 'test'
act -j deploy  # Roda job 'deploy'
```

### Verificar Cloudflare Deployment

```bash
# Health check
curl https://mcp-dadosbr.aredes.me/health

# Testar MCP endpoint
curl -X POST https://mcp-dadosbr.aredes.me/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Verificar NPM Package

```bash
# Ver versões publicadas
npm view @aredes.me/mcp-dadosbr versions

# Ver info da versão específica
npm view @aredes.me/mcp-dadosbr@0.3.1

# Instalar versão específica para testar
npm install -g @aredes.me/mcp-dadosbr@0.3.1
```

---

## 📞 Suporte

Se os problemas persistirem:

1. **Verifique os logs completos do GitHub Actions**:
   - Actions → Workflow run → Clique no job falhado
   - Expanda todos os steps para ver detalhes

2. **Teste localmente**:
   - Rode os mesmos comandos do CI localmente
   - Verifique se há diferenças de ambiente

3. **Abra uma issue**:
   - Inclua: logs completos, comandos executados, versões
   - URL: https://github.com/cristianoaredes/mcp-dadosbr/issues

---

## 📚 Referências

- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Wrangler Authentication](https://developers.cloudflare.com/workers/wrangler/ci-cd/)
- [NPM Publish Tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Última atualização**: Outubro 2025  
**Versão do projeto**: 0.3.1
