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
- **[PT-BR Documentation Hub](pt-br/README.md)** - Complete Portuguese (PT-BR) architecture & development index
- **[Code Review & Metrics](pt-br/desenvolvimento/metricas.md)** - Test suites, resilience, and quality gates
- **[Testing](../README.md#desenvolvimento-e-contribuição)** - Unit tests, transport smoke suite, and Cloudflare Worker validation
- **[Project Governance](../.archagents/README.md)** - Traceable `codebase-ops` backlog, designs, runs, and P10 verifications

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

## 🛠️ Available Tools (29 Tools + 5 MCP Apps in v0.7.0)

> **Version note:** Repository `main` holds **v0.7.0** (29 tools across 6 domains + 5 interactive `ui://dadosbr/*.html` MCP Apps); npm `latest` currently distributes **v0.6.0** (23 tools). See the [complete catalog in `README.md`](../README.md#catálogo-completo-das-29-ferramentas) and [`llms.txt`](../llms.txt).

| Domain | Count | Tools | Key Features |
|--------|-------|-------|--------------|
| Cadastro, Endereços & Classificação | 5 | `cnpj_lookup` (**MCP App**), `cep_lookup`, `cpf_validate`, `cnae_ncm_lookup`, `feriados_ddd_lookup` | OpenCNPJ/OpenCEP (SSRF allowlist), local mod-11 CPF check, IBGE CNAE v2, BrasilAPI NCM/holidays/DDD |
| Governo, Diários, Contratações & Indicadores | 6 | `ibge_localidades` (**MCP App**), `ibge_indicadores`, `querido_diario` (**MCP App**), `pncp_licitacoes` (**MCP App**), `transparencia_lookup`, `ceis_cnep_lookup` | IBGE localities & population/GDP, municipal gazettes, PNCP Law 14.133 notices, CGU Portal da Transparência & sanctions |
| Financeiro e Mercado | 4 | `bacen_taxas` (**MCP App**), `bcb_olinda`, `sistema_financeiro_lookup`, `fipe_veiculos` | Banco Central BCData/SGS & Olinda PTAX/Focus, Pix/ISPB/CVM registries, FIPE tables |
| Jurídico, Compliance e Integridade | 6 | `datajud_processos`, `tcu_certidoes`, `oab_advogado`, `bnmp_mandados`, `procurados_lookup`, `lista_suja_lookup` | CNJ DataJud, TCU consolidated certificates, CAPTCHA-honest OAB/BNMP, MJSP Captura, official MTE CSV |
| Saúde e Consumo | 2 | `cnes_saude`, `consumidor_reclamacoes` | DataSUS CNES (27 UF codes), guided Consumidor.gov.br open-data fallback |
| Inteligência, Busca Web & Raciocínio | 6 | `cnpj_search`, `cnpj_intelligence`, `company_deep_profile`, `domain_whois`, `strategic_osint_prompt`, `sequentialthinking` | Tavily/Perplexity web OSINT, RDAP WHOIS, parallel due diligence, structured thinking |

## 📊 Quality Metrics

- **Vitest Test Suite (`v0.7.0`):** `39` test files, `540/540` tests passing (`100%`) + `npm run test:transport` (101 stdio calls & HTTP/SSE)
- **Code Coverage:** measured on demand via `npm run test:coverage` (`vitest run --coverage`)
- **TypeScript:** Strict mode ✅ (`tsc` + `tsc -p tsconfig.worker.json`)
- **Thread-Safe:** 100% ✅
- **LGPD Compliant:** ✅ (`PRIVACY.md` & `HOMONYM_HUMAN_REVIEW_NOTICE`)
- **Production Ready:** ✅

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