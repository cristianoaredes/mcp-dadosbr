# MCP DadosBR 🇧🇷

[![smithery badge](https://smithery.ai/badge/@cristianoaredes/mcp-dadosbr)](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr)
[![npm version](https://badge.fury.io/js/@aredes.me%2Fmcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://mcp-dadosbr.aredes.me/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Model Context Protocol Server for Brazilian Public Data**

[English](#english) | [Português](#português)

Access Brazilian government data directly in AI assistants like Claude Desktop, Cursor, and Windsurf. Query CNPJ company records, CEP postal codes, perform intelligent web searches, and analyze complex data using the Model Context Protocol (MCP).

---

## 🚀 Features

- 🏢 **CNPJ Lookup** - Brazilian company data (legal name, status, address, CNAE activity codes)
- 📮 **CEP Lookup** - Postal code information (street, neighborhood, city, state)
- 🔍 **Intelligent Search** - Web search with Google Dork operators for targeted research
- 🤔 **Structured Reasoning** - Sequential thinking tool for complex analysis
- 🎯 **Research Intelligence** - Orchestrated multi-query company investigations

## ⚡ Quick Start

Install globally via NPM:

### Installing via Smithery

To install mcp-dadosbr automatically via [Smithery](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr):

```bash
npx -y @smithery/cli install @cristianoaredes/mcp-dadosbr --client claude
```

### Manual Installation

```bash
npm install -g @aredes.me/mcp-dadosbr
```

Or use directly with NPX:

```bash
npx @aredes.me/mcp-dadosbr
```

### Configure in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["-y", "@aredes.me/mcp-dadosbr"]
    }
  }
}
```

**Config location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

Test with: *"Can you look up CNPJ 00.000.000/0001-91?"*

## 💼 Use Cases

**Company Due Diligence**: Verify legal entity status, registration details, and business activity codes for procurement and partnerships.

**E-commerce & Logistics**: Validate shipping addresses using CEP lookup to reduce delivery errors and optimize routing.

**Legal Research**: Search government databases for lawsuits, contracts, and procurement documents using intelligent web search with site operators.

**KYC & Compliance**: Automate company verification for financial services, combining CNPJ data with web research for comprehensive due diligence.

## 🔌 Supported Platforms

**AI Assistants**: Claude Desktop, Continue.dev, Cursor, Windsurf  
**Deployment**: Node.js (stdio), Cloudflare Workers (HTTP), Smithery Platform  
**Transport**: stdio for desktop applications, HTTP/SSE for web and API integrations

**Live Demo**: [https://mcp-dadosbr.aredes.me](https://mcp-dadosbr.aredes.me)

## 📚 Documentation

### 🚀 Getting Started
- **[Configuration Guide](docs/CONFIGURATION.md)** - Environment variables, custom API endpoints, authentication
- **[Usage Examples](docs/USAGE_EXAMPLES.md)** - Real-world integration patterns and code samples
- **[MCP Client Integration](docs/MCP_CLIENT_INTEGRATION.md)** - Detailed setup for Claude, Cursor, Windsurf, Continue.dev

### 🔧 Advanced Features
- **[Web Search Operators](docs/WEB_SEARCH.md)** - Google Dork syntax for targeted research queries
- **[Sequential Thinking](docs/SEQUENTIAL_THINKING.md)** - Structured reasoning for complex data analysis
- **[Intelligence Tool](docs/USAGE_EXAMPLES.md#intelligence)** - Multi-query orchestration for comprehensive research

### 🌐 Deployment
- **[Cloudflare Workers](docs/CLOUDFLARE_DEPLOYMENT.md)** - Serverless deployment with global edge distribution
- **[Smithery Platform](smithery.yaml)** - One-click deployment configuration
- **[Search Providers](docs/PROVIDERS.md)** - DuckDuckGo, Tavily, SerpAPI setup and comparison

### 📚 Reference
- **[Project Structure](PROJECT_STRUCTURE.md)** - Codebase organization and architecture overview
- **[Navigation Guide](NAVIGATION.md)** - Quick reference for finding documentation

### 🇧🇷 Português
- **[Documentação Completa PT-BR](docs/pt-br/README.md)** - Complete technical documentation in Brazilian Portuguese
- **[Arquitetura](docs/pt-br/arquitetura/)** - Detailed architectural diagrams and design decisions
- **[Exemplos Práticos](docs/pt-br/exemplos/)** - Brazilian use cases and step-by-step tutorials

## 🛠️ Key Tools

### `cnpj_lookup`
Query Brazilian company data by CNPJ (Cadastro Nacional da Pessoa Jurídica).

**Input**: CNPJ number (formatted or raw)  
**Output**: Company name, legal status, address, CNAE codes, registration date  
**Data Source**: OpenCNPJ (free public API)

### `cep_lookup`
Query Brazilian postal codes for address information.

**Input**: CEP number (formatted or raw)  
**Output**: Street name, neighborhood, city, state, area code  
**Data Source**: OpenCEP (free public API)

### `cnpj_search`
Perform intelligent web searches with advanced operators for company research.

**Operators**: `site:`, `intext:`, `intitle:`, `filetype:`, `-exclude`  
**Use Cases**: Find lawsuits, government contracts, news articles, financial reports

### `sequentialthinking`
Structured reasoning tool for breaking down complex analysis into logical steps.

**Features**: Iterative thinking, plan revision, branch exploration  
**Use Cases**: Multi-step investigations, data validation, decision-making processes

### `intelligence`
Orchestrate multiple research queries into comprehensive company intelligence reports.

**Capabilities**: Automated query generation, parallel search execution, result synthesis  
**Use Cases**: Due diligence, market research, competitive analysis

## 🤝 Contributing

We welcome contributions from the community! See the [Contributing Guide](CONTRIBUTING.md) for development setup, coding standards, and how to submit pull requests.

**Code of Conduct**: This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.

## 📦 Releases

This project uses automated releases with semantic versioning and changelog generation. See the [Release Guide](RELEASING.md) for detailed instructions on:

- Creating new releases
- Version tagging process
- Automated workflows
- Rollback procedures

**Quick Release**: Update [`package.json`](package.json) version, commit, create a git tag (`v*.*.*`), and push to trigger automated release workflow.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Credits

**Data Sources**:
- [OpenCNPJ](https://opencnpj.org/) - Free Brazilian company registry data
- [OpenCEP](https://opencep.com/) - Free Brazilian postal code database

## 👨‍💻 Author

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/cristianoaredes">
        <img src="https://github.com/cristianoaredes.png" width="100px;" alt="Cristiano Aredes"/><br />
        <sub><b>Cristiano Aredes</b></sub>
      </a><br />
      <a href="https://www.linkedin.com/in/cristianoaredes/" title="LinkedIn">💼</a>
      <a href="https://github.com/cristianoaredes" title="Code">💻</a>
      <a href="mailto:cristiano@aredes.me" title="Email">📧</a>
    </td>
  </tr>
</table>

### Installing via Smithery

Para instalar automaticamente via [Smithery](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr):

```bash
npx -y @smithery/cli install @cristianoaredes/mcp-dadosbr --client claude
```

### Instalação Manual

**Maintainer**: [Cristiano Aredes](https://github.com/cristianoaredes) | [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) | cristiano@aredes.me

---

## Português

🇧🇷 **Servidor MCP para consulta de dados públicos brasileiros.**

Integre informações de CNPJ (empresas) e CEP (códigos postais) diretamente no Claude Desktop, Cursor, Windsurf, Continue.dev e outros assistentes de IA compatíveis com o Model Context Protocol.

### ⚡ Instalação

```bash
npm install -g @aredes.me/mcp-dadosbr
```

### 🔌 Configuração

Configure no Claude Desktop editando `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["-y", "@aredes.me/mcp-dadosbr"]
    }
  }
}
```

**Teste**: *"Pode consultar o CNPJ 00.000.000/0001-91?"*

### 📖 Documentação Completa

Acesse a **[documentação completa em português](docs/pt-br/README.md)** para:
- Guias de instalação detalhados para cada IDE
- Exemplos de uso com casos brasileiros
- Arquitetura e design do sistema
- Configuração avançada e personalização
- Tutoriais passo a passo

### 📦 Lançamentos

O projeto utiliza lançamentos automatizados com versionamento semântico e geração automática de changelog. Consulte o [Guia de Lançamento](RELEASING.md) para instruções detalhadas sobre:

- Criação de novos lançamentos
- Processo de versionamento
- Fluxos de trabalho automatizados
- Procedimentos de rollback

**Lançamento Rápido**: Atualize a versão no [`package.json`](package.json), faça commit, crie uma tag git (`v*.*.*`) e envie para disparar o fluxo automatizado.

---

**Made with ❤️ for the Brazilian developer community 🇧🇷**