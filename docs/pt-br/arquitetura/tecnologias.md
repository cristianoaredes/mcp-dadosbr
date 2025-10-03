# Tecnologias e Dependências

## Stack Principal

- **Runtime:** Node.js 18+ / Cloudflare Workers
- **Linguagem:** TypeScript 5.x
- **Protocol:** Model Context Protocol (MCP) SDK 1.18.2

## Dependências de Produção

| Dependência | Versão | Propósito |
|-------------|--------|-----------|
| `@modelcontextprotocol/sdk` | 1.18.2 | SDK oficial do MCP |
| `@smithery/sdk` | 1.6.6 | Deploy na plataforma Smithery |
| `async-mutex` | 0.5.0 | Locks para operações thread-safe |
| `chalk` | 5.6.2 | Colorização de terminal |
| `duck-duck-scrape` | 2.2.7 | Busca no DuckDuckGo |
| `express` | 5.0.1 | Servidor HTTP (modo HTTP) |
| `tavily` | 1.0.2 | API Tavily Search |
| `zod` | 3.23.8 | Validação de schemas |

## Dependências de Desenvolvimento

| Dependência | Versão | Propósito |
|-------------|--------|-----------|
| `@cloudflare/workers-types` | 4.x | Types do Cloudflare Workers |
| `vitest` | 2.0.0 | Test runner |
| `@vitest/ui` | 2.0.0 | Interface de testes |
| `c8` | 9.0.0 | Code coverage |
| `tsx` | 4.0.0 | TypeScript executor |
| `wrangler` | 4.40.2 | CLI do Cloudflare |

## Sistema de Build

### Build Local
```bash
npm run build          # Compila TypeScript para build/
npm run build:worker   # Compila para Cloudflare Workers
```

### Configurações TypeScript

O projeto utiliza duas configurações TypeScript distintas:

- **[`tsconfig.json`](../../../tsconfig.json)**: Configuração para Node.js
- **[`tsconfig.worker.json`](../../../tsconfig.worker.json)**: Configuração para Cloudflare Workers

### NPM Package
```bash
npm publish           # Publica no npm registry
```
- **Entry point:** `build/lib/bin/mcp-dadosbr.js`
- **Binário:** `mcp-dadosbr`
- **Files:** Apenas `build/`, `README.md`, `LICENSE`

### Cloudflare Workers
```bash
npm run deploy        # Deploy para produção
npm run deploy:staging # Deploy para staging
wrangler tail         # Ver logs em tempo real
```
- **URL:** https://mcp-dadosbr.aredes.me
- **KV:** Cache global compartilhado
- **Secrets:** Via `wrangler secret put`

### Smithery
```bash
smithery deploy       # Deploy automático
```
- **Marketplace:** smithery.ai/server/dadosbr
- **Auto-update:** Via CI/CD

## Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev           # Roda em modo dev com tsx
npm run build         # Compila TypeScript
npm start             # Roda versão compilada
```

### Testes
```bash
npm test              # Todos os testes
npm run test:watch    # Watch mode
npm run test:ui       # UI interativa
npm run test:coverage # Coverage report
npm run test:integration # Testes de integração
```

### MCP Client
```bash
npm run mcp:start     # Inicia em modo HTTP
npm run mcp:cnpj      # Testa CNPJ lookup
npm run mcp:cep       # Testa CEP lookup
npm run mcp:test      # Roda todos os testes MCP
```

### Cloudflare
```bash
npm run deploy        # Deploy produção
npm run deploy:staging # Deploy staging
npm run cf:logs       # Tail logs
npm run cf:kv:create  # Criar KV namespace
```

### Exemplos
```bash
npm run test:sse      # Testa SSE client
```

## APIs Externas

### APIs Padrão (Gratuitas)
- **OpenCNPJ:** https://api.opencnpj.org/
  - Dados de empresas brasileiras
  - Sem autenticação
  - Rate limit razoável

- **OpenCEP:** https://opencep.com/v1/
  - Dados de CEP brasileiros
  - Sem autenticação
  - Rate limit razoável

### APIs Opcionais (Pagas)
- **Tavily Search:** https://tavily.com
  - API paga de busca
  - Sem rate limit
  - Requer `TAVILY_API_KEY`

- **SerpAPI:** https://serpapi.com
  - API paga Google Search
  - Sem rate limit
  - Não implementado (apenas stubs)

### Configuração de APIs Customizadas
```json
{
  "cnpjApiUrl": "https://minha-api.com/cnpj/",
  "cnpjAuthHeader": "Bearer meu-token",
  "cepApiUrl": "https://minha-api.com/cep/",
  "cepAuthHeader": "X-API-Key: minha-chave"
}
```

## Recursos Adicionais

### Documentação Oficial
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Vitest](https://vitest.dev/)

### APIs Utilizadas
- [OpenCNPJ API](https://opencnpj.org/)
- [OpenCEP API](https://opencep.com/)
- [Tavily Search](https://tavily.com/)
- [DuckDuckGo](https://duckduckgo.com/)