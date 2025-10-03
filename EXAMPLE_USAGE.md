# 🎯 Exemplos de Uso - MCP DadosBR v0.2.0

## 📋 Ferramentas Disponíveis

1. **cnpj_lookup** - Busca básica de CNPJ
2. **cep_lookup** - Busca de CEP
3. **sequentialthinking** - Pensamento estruturado para análises complexas
4. **cnpj_search** - Busca manual na web (limitado)
5. **cnpj_intelligence** - Busca inteligente automática ⭐ NOVO

---

## 🏢 Exemplo 1: Busca Básica de Empresa

**Prompt no Claude Desktop:**
```
Pode consultar o CNPJ 00.000.000/0001-91 para mim?
```

**O que acontece:**
- Claude usa `cnpj_lookup`
- Retorna: razão social, endereço, situação cadastral, sócios, capital social
- Tempo: ~300-500ms

---

## 🧠 Exemplo 2: Investigação Complexa com Sequential Thinking

**Prompt no Claude Desktop:**
```
Use sequential thinking para planejar uma investigação completa sobre a empresa CNPJ 00.000.000/0001-91
```

**O que acontece:**
1. Claude começa com `sequentialthinking` - Thought 1/N
2. Planeja os passos da investigação
3. Executa cada passo (cnpj_lookup, buscas, etc)
4. Revisa e ajusta o plano conforme descobre informações
5. Conclui com análise final

**Exemplo de Output:**
```
┌─────────────────────────────────────────────────┐
│ 💭 Thought 1/5                                  │
├─────────────────────────────────────────────────┤
│ Iniciando investigação do CNPJ 00000000000191  │
│ Plano: 1) Dados básicos 2) Histórico legal     │
│ 3) Presença online 4) Análise de sócios        │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Exemplo 3: Intelligence Automática (Recomendado)

### Com Tavily (Produção)

**Configuração:**
```bash
# No Claude Desktop config
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"],
      "env": {
        "TAVILY_API_KEY": "tvly-xxxxxxxx"
      }
    }
  }
}
```

**Prompt:**
```
Faça uma investigação completa usando cnpj_intelligence sobre o CNPJ 00.000.000/0001-91 com o provider Tavily
```

**O que acontece:**
1. ✅ Busca dados do CNPJ automaticamente
2. ✅ Gera 10+ dorks inteligentes baseados nos dados
3. ✅ Busca em múltiplas categorias:
   - Government (gov.br, transparência)
   - Legal (jusbrasil, tribunais)
   - News (g1, folha, estadão)
   - Documents (PDFs, planilhas)
   - Social (LinkedIn, GitHub)
   - Partners (sócios e diretores)
4. ✅ Consolida todos os resultados
5. ✅ Retorna análise completa

**Vantagens:**
- 🚀 Rápido (sem rate limiting)
- ✅ Confiável (Tavily não bloqueia)
- 📊 Alta qualidade dos resultados
- 💰 Custo baixo (~$0.01 por investigação)

### Sem API Key (Grátis, Limitado)

**Prompt:**
```
Use cnpj_intelligence para investigar o CNPJ 00.000.000/0001-91, mas limite a 3 queries na categoria government apenas
```

**Configuração no prompt:**
- `categories: ["government"]` - Apenas 1 categoria
- `max_queries: 3` - Limitar queries
- `provider: "duckduckgo"` - Provider grátis

**Limitações:**
- ⚠️ Pode bloquear
- ⚠️ Resultados de menor qualidade
- ⚠️ Mais lento (delays de 3s)

---

## 🎯 Exemplo 4: Due Diligence Completa

**Prompt no Claude Desktop:**
```
Preciso fazer due diligence completa da empresa CNPJ 00.000.000/0001-91.

Use sequential thinking para planejar e executar:
1. Dados cadastrais básicos
2. Histórico legal e processos
3. Presença online e reputação
4. Análise dos sócios e diretores
5. Documentos públicos relevantes

Use cnpj_intelligence com Tavily para as buscas.
```

**O que Claude fará:**
```typescript
// Thought 1: Planejamento
sequentialthinking({
  thought: "Planejando due diligence completa...",
  thoughtNumber: 1,
  totalThoughts: 8
})

// Thought 2: Dados básicos
const basicData = cnpj_lookup({ cnpj: "00000000000191" })

// Thought 3: Busca inteligente
const intelligence = cnpj_intelligence({
  cnpj: "00000000000191",
  categories: ["government", "legal", "documents", "social", "partners"],
  provider: "tavily",
  max_queries: 15
})

// Thoughts 4-7: Análise dos resultados
// Thought 8: Conclusão final
```

---

## 📊 Exemplo 5: Comparação de Empresas

**Prompt:**
```
Compare estas duas empresas usando cnpj_intelligence:
- CNPJ 1: 00.000.000/0001-91
- CNPJ 2: 33.000.167/0001-01

Analise: porte, situação cadastral, processos legais, presença online
```

---

## 🔧 Exemplo 6: Uso Programático (TypeScript)

```typescript
import { executeTool } from '@aredes.me/mcp-dadosbr';
import { MemoryCache } from '@aredes.me/mcp-dadosbr';

const cache = new MemoryCache();
const apiConfig = {
  cnpjBaseUrl: 'https://open.cnpja.com/office/',
  cepBaseUrl: 'https://opencep.com/v1/',
  authHeaders: {}
};

// Busca inteligente
const result = await executeTool(
  'cnpj_intelligence',
  {
    cnpj: '00000000000191',
    categories: ['government', 'legal'],
    provider: 'tavily',
    max_results_per_query: 5,
    max_queries: 10
  },
  apiConfig,
  cache
);

if (result.ok) {
  console.log('Company:', result.data.company_data.company.name);
  console.log('Government results:', result.data.search_results.government.length);
  console.log('Legal results:', result.data.search_results.legal.length);
}
```

---

## 💡 Dicas de Uso

### Para Melhor Performance

1. **Use Tavily em produção**
   - Configure TAVILY_API_KEY
   - Sem rate limiting
   - Resultados confiáveis

2. **Combine com Sequential Thinking**
   ```
   Use sequential thinking para planejar a investigação, 
   depois use cnpj_intelligence para executar as buscas
   ```

3. **Limite categorias quando necessário**
   ```
   categories: ["government", "legal"]  // Apenas o essencial
   ```

4. **Ajuste max_queries**
   ```
   max_queries: 5  // Rápido e barato
   max_queries: 15 // Investigação profunda
   ```

### Para Economia de Custos

1. **Use cache agressivamente**
   - Resultados são cached automaticamente
   - Evita buscas duplicadas

2. **Comece com categorias específicas**
   - Não busque tudo se não precisa

3. **Free tier do Tavily**
   - 1000 searches/mês grátis
   - Perfeito para começar

---

## 🆘 Troubleshooting

### "DDG detected an anomaly"
```
Solução: Use Tavily ou limite max_queries
```

### "Tavily API key not configured"
```
Solução: Configure TAVILY_API_KEY no ambiente
```

### Resultados vazios
```
Verificar:
1. CNPJ é válido?
2. Provider está configurado?
3. Há créditos na conta Tavily?
```

---

## 📚 Mais Exemplos

Ver também:
- [Providers Guide](docs/PROVIDERS.md) - Comparação detalhada
- [Configuration](docs/CONFIGURATION.md) - Setup completo
- [Usage Examples](docs/USAGE_EXAMPLES.md) - Mais padrões
