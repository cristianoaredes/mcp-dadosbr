# 📚 MCP DadosBR Documentation

Welcome to the MCP DadosBR documentation! This directory contains comprehensive guides and technical documentation for the Brazilian public data MCP server.

## 🚀 Quick Start

1. **Install globally:**
   ```bash
   npm install -g @aredes.me/mcp-dadosbr
   ```

2. **Configure your AI tool:**
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

3. **Test with examples:**
   - CNPJ: `11.222.333/0001-81`
   - CEP: `01310-100`

## 📖 Complete Documentation

### **Core Guides**
- **[Configuration Guide](CONFIGURATION.md)** - Environment variables, caching, API customization
- **[Usage Examples](USAGE_EXAMPLES.md)** - Real-world usage patterns and code examples
- **[MCP Client Integration](MCP_CLIENT_INTEGRATION.md)** - Integration with Claude Desktop, Continue.dev, Cline, and more

### **Deployment**
- **[Cloudflare Workers](CLOUDFLARE_DEPLOYMENT.md)** - Deploy to Cloudflare Workers with ChatGPT integration

## 🔧 IDE Quick Setup

### **Claude Desktop**
**File**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
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

### **Continue.dev / Cline**
**File**: `~/.continue/config.json`
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

### **Windsurf IDE**
**File**: Settings → MCP Servers
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

## 🧪 Testing

**Debug mode:**
```bash
DEBUG=1 npx @aredes.me/mcp-dadosbr
```

**HTTP mode:**
```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=3000 npx @aredes.me/mcp-dadosbr
```

## 🛠️ Available Tools

### `cnpj_lookup`
Look up Brazilian company information by CNPJ number.
- **Input**: CNPJ string (with or without formatting)
- **Output**: Company data from OpenCNPJ API

### `cep_lookup`
Look up Brazilian postal code information by CEP.
- **Input**: CEP string (with or without formatting)
- **Output**: Address data from OpenCEP API

## 📞 Support

- **GitHub**: [Issues](https://github.com/cristianoaredes/mcp-dadosbr/issues)
- **NPM**: [@aredes.me/mcp-dadosbr](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)