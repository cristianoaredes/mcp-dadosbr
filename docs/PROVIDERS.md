# Search Providers Guide (v0.3.2)

## Overview

A partir da versão `0.3.2`, o MCP DadosBR utiliza **exclusivamente a Tavily API** para buscas web na ferramenta `cnpj_intelligence`. O antigo fallback gratuito via DuckDuckGo foi removido para garantir resultados consistentes e 100% assertivos.

> ❗️ **Breaking change**: `TAVILY_API_KEY` agora é obrigatória para `cnpj_search` e `cnpj_intelligence`.

---

## 🔍 Tavily (Pago) — Provider Único

### Características
- ✅ **Alta qualidade**: Resultados otimizados para LLMs e agentes
- ✅ **Sem rate limiting**: Sem bloqueios nem delays artificiais
- ✅ **Rápido**: Respostas em milissegundos
- ✅ **Confiável**: Ambiente desenhado para produção
- 💰 **Custo**: ~US$ 1 por 1.000 buscas (1000 consultas grátis/mês)

### Configuração

#### 1. Criar Conta
1. Acesse: https://tavily.com
2. Crie uma conta
3. Obtenha sua API key no dashboard

#### 2. Configurar API Key

**Opção A: Variável de Ambiente (Recomendado)**
```bash
# ~/.bashrc ou ~/.zshrc
export TAVILY_API_KEY="tvly-xxxxxxxxxxxxxxxxxxxxxxxx"

# Ou no Claude Desktop config
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"],
      "env": {
        "TAVILY_API_KEY": "tvly-xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

**Opção B: Programático**
```typescript
import { TavilyProvider } from './lib/core/search-providers.js';

const provider = new TavilyProvider('tvly-xxxxxxxxxxxxxxxxxxxxxxxx');
```

### Uso
```typescript
cnpj_intelligence({
  cnpj: "00000000000191",
  provider: "tavily",
  max_results_per_query: 5,
  max_queries: 10
})
```

### Preços (2025)
- **Basic**: $1/1000 searches
- **Advanced**: $2/1000 searches (busca mais profunda)
- Free tier: 1000 searches/mês grátis para começar

### Quando Usar
- ✅ Produção
- ✅ Due diligence importante
- ✅ Investigações que precisam de qualidade
- ✅ Quando buscas precisam de precisão comprovada

---

## 💡 Recomendações

### Para Produção
```typescript
// Use Tavily
cnpj_intelligence({
  cnpj: "00000000000191",
  provider: "tavily",
  max_queries: 10,
  categories: ["government", "legal", "news"]
})
```

### Para Investigações Importantes
```typescript
// Use Tavily com busca avançada
// Configure search_depth: 'advanced' no provider
```

---

## 🔐 Segurança

### Boas Práticas
1. ✅ Use variáveis de ambiente para API keys
2. ✅ Nunca commite API keys no código
3. ✅ Rotacione keys periodicamente
4. ✅ Monitore uso para evitar custos inesperados

### Exemplo de .env
```bash
# .env (NÃO commitar!)
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxxxxxx
```

### Gitignore
```bash
# .gitignore
.env
.env.local
*.key
```

---

## 📊 Comparação Detalhada
### Monitoramento de Uso

- Configure alertas no painel da Tavily
- Monitore o número de queries realizadas por investigação (`queries_executed` no resultado)
- Ajuste `max_queries` conforme necessidade

---

## 🆘 Troubleshooting Tavily

### Tavily não funciona?
```bash
# Erro: "Tavily API key not configured"

Verificar:
1. API key está no .env?
2. Variável foi exportada?
3. API key é válida?
4. Tem créditos na conta?

Testar:
curl -X POST "https://api.tavily.com/search" \
  -H "Content-Type: application/json" \
  -d '{"api_key": "tvly-xxx", "query": "test"}'
```

---

## 📚 Links Úteis

- **Tavily**: https://tavily.com
- **Tavily Docs**: https://docs.tavily.com

---

**Related Documentation**:
- [CNPJ Intelligence Tool](./CNPJ_INTELLIGENCE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Web Search Tool](./WEB_SEARCH.md)
