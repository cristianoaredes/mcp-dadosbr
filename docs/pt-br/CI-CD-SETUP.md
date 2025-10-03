# Configuração de CI/CD com GitHub Actions

Guia completo em português para configurar o deploy automático no Cloudflare Workers usando GitHub Actions.

## 📋 Pré-requisitos

- ✅ Conta no GitHub com acesso ao repositório
- ✅ Conta no Cloudflare (tier gratuito suficiente)
- ✅ Token de API do Cloudflare (fornecido pelo usuário)

---

## 🔐 Passo 1: Configurar o Token no GitHub

### Token Recebido
```
Token: MhUU**********************Qk53
(primeiros e últimos 4 caracteres mostrados)
```

### Adicionar ao GitHub Secrets

1. **Acesse as configurações do repositório:**
   ```
   https://github.com/SEU_USUARIO/mcp-dadosbr/settings/secrets/actions
   ```

2. **Clique em "New repository secret"**

3. **Configure o secret:**
   - **Name (Nome):** `CLOUDFLARE_API_TOKEN`
   - **Value (Valor):** Cole o token completo fornecido
   
4. **Clique em "Add secret"**

### ✅ Verificação
Após adicionar, você verá o secret listado como:
```
CLOUDFLARE_API_TOKEN
Added X days ago • Not used yet
```

---

## 🚀 Passo 2: Testar o Deploy Automático

### Opção A: Deploy Manual (Recomendado para primeiro teste)

1. **Acesse a aba Actions:**
   ```
   https://github.com/SEU_USUARIO/mcp-dadosbr/actions
   ```

2. **Selecione o workflow:**
   - Clique em "Deploy to Cloudflare Workers"

3. **Execute manualmente:**
   - Clique em "Run workflow"
   - Selecione o ambiente: `staging` (recomendado para primeiro teste)
   - Clique em "Run workflow"

4. **Acompanhe a execução:**
   - O workflow irá:
     - ✓ Fazer checkout do código
     - ✓ Instalar dependências
     - ✓ Compilar o Worker
     - ✓ Deploy no Cloudflare
     - ✓ Executar testes de saúde
     - ✓ Gerar relatório de deploy

### Opção B: Deploy Automático

O deploy será disparado automaticamente quando você fizer push para `master` com alterações em:
- `workers/**`
- `wrangler.toml`
- `package.json`
- `tsconfig.worker.json`

---

## 🔍 Passo 3: Verificar o Deploy

### Verificar Logs do Workflow

1. Clique na execução do workflow
2. Expanda cada etapa para ver os logs
3. Procure por mensagens de sucesso ou erro

### Testar os Endpoints

**Health Check:**
```bash
curl https://mcp-dadosbr-staging.aredes.me/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "service": "mcp-dadosbr",
  "version": "1.0.0",
  "timestamp": "2024-10-03T11:00:00.000Z",
  "runtime": "cloudflare-workers"
}
```

**Teste do MCP:**
```bash
curl -X POST https://mcp-dadosbr-staging.aredes.me/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

---

## 📊 Passo 4: Monitorar e Gerenciar

### Dashboard do Cloudflare

1. Acesse: https://dash.cloudflare.com
2. Navegue para: **Workers & Pages**
3. Selecione: **mcp-dadosbr-staging** (ou production)
4. Visualize:
   - Requisições em tempo real
   - Logs de execução
   - Métricas de performance
   - Uso de recursos

### GitHub Actions Dashboard

1. Acesse: https://github.com/SEU_USUARIO/mcp-dadosbr/actions
2. Veja histórico de deployments
3. Monitore status de cada deploy
4. Baixe artefatos se necessário

---

## ⚠️ Solução de Problemas

### Erro: "Authentication error (10000)"

**Causa:** Token do Cloudflare inválido ou expirado

**Solução:**
1. Verifique se o token foi adicionado corretamente no GitHub Secrets
2. Nome deve ser exatamente: `CLOUDFLARE_API_TOKEN`
3. Valor deve ser o token completo (sem espaços ou quebras de linha)
4. Se necessário, gere um novo token no Cloudflare e atualize o secret

### Erro: "KV namespace not found"

**Causa:** IDs dos namespaces KV estão incorretos no `wrangler.toml`

**Solução:**
```bash
# Criar namespaces
wrangler kv:namespace create MCP_CACHE
wrangler kv:namespace create MCP_CACHE --preview

# Atualizar IDs no wrangler.toml
```

### Erro: "Account ID not found"

**Causa:** Account ID não está configurado

**Solução:**
```bash
# Verificar Account ID
wrangler whoami

# Atualizar wrangler.toml se necessário
```

### Workflow não dispara automaticamente

**Causa:** Alterações não estão nos arquivos/diretórios monitorados

**Solução:**
- Verifique se mudanças foram feitas em arquivos monitorados
- Confirme que o push foi para a branch `master`
- Verifique sintaxe do arquivo workflow

---

## 🔒 Segurança

### Boas Práticas Implementadas

✅ **Token armazenado em GitHub Secrets**
- Nunca exposto em logs
- Não pode ser lido após criação
- Protegido por criptografia

✅ **`.gitignore` configurado**
- Arquivos `.env*` não são commitados
- Tokens locais protegidos
- Build outputs excluídos

✅ **`.env.example` criado**
- Template sem valores sensíveis
- Documentação de variáveis necessárias
- Guia para desenvolvedores

### Checklist de Segurança

- [ ] Token adicionado apenas no GitHub Secrets
- [ ] Arquivo `.env` no `.gitignore`
- [ ] Nenhum token hard-coded no código
- [ ] Token com permissões mínimas necessárias
- [ ] Logs revisados (sem exposição de secrets)

---

## 🎯 Próximos Passos

### Deploy para Produção

Quando estiver pronto para produção:

1. **Teste completamente no staging**
2. **Execute deploy manual para produção:**
   ```
   Actions → Deploy to Cloudflare Workers → Run workflow
   Environment: production
   ```
3. **Verifique os endpoints de produção**
4. **Configure domínio customizado (opcional)**

### Configurações Avançadas

- **Domínio customizado**: Ver [`docs/CLOUDFLARE_DEPLOYMENT.md`](../CLOUDFLARE_DEPLOYMENT.md#custom-domains)
- **Variáveis de ambiente**: Ver [`docs/CLOUDFLARE_DEPLOYMENT.md`](../CLOUDFLARE_DEPLOYMENT.md#environment-variables)
- **Monitoramento**: Ver [`docs/CLOUDFLARE_DEPLOYMENT.md`](../CLOUDFLARE_DEPLOYMENT.md#monitoring--logs)

---

## 📚 Recursos Adicionais

- [Documentação Completa de Deployment](../CLOUDFLARE_DEPLOYMENT.md)
- [Configuração do Projeto](../CONFIGURATION.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

## ✅ Resumo da Configuração

| Item | Status | Detalhes |
|------|--------|----------|
| Token Cloudflare | ✅ Fornecido | MhUU****Qk53 |
| GitHub Secret | ⏳ Pendente | Adicionar como `CLOUDFLARE_API_TOKEN` |
| Workflow CI/CD | ✅ Configurado | `.github/workflows/cloudflare-deploy.yml` |
| Documentação | ✅ Atualizada | Guias em PT-BR e EN |
| `.env.example` | ✅ Criado | Template de variáveis |
| `.gitignore` | ✅ Verificado | Arquivos sensíveis protegidos |

**Ação Necessária:** Adicionar o token como GitHub Secret conforme instruções acima.