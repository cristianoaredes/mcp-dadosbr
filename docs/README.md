# MCP DadosBR Documentation

> **Multi-language documentation for Brazilian public data MCP server**

## 📚 Available Languages

### 🇧🇷 Português Brasileiro
**Documentação completa em português brasileiro para desenvolvedores brasileiros**

- **[📖 Documentação Principal PT-BR](pt-br/README.md)** - Índice completo da documentação
- **[🏗️ Arquitetura](pt-br/arquitetura/)** - Visão arquitetural detalhada
- **[💻 Desenvolvimento](pt-br/desenvolvimento/)** - Guias de desenvolvimento
- **[📚 Exemplos](pt-br/exemplos/)** - Exemplos práticos e casos de uso
- **[📝 Glossário](pt-br/glossario/)** - Terminologia técnica em PT-BR

### 🇺🇸 English
**Technical documentation in English**

- **[⚙️ Configuration Guide](CONFIGURATION.md)** - Environment variables, custom APIs, authentication
- **[🔍 Search Providers](PROVIDERS.md)** - DuckDuckGo, Tavily, SerpAPI setup and comparison
- **[💡 Usage Examples](USAGE_EXAMPLES.md)** - Real-world integration patterns  
- **[🔧 MCP Client Integration](MCP_CLIENT_INTEGRATION.md)** - Detailed IDE setup guides
- **[☁️ Cloudflare Deployment](CLOUDFLARE_DEPLOYMENT.md)** - Serverless deployment guide
- **[🧠 Sequential Thinking](SEQUENTIAL_THINKING.md)** - Structured reasoning documentation
- **[🔍 Web Search](WEB_SEARCH.md)** - Intelligent web search capabilities

## 🎯 Quick Start by Language

### Para Desenvolvedores Brasileiros 🇧🇷

```bash
# Instalação rápida
npm install -g @aredes.me/mcp-dadosbr

# Primeira consulta
echo '{"method": "tools/call", "params": {"name": "cnpj_lookup", "arguments": {"cnpj": "33.000.167/0001-01"}}}' | mcp-dadosbr
```

**Continue em**: [Documentação PT-BR](pt-br/README.md)

### For International Developers 🇺🇸

```bash
# Quick install
npm install -g @aredes.me/mcp-dadosbr

# First query
echo '{"method": "tools/call", "params": {"name": "cnpj_lookup", "arguments": {"cnpj": "33000167000101"}}}' | mcp-dadosbr
```

**Continue at**: [Configuration Guide](CONFIGURATION.md)

## 📋 Documentation Structure

### Core Documentation
- **Configuration** - Setup and environment variables
- **Usage Examples** - Integration patterns and real-world use cases
- **MCP Client Integration** - IDE setup (Claude Desktop, Cursor, Windsurf)
- **Deployment** - Cloudflare Workers and production deployment

### Advanced Features
- **Search Providers** - Web search integration (DuckDuckGo, Tavily)
- **Sequential Thinking** - Structured reasoning capabilities
- **Web Search** - Google Dorks and intelligent search

### Development
- **[Development Docs](development/)** - Internal development documentation
- **Code Review** - Architecture analysis and code quality
- **Testing** - Test suite and quality assurance
- **Feature Planning** - Roadmap and future development

## 🌐 Multi-Platform Support

### NPM Package
```bash
npm install -g @aredes.me/mcp-dadosbr
```

### Cloudflare Workers
- **Production**: https://mcp-dadosbr.aredes.me
- **REST API**: `/cnpj/{cnpj}`, `/cep/{cep}`
- **Health Check**: `/health`

### Smithery Platform
- **Marketplace**: smithery.ai/server/dadosbr
- **Auto-deployment**: Via Smithery CLI

## 🛠️ Available Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `cnpj_lookup` | Brazilian company data | CNPJ | Company details, address, status |
| `cep_lookup` | Brazilian postal code | CEP | Address, neighborhood, city, state |
| `cnpj_search` | Intelligent web search | Search query | Web results with Google Dorks |
| `sequentialthinking` | Structured reasoning | Thought + progress | Reasoning status |

## 📊 Quality Metrics

- **Test Coverage**: ~60%
- **Tests Passing**: 88/88 (100%)
- **TypeScript**: Strict mode ✅
- **Thread-Safe**: 100% ✅
- **LGPD Compliant**: ✅
- **Production Ready**: ✅

## 🤝 Contributing

### For Brazilian Contributors 🇧🇷
Veja o [Guia de Contribuição PT-BR](pt-br/desenvolvimento/boas-praticas.md)

### For International Contributors 🇺🇸
See the [Contributing Guide](../CONTRIBUTING.md)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/cristianoaredes/mcp-dadosbr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cristianoaredes/mcp-dadosbr/discussions)
- **Email**: cristiano@aredes.me

---

**Made with ❤️ for the Brazilian developer community and international users**