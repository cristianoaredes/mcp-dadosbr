[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/cristianoaredes-mcp-dadosbr-badge.png)](https://mseep.ai/app/cristianoaredes-mcp-dadosbr)

# MCP DadosBR 🇧🇷

[![smithery badge](https://smithery.ai/badge/@cristianoaredes/mcp-dadosbr)](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr)
[![npm version](https://badge.fury.io/js/@aredes.me%2Fmcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![npm downloads](https://img.shields.io/npm/dm/@aredes.me/mcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://mcp-dadosbr.aredes.me/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🤖 Model Context Protocol (MCP) server for Brazilian business data lookup** — bring CNPJ (company) and CEP (postal code) information directly into Claude Desktop, Cursor, Windsurf, Continue.dev and other AI assistants.
> 
> 🚀 Multi-platform deployment: NPM package, Cloudflare Workers, Smithery.

_[English](#english) | [Português](#português)_

---

## Português

🇧🇷 **Servidor MCP para consulta de dados empresariais brasileiros (CNPJ) e validação de endereços (CEP).** Integre essas consultas em minutos em Claude Desktop, Cursor, Windsurf, Continue.dev e qualquer cliente compatível com MCP.

## ⚡ Instalação Rápida

```bash
npm install -g @aredes.me/mcp-dadosbr
```

Ou execute diretamente com NPX:

```bash
npx @aredes.me/mcp-dadosbr
```

### Via Smithery (1 clique)

```bash
npx -y @smithery/cli install @cristianoaredes/mcp-dadosbr --client claude
```

## 🔌 Configuração por IDE / Cliente MCP

### 🤖 Claude Desktop
```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"],
      "env": {
        "TAVILY_API_KEY": "tvly-your-api-key-here"
      }
    }
  }
}
```
**Localização**: `~/Library/Application Support/Claude/claude_desktop_config.json`

> ⚠️ **Obrigatório**: Configure `TAVILY_API_KEY` para usar `cnpj_search` e `cnpj_intelligence`. Obtenha sua chave em [tavily.com](https://tavily.com)

### 🎯 Cursor IDE
```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"],
      "env": {
        "TAVILY_API_KEY": "tvly-your-api-key-here"
      }
    }
  }
}
```

### 🏄 Windsurf IDE
```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"],
      "env": {
        "TAVILY_API_KEY": "tvly-your-api-key-here"
      }
    }
  }
}
```

### 🔄 Continue.dev
```json
{
  "mcpServers": [
    {
      "name": "dadosbr",
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"],
      "env": {
        "TAVILY_API_KEY": "tvly-your-api-key-here"
      }
    }
  ]
}
```

### 🤖 ChatGPT MCP
Para usar com ChatGPT, configure o servidor Cloudflare Workers como endpoint remoto:

1. **Deploy no Cloudflare Workers**: `npm run deploy`
2. **Configure no ChatGPT**:
   - URL do servidor: `https://mcp-dadosbr.your-subdomain.workers.dev`
   - O ChatGPT detectará automaticamente os endpoints OAuth e MCP
3. **Configure API Key** (opcional, via environment variables no Workers):
   ```bash
   TAVILY_API_KEY="tvly-your-api-key-here"
   ```

**APIs REST disponíveis**:
- `GET /cnpj/{cnpj}` - Consulta dados de empresa
- `GET /cep/{cep}` - Consulta dados de endereço
- `POST /search` - Busca web inteligente
- `POST /intelligence` - Busca inteligente completa
- `POST /thinking` - Raciocínio estruturado

**✅ Teste rápido**
```
Pode consultar o CNPJ 11.222.333/0001-81?
```

## 🛠️ Ferramentas Disponíveis

- 🏢 **`cnpj_lookup`** — razão social, situação cadastral, endereço, CNAE (fonte: OpenCNPJ)
- 📮 **`cep_lookup`** — logradouro, bairro, cidade, UF, DDD (fonte: OpenCEP)
- 🔍 **`cnpj_search`** — buscas web com dorks (site:, intext:, filetype:) via Tavily
- 🤔 **`sequentialthinking`** — raciocínio estruturado passo a passo
- 🎯 **`cnpj_intelligence`** — orquestra múltiplas consultas e gera relatório consolidado com filtros de assertividade

> **✨ Novidade v0.3.2**: Buscas web agora usam **Tavily** exclusivamente, com filtros automáticos para garantir **100% de precisão** nos resultados (valida CNPJ em todos os snippets retornados). Configure `TAVILY_API_KEY` obrigatoriamente.

## 🧪 Testes em Linha de Comando

### Servidor HTTP + SSE local
```bash
npm run build
TAVILY_API_KEY="tvly-xxx" MCP_TRANSPORT=http MCP_HTTP_PORT=3000 node build/lib/adapters/cli.js
```

Em outro terminal:
```bash
TAVILY_API_KEY="tvly-xxx" node scripts/mcp-client.js list-tools
TAVILY_API_KEY="tvly-xxx" node scripts/mcp-client.js cnpj 28526270000150
TAVILY_API_KEY="tvly-xxx" MAX_QUERIES=3 MAX_RESULTS=3 node scripts/mcp-client.js intelligence 28526270000150
```

### Health check rápido
```bash
curl -i https://mcp-dadosbr.aredes.me/health
```

## 🌐 Deploy Web (Opcional)

**Cloudflare Workers**: https://mcp-dadosbr.aredes.me
- 🔗 REST API: `/cnpj/{cnpj}` · `/cep/{cep}` · `/search` · `/intelligence` · `/thinking`
- 🤖 OpenAPI: `/openapi.json`
- 📊 Health: `/health`
- 🔐 OAuth 2.0 + API Key Authentication: Protegido contra abuso
- ⚡ Rate Limiting: 30 req/min por IP (configurável)

**Smithery**: `smithery.yaml` para deploy single-click.

### 🚀 Para ChatGPT MCP
```bash
# 1. Deploy no Cloudflare
npm run build
npm run deploy

# 2. Configure no ChatGPT:
# - Server URL: https://your-subdomain.workers.dev
# - O ChatGPT detectará automaticamente OAuth + MCP endpoints
```

### 🔒 Segurança (Cloudflare Workers)

**API Key Authentication:**
- **Protegidos**: Endpoints REST (`/cnpj/*`, `/cep/*`, `/search`, `/intelligence`, `/thinking`)
- **Não protegidos**: Protocolo MCP (`/mcp`, `/sse`) - para compatibilidade com AI assistants

```bash
# Configure API key
wrangler secret put MCP_API_KEY

# Use via headers (apenas para endpoints REST):
curl -H "X-API-Key: your-key" https://mcp-dadosbr.aredes.me/cnpj/11222333000181
# ou
curl -H "Authorization: Bearer your-key" https://mcp-dadosbr.aredes.me/cnpj/11222333000181

# Endpoints MCP não precisam de autenticação:
curl -X POST https://mcp-dadosbr.aredes.me/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

**Rate Limiting:**
- Padrão: 30 requisições por minuto por IP
- KV-based para escalabilidade
- Desativável com `MCP_DISABLE_RATE_LIMIT=true`

## 📚 Documentação

- **[Configuration Guide](docs/CONFIGURATION.md)**
- **[Usage Examples](docs/USAGE_EXAMPLES.md)**
- **[MCP Client Integration](docs/MCP_CLIENT_INTEGRATION.md)**
- **[Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)**
- **[Search Providers](docs/PROVIDERS.md)**
- **[Documentação PT-BR Completa](docs/pt-br/README.md)**

## 💼 Casos de Uso

- **Due diligence e compliance**
- **E-commerce e logística** (validação de endereço)
- **Pesquisa jurídica** (tribunais, portais gov.br via dorks)
- **Atendimento ao cliente e CRM** (verificação de cadastro)

## 🤝 Contribuição & Lançamentos

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [RELEASING.md](RELEASING.md)
- Tokens necessários para CI/CD: veja `docs/GITHUB_SECRETS_SETUP.md`

## 📄 Licença & Créditos

- MIT License — [LICENSE](LICENSE)
- Dados fornecidos por [OpenCNPJ](https://opencnpj.org/) e [OpenCEP](https://opencep.com/)

## 👨‍💻 Mantenedor

| [Cristiano Aredes](https://github.com/cristianoaredes)                         |
| ------------------------------------------------------------------------------ |
| [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) · cristiano@aredes.me |

---

## English

🤖 **Model Context Protocol server for Brazilian company (CNPJ) and postal code (CEP) data.** Integrate verified business data into Claude Desktop, Cursor, Windsurf, Continue.dev and any MCP-compatible assistant.

### ⚡ Quick Install

```bash
npm install -g @aredes.me/mcp-dadosbr
```

Or via NPX:

```bash
npx @aredes.me/mcp-dadosbr
```

### IDE Configuration

- Claude Desktop / Cursor / Windsurf:
  ```json
  {
    "mcpServers": {
      "dadosbr": {
        "command": "npx",
        "args": ["@aredes.me/mcp-dadosbr"],
        "env": {
          "TAVILY_API_KEY": "tvly-your-api-key-here"
        }
      }
    }
  }
  ```
- Continue.dev:
  ```json
  {
    "mcpServers": [
      {
        "name": "dadosbr",
        "command": "npx",
        "args": ["@aredes.me/mcp-dadosbr"],
        "env": {
          "TAVILY_API_KEY": "tvly-your-api-key-here"
        }
      }
    ]
  }
  ```

> ⚠️ **Required**: Set `TAVILY_API_KEY` to use `cnpj_search` and `cnpj_intelligence`. Get your key at [tavily.com](https://tavily.com)

**Test prompt**: `Can you look up CNPJ 11.222.333/0001-81?`

### Key Tools

- `cnpj_lookup` — Company registry data (OpenCNPJ)
- `cep_lookup` — Postal address data (OpenCEP)
- `cnpj_search` — Google-dork style search queries via Tavily
- `sequentialthinking` — Structured multi-step reasoning
- `cnpj_intelligence` — Automated company intelligence workflow with accuracy filters

> **✨ New in v0.3.2**: Web searches now use **Tavily** exclusively, with automatic filters ensuring **100% accuracy** (validates CNPJ in all returned snippets). `TAVILY_API_KEY` is required.

### Web Deployment

- Cloudflare Worker endpoint: https://mcp-dadosbr.aredes.me
- REST: `/cnpj/{cnpj}`, `/cep/{cep}`
- OpenAPI spec: `/openapi.json`
- Health: `/health`

### Documentation & Support

- [Configuration Guide](docs/CONFIGURATION.md)
- [Usage Examples](docs/USAGE_EXAMPLES.md)
- [Search Providers](docs/PROVIDERS.md)
- [Release Guide](RELEASING.md)

### License

MIT License — see [LICENSE](LICENSE). Data courtesy of OpenCNPJ & OpenCEP.

---

**Made with ❤️ for the Brazilian developer community 🇧🇷**