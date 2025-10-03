# MCP DadosBR 🇧🇷

[![smithery badge](https://smithery.ai/badge/@cristianoaredes/mcp-dadosbr)](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr)
[![npm version](https://badge.fury.io/js/@aredes.me%2Fmcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://mcp-dadosbr.aredes.me/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Servidor MCP para consulta de dados públicos brasileiros**

[Português](#português) | [English](#english)

Acesse dados do governo brasileiro direto em assistentes de IA como Claude Desktop, Cursor e Windsurf. Consulte CNPJ de empresas, CEP, realize buscas inteligentes e análise de dados complexos usando o Model Context Protocol (MCP).

---

## Português

### 🚀 Recursos

- 🏢 **Consulta CNPJ** - Dados de empresas (razão social, situação cadastral, endereço, CNAE)
- 📮 **Consulta CEP** - Informações de endereço (rua, bairro, cidade, estado)
- 🔍 **Busca Inteligente** - Pesquisa web com operadores Google Dork para pesquisas direcionadas
- 🤔 **Raciocínio Estruturado** - Ferramenta de pensamento sequencial para análises complexas
- 🎯 **Inteligência de Pesquisa** - Orquestração de múltiplas consultas para investigações completas

### ⚡ Instalação Rápida

#### Via Smithery (Recomendado)

```bash
npx -y @smithery/cli install @cristianoaredes/mcp-dadosbr --client claude
```

#### Via NPM

```bash
npm install -g @aredes.me/mcp-dadosbr
```

Ou use diretamente com NPX:

```bash
npx @aredes.me/mcp-dadosbr
```

### 🔌 Configuração no Claude Desktop

Adicione ao seu `claude_desktop_config.json`:

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

**Localização do config**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

**Teste**: *"Pode consultar o CNPJ 00.000.000/0001-91?"*

### 💼 Casos de Uso

- **Due Diligence**: Verifique status legal, detalhes de registro e códigos CNAE para parcerias
- **E-commerce e Logística**: Valide endereços de entrega usando CEP para reduzir erros
- **Pesquisa Jurídica**: Busque processos, contratos e editais usando operadores de busca avançados
- **KYC e Compliance**: Automatize verificação de empresas para serviços financeiros

### 🔌 Plataformas Suportadas

**Assistentes de IA**: Claude Desktop, Continue.dev, Cursor, Windsurf  
**Deploy**: Node.js (stdio), Cloudflare Workers (HTTP), Plataforma Smithery  
**Transporte**: stdio para aplicações desktop, HTTP/SSE para web e integrações API

**Demo ao vivo**: [https://mcp-dadosbr.aredes.me](https://mcp-dadosbr.aredes.me)

### 📚 Documentação

#### 🚀 Primeiros Passos
- **[Guia de Configuração](docs/CONFIGURATION.md)** - Variáveis de ambiente, endpoints personalizados
- **[Exemplos de Uso](docs/USAGE_EXAMPLES.md)** - Padrões de integração e exemplos de código
- **[Integração com Clientes MCP](docs/MCP_CLIENT_INTEGRATION.md)** - Setup para Claude, Cursor, Windsurf, Continue.dev

#### 🔧 Recursos Avançados
- **[Operadores de Busca](docs/WEB_SEARCH.md)** - Sintaxe Google Dork para pesquisas direcionadas
- **[Pensamento Sequencial](docs/SEQUENTIAL_THINKING.md)** - Raciocínio estruturado para análise de dados
- **[Ferramenta de Inteligência](docs/USAGE_EXAMPLES.md#intelligence)** - Orquestração multi-query

#### 🌐 Deploy
- **[Cloudflare Workers](docs/CLOUDFLARE_DEPLOYMENT.md)** - Deploy serverless com distribuição global
- **[Plataforma Smithery](smithery.yaml)** - Configuração de deploy com um clique
- **[Provedores de Busca](docs/PROVIDERS.md)** - Setup DuckDuckGo, Tavily, SerpAPI

#### 📚 Referência
- **[Estrutura do Projeto](PROJECT_STRUCTURE.md)** - Organização do código e visão arquitetural
- **[Guia de Navegação](NAVIGATION.md)** - Referência rápida para encontrar documentação
- **[Documentação Completa PT-BR](docs/pt-br/README.md)** - Documentação técnica completa em português
- **[Arquitetura](docs/pt-br/arquitetura/)** - Diagramas e decisões de design
- **[Exemplos Práticos](docs/pt-br/exemplos/)** - Casos de uso brasileiros e tutoriais

### 🛠️ Ferramentas Principais

#### `cnpj_lookup`
Consulta dados de empresas brasileiras por CNPJ.

**Entrada**: Número do CNPJ (formatado ou não)  
**Saída**: Razão social, situação cadastral, endereço, códigos CNAE, data de abertura  
**Fonte**: OpenCNPJ (API pública gratuita)

#### `cep_lookup`
Consulta códigos postais para informações de endereço.

**Entrada**: Número do CEP (formatado ou não)  
**Saída**: Logradouro, bairro, cidade, estado, DDD  
**Fonte**: OpenCEP (API pública gratuita)

#### `cnpj_search`
Busca inteligente na web com operadores avançados para pesquisa de empresas.

**Operadores**: `site:`, `intext:`, `intitle:`, `filetype:`, `-exclude`  
**Casos de Uso**: Processos judiciais, contratos governamentais, notícias, relatórios financeiros

#### `sequentialthinking`
Ferramenta de raciocínio estruturado para análises complexas.

**Recursos**: Pensamento iterativo, revisão de planos, exploração de ramificações  
**Casos de Uso**: Investigações multi-etapas, validação de dados, processos decisórios

#### `intelligence`
Orquestra múltiplas consultas em relatórios abrangentes de inteligência empresarial.

**Capacidades**: Geração automatizada de consultas, execução paralela, síntese de resultados  
**Casos de Uso**: Due diligence, pesquisa de mercado, análise competitiva

### 🤝 Contribuindo

Contribuições são bem-vindas! Veja o [Guia de Contribuição](CONTRIBUTING.md) para setup de desenvolvimento, padrões de código e como submeter pull requests.

**Código de Conduta**: Este projeto segue o [Contributor Covenant](https://www.contributor-covenant.org/).

### 📦 Lançamentos

Este projeto usa lançamentos automatizados com versionamento semântico e geração automática de changelog. Veja o [Guia de Lançamento](RELEASING.md) para instruções detalhadas.

**Lançamento Rápido**: Atualize a versão no [`package.json`](package.json), faça commit, crie uma tag git (`v*.*.*`) e envie para disparar o workflow automatizado.

### 📄 Licença

Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

### 🙏 Créditos

**Fontes de Dados**:
- [OpenCNPJ](https://opencnpj.org/) - Dados públicos de empresas brasileiras
- [OpenCEP](https://opencep.com/) - Base de dados de CEP brasileiros

### 👨‍💻 Autor

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

**Mantenedor**: [Cristiano Aredes](https://github.com/cristianoaredes) | [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) | cristiano@aredes.me

---

**Feito com ❤️ para a comunidade brasileira de desenvolvedores 🇧🇷**

---

## English

**Model Context Protocol Server for Brazilian Public Data**

Access Brazilian government data directly in AI assistants like Claude Desktop, Cursor, and Windsurf. Query CNPJ company records, CEP postal codes, perform intelligent web searches, and analyze complex data using the Model Context Protocol (MCP).

### 🚀 Features

- 🏢 **CNPJ Lookup** - Brazilian company data (legal name, status, address, CNAE codes)
- 📮 **CEP Lookup** - Postal code information (street, neighborhood, city, state)
- 🔍 **Intelligent Search** - Web search with Google Dork operators
- 🤔 **Structured Reasoning** - Sequential thinking for complex analysis
- 🎯 **Research Intelligence** - Multi-query company investigations

### ⚡ Quick Start

#### Via Smithery (Recommended)

```bash
npx -y @smithery/cli install @cristianoaredes/mcp-dadosbr --client claude
```

#### Via NPM

```bash
npm install -g @aredes.me/mcp-dadosbr
```

Or use with NPX:

```bash
npx @aredes.me/mcp-dadosbr
```

### 🔌 Configure in Claude Desktop

Add to `claude_desktop_config.json`:

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

**Test**: *"Can you look up CNPJ 00.000.000/0001-91?"*

### 💼 Use Cases

- **Due Diligence**: Verify legal entity status and registration details
- **E-commerce & Logistics**: Validate shipping addresses using CEP lookup
- **Legal Research**: Search government databases for lawsuits and contracts
- **KYC & Compliance**: Automate company verification for financial services

### 📚 Documentation

- **[Configuration Guide](docs/CONFIGURATION.md)** - Environment variables and custom endpoints
- **[Usage Examples](docs/USAGE_EXAMPLES.md)** - Integration patterns and code samples
- **[MCP Client Integration](docs/MCP_CLIENT_INTEGRATION.md)** - Setup for Claude, Cursor, Windsurf
- **[Cloudflare Workers](docs/CLOUDFLARE_DEPLOYMENT.md)** - Serverless deployment guide
- **[Release Guide](RELEASING.md)** - Automated release process

### 🤝 Contributing

Contributions welcome! See [Contributing Guide](CONTRIBUTING.md) for development setup and coding standards.

### 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

**Made with ❤️ for the Brazilian developer community 🇧🇷**