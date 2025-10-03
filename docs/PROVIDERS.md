# Search Providers Guide

## Overview

O MCP DadosBR suporta múltiplos providers de busca para a ferramenta `cnpj_intelligence`. Cada provider tem suas vantagens e limitações.

## 📋 Providers Disponíveis

| Provider | Custo | Qualidade | Rate Limiting | Status |
|----------|-------|-----------|---------------|--------|
| **DuckDuckGo** | Grátis | Baixa-Média | Muito Agressivo | ⚠️ Limitado |
| **Tavily** | Pago | Alta | Nenhum | ✅ Recomendado |
| **SerpAPI** | Pago | Muito Alta | Generoso | 🔜 Em breve |

---

## 🦆 DuckDuckGo (Free)

### Características
- ✅ **Grátis**: Sem custo
- ⚠️ **Rate Limiting Agressivo**: Pode bloquear até primeira requisição
- ⚠️ **Qualidade Baixa**: Resultados menos relevantes que Google
- ⚠️ **IP Blocking**: Pode bloquear seu IP temporariamente

### Configuração
```bash
# Nenhuma configuração necessária
# É o provider padrão
```

### Uso
```typescript
cnpj_intelligence({
  cnpj: "00000000000191",
  provider: "duckduckgo"  // ou omitir (é o default)
})
```

### Limitações Conhecidas
1. **Bloqueio agressivo**: DuckDuckGo detecta buscas automatizadas e bloqueia
2. **Delay de 3 segundos**: Entre cada busca (ainda assim pode bloquear)
3. **Qualidade inferior**: Resultados menos relevantes
4. **Não recomendado para produção**

---

## 🔍 Tavily (Paid) ⭐ RECOMENDADO

### Características
- ✅ **Alta Qualidade**: Otimizado para LLMs e agents
- ✅ **Sem Rate Limiting**: Sem bloqueios
- ✅ **Rápido**: Respostas em milissegundos
- ✅ **Confiável**: Desenhado para uso em produção
- 💰 **Custo**: ~$1 USD por 1.000 buscas

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
- ✅ Quando DuckDuckGo está bloqueando

---

## 🔧 SerpAPI (Coming Soon)

### Características
- ✅ **Qualidade Máxima**: Resultados do Google real
- ✅ **Dados Estruturados**: JSON limpo e estruturado
- 💰 **Mais Caro**: ~$50/mês por 5.000 buscas

### Status
🔜 **Em desenvolvimento**. A estrutura está pronta, implementação em breve.

---

## 🎯 Seleção Automática de Provider

O sistema pode selecionar automaticamente o melhor provider disponível:

```typescript
cnpj_intelligence({
  cnpj: "00000000000191"
  // provider não especificado
})

// Ordem de preferência:
// 1. Se TAVILY_API_KEY configurada → Tavily
// 2. Se SERPAPI_KEY configurada → SerpAPI  
// 3. Fallback → DuckDuckGo (grátis mas limitado)
```

---

## 💡 Recomendações

### Para Desenvolvimento
```typescript
// Use DuckDuckGo com queries limitadas
cnpj_intelligence({
  cnpj: "00000000000191",
  provider: "duckduckgo",
  max_queries: 2,  // Limitar para evitar bloqueio
  categories: ["government"]  // Apenas 1 categoria
})
```

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
SERPAPI_KEY=xxxxxxxxxxxxxxxxxxxxx
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

### Qualidade dos Resultados
```
SerpAPI     ████████████████████ 100%
Tavily      ████████████████░░░░  80%
DuckDuckGo  ████████░░░░░░░░░░░░  40%
```

### Velocidade
```
Tavily      ████████████████████ <500ms
DuckDuckGo  ██████████░░░░░░░░░░ ~1000ms (+ delays)
SerpAPI     ████████████░░░░░░░░ ~700ms
```

### Custo (1000 buscas)
```
DuckDuckGo  Grátis
Tavily      $1 USD
SerpAPI     $10 USD
```

---

## 🆘 Troubleshooting

### DuckDuckGo bloqueando?
```bash
# Erro: "DDG detected an anomaly in the request"

Soluções:
1. Aguarde alguns minutos
2. Use Tavily
3. Reduza max_queries
4. Aumente intervalo entre requests
```

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
- **SerpAPI**: https://serpapi.com
- **DuckDuckGo**: https://duckduckgo.com

---

**Related Documentation**:
- [CNPJ Intelligence Tool](./CNPJ_INTELLIGENCE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Web Search Tool](./WEB_SEARCH.md)
