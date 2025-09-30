# Web Search Tool - cnpj_search

## 📋 Overview

The `cnpj_search` tool provides intelligent web search capabilities using DuckDuckGo, with support for advanced search operators (Google Dorks). It's perfect for finding additional information about Brazilian companies, including lawsuits, documents, news, and online presence.

## 🎯 Features

- ✅ **Free**: Uses DuckDuckGo (no API key required)
- ✅ **Advanced Operators**: Supports site:, intext:, intitle:, filetype:, etc.
- ✅ **Rate Limiting**: Automatic 1-second delay between requests
- ✅ **Caching**: Automatic caching of search results
- ✅ **Brazilian Focus**: Optimized for Brazilian content (locale: br-pt)

## 🔍 Search Operators

### Basic Operators

```bash
# Exact phrase
"BANCO DO BRASIL SA"

# Exclude term
CNPJ -youtube

# OR operator
"razao social" OR "nome fantasia"
```

### Domain-Specific

```bash
# Search within specific domain
00000000000191 site:gov.br

# Search within TLD
CNPJ site:.gov.br

# Exclude domain
empresa -site:youtube.com
```

### Content Operators

```bash
# Text in page body
intext:"00000000000191"

# Text in page title
intitle:"BANCO DO BRASIL"

# Text in URL
inurl:cnpj
```

### File Type

```bash
# PDF documents
"00000000000191" filetype:pdf

# Excel spreadsheets
"BANCO DO BRASIL" filetype:xls

# Word documents
empresa filetype:doc
```

## 💡 Use Cases

### 1. Find Government Records

```typescript
// Search for company in government websites
cnpj_search({
  query: "00000000000191 site:gov.br",
  max_results: 10
})

// Search in transparency portals
cnpj_search({
  query: "00000000000191 site:transparencia.gov.br"
})
```

### 2. Find Legal Cases

```bash
# Search lawsuits
"BANCO DO BRASIL SA" site:jusbrasil.com.br

# Search in courts
"00000000000191" site:*.jus.br

# Search legal documents
"BANCO DO BRASIL" filetype:pdf site:jusbrasil.com.br
```

### 3. Find Documents

```bash
# PDFs mentioning the company
"00000000000191" filetype:pdf "BRASILIA"

# Excel files with company data
"BANCO DO BRASIL" filetype:xls

# Any document type
"00000000000191" (filetype:pdf OR filetype:doc OR filetype:xls)
```

### 4. Social Media & Online Presence

```bash
# LinkedIn
"BANCO DO BRASIL" site:linkedin.com

# GitHub repositories
"Banco do Brasil" site:github.com

# Facebook pages
"BANCO DO BRASIL" site:facebook.com
```

### 5. News & Articles

```bash
# Recent news
"00000000000191" intext:noticia

# Press releases
"BANCO DO BRASIL" intext:"press release"
```

## 📖 API Reference

### Input Schema

```typescript
{
  query: string;        // Search query with optional operators
  max_results?: number; // Maximum results (1-20, default: 5)
}
```

### Output Schema

```typescript
{
  ok: boolean;
  data?: {
    results: Array<{
      title: string;    // Page title
      url: string;      // Page URL
      snippet: string;  // Description/snippet
    }>;
    query: string;      // Original query
    count: number;      // Number of results
    source: string;     // "duckduckgo"
    fetchedAt: string;  // ISO timestamp
  };
  error?: string;
}
```

## 🎬 Examples

### Example 1: Basic Company Search

**Query**:
```typescript
cnpj_search({
  query: "00000000000191",
  max_results: 5
})
```

**Result**:
```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "title": "BANCO DO BRASIL SA - ReceitaWS",
        "url": "https://www.receitaws.com.br/cnpj/00000000000191",
        "snippet": "Consulta CNPJ grátis..."
      }
    ],
    "query": "00000000000191",
    "count": 5,
    "source": "duckduckgo",
    "fetchedAt": "2025-09-30T02:00:00.000Z"
  }
}
```

### Example 2: Government Records

**Query**:
```typescript
cnpj_search({
  query: "00000000000191 site:gov.br",
  max_results: 10
})
```

### Example 3: Legal Cases

**Query**:
```typescript
cnpj_search({
  query: '"BANCO DO BRASIL SA" site:jusbrasil.com.br',
  max_results: 5
})
```

### Example 4: Documents

**Query**:
```typescript
cnpj_search({
  query: "00000000000191 filetype:pdf",
  max_results: 10
})
```

## ⚙️ Configuration

### Cache Settings

Results are cached using the same cache system as CNPJ/CEP lookups:

```bash
# Cache size (default: 256 entries)
MCP_CACHE_SIZE=512

# Cache TTL (default: 60 seconds)
MCP_CACHE_TTL=3600000  # 1 hour for search results
```

### Rate Limiting

Built-in rate limiting prevents DuckDuckGo from blocking requests:

- **Delay**: 1 second between requests (hardcoded)
- **Strategy**: Automatic sleep before each request

## ⚠️ Limitations

### DuckDuckGo Limitations

1. **Operator Support**: Not all operators work 100% reliably (official DuckDuckGo documentation acknowledges this)
2. **Result Quality**: Lower quality than Google (but free)
3. **Rate Limiting**: Aggressive rate limiting if too many requests
4. **No Pagination**: Limited to max 20 results per query

### Tool Limitations

1. **Snippets Only**: No full page content (use for discovery only)
2. **No Scraping**: Doesn't fetch full page content
3. **Brazilian Focus**: Optimized for Brazilian content (br-pt locale)

## 🔄 Integration with Sequential Thinking

The search tool works great with sequential thinking for complex investigations:

```typescript
// Step 1: Plan investigation
sequentialthinking({
  thought: "Need to investigate company X. Will search: 1) gov records, 2) lawsuits, 3) online presence",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// Step 2: Search government records
cnpj_search({
  query: "CNPJ site:gov.br"
})

// Step 3: Analyze results
sequentialthinking({
  thought: "Found 5 government records. Most relevant: ...",
  thoughtNumber: 2,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// Continue investigation...
```

## 🎯 Best Practices

### 1. Use Specific Queries

❌ Bad:
```bash
"empresa"
```

✅ Good:
```bash
"28526270000150" site:gov.br filetype:pdf
```

### 2. Combine Operators

```bash
# Multiple domains
"CNPJ" (site:gov.br OR site:*.jus.br)

# Specific content + file type
"razao social" intext:CNPJ filetype:pdf

# Exclude irrelevant results
"empresa" site:gov.br -youtube -facebook
```

### 3. Use Exact Phrases

```bash
# Without quotes (broad)
CRISTIANO AREDES COSTA SOLUCOES

# With quotes (exact)
"CRISTIANO AREDES COSTA SOLUCOES EM TECNOLOGIA"
```

### 4. Start Broad, Then Narrow

```bash
# 1. Start broad
"28526270000150"

# 2. Add domain filter
"28526270000150" site:gov.br

# 3. Add file type
"28526270000150" site:gov.br filetype:pdf
```

## 📊 Performance

- **Average Response Time**: 1-3 seconds (including rate limiting)
- **Cache Hit**: <100ms
- **Results per Query**: 5-10 recommended (max 20)

## 🔮 Future Enhancements

Planned for future versions:

- [ ] Fallback to Tavily API when DuckDuckGo fails
- [ ] Full page scraping with Firecrawl
- [ ] Result relevance scoring
- [ ] Automatic query refinement
- [ ] Multi-source aggregation

---

**Related Documentation**:
- [Sequential Thinking](./SEQUENTIAL_THINKING.md)
- [Usage Examples](./USAGE_EXAMPLES.md)
- [Configuration Guide](./CONFIGURATION.md)
