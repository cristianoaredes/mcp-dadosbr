# 📚 MCP DadosBR Documentation

Welcome to the MCP DadosBR documentation! This directory contains comprehensive guides and technical documentation for the Brazilian public data MCP server.

## 🏗️ Architecture Overview

**Modular Design**: Built with a clean, scalable architecture:

- **Core Engine** (`lib/core/`): MCP server, tools, caching, HTTP client, validation
- **Adapters** (`lib/adapters/`): CLI (stdio), Cloudflare Workers, Smithery deployment  
- **Configuration** (`lib/config/`): Environment-based config with `.mcprc.json` support
- **Types** (`lib/types/`): TypeScript interfaces and type definitions

**Key Features**:
- 🔄 **Request Deduplication**: Prevents concurrent identical API calls
- ⚡ **Circuit Breaker**: Automatic failure protection with 30s recovery
- 💾 **Smart Caching**: LRU cache with TTL and automatic cleanup
- 📊 **Built-in Metrics**: Request tracking, cache hits, error rates
- 🔧 **Configurable APIs**: Support for custom CNPJ/CEP endpoints
- 🔐 **Authentication**: Flexible header-based auth for custom APIs

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
- **[Cloudflare Workers](CLOUDFLARE_DEPLOYMENT.md)** - Serverless deployment with global edge performance

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
- **Output**: Company data including name, address, registration status, CNAE, capital
- **APIs**: OpenCNPJ (default) or custom via configuration

### `cep_lookup`
Look up Brazilian postal code information by CEP.
- **Input**: CEP string (with or without formatting)  
- **Output**: Address data including street, neighborhood, city, state, area code
- **APIs**: OpenCEP (default) or custom via configuration

## 🔧 Configuration Options

**Environment Variables:**
- `CNPJ_API_BASE_URL` - Custom CNPJ API endpoint
- `CEP_API_BASE_URL` - Custom CEP API endpoint  
- `API_KEY_HEADER` / `API_KEY_VALUE` - Authentication
- `MCP_CACHE_SIZE` - Cache size (default: 256)
- `MCP_CACHE_TTL` - Cache TTL in ms (default: 60000)
- `MCP_TRANSPORT` - Transport mode: `stdio` (default) or `http`
- `MCP_HTTP_PORT` - HTTP port when using http transport (default: 3000)

**Configuration File** (`.mcprc.json`):
```json
{
  "apiUrls": {
    "cnpj": "https://your-api.com/api/v1/",
    "cep": "https://your-api.com/api/v1/"
  },
  "auth": {
    "headers": {
      "X-API-Key": "your-secret-key",
      "Authorization": "Bearer your-token"
    }
  }
}
```

## 🚀 Available Scripts

**Development:**
```bash
npm run dev          # Start with stdio transport
MCP_TRANSPORT=http npm run dev  # Start with HTTP transport
```

**Production:**
```bash
npm run build        # Build TypeScript
npm start           # Run built CLI adapter
npm run deploy      # Deploy to Cloudflare Workers
```

**Testing:**
```bash
npm test            # Run integration tests
npm run mcp:test    # Test both CNPJ and CEP lookups
```

## 📞 Support

- **GitHub**: [Issues](https://github.com/cristianoaredes/mcp-dadosbr/issues)
- **NPM**: [@aredes.me/mcp-dadosbr](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)