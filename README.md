# MCP DadosBR 🇧🇷

[![smithery badge](https://smithery.ai/badge/@cristianoaredes/mcp-dadosbr)](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr)
[![npm version](https://badge.fury.io/js/@aredes.me%2Fmcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![npm downloads](https://img.shields.io/npm/dm/@aredes.me/mcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://mcp-dadosbr.aredes.me/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🤖 Servidor Model Context Protocol (MCP) para consulta de dados empresariais brasileiros** — traga informações de CNPJ (empresas) e CEP (endereços) diretamente para Claude Desktop, Cursor, Windsurf, Continue.dev e outros assistentes de IA.
> 
> 🚀 Deploy multiplataforma: Pacote NPM, Cloudflare Workers, Smithery.

_[Português](#português) | [English](#english)_

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

### Deploy em VPS

[![Deploy to Hostinger VPS](https://img.shields.io/badge/Deploy%20to-Hostinger%20VPS-673DE6?style=for-the-badge&logo=hostinger&logoColor=white)](https://www.hostinger.com.br/cart?product=vps%3Avps_kvm_2&period=12&referral_type=cart_link&REFERRALCODE=FQLCRISTIRC3&referral_id=019a73b2-a3cd-72b8-8141-76eb55275046)

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
**Localização**: `~/.continue/config.json`

### 🧑‍💻 Claude Code CLI

**Instalação via comando `claude mcp add`:**
```bash
# Opção 1: Servidor local stdio (recomendado para desenvolvimento)
claude mcp add --transport stdio dadosbr \
  --env TAVILY_API_KEY=tvly-your-api-key-here \
  -- npx -y @aredes.me/mcp-dadosbr

# Opção 2: Servidor HTTP remoto (Cloudflare Workers)
claude mcp add --transport http dadosbr \
  https://mcp-dadosbr.aredes.me/mcp
```

**Verificação:**
```bash
# Listar servidores MCP configurados
claude mcp list

# Remover se necessário
claude mcp remove dadosbr
```

### 🤖 Google Gemini CLI
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
**Localização**: `~/.config/gemini/mcp_config.json`

### 📦 Codex CLI
```bash
# Configurar no .codexrc
codex mcp add dadosbr npx @aredes.me/mcp-dadosbr

# Ou via environment
export CODEX_MCP_SERVERS='{"dadosbr":{"command":"npx","args":["@aredes.me/mcp-dadosbr"],"env":{"TAVILY_API_KEY":"tvly-xxx"}}}'
```

### 🐝 Zed Editor
```json
{
  "context_servers": {
    "dadosbr": {
      "command": {
        "path": "npx",
        "args": ["@aredes.me/mcp-dadosbr"]
      },
      "env": {
        "TAVILY_API_KEY": "tvly-your-api-key-here"
      }
    }
  }
}
```
**Localização**: `~/.config/zed/settings.json`

### 🦖 Cline (VS Code Extension)
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
**Localização**: VS Code Settings > Extensions > Cline > MCP Servers

### ⚡ Roo Cline
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
**Localização**: `~/.roo-cline/mcp-settings.json`

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

## 🔧 Configuração Avançada

### Variáveis de Ambiente

**Obrigatórias:**
- `TAVILY_API_KEY` - Chave da API Tavily para buscas web ([obtenha aqui](https://tavily.com))

**Opcionais:**
- `MCP_TRANSPORT` - Modo de transporte: `stdio` (padrão) ou `http`
- `MCP_HTTP_PORT` - Porta do servidor HTTP (padrão: `3000`)
- `MCP_API_KEY` - Chave de API para autenticação dos endpoints REST
- `MCP_DISABLE_RATE_LIMIT` - Desabilitar rate limiting (padrão: `false`)
- `MAX_QUERIES` - Número máximo de queries de busca (padrão: `10`)
- `MAX_RESULTS` - Resultados máximos por query (padrão: `5`)
- `CNPJ_API_BASE_URL` - Endpoint customizado da API de CNPJ (padrão: OpenCNPJ)
- `CEP_API_BASE_URL` - Endpoint customizado da API de CEP (padrão: OpenCEP)

### Arquivo de Configuração

Crie `.mcprc.json` no diretório do seu projeto:

```json
{
  "tavilyApiKey": "tvly-sua-chave-api",
  "transport": "http",
  "httpPort": 3000,
  "cnpjBaseUrl": "https://open.cnpja.com/office/",
  "cepBaseUrl": "https://opencep.com/v1/"
}
```

## 📚 Documentação

- **[Guia de Navegação](docs/NAVIGATION.md)** - 🧭 Encontre rapidamente o que procura
- **[Guia de Configuração](docs/CONFIGURATION.md)** - Referência completa de configuração
- **[Exemplos de Uso](docs/EXAMPLE_USAGE.md)** - Exemplos práticos de uso
- **[Integração com Clientes MCP](docs/MCP_CLIENT_INTEGRATION.md)** - Guias de configuração de IDEs
- **[Deploy no Cloudflare](docs/CLOUDFLARE_DEPLOYMENT.md)** - Deploy em produção
- **[Provedores de Busca](docs/PROVIDERS.md)** - Comparação de provedores
- **[Guia para Agentes](docs/development/AGENTS.md)** - Guia para agentes de IA
- **[Documentação Completa PT-BR](docs/pt-br/README.md)** - Documentação completa em português

## 💼 Casos de Uso

- **Due diligence e compliance** - Verificar registro empresarial e situação legal
- **E-commerce e logística** - Validação e verificação de endereços
- **Pesquisa jurídica** - Processos judiciais, portais gov.br via dorks
- **Atendimento ao cliente e CRM** - Verificação de cadastro e enriquecimento de dados
- **Análise financeira** - Checagem de antecedentes e investigação de empresas
- **Vendas e marketing** - Enriquecimento e validação de leads

## 🎯 Exemplos de Prompts

**Consulta Básica de CNPJ:**
```
Pode consultar o CNPJ 11.222.333/0001-81 e me dizer sobre essa empresa?
```

**Validação de Endereço:**
```
O CEP 01310-100 é válido? Qual é o endereço?
```

**Investigação de Intelligence:**
```
Use cnpj_intelligence para fazer uma investigação completa sobre o CNPJ 11.222.333/0001-81.
Preciso de informações sobre processos judiciais, notícias e registros governamentais.
```

**Análise Estruturada:**
```
Use sequential thinking para planejar e executar uma investigação de due diligence
para o CNPJ 11.222.333/0001-81. Inclua dados da empresa, pesquisa jurídica
e análise de presença online.
```

## 🧬 Arquitetura

### Componentes Principais

- **Adapters** (`lib/adapters/`) - Implementações específicas de plataforma (CLI, Cloudflare, Smithery)
- **Core** (`lib/core/`) - Lógica de negócio (ferramentas, busca, intelligence, validação)
- **Infrastructure** (`lib/infrastructure/`) - Preocupações transversais (cache, circuit breaker, rate limiting, logging)
- **Workers** (`lib/workers/`) - Implementação do Cloudflare Workers
- **Types** (`lib/types/`) - Definições de tipos TypeScript

### Padrões de Design

- **Adapter Pattern** - Suporte a deploy multiplataforma
- **Circuit Breaker** - Proteção contra falhas de API e resiliência
- **Result Pattern** - Tratamento funcional de erros sem exceções
- **Repository Pattern** - Camada abstrata de acesso a dados
- **Strategy Pattern** - Provedores de busca plugáveis

### Stack Tecnológica

- **Linguagem**: TypeScript (modo estrito)
- **Runtime**: Node.js 18+
- **Servidor HTTP**: Express 5.x
- **MCP SDK**: @modelcontextprotocol/sdk, @genkit-ai/mcp
- **Busca**: API Tavily
- **Deploy**: Cloudflare Workers, NPM, Smithery
- **Testes**: Vitest (88 testes unitários, 100% de aprovação)

## 🤝 Contribuição & Lançamentos

Recebemos contribuições de desenvolvedores do mundo todo!

- **[Guia de Contribuição](CONTRIBUTING.md)** - Como contribuir (Português & Inglês)
- **[Guia de Lançamentos](RELEASING.md)** - Processo de release e versionamento
- **Tokens CI/CD**: Veja `docs/GITHUB_SECRETS_SETUP.md`

### Setup de Desenvolvimento

```bash
# Clonar repositório
git clone https://github.com/cristianoaredes/mcp-dadosbr.git
cd mcp-dadosbr

# Instalar dependências
npm install

# Build
npm run build

# Executar testes
npm test

# Executar em modo desenvolvimento
npm run dev
```

## ✨ Funcionalidades

- ✅ **5 ferramentas MCP** - Consulta CNPJ, consulta CEP, busca web, intelligence, sequential thinking
- ✅ **Multiplataforma** - NPM, Cloudflare Workers, Smithery
- ✅ **Pronto para produção** - Circuit breaker, rate limiting, caching, monitoramento
- ✅ **Type-safe** - TypeScript completo com modo estrito
- ✅ **Bem testado** - 88 testes unitários, testes de integração abrangentes
- ✅ **Bem documentado** - Documentação completa em Português e Inglês
- ✅ **Compatível com LGPD** - Mascaramento de PII em logs
- ✅ **Escalável** - Cloudflare Workers com deploy global na edge
- ✅ **Seguro** - Autenticação por API key, rate limiting, proteção CORS
- ✅ **Developer-friendly** - Configuração simples, ótima DX

## 📊 Métricas de Qualidade

- **Cobertura de Testes**: ~60%
- **Testes Unitários**: 88 testes, 100% de aprovação
- **TypeScript**: Modo estrito habilitado
- **Qualidade de Código**: ESLint, Prettier
- **Suporte a Plataformas**: Node.js 18+, Cloudflare Workers
- **Documentação**: 15+ guias em 2 idiomas

## 📄 Licença & Créditos

- MIT License — [LICENSE](LICENSE)
- Dados fornecidos por [OpenCNPJ](https://opencnpj.org/) e [OpenCEP](https://opencep.com/)

## 👨‍💻 Mantenedor

| [Cristiano Aredes](https://github.com/cristianoaredes)                         |
| ------------------------------------------------------------------------------ |
| [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) · cristiano@aredes.me |

## 🌐 Links

- **Pacote NPM**: https://www.npmjs.com/package/@aredes.me/mcp-dadosbr
- **Smithery**: https://smithery.ai/server/@cristianoaredes/mcp-dadosbr
- **API Live**: https://mcp-dadosbr.aredes.me
- **GitHub**: https://github.com/cristianoaredes/mcp-dadosbr
- **Issues**: https://github.com/cristianoaredes/mcp-dadosbr/issues
- **Discussões**: https://github.com/cristianoaredes/mcp-dadosbr/discussions

---

## English

🤖 **Model Context Protocol server for Brazilian company (CNPJ) and postal code (CEP) data.** Integrate verified business data into Claude Desktop, Cursor, Windsurf, Continue.dev and any MCP-compatible AI assistant in minutes.

## ⚡ Quick Install

```bash
npm install -g @aredes.me/mcp-dadosbr
```

Or run directly with NPX:

```bash
npx @aredes.me/mcp-dadosbr
```

### Via Smithery (1-click install)

```bash
npx -y @smithery/cli install @cristianoaredes/mcp-dadosbr --client claude
```

### Deploy to VPS

[![Deploy to Hostinger VPS](https://img.shields.io/badge/Deploy%20to-Hostinger%20VPS-673DE6?style=for-the-badge&logo=hostinger&logoColor=white)](https://www.hostinger.com.br/cart?product=vps%3Avps_kvm_2&period=12&referral_type=cart_link&REFERRALCODE=FQLCRISTIRC3&referral_id=019a73b2-a3cd-72b8-8141-76eb55275046)

## 🔌 IDE / MCP Client Configuration

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
**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

> ⚠️ **Required**: Set `TAVILY_API_KEY` to use `cnpj_search` and `cnpj_intelligence`. Get your key at [tavily.com](https://tavily.com)

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
**Location**: `~/.cursor/config.json`

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
**Location**: `~/.windsurf/config.json`

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
**Location**: `~/.continue/config.json`

### 🧑‍💻 Claude Code CLI

**Installation via `claude mcp add` command:**
```bash
# Option 1: Local stdio server (recommended for development)
claude mcp add --transport stdio dadosbr \
  --env TAVILY_API_KEY=tvly-your-api-key-here \
  -- npx -y @aredes.me/mcp-dadosbr

# Option 2: Remote HTTP server (Cloudflare Workers)
claude mcp add --transport http dadosbr \
  https://mcp-dadosbr.aredes.me/mcp
```

**Verification:**
```bash
# List configured MCP servers
claude mcp list

# Remove if needed
claude mcp remove dadosbr
```

### 🤖 Google Gemini CLI
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
**Location**: `~/.config/gemini/mcp_config.json`

### 📦 Codex CLI
```bash
# Configure in .codexrc
codex mcp add dadosbr npx @aredes.me/mcp-dadosbr

# Or via environment
export CODEX_MCP_SERVERS='{"dadosbr":{"command":"npx","args":["@aredes.me/mcp-dadosbr"],"env":{"TAVILY_API_KEY":"tvly-xxx"}}}'
```

### 🐝 Zed Editor
```json
{
  "context_servers": {
    "dadosbr": {
      "command": {
        "path": "npx",
        "args": ["@aredes.me/mcp-dadosbr"]
      },
      "env": {
        "TAVILY_API_KEY": "tvly-your-api-key-here"
      }
    }
  }
}
```
**Location**: `~/.config/zed/settings.json`

### 🦖 Cline (VS Code Extension)
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
**Location**: VS Code Settings > Extensions > Cline > MCP Servers

### ⚡ Roo Cline
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
**Location**: `~/.roo-cline/mcp-settings.json`

### 🤖 ChatGPT MCP
To use with ChatGPT, configure the Cloudflare Workers server as a remote endpoint:

1. **Deploy to Cloudflare Workers**: `npm run deploy`
2. **Configure in ChatGPT**:
   - Server URL: `https://mcp-dadosbr.your-subdomain.workers.dev`
   - ChatGPT will automatically detect OAuth and MCP endpoints
3. **Configure API Key** (optional, via Workers environment variables):
   ```bash
   wrangler secret put TAVILY_API_KEY
   ```

**Available REST APIs**:
- `GET /cnpj/{cnpj}` - Query company data
- `GET /cep/{cep}` - Query address data
- `POST /search` - Intelligent web search
- `POST /intelligence` - Complete intelligence search
- `POST /thinking` - Structured reasoning

**✅ Quick test**
```
Can you look up CNPJ 11.222.333/0001-81?
```

## 🛠️ Available Tools

- 🏢 **`cnpj_lookup`** — Company name, tax status, address, CNAE code (source: OpenCNPJ)
- 📮 **`cep_lookup`** — Street, neighborhood, city, state, area code (source: OpenCEP)
- 🔍 **`cnpj_search`** — Web searches with dorks (site:, intext:, filetype:) via Tavily
- 🤔 **`sequentialthinking`** — Structured step-by-step reasoning
- 🎯 **`cnpj_intelligence`** — Orchestrates multiple queries and generates consolidated report with accuracy filters

> **✨ New in v0.3.2**: Web searches now use **Tavily** exclusively, with automatic filters ensuring **100% accuracy** (validates CNPJ in all returned snippets). `TAVILY_API_KEY` is required.

## 🧪 Command Line Testing

### Local HTTP + SSE server
```bash
npm run build
TAVILY_API_KEY="tvly-xxx" MCP_TRANSPORT=http MCP_HTTP_PORT=3000 node build/lib/adapters/cli.js
```

In another terminal:
```bash
TAVILY_API_KEY="tvly-xxx" node scripts/mcp-client.js list-tools
TAVILY_API_KEY="tvly-xxx" node scripts/mcp-client.js cnpj 28526270000150
TAVILY_API_KEY="tvly-xxx" MAX_QUERIES=3 MAX_RESULTS=3 node scripts/mcp-client.js intelligence 28526270000150
```

### Quick health check
```bash
curl -i https://mcp-dadosbr.aredes.me/health
```

## 🌐 Web Deployment (Optional)

**Cloudflare Workers**: https://mcp-dadosbr.aredes.me
- 🔗 REST API: `/cnpj/{cnpj}` · `/cep/{cep}` · `/search` · `/intelligence` · `/thinking`
- 🤖 OpenAPI: `/openapi.json`
- 📊 Health: `/health`
- 🔐 OAuth 2.0 + API Key Authentication: Protected against abuse
- ⚡ Rate Limiting: 30 req/min per IP (configurable)

**Smithery**: `smithery.yaml` for single-click deployment.

### 🚀 For ChatGPT MCP
```bash
# 1. Deploy to Cloudflare
npm run build
npm run deploy

# 2. Configure in ChatGPT:
# - Server URL: https://your-subdomain.workers.dev
# - ChatGPT will automatically detect OAuth + MCP endpoints
```

### 🔒 Security (Cloudflare Workers)

**API Key Authentication:**
- **Protected**: REST endpoints (`/cnpj/*`, `/cep/*`, `/search`, `/intelligence`, `/thinking`)
- **Unprotected**: MCP protocol (`/mcp`, `/sse`) - for AI assistant compatibility

```bash
# Configure API key
wrangler secret put MCP_API_KEY

# Use via headers (REST endpoints only):
curl -H "X-API-Key: your-key" https://mcp-dadosbr.aredes.me/cnpj/11222333000181
# or
curl -H "Authorization: Bearer your-key" https://mcp-dadosbr.aredes.me/cnpj/11222333000181

# MCP endpoints don't require authentication:
curl -X POST https://mcp-dadosbr.aredes.me/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

**Rate Limiting:**
- Default: 30 requests per minute per IP
- KV-based for scalability
- Disable with `MCP_DISABLE_RATE_LIMIT=true`

## 🔧 Advanced Configuration

### Environment Variables

**Required:**
- `TAVILY_API_KEY` - Tavily API key for web searches ([get it here](https://tavily.com))

**Optional:**
- `MCP_TRANSPORT` - Transport mode: `stdio` (default) or `http`
- `MCP_HTTP_PORT` - HTTP server port (default: `3000`)
- `MCP_API_KEY` - API key for REST endpoint authentication
- `MCP_DISABLE_RATE_LIMIT` - Disable rate limiting (default: `false`)
- `MAX_QUERIES` - Maximum number of search queries (default: `10`)
- `MAX_RESULTS` - Maximum results per query (default: `5`)
- `CNPJ_API_BASE_URL` - Custom CNPJ API endpoint (default: OpenCNPJ)
- `CEP_API_BASE_URL` - Custom CEP API endpoint (default: OpenCEP)

### Configuration File

Create `.mcprc.json` in your project directory:

```json
{
  "tavilyApiKey": "tvly-your-api-key",
  "transport": "http",
  "httpPort": 3000,
  "cnpjBaseUrl": "https://open.cnpja.com/office/",
  "cepBaseUrl": "https://opencep.com/v1/"
}
```

## 📚 Documentation

- **[Navigation Guide](docs/NAVIGATION.md)** - 🧭 Quickly find what you're looking for
- **[Configuration Guide](docs/CONFIGURATION.md)** - Complete configuration reference
- **[Usage Examples](docs/EXAMPLE_USAGE.md)** - Real-world usage examples
- **[MCP Client Integration](docs/MCP_CLIENT_INTEGRATION.md)** - IDE setup guides
- **[Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)** - Deploy to production
- **[Search Providers](docs/PROVIDERS.md)** - Search provider comparison
- **[Agent Development Guide](docs/development/AGENTS.md)** - Guide for AI agents
- **[Complete PT-BR Documentation](docs/pt-br/README.md)** - Documentação completa em português

## 💼 Use Cases

- **Due diligence and compliance** - Verify company registration and legal status
- **E-commerce and logistics** - Address validation and verification
- **Legal research** - Court records, government portals via dorks
- **Customer service and CRM** - Registration verification and data enrichment
- **Financial analysis** - Company background checks and investigation
- **Sales and marketing** - Lead enrichment and validation

## 🎯 Example Prompts

**Basic CNPJ Lookup:**
```
Can you look up CNPJ 11.222.333/0001-81 and tell me about this company?
```

**Address Validation:**
```
Is CEP 01310-100 a valid postal code? What's the address?
```

**Intelligence Investigation:**
```
Use cnpj_intelligence to do a complete investigation on CNPJ 11.222.333/0001-81. 
I need information about legal cases, news, and government records.
```

**Structured Analysis:**
```
Use sequential thinking to plan and execute a due diligence investigation 
for CNPJ 11.222.333/0001-81. Include company data, legal research, 
and online presence analysis.
```

## 🧬 Architecture

### Core Components

- **Adapters** (`lib/adapters/`) - Platform-specific implementations (CLI, Cloudflare, Smithery)
- **Core** (`lib/core/`) - Business logic (tools, search, intelligence, validation)
- **Infrastructure** (`lib/infrastructure/`) - Cross-cutting concerns (cache, circuit breaker, rate limiting, logging)
- **Workers** (`lib/workers/`) - Cloudflare Workers implementation
- **Types** (`lib/types/`) - TypeScript type definitions

### Design Patterns

- **Adapter Pattern** - Multi-platform deployment support
- **Circuit Breaker** - API failure protection and resilience
- **Result Pattern** - Functional error handling without exceptions
- **Repository Pattern** - Abstract data access layer
- **Strategy Pattern** - Pluggable search providers

### Technology Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 18+
- **HTTP Server**: Express 5.x
- **MCP SDK**: @modelcontextprotocol/sdk, @genkit-ai/mcp
- **Search**: Tavily API
- **Deployment**: Cloudflare Workers, NPM, Smithery
- **Testing**: Vitest (88 unit tests, 100% pass rate)

## 🤝 Contributing & Releases

We welcome contributions from developers worldwide!

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute (English & Portuguese)
- **[Release Guide](RELEASING.md)** - Release process and versioning
- **CI/CD Tokens**: See `docs/GITHUB_SECRETS_SETUP.md`

### Development Setup

```bash
# Clone repository
git clone https://github.com/cristianoaredes/mcp-dadosbr.git
cd mcp-dadosbr

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

## ✨ Features

- ✅ **5 MCP tools** - CNPJ lookup, CEP lookup, web search, intelligence, sequential thinking
- ✅ **Multi-platform** - NPM, Cloudflare Workers, Smithery
- ✅ **Production-ready** - Circuit breaker, rate limiting, caching, monitoring
- ✅ **Robust SSE** - Heartbeat (30s), timeout management (50s), graceful shutdown
- ✅ **Type-safe** - Full TypeScript with strict mode
- ✅ **Well-tested** - 88 unit tests, comprehensive integration tests
- ✅ **Well-documented** - Complete docs in Portuguese and English
- ✅ **LGPD compliant** - PII masking in logs
- ✅ **Scalable** - Cloudflare Workers with global edge deployment
- ✅ **Secure** - API key authentication, rate limiting, CORS protection
- ✅ **Developer-friendly** - Simple setup, great DX

## 📊 Quality Metrics

- **Test Coverage**: ~60%
- **Unit Tests**: 88 tests, 100% pass rate
- **TypeScript**: Strict mode enabled
- **Code Quality**: ESLint, Prettier
- **Platform Support**: Node.js 18+, Cloudflare Workers
- **Documentation**: 15+ guides in 2 languages

## 📝 License & Credits

- **License**: MIT License — see [LICENSE](LICENSE)
- **Data Sources**: 
  - Company data provided by [OpenCNPJ](https://opencnpj.org/)
  - Postal code data provided by [OpenCEP](https://opencep.com/)
  - Web search powered by [Tavily](https://tavily.com/)

## 👨‍💻 Maintainer

| [Cristiano Aredes](https://github.com/cristianoaredes)                         |
| ------------------------------------------------------------------------------ |
| [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) · cristiano@aredes.me |

## 🌐 Links

- **NPM Package**: https://www.npmjs.com/package/@aredes.me/mcp-dadosbr
- **Smithery**: https://smithery.ai/server/@cristianoaredes/mcp-dadosbr
- **Live API**: https://mcp-dadosbr.aredes.me
- **GitHub**: https://github.com/cristianoaredes/mcp-dadosbr
- **Issues**: https://github.com/cristianoaredes/mcp-dadosbr/issues
- **Discussions**: https://github.com/cristianoaredes/mcp-dadosbr/discussions

---

**Made with ❤️ for the Brazilian developer community 🇧🇷**