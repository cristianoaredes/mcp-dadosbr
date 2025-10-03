# Feature: Sequential Thinking + Intelligent Search

**Branch**: `feature/sequential-thinking-search`  
**Data Início**: 2025-09-30  
**Objetivo**: Adicionar busca inteligente na web e pensamento sequencial ao MCP DadosBR

---

## 🎯 Visão Geral

Integrar duas novas ferramentas MCP ao servidor:
1. **Sequential Thinking**: Pensamento estruturado e iterativo para análise complexa
2. **Web Search**: Busca inteligente usando DuckDuckGo com suporte a Google Dorks

### Princípio KISS
- Ferramentas independentes (LLM orquestra)
- Zero custo (DuckDuckGo grátis)
- Mínimas mudanças no código existente
- Sem APIs pagas necessárias

---

## 📋 Tasks - Implementação

### ✅ Fase 0: Setup
- [x] Criar branch `feature/sequential-thinking-search`
- [x] Criar arquivo de planejamento
- [ ] Instalar dependências necessárias

### 🔧 Fase 1: Dependências e Setup (30 min)
- [ ] **Task 1.1**: Instalar `duckduckgo-search` package
- [ ] **Task 1.2**: Instalar `chalk` para formatação (Sequential Thinking)
- [ ] **Task 1.3**: Atualizar `package.json` com novas dependências
- [ ] **Task 1.4**: Testar instalação local

### 🧠 Fase 2: Sequential Thinking Tool (1h)
- [ ] **Task 2.1**: Criar `lib/core/sequential-thinking.ts`
- [ ] **Task 2.2**: Implementar classe `SequentialThinkingServer`
- [ ] **Task 2.3**: Adicionar validação de input
- [ ] **Task 2.4**: Implementar formatação colorida de pensamentos
- [ ] **Task 2.5**: Adicionar suporte a branches e revisões
- [ ] **Task 2.6**: Adicionar variável de ambiente `DISABLE_THOUGHT_LOGGING`

### 🔍 Fase 3: Web Search Tool (1h)
- [ ] **Task 3.1**: Criar `lib/core/search.ts`
- [ ] **Task 3.2**: Implementar função `executeSearch` com DuckDuckGo
- [ ] **Task 3.3**: Adicionar suporte a operadores (site:, intext:, filetype:, etc.)
- [ ] **Task 3.4**: Implementar formatação de resultados
- [ ] **Task 3.5**: Adicionar cache para resultados de busca
- [ ] **Task 3.6**: Implementar rate limiting básico

### 🔗 Fase 4: Integração com MCP Server (1h)
- [ ] **Task 4.1**: Atualizar `lib/core/tools.ts` - adicionar TOOL_DEFINITIONS
- [ ] **Task 4.2**: Atualizar `executeTool` para incluir novas ferramentas
- [ ] **Task 4.3**: Adicionar tipos em `lib/types/index.ts`
- [ ] **Task 4.4**: Atualizar exports em `lib/core/mcp-server.ts`

### 🧪 Fase 5: Testes (1h)
- [ ] **Task 5.1**: Criar teste manual para Sequential Thinking
- [ ] **Task 5.2**: Criar teste manual para Web Search
- [ ] **Task 5.3**: Testar integração completa (CNPJ lookup → Search → Thinking)
- [ ] **Task 5.4**: Testar operadores de busca (site:, intext:, etc.)
- [ ] **Task 5.5**: Validar cache e rate limiting

### 📚 Fase 6: Documentação (30 min)
- [ ] **Task 6.1**: Atualizar README.md com novas ferramentas
- [ ] **Task 6.2**: Criar `docs/SEQUENTIAL_THINKING.md`
- [ ] **Task 6.3**: Criar `docs/WEB_SEARCH.md`
- [ ] **Task 6.4**: Adicionar exemplos de uso em `docs/USAGE_EXAMPLES.md`
- [ ] **Task 6.5**: Atualizar CHANGELOG.md

### 🚀 Fase 7: Build e Deploy (30 min)
- [ ] **Task 7.1**: Build TypeScript: `npm run build`
- [ ] **Task 7.2**: Testar build em produção
- [ ] **Task 7.3**: Atualizar versão em `package.json` (0.1.0 → 0.2.0)
- [ ] **Task 7.4**: Commit e push da feature branch
- [ ] **Task 7.5**: Criar Pull Request para `main`

---

## 🛠️ Detalhes Técnicos

### Novas Dependências
```json
{
  "dependencies": {
    "duckduckgo-search": "^0.2.0",
    "chalk": "^5.3.0"
  }
}
```

### Novos Arquivos
```
lib/core/
├── sequential-thinking.ts     # 🆕 Sequential Thinking implementation
└── search.ts                  # 🆕 DuckDuckGo search wrapper

docs/
├── SEQUENTIAL_THINKING.md     # 🆕 Documentação
└── WEB_SEARCH.md              # 🆕 Documentação
```

### Arquivos Modificados
```
lib/core/tools.ts              # Adicionar novas ferramentas
lib/types/index.ts             # Adicionar novos tipos
package.json                   # Adicionar dependências
README.md                      # Documentar novas features
CHANGELOG.md                   # Registrar mudanças
```

---

## 📊 Novas Ferramentas MCP

### 1. `sequentialthinking`
**Descrição**: Pensamento estruturado e iterativo para análise complexa

**Input**:
```typescript
{
  thought: string;              // Pensamento atual
  thoughtNumber: number;        // Número do pensamento (1, 2, 3...)
  totalThoughts: number;        // Total estimado
  nextThoughtNeeded: boolean;   // Se precisa mais pensamentos
  isRevision?: boolean;         // Se é revisão
  revisesThought?: number;      // Qual pensamento está revisando
  branchFromThought?: number;   // Ponto de ramificação
  branchId?: string;            // ID da branch
}
```

**Output**:
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1
}
```

### 2. `cnpj_search`
**Descrição**: Busca na web sobre CNPJ, empresa, sócios usando DuckDuckGo

**Input**:
```typescript
{
  query: string;                // Query com operadores
  max_results?: number;         // Máximo de resultados (default: 5)
}
```

**Output**:
```json
{
  "ok": true,
  "results": [
    {
      "title": "Título da página",
      "url": "https://example.com",
      "snippet": "Descrição..."
    }
  ],
  "query": "28526270000150 site:gov.br",
  "count": 5
}
```

---

## 🎯 Operadores de Busca Suportados

```bash
# Operadores DuckDuckGo confirmados:
site:gov.br "28526270000150"          # Domínio específico
"CRISTIANO AREDES" intext:CNPJ        # Texto exato + palavra no corpo
filetype:pdf "28526270000150"         # Tipo de arquivo
intitle:"AC SOLUCOES"                 # No título
inurl:28526270000150                  # Na URL
-youtube "28526270000150"             # Excluir domínio
"CNPJ" OR "Receita Federal"           # Operador OR
```

---

## 🎬 Exemplo de Uso Real

### Cenário: Investigação completa de empresa

**Usuário pergunta**:
> "Quero um relatório completo sobre a empresa CNPJ 28526270000150"

**Claude com Sequential Thinking faz**:
```typescript
// 1. Buscar dados básicos
cnpj_lookup("28526270000150")

// 2. Planejar investigação
sequentialthinking({
  thought: "Empresa: CRISTIANO AREDES. Preciso: processos, sócios, online",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// 3. Buscar processos judiciais
cnpj_search({
  query: "28526270000150 site:jusbrasil.com.br OR site:*.jus.br"
})

// 4. Analisar resultados
sequentialthinking({
  thought: "Encontrados 3 processos. Relevância: baixa. Continuar.",
  thoughtNumber: 2,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// 5. Buscar presença online
cnpj_search({
  query: "cristianoaredes site:github.com OR site:linkedin.com"
})

// 6. Sintetizar
sequentialthinking({
  thought: "Dados coletados. Sintetizando relatório completo.",
  thoughtNumber: 5,
  totalThoughts: 5,
  nextThoughtNeeded: false
})
```

---

## ✅ Critérios de Sucesso

- [ ] Sequential Thinking funciona com branches e revisões
- [ ] Web Search retorna resultados do DuckDuckGo
- [ ] Operadores de busca funcionam (site:, filetype:, etc.)
- [ ] Cache reduz buscas duplicadas
- [ ] Documentação completa e exemplos funcionais
- [ ] Build sem erros
- [ ] Testes manuais passam

---

## 🚧 Limitações Conhecidas (KISS)

1. **DuckDuckGo**: Operadores não 100% confiáveis (doc oficial admite)
2. **Rate Limiting**: DuckDuckGo pode bloquear após muitas requisições
3. **Qualidade**: Resultados inferiores ao Google, mas grátis
4. **Sem Scraping**: Apenas snippets, não conteúdo completo

**Trade-off aceito**: MVP grátis vs qualidade premium paga

---

## 📈 Próximas Iterações (Futuro)

### v0.3.0 (Futuro)
- [ ] Adicionar Tavily como fallback pago ($1/1000 buscas)
- [ ] Implementar scraping seletivo com Firecrawl
- [ ] Dashboard de métricas de busca
- [ ] Histórico de pensamentos persistente

### v0.4.0 (Futuro)
- [ ] Integração com mais fontes de dados BR
- [ ] API REST para busca direta
- [ ] Webhooks para alertas

---

## 🔍 Referências

- [Sequential Thinking MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking)
- [DuckDuckGo Search Syntax](https://duckduckgo.com/duckduckgo-help-pages/results/syntax)
- [Google Dorks for OSINT](https://www.sans.org/security-resources/GoogleCheatSheet.pdf)
- [Firecrawl Documentation](https://docs.firecrawl.dev/)

---

**Status**: 🔄 Em Desenvolvimento  
**Estimativa Total**: 5-6 horas  
**Risco**: Baixo (mudanças mínimas, sem breaking changes)
