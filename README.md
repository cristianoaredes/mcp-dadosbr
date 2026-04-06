# MCP DadosBR — Brazilian Data MCP Server for Claude, Cursor & AI Assistants

[![smithery badge](https://smithery.ai/badge/@cristianoaredes/mcp-dadosbr)](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr)
[![npm version](https://badge.fury.io/js/@aredes.me%2Fmcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![npm downloads](https://img.shields.io/npm/dm/@aredes.me/mcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**The most complete Brazilian OSINT toolkit as a Model Context Protocol (MCP) server.** Query CNPJ, CEP, court records, government contracts, financial indicators, and more — directly from Claude Desktop, Cursor, Windsurf, Claude Code, or any MCP-compatible AI assistant.

_[Português](#português) | [English](#english)_

---

## Português

### O que é isso?

MCP DadosBR é um servidor MCP que conecta assistentes de IA a dados públicos brasileiros. Com ele, Claude, Cursor, Windsurf e outros assistentes podem consultar CNPJs, endereços por CEP, processos judiciais, contratos governamentais, indicadores financeiros do Banco Central e muito mais — sem sair da conversa.

São **23 ferramentas OSINT** organizadas em 6 domínios: governo, jurídico, empresas, financeiro, saúde e inteligência estratégica.

### Instalação rápida

```bash
npx @aredes.me/mcp-dadosbr
```

### Configuração (qualquer cliente MCP)

Adicione ao arquivo de configuração do seu cliente MCP:

```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"],
      "env": {
        "TAVILY_API_KEY": "tvly-your-key",
        "PERPLEXITY_API_KEY": "pplx-your-key",
        "TRANSPARENCIA_API_KEY": "your-key",
        "DATAJUD_API_KEY": "your-key"
      }
    }
  }
}
```

<details>
<summary>Localização do arquivo de configuração por cliente</summary>

| Cliente | Localização |
|---|---|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` no projeto |
| Windsurf | `~/.windsurf/config.json` |
| Continue.dev | `~/.continue/config.json` |
| Gemini CLI | `~/.config/gemini/mcp_config.json` |
| Zed | `~/.config/zed/settings.json` (campo `context_servers`) |
| Cline / Roo Cline | VS Code Settings → Extensions → Cline → MCP Servers |

**Claude Code CLI:**
```bash
claude mcp add --transport stdio dadosbr \
  --env TAVILY_API_KEY=tvly-xxx \
  --env TRANSPARENCIA_API_KEY=xxx \
  --env DATAJUD_API_KEY=xxx \
  -- npx -y @aredes.me/mcp-dadosbr
```
</details>

---

### 23 Ferramentas OSINT

#### Governo e Transparência

| Ferramenta | O que faz | API Key |
|---|---|---|
| `ibge_localidades` | Estados, municípios e regiões do IBGE | — |
| `transparencia_lookup` | Contratos, convênios e licitações federais | `TRANSPARENCIA_API_KEY` |
| `ceis_cnep_lookup` | Empresas sancionadas (CEIS/CNEP) | `TRANSPARENCIA_API_KEY` |
| `pncp_licitacoes` | Portal Nacional de Contratações Públicas | — |
| `querido_diario` | Diários oficiais municipais (Open Knowledge) | — |

#### Jurídico e Compliance

| Ferramenta | O que faz | API Key |
|---|---|---|
| `datajud_processos` | Processos judiciais em todos os tribunais brasileiros | `DATAJUD_API_KEY` |
| `oab_advogado` | Consulta de advogados no CNA/OAB | — |
| `bnmp_mandados` | Mandados de prisão (BNMP/CNJ) | — |
| `procurados_lookup` | Pessoas procuradas (MJSP/Interpol) | — |
| `lista_suja_lookup` | Lista suja do trabalho escravo (MTE) | — |

#### Empresas e Pessoas

| Ferramenta | O que faz | API Key |
|---|---|---|
| `cnpj_lookup` | Dados cadastrais completos por CNPJ | — |
| `cep_lookup` | Endereço completo por CEP | — |
| `cpf_validate` | Validação matemática de CPF | — |
| `domain_whois` | WHOIS de domínios .br (Registro.br) | — |
| `consumidor_reclamacoes` | Reclamações no Consumidor.gov.br | — |
| `company_deep_profile` | Perfil completo orquestrado com 6 fontes | Múltiplas |

#### Financeiro

| Ferramenta | O que faz | API Key |
|---|---|---|
| `bacen_taxas` | SELIC, IPCA, Dólar, Euro, CDI (Banco Central) | — |
| `fipe_veiculos` | Tabela FIPE de veículos | — |

#### Saúde

| Ferramenta | O que faz | API Key |
|---|---|---|
| `cnes_saude` | Estabelecimentos de saúde (CNES/DataSUS) | — |

#### Inteligência Estratégica

| Ferramenta | O que faz | API Key |
|---|---|---|
| `cnpj_search` | Busca web com Google Dorks via Tavily | `TAVILY_API_KEY` |
| `cnpj_intelligence` | Busca inteligente multi-categoria | `TAVILY_API_KEY` |
| `strategic_osint_prompt` | Templates de análise (due diligence, fraude, ESG) | — |
| `sequentialthinking` | Raciocínio estruturado passo a passo | — |

---

### Exemplos de uso

**Due Diligence completa de empresa:**
```
Faça uma investigação completa do CNPJ 00.000.000/0001-91:
1. Use cnpj_lookup para dados cadastrais
2. Use transparencia_lookup para contratos governamentais
3. Use datajud_processos para processos judiciais
4. Use lista_suja_lookup para verificar trabalho escravo
5. Use company_deep_profile para o perfil consolidado
```

**Detecção de fraude:**
```
Use strategic_osint_prompt com template "fraud_detection" para o CNPJ 11.222.333/0001-81.
Execute cada ferramenta indicada no prompt gerado.
```

**Consulta financeira:**
```
Quais são as taxas atuais do Banco Central?
Use bacen_taxas para SELIC, IPCA e câmbio do Dólar.
```

**Pesquisa jurídica:**
```
Use datajud_processos para buscar processos contra "Empresa XYZ" no TJSP.
Depois use oab_advogado para verificar "João Silva" na OAB/SP.
```

**Inteligência territorial:**
```
Use ibge_localidades para listar municípios de MG,
depois use cnes_saude para encontrar hospitais em Belo Horizonte.
```

---

### Variáveis de ambiente

| Variável | Necessária para | Como obter |
|---|---|---|
| `TAVILY_API_KEY` | Ferramentas de busca web | [tavily.com](https://tavily.com) |
| `PERPLEXITY_API_KEY` | Busca alternativa (se Tavily não configurado) | [perplexity.ai](https://docs.perplexity.ai/) |
| `TRANSPARENCIA_API_KEY` | Dados de transparência federal | [portaldatransparencia.gov.br/api-de-dados](http://portaldatransparencia.gov.br/api-de-dados) |
| `DATAJUD_API_KEY` | Processos judiciais | [datajud-wiki.cnj.jus.br](https://datajud-wiki.cnj.jus.br/) |
| `MCP_TRANSPORT` | — | `stdio` (padrão) ou `http` |
| `MCP_HTTP_PORT` | — | Porta HTTP (padrão: `3000`) |

Todas as ferramentas sem "API Key" na tabela funcionam sem nenhuma chave.

---

### Requisitos

- **Node.js 18+**
- Chaves de API opcionais conforme tabela acima

---

### Desenvolvimento e contribuição

```bash
git clone https://github.com/cristianoaredes/mcp-dadosbr.git
cd mcp-dadosbr
npm install
npm run build
npm test
```

---

### Licença

MIT — veja [LICENSE](LICENSE).

Dados fornecidos por: [OpenCNPJ](https://opencnpj.org/), [OpenCEP](https://opencep.com/), [IBGE](https://servicodados.ibge.gov.br/), [Portal da Transparência](https://portaldatransparencia.gov.br/), [CNJ Datajud](https://datajud-wiki.cnj.jus.br/), [Banco Central](https://www.bcb.gov.br/), [BrasilAPI](https://brasilapi.com.br/), [CNES/DataSUS](https://cnes.datasus.gov.br/)

Feito por [Cristiano Arêdes](https://github.com/cristianoaredes) · [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) · cristiano@aredes.me

---

## English

### What is this?

MCP DadosBR is a Model Context Protocol (MCP) server that gives AI assistants direct access to Brazilian public data. Connect Claude Desktop, Cursor, Windsurf, Claude Code, or any MCP-compatible client to query CNPJ company records, CEP postal addresses, court proceedings, government contracts, Central Bank financial rates, healthcare facilities, and more — all from within the conversation.

**23 OSINT tools** across 6 domains: government transparency, legal/compliance, companies, financial, health, and strategic intelligence.

### Quick install

```bash
npx @aredes.me/mcp-dadosbr
```

### Configuration (any MCP client)

```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr"],
      "env": {
        "TAVILY_API_KEY": "tvly-your-key",
        "PERPLEXITY_API_KEY": "pplx-your-key",
        "TRANSPARENCIA_API_KEY": "your-key",
        "DATAJUD_API_KEY": "your-key"
      }
    }
  }
}
```

<details>
<summary>Config file location by client</summary>

| Client | Location |
|---|---|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` in the project |
| Windsurf | `~/.windsurf/config.json` |
| Continue.dev | `~/.continue/config.json` |
| Gemini CLI | `~/.config/gemini/mcp_config.json` |
| Zed | `~/.config/zed/settings.json` (`context_servers` field) |
| Cline / Roo Cline | VS Code Settings → Extensions → Cline → MCP Servers |

**Claude Code CLI:**
```bash
claude mcp add --transport stdio dadosbr \
  --env TAVILY_API_KEY=tvly-xxx \
  --env TRANSPARENCIA_API_KEY=xxx \
  --env DATAJUD_API_KEY=xxx \
  -- npx -y @aredes.me/mcp-dadosbr
```
</details>

---

### 23 OSINT Tools

| Domain | Tools | Description |
|---|---|---|
| Government | `ibge_localidades` · `transparencia_lookup` · `ceis_cnep_lookup` · `pncp_licitacoes` · `querido_diario` | IBGE geography, federal contracts, sanctioned companies, public procurement, municipal gazettes |
| Legal | `datajud_processos` · `oab_advogado` · `bnmp_mandados` · `procurados_lookup` · `lista_suja_lookup` | Court proceedings across all Brazilian courts, lawyer verification, arrest warrants, wanted persons, slave labor blacklist |
| Company | `cnpj_lookup` · `cep_lookup` · `cpf_validate` · `domain_whois` · `consumidor_reclamacoes` · `company_deep_profile` | Company registration, address lookup, CPF validation, .br domain WHOIS, consumer complaints, 6-source deep profile |
| Financial | `bacen_taxas` · `fipe_veiculos` | Brazilian Central Bank rates (SELIC, IPCA, USD, EUR, CDI), FIPE vehicle pricing table |
| Health | `cnes_saude` | Healthcare facility search via CNES/DataSUS |
| Intelligence | `cnpj_search` · `cnpj_intelligence` · `strategic_osint_prompt` · `sequentialthinking` | Web search with Google Dorks, multi-source intelligence, strategic analysis templates (due diligence, fraud, ESG), structured reasoning |

---

### Requirements

- **Node.js 18+**
- Optional API keys depending on which tools you need (see table below)

### Environment Variables

| Variable | Required for | How to get |
|---|---|---|
| `TAVILY_API_KEY` | Web search tools (`cnpj_search`, `cnpj_intelligence`) | [tavily.com](https://tavily.com) |
| `PERPLEXITY_API_KEY` | Alternative search (used if Tavily not set) | [perplexity.ai](https://docs.perplexity.ai/) |
| `TRANSPARENCIA_API_KEY` | Government transparency data | [Portal da Transparência API](http://portaldatransparencia.gov.br/api-de-dados) |
| `DATAJUD_API_KEY` | Court proceedings | [Datajud Wiki](https://datajud-wiki.cnj.jus.br/) |

All tools without an API key in the table above work with zero configuration.

---

### Example prompts

**Full company due diligence:**
```
Run a full due diligence on CNPJ 00.000.000/0001-91:
cnpj_lookup → transparencia_lookup → datajud_processos → lista_suja_lookup → company_deep_profile
```

**Fraud detection:**
```
Use strategic_osint_prompt with template "fraud_detection" for CNPJ 11.222.333/0001-81.
Then run each tool indicated in the generated prompt.
```

**Brazilian Central Bank rates:**
```
What are the current Brazilian Central Bank rates?
Use bacen_taxas for SELIC, IPCA, and USD exchange rate.
```

**Legal research:**
```
Search for lawsuits against "Company XYZ" using datajud_processos in TJSP.
Then verify lawyer "João Silva" with oab_advogado in OAB/SP.
```

---

### Stats

- **23 tools** · **257 tests** (100% passing) · **64 Google Dork templates** · **10 OSINT categories**
- TypeScript strict mode · Node.js 18+ · Vitest · Express 5
- Circuit breaker, LRU cache, request deduplication built-in

### Architecture overview

```
lib/
├── adapters/          # CLI, Cloudflare Workers, Smithery
├── config/            # Configuration and timeouts
├── core/              # Registry, search, intelligence, dork-templates
├── infrastructure/    # Cache, circuit breaker, rate limiting
├── tools/             # Domain-organized tools
│   ├── core.ts        #   CNPJ, CEP, search, intelligence, thinking
│   ├── government.ts  #   IBGE, Transparência, CEIS/CNEP, PNCP, Querido Diário
│   ├── legal.ts       #   Datajud, OAB, BNMP, Procurados, Lista Suja
│   ├── company.ts     #   CPF, WHOIS, Consumidor, Deep Profile
│   ├── financial.ts   #   Banco Central, FIPE
│   ├── health.ts      #   CNES/DataSUS
│   └── osint.ts       #   Strategic prompts
└── types/             # TypeScript type definitions
```

---

### Contributing

```bash
git clone https://github.com/cristianoaredes/mcp-dadosbr.git
cd mcp-dadosbr
npm install
npm run build
npm test
```

### License

MIT — see [LICENSE](LICENSE).

Data sources: [OpenCNPJ](https://opencnpj.org/), [OpenCEP](https://opencep.com/), [IBGE](https://servicodados.ibge.gov.br/), [Portal da Transparência](https://portaldatransparencia.gov.br/), [CNJ Datajud](https://datajud-wiki.cnj.jus.br/), [Banco Central do Brasil](https://www.bcb.gov.br/), [BrasilAPI](https://brasilapi.com.br/), [CNES/DataSUS](https://cnes.datasus.gov.br/)

Built by [Cristiano Arêdes](https://github.com/cristianoaredes) · [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) · cristiano@aredes.me

---

### Links

- **npm**: https://www.npmjs.com/package/@aredes.me/mcp-dadosbr
- **Smithery**: https://smithery.ai/server/@cristianoaredes/mcp-dadosbr
- **GitHub**: https://github.com/cristianoaredes/mcp-dadosbr
