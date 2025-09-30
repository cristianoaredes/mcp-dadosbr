# MCP DadosBR 🇧🇷

[![npm version](https://badge.fury.io/js/@aredes.me%2Fmcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![npm downloads](https://img.shields.io/npm/dm/@aredes.me/mcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://mcp-dadosbr.aredes.me/)

> **🤖 Model Context Protocol (MCP) server for Brazilian public data lookup - Company (CNPJ) and postal code (CEP) information directly in Claude Desktop, Cursor, Windsurf, Continue.dev, and other AI assistants**

🚀 **Multi-platform deployment: NPM package, Cloudflare Workers, Smithery, and configurable API endpoints!**

_[English](#english) | [Português](#português)_

---

## Português

🇧🇷 **Servidor MCP para consulta de dados públicos brasileiros.** Integre informações de CNPJ (empresas) e CEP (códigos postais) diretamente no Claude Desktop, Cursor, Windsurf, Continue.dev e outros assistentes de IA.

## ⚡ Instalação Rápida

```bash
npm install -g @aredes.me/mcp-dadosbr
```

## 🔌 Configuração por IDE

### 🤖 Claude Desktop
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
**Localização**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### 🎯 Cursor IDE  
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

### 🏄‍♂️ Windsurf IDE
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

### 🔄 Continue.dev
```json
{
  "mcpServers": [
    {
      "name": "dadosbr",
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"]
    }
  ]
}
```

**✅ Teste:** `Pode consultar o CNPJ 00.000.000/0001-91?`

## 🛠️ Ferramentas Disponíveis

### 🏢 `cnpj_lookup` - Consulta de Empresas  
- **Entrada**: CNPJ (formatado ou não)
- **Saída**: Nome, endereço, situação cadastral, CNAE, capital social
- **Exemplo**: `00.000.000/0001-91`
- **APIs**: OpenCNPJ (padrão) ou customizada via configuração

### 📮 `cep_lookup` - Consulta de CEP
- **Entrada**: CEP (formatado ou não)
- **Saída**: Logradouro, bairro, cidade, estado, DDD
- **Exemplo**: `01310-100`
- **APIs**: OpenCEP (padrão) ou customizada via configuração

### 🔍 `cnpj_search` - Busca Inteligente na Web 🆕
- **Entrada**: Query de busca com operadores avançados
- **Saída**: Resultados do DuckDuckGo (título, URL, snippet)
- **Exemplo**: `00000000000191 site:gov.br`
- **Operadores**: `site:`, `intext:`, `intitle:`, `filetype:`, etc.
- **Uso**: Encontrar processos, documentos, notícias sobre empresas

### 🧠 `sequentialthinking` - Pensamento Sequencial 🆕
- **Entrada**: Pensamento atual + progresso
- **Saída**: Status do raciocínio estruturado
- **Uso**: Análise complexa, planejamento iterativo, investigações
- **Recursos**: Revisões, ramificações, ajuste dinâmico de plano

## 🌐 Deploy Web (Opcional)

**Cloudflare Workers**: https://mcp-dadosbr.aredes.me
- 🔗 API REST: `/cnpj/{cnpj}`, `/cep/{cep}`  
- 🤖 ChatGPT: `/openapi.json`
- 📊 Health: `/health`

---

## English

🤖 **Model Context Protocol (MCP) server providing Brazilian public data lookup capabilities.** Seamlessly integrate CNPJ (company) and CEP (postal code) data into Claude Desktop, Cursor, Windsurf, Continue.dev, and other AI coding assistants.

## ⚡ Quick Install

```bash
npm install -g @aredes.me/mcp-dadosbr
```

## 🔌 Setup by IDE

### 🤖 Claude Desktop
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

### 🎯 Cursor IDE
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

### 🏄‍♂️ Windsurf IDE
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

### 🔄 Continue.dev
```json
{
  "mcpServers": [
    {
      "name": "dadosbr",
      "command": "npx", 
      "args": ["@aredes.me/mcp-dadosbr"]
    }
  ]
}
```
## 🛠️ Available Tools

### 🏢 `cnpj_lookup` - Company Lookup
- **Input**: CNPJ (formatted or not)
- **Output**: Name, address, registration status, CNAE, share capital
- **Example**: `00.000.000/0001-91`
- **APIs**: OpenCNPJ (default) or custom via configuration

### 📮 `cep_lookup` - Postal Code Lookup  
- **Input**: CEP (formatted or not)
- **Output**: Street, neighborhood, city, state, area code
- **Example**: `01310-100`
- **APIs**: OpenCEP (default) or custom via configuration

### 🔍 `cnpj_search` - Intelligent Web Search 🆕
- **Input**: Search query with advanced operators
- **Output**: DuckDuckGo results (title, URL, snippet)
- **Example**: `00000000000191 site:gov.br`
- **Operators**: `site:`, `intext:`, `intitle:`, `filetype:`, etc.
- **Usage**: Find lawsuits, documents, news about companies

### 🧠 `sequentialthinking` - Sequential Thinking 🆕
- **Input**: Current thought + progress
- **Output**: Structured reasoning status
- **Usage**: Complex analysis, iterative planning, investigations
- **Features**: Revisions, branches, dynamic plan adjustment

## 🌐 Web Deploy (Optional)

**Cloudflare Workers**: https://mcp-dadosbr.aredes.me
- 🔗 REST API: `/cnpj/{cnpj}`, `/cep/{cep}`
- 🤖 ChatGPT: `/openapi.json`
- 📊 Health: `/health`

**✅ Test:** `Can you look up CNPJ 00.000.000/0001-91?`

---

## 📚 Documentation

- 📖 **[Configuration Guide](docs/CONFIGURATION.md)** - Environment variables, custom APIs, authentication
- 🔍 **[Search Providers](docs/PROVIDERS.md)** - DuckDuckGo, Tavily, SerpAPI setup and comparison
- 💡 **[Usage Examples](docs/USAGE_EXAMPLES.md)** - Real-world integration patterns  
- 🔧 **[MCP Client Integration](docs/MCP_CLIENT_INTEGRATION.md)** - Detailed IDE setup guides
- ☁️ **[Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)** - Serverless deployment guide

## 🏗️ Architecture

**Modular Design**: The server is built with a clean, modular architecture:

- **Core Engine**: `lib/core/` - MCP server, tools, caching, HTTP client, validation
- **Adapters**: `lib/adapters/` - CLI (stdio), Cloudflare Workers, Smithery deployment
- **Configuration**: `lib/config/` - Environment-based config with `.mcprc.json` support
- **Types**: `lib/types/` - TypeScript interfaces and type definitions

**Key Features**:
- 🔄 **Request Deduplication**: Prevents concurrent identical API calls
- ⚡ **Circuit Breaker**: Automatic failure protection with 30s recovery
- 💾 **Smart Caching**: LRU cache with TTL and automatic cleanup
- 📊 **Built-in Metrics**: Request tracking, cache hits, error rates
- 🔧 **Configurable APIs**: Support for custom CNPJ/CEP endpoints
- 🔐 **Authentication**: Flexible header-based auth for custom APIs

## 🙏 Credits

- 🔗 **[OpenCNPJ](https://opencnpj.org/)** - Free Brazilian company data
- 🔗 **[OpenCEP](https://opencep.com/)** - Free Brazilian postal code data

## 🤝 Contributing

Found a bug? Check our [Contributing Guide](CONTRIBUTING.md) or open an [Issue](https://github.com/cristianoaredes/mcp-dadosbr/issues).

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Mantenedores

[Cristiano Aredes](https://github.com/cristianoaredes)

## 📫 Contato

Para sugestões, dúvidas ou contribuições:
- 📧 Email: [cristiano@aredes.me](mailto:cristiano@aredes.me)
- 💼 LinkedIn: [Cristiano Aredes](https://www.linkedin.com/in/cristianoaredes/)

## ⭐ Mostre seu apoio

Se este projeto te ajudou de alguma forma, considere:
- ⭐ Dar uma estrela no GitHub
- 🐛 Reportar bugs ou sugerir melhorias em [Issues](https://github.com/cristianoaredes/mcp-dadosbr/issues)
- 🔀 Fazer um fork e contribuir com o projeto
- 📢 Compartilhar com outros desenvolvedores

## 📝 Citação

Se você usar este projeto como referência em artigos ou estudos, por favor cite:

```bibtex
@software{mcp_dadosbr,
  author = {Cristiano Aredes},
  title = {MCP DadosBR - Brazilian Data MCP Server},
  year = {2025},
  publisher = {GitHub},
  url = {https://github.com/cristianoaredes/mcp-dadosbr}
}
```

---

**Made with ❤️ for the Brazilian developer community 🇧🇷**

*"Conectando dados públicos brasileiros ao futuro da IA"*