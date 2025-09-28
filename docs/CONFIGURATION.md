# Configuration Guide - MCP DadosBR

## 📋 Table of Contents

- [Basic Configuration](#basic-configuration)
- [Environment Variables](#environment-variables)
- [Configuration File](#configuration-file)
- [Transport Options](#transport-options)
- [API Customization](#api-customization)
- [Caching Configuration](#caching-configuration)
- [Authentication](#authentication)
- [Cloudflare Workers](#cloudflare-workers)

## 🔧 Basic Configuration

### Default Settings
```bash
# Default APIs
CNPJ API: https://api.opencnpj.org/
CEP API: https://opencep.com/v1/

# Default Cache
Size: 256 entries
TTL: 60 seconds

# Default Transport
Mode: stdio
Timeout: 8 seconds
```

## 🌍 Environment Variables

### Core Settings
```bash
# Transport configuration
MCP_TRANSPORT=stdio              # stdio | http
MCP_HTTP_PORT=3000              # HTTP port (when using http transport)

# Cache configuration
MCP_CACHE_SIZE=256              # Maximum cache entries
MCP_CACHE_TTL=60000             # Cache TTL in milliseconds

# API timeout
MCP_API_TIMEOUT=8000            # API request timeout in milliseconds
```

### API Endpoints
```bash
# Custom API endpoints
CNPJ_API_BASE_URL=https://your-cnpj-api.com/
CEP_API_BASE_URL=https://your-cep-api.com/v1/

# Authentication
API_KEY_HEADER=X-API-Key
API_KEY_VALUE=your-secret-key
```

### Usage Example
```bash
# Run with custom configuration
CNPJ_API_BASE_URL=https://api.example.com/ \
CEP_API_BASE_URL=https://cep.example.com/ \
MCP_CACHE_SIZE=512 \
npx @aredes.me/mcp-dadosbr
```

## 📄 Configuration File

### .mcprc.json
Create a `.mcprc.json` file in your project root:

```json
{
  "apiUrls": {
    "cnpj": "https://your-cnpj-api.com/",
    "cep": "https://your-cep-api.com/v1/"
  },
  "auth": {
    "headers": {
      "X-API-Key": "your-secret-key",
      "Authorization": "Bearer your-token"
    }
  },
  "cache": {
    "size": 512,
    "ttl": 120000
  },
  "timeout": 10000
}
```

### Configuration Priority
1. **Environment Variables** (highest priority)
2. **Configuration File** (.mcprc.json)
3. **Default Values** (lowest priority)

## 🚀 Transport Options

### stdio Transport (Default)
```bash
# For CLI tools and desktop applications
MCP_TRANSPORT=stdio npx @aredes.me/mcp-dadosbr
```

**Use cases:**
- Claude Desktop
- Continue.dev
- Cursor IDE
- Windsurf IDE
- Local development

### HTTP Transport
```bash
# For web applications and HTTP clients
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 npx @aredes.me/mcp-dadosbr
```

**Features:**
- JSON-RPC over HTTP
- CORS support
- Health check endpoint
- Metrics endpoint

**Endpoints:**
- `POST /mcp` - MCP JSON-RPC
- `GET /health` - Health check
- `GET /metrics` - Performance metrics

## 🔗 API Customization

### Custom CNPJ API
```json
{
  "apiUrls": {
    "cnpj": "https://your-cnpj-service.com/api/v1/"
  }
}
```

**Expected Response Format:**
```json
{
  "cnpj": "11222333000181",
  "razao_social": "Company Name",
  "nome_fantasia": "Trade Name",
  "situacao": "ATIVA",
  "endereco": {
    "logradouro": "Street Name",
    "numero": "123",
    "bairro": "Neighborhood",
    "municipio": "City",
    "uf": "SP",
    "cep": "01234567"
  }
}
```

### Custom CEP API
```json
{
  "apiUrls": {
    "cep": "https://your-cep-service.com/api/"
  }
}
```

**Expected Response Format:**
```json
{
  "cep": "01310100",
  "logradouro": "Avenida Paulista",
  "bairro": "Bela Vista",
  "localidade": "São Paulo",
  "uf": "SP",
  "estado": "São Paulo"
}
```

## 💾 Caching Configuration

### Cache Settings
```bash
# Environment variables
MCP_CACHE_SIZE=512              # Maximum entries (default: 256)
MCP_CACHE_TTL=120000           # TTL in milliseconds (default: 60000)
```

```json
{
  "cache": {
    "size": 512,                 // Maximum cache entries
    "ttl": 120000               // Time-to-live in milliseconds
  }
}
```

### Cache Behavior
- **LRU Eviction**: Least Recently Used entries are removed when cache is full
- **TTL Expiration**: Entries expire after configured time
- **Automatic Cleanup**: Expired entries are cleaned up on access
- **Key Format**: `{tool}:{normalized_input}` (e.g., `cnpj:11222333000181`)

## 🔐 Authentication

### API Key Authentication
```bash
# Environment variables
API_KEY_HEADER=X-API-Key
API_KEY_VALUE=your-secret-key
```

```json
{
  "auth": {
    "headers": {
      "X-API-Key": "your-secret-key"
    }
  }
}
```

### Bearer Token Authentication
```json
{
  "auth": {
    "headers": {
      "Authorization": "Bearer your-jwt-token"
    }
  }
}
```

### Multiple Headers
```json
{
  "auth": {
    "headers": {
      "X-API-Key": "your-api-key",
      "X-Client-ID": "your-client-id",
      "Authorization": "Bearer your-token"
    }
  }
}
```

## ☁️ Cloudflare Workers

### Environment Variables
```toml
# wrangler.toml
[vars]
MCP_TRANSPORT = "http"
MCP_HTTP_PORT = "8787"
MCP_CACHE_SIZE = "256"
MCP_CACHE_TTL = "60000"
CNPJ_API_BASE_URL = "https://api.opencnpj.org/"
CEP_API_BASE_URL = "https://opencep.com/v1/"
```

### KV Storage
```toml
# wrangler.toml
[[kv_namespaces]]
binding = "MCP_CACHE"
id = "your-kv-namespace-id"
```

### Secrets
```bash
# Set secrets via Wrangler CLI
wrangler secret put API_KEY_VALUE
wrangler secret put CUSTOM_API_TOKEN
```

## 🧪 Testing Configuration

### Test with Custom APIs
```bash
# Test CNPJ lookup
CNPJ_API_BASE_URL=https://httpbin.org/json \
npx @aredes.me/mcp-dadosbr

# Test with authentication
API_KEY_HEADER=X-Test-Key \
API_KEY_VALUE=test123 \
npx @aredes.me/mcp-dadosbr
```

### Validate Configuration
```bash
# Check configuration loading
DEBUG=1 npx @aredes.me/mcp-dadosbr
```

## 🔍 Troubleshooting

### Common Issues

**1. API Connection Errors**
```bash
# Check API URLs
curl https://api.opencnpj.org/11222333000181
curl https://opencep.com/v1/01310100
```

**2. Authentication Failures**
```bash
# Test with curl
curl -H "X-API-Key: your-key" https://your-api.com/test
```

**3. Cache Issues**
```bash
# Clear cache by restarting
# Or reduce cache TTL for testing
MCP_CACHE_TTL=1000 npx @aredes.me/mcp-dadosbr
```

**4. Transport Problems**
```bash
# Test HTTP transport
MCP_TRANSPORT=http MCP_HTTP_PORT=3001 npx @aredes.me/mcp-dadosbr

# Check health endpoint
curl http://localhost:3001/health
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=1 npx @aredes.me/mcp-dadosbr
```

## 📞 Support

- **GitHub Issues**: [Report configuration problems](https://github.com/cristianoaredes/mcp-dadosbr/issues)
- **Documentation**: [Full documentation](https://github.com/cristianoaredes/mcp-dadosbr#readme)
- **Examples**: [Configuration examples](https://github.com/cristianoaredes/mcp-dadosbr/tree/main/examples)