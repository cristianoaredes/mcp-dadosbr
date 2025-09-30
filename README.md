[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/cristianoaredes-mcp-dadosbr-badge.png)](https://mseep.ai/app/cristianoaredes-mcp-dadosbr)

# MCP DadosBR 🇧🇷

[![smithery badge](https://smithery.ai/badge/@cristianoaredes/mcp-dadosbr)](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr)
[![npm version](https://badge.fury.io/js/@aredes.me%2Fmcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![npm downloads](https://img.shields.io/npm/dm/@aredes.me/mcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://mcp-dadosbr.aredes.me/)

> **🤖 Model Context Protocol (MCP) server for Brazilian public data lookup - Company (CNPJ) and postal code (CEP) information directly in Claude Desktop, Cursor, Windsurf, Continue.dev, and other AI assistants**

🚀 **Multi-platform deployment: NPM package, Cloudflare Workers, and Smithery support!**

_[English](#english) | [Português](#português)_

---

## Português

🇧🇷 **Servidor MCP para consulta de dados públicos brasileiros.** Integre informações de CNPJ (empresas) e CEP (códigos postais) diretamente no Claude Desktop, Cursor, Windsurf, Continue.dev e outros assistentes de IA.

## ⚡ Instalação Rápida

### Installing via Smithery

To install mcp-dadosbr automatically via [Smithery](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr):

```bash
npx -y @smithery/cli install @cristianoaredes/mcp-dadosbr --client claude
```

### Manual Installation
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

**✅ Teste:** `Pode consultar o CNPJ 11.222.333/0001-81?`

## 🛠️ Ferramentas Disponíveis

### 🏢 `cnpj_lookup` - Consulta de Empresas  
- **Entrada**: CNPJ (formatado ou não)
- **Saída**: Nome, endereço, situação cadastral
- **Exemplo**: `11.222.333/0001-81`

### 📮 `cep_lookup` - Consulta de CEP
- **Entrada**: CEP (formatado ou não)
- **Saída**: Logradouro, bairro, cidade, estado  
- **Exemplo**: `01310-100`

## 🌐 Deploy Web (Opcional)

**Cloudflare Workers**: https://mcp-dadosbr.aredes.me
- 🔗 API REST: `/cnpj/{cnpj}`, `/cep/{cep}`  
- 🤖 ChatGPT: `/openapi.json`
- 📊 Health: `/health`

---

## English

🤖 **Model Context Protocol (MCP) server providing Brazilian public data lookup capabilities.** Seamlessly integrate CNPJ (company) and CEP (postal code) data into Claude Desktop, Cursor, Windsurf, Continue.dev, and other AI coding assistants.

## ⚡ Quick Install

### Installing via Smithery

To install mcp-dadosbr automatically via [Smithery](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr):

```bash
npx -y @smithery/cli install @cristianoaredes/mcp-dadosbr
```

### Manual Installation
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
- **Output**: Name, address, registration status
- **Example**: `11.222.333/0001-81`

### 📮 `cep_lookup` - Postal Code Lookup  
- **Input**: CEP (formatted or not)
- **Output**: Street, neighborhood, city, state
- **Example**: `01310-100`

## 🌐 Web Deploy (Optional)

**Cloudflare Workers**: https://mcp-dadosbr.aredes.me
- 🔗 REST API: `/cnpj/{cnpj}`, `/cep/{cep}`
- 🤖 ChatGPT: `/openapi.json`
- 📊 Health: `/health`

**✅ Test:** `Can you look up CNPJ 11.222.333/0001-81?`

---

## 📚 Documentation

- 📖 **[Configuration Guide](docs/CONFIGURATION.md)** - Advanced setup options
- 💡 **[Usage Examples](docs/USAGE_EXAMPLES.md)** - Real-world patterns  
- 🔧 **[MCP Client Integration](docs/MCP_CLIENT_INTEGRATION.md)** - Detailed IDE setup
- ☁️ **[Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md)** - Web deployment

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
