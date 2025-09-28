# Cloudflare Workers Deployment Guide

_[English](#english) | [Português](#português)_

---

## English

This guide explains how to deploy MCP DadosBR to Cloudflare Workers for global, serverless execution with **ChatGPT integration support**.

### 🌟 Benefits of Cloudflare Workers

- **Global Edge Network**: Deploy to 300+ locations worldwide
- **Zero Cold Starts**: Instant response times
- **Automatic Scaling**: Handle any traffic volume
- **FREE Tier Available**: 100,000 requests/day at no cost
- **Built-in Security**: DDoS protection and WAF
- **High Availability**: 99.99% uptime SLA
- **Server-Sent Events**: Real-time streaming support for MCP agents

### 💰 Free Tier Limits (Perfect for MCP Hosting)

- **Workers Free**: 100,000 requests/day per account
- **KV Storage**: 100,000 reads/day, 1,000 writes/day, 1GB storage
- **Pages**: 500 builds/month, unlimited sites and bandwidth
- **Zero Trust**: Up to 50 users for authentication
- **CDN & SSL**: Included with basic DDoS protection

_No credit card required for free tier! Perfect for hosting MCP remote servers._

### 📋 Prerequisites

1. **Cloudflare Account**: [Sign up for free](https://dash.cloudflare.com/sign-up)
2. **Node.js 18+**: Required for build process
3. **Wrangler CLI**: Cloudflare's deployment tool

### 🚀 Quick Deployment

#### 1. Install Dependencies

```bash
# Install project dependencies
npm install

# Install Wrangler CLI globally (if not already installed)
npm install -g wrangler
```

#### 2. Login to Cloudflare

```bash
wrangler login
```

#### 3. Configure Deployment

Edit `wrangler.toml` with your settings:

```toml
name = "mcp-dadosbr"
main = "build/lib/workers/worker.js"
compatibility_date = "2024-01-15"

[env.production]
name = "mcp-dadosbr"
routes = [
  { pattern = "mcp-dadosbr.your-domain.com/*", zone_name = "your-domain.com" }
]

[vars]
MCP_TRANSPORT = "http"
MCP_CACHE_SIZE = "256"
MCP_CACHE_TTL = "60000"
```

#### 4. Deploy

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Or use the deployment script
./scripts/deploy-cloudflare.sh production
```

### 🔧 Configuration Options

#### Environment Variables

Configure in `wrangler.toml` under `[vars]`:

| Variable         | Default   | Description                              |
| ---------------- | --------- | ---------------------------------------- |
| `MCP_TRANSPORT`  | `"http"`  | Transport mode (always http for Workers) |
| `MCP_CACHE_SIZE` | `"256"`   | Maximum cache entries                    |
| `MCP_CACHE_TTL`  | `"60000"` | Cache TTL in milliseconds                |

#### Custom Domain

1. Add your domain to Cloudflare
2. Configure routes in `wrangler.toml`:

```toml
[env.production]
routes = [
  { pattern = "api.yourdomain.com/mcp/*", zone_name = "yourdomain.com" }
]
```

#### KV Storage (Optional)

For persistent caching across requests:

```bash
# Create KV namespace
npm run cf:kv:create

# Add to wrangler.toml
[[kv_namespaces]]
binding = "MCP_CACHE"
id = "your-kv-namespace-id"
```

### 🧪 Testing Deployment

#### Health Check

```bash
curl https://your-worker.your-subdomain.workers.dev/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "mcp-dadosbr",
  "version": "1.0.0",
  "runtime": "cloudflare-workers"
}
```

#### HTTP JSON-RPC Test

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "cnpj_lookup",
      "arguments": {
        "cnpj": "11.222.333/0001-81"
      }
    }
  }'
```

#### Server-Sent Events (SSE) Test

```bash
# Test SSE endpoint
curl -N -H "Accept: text/event-stream" \\
  https://your-worker.your-subdomain.workers.dev/sse

# Expected SSE stream:
# event: connection
# data: {"type":"connection","status":"connected","server":"mcp-dadosbr"}
#
# event: message
# data: {"jsonrpc":"2.0","id":"init","result":{"protocolVersion":"2024-11-05"}}
```

### 🔄 MCP Transport Options

#### 1. HTTP JSON-RPC (Standard)

- **Endpoint**: `/mcp`
- **Method**: POST
- **Content-Type**: application/json
- **Use Case**: Traditional request/response MCP clients

#### 2. Server-Sent Events (Streaming)

- **Endpoint**: `/sse`
- **Method**: GET/POST
- **Accept**: text/event-stream
- **Use Case**: Real-time streaming MCP agents
- **Benefits**: Lower latency, persistent connection, real-time updates

#### 3. REST API (ChatGPT Integration)

- **Endpoints**: `/cnpj/{cnpj}`, `/cep/{cep}`
- **Method**: GET
- **Content-Type**: application/json
- **Use Case**: Direct HTTP access, ChatGPT actions
- **OpenAPI Schema**: `/openapi.json`

#### 4. OAuth Endpoints (MCP Connectors)

- **Discovery**: `/.well-known/oauth-authorization-server`
- **Authorization**: `/oauth/authorize`
- **Token**: `/oauth/token`
- **User Info**: `/oauth/userinfo`
- **JWKS**: `/.well-known/jwks.json`

````

### 📊 Monitoring and Logs

#### View Logs

```bash
# Real-time logs
npm run cf:tail

# Or with wrangler directly
wrangler tail
````

#### Analytics

Access analytics in Cloudflare Dashboard:

1. Go to Workers & Pages
2. Select your worker
3. View metrics, requests, and errors

### 🔒 Security Configuration

#### CORS Settings

CORS is automatically configured for:

- Origins: `*` (configure as needed)
- Methods: `GET, POST, OPTIONS`
- Headers: `Content-Type, Accept`

#### Rate Limiting

Configure in Cloudflare Dashboard:

1. Go to Security > WAF
2. Create rate limiting rules
3. Set limits per IP/endpoint

### 🚀 Advanced Configuration

#### Multiple Environments

```toml
[env.staging]
name = "mcp-dadosbr-staging"
vars = { MCP_CACHE_SIZE = "128" }

[env.production]
name = "mcp-dadosbr"
vars = { MCP_CACHE_SIZE = "512" }
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

#### Custom Build Process

```bash
# Build for Workers
npm run build:worker

# Deploy specific environment
wrangler deploy --env production
```

### 🔧 Troubleshooting

#### Common Issues

**Build Errors**

```bash
# Clear dist and rebuild
rm -rf dist
npm run build:worker
```

**Authentication Issues**

```bash
# Re-login to Cloudflare
wrangler logout
wrangler login
```

**Deployment Failures**

```bash
# Check wrangler.toml syntax
wrangler validate

# Deploy with verbose logging
wrangler deploy --verbose
```

#### Performance Optimization

1. **Enable KV Caching**: Reduces API calls
2. **Configure Cache TTL**: Balance freshness vs performance
3. **Use Custom Domain**: Better performance than workers.dev
4. **Monitor Metrics**: Track response times and error rates

### 📚 Integration with MCP Clients

#### Claude Desktop (Remote MCP Bridge)

Use the included bridge for remote MCP connections:

```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"]
    }
  }
}
```

#### ChatGPT Integration

1. **Deploy to Cloudflare Workers**
2. **Add to ChatGPT** as custom GPT action
3. **Import OpenAPI schema** from `/openapi.json`
4. **Test with REST endpoints**:
   - `/cnpj/11222333000181`
   - `/cep/01310100`

#### HTTP Client

```javascript
const response = await fetch(
  "https://your-worker.your-subdomain.workers.dev/mcp",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "cnpj_lookup",
        arguments: { cnpj: "11.222.333/0001-81" },
      },
    }),
  }
);
```

---

## Português

Este guia explica como fazer deploy do MCP DadosBR no Cloudflare Workers para execução serverless global.

### 🌟 Benefícios do Cloudflare Workers

- **Rede Global Edge**: Deploy em 300+ localizações mundialmente
- **Zero Cold Starts**: Tempos de resposta instantâneos
- **Escalonamento Automático**: Lida com qualquer volume de tráfego
- **Custo Efetivo**: Pague apenas pelas requisições
- **Segurança Integrada**: Proteção DDoS e WAF
- **Alta Disponibilidade**: SLA de 99.99% uptime

### 📋 Pré-requisitos

1. **Conta Cloudflare**: [Cadastre-se gratuitamente](https://dash.cloudflare.com/sign-up)
2. **Node.js 18+**: Necessário para o processo de build
3. **Wrangler CLI**: Ferramenta de deploy da Cloudflare

### 🚀 Deploy Rápido

#### 1. Instalar Dependências

```bash
# Instalar dependências do projeto
npm install

# Instalar Wrangler CLI globalmente (se ainda não instalado)
npm install -g wrangler
```

#### 2. Login na Cloudflare

```bash
wrangler login
```

#### 3. Configurar Deploy

Edite `wrangler.toml` com suas configurações:

```toml
name = "mcp-dadosbr"
main = "build/lib/workers/worker.js"
compatibility_date = "2024-01-15"

[env.production]
name = "mcp-dadosbr"
routes = [
  { pattern = "mcp-dadosbr.seudominio.com/*", zone_name = "seudominio.com" }
]

[vars]
MCP_TRANSPORT = "http"
MCP_CACHE_SIZE = "256"
MCP_CACHE_TTL = "60000"
```

#### 4. Fazer Deploy

```bash
# Deploy para staging
npm run deploy:staging

# Deploy para produção
npm run deploy:production

# Ou usar o script de deploy
./scripts/deploy-cloudflare.sh production
```

### 🔧 Opções de Configuração

#### Variáveis de Ambiente

Configure em `wrangler.toml` sob `[vars]`:

| Variável         | Padrão    | Descrição                                     |
| ---------------- | --------- | --------------------------------------------- |
| `MCP_TRANSPORT`  | `"http"`  | Modo de transporte (sempre http para Workers) |
| `MCP_CACHE_SIZE` | `"256"`   | Máximo de entradas no cache                   |
| `MCP_CACHE_TTL`  | `"60000"` | TTL do cache em milissegundos                 |

#### Domínio Personalizado

1. Adicione seu domínio à Cloudflare
2. Configure rotas em `wrangler.toml`:

```toml
[env.production]
routes = [
  { pattern = "api.seudominio.com/mcp/*", zone_name = "seudominio.com" }
]
```

### 🧪 Testando o Deploy

#### Health Check

```bash
curl https://seu-worker.seu-subdominio.workers.dev/health
```

#### Teste de Ferramenta MCP

```bash
curl -X POST https://seu-worker.seu-subdominio.workers.dev/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "cnpj_lookup",
      "arguments": {
        "cnpj": "11.222.333/0001-81"
      }
    }
  }'
```

### 📊 Monitoramento e Logs

#### Visualizar Logs

```bash
# Logs em tempo real
npm run cf:tail

# Ou com wrangler diretamente
wrangler tail
```

### 🔒 Configuração de Segurança

#### Configurações CORS

CORS é automaticamente configurado para:

- Origens: `*` (configure conforme necessário)
- Métodos: `GET, POST, OPTIONS`
- Headers: `Content-Type, Accept`

### 🚀 Configuração Avançada

#### Múltiplos Ambientes

```toml
[env.staging]
name = "mcp-dadosbr-staging"
vars = { MCP_CACHE_SIZE = "128" }

[env.production]
name = "mcp-dadosbr"
vars = { MCP_CACHE_SIZE = "512" }
routes = [
  { pattern = "api.seudominio.com/*", zone_name = "seudominio.com" }
]
```

---

## 🔗 Links Úteis

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [MCP DadosBR Repository](https://github.com/cristianoaredes/mcp-dadosbr)
- [Project Structure](./PROJECT_STRUCTURE.md)
- [Git Workflow](./GIT_WORKFLOW.md)
