# MCP DadosBR 🇧🇷

[![smithery badge](https://smithery.ai/badge/@cristianoaredes/mcp-dadosbr)](https://smithery.ai/server/@cristianoaredes/mcp-dadosbr)
[![npm version](https://badge.fury.io/js/@aredes.me%2Fmcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![npm downloads](https://img.shields.io/npm/dm/@aredes.me/mcp-dadosbr.svg)](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🕵️ The most complete Brazilian OSINT toolkit as an MCP server** — 23 tools covering company data, government transparency, legal proceedings, financial indicators, healthcare, and strategic intelligence.
>
> Works with Claude Desktop, Cursor, Windsurf, Gemini CLI, Claude Code, and any MCP-compatible AI assistant.

_[Português](#português) | [English](#english)_

---

## Português

### ⚡ Instalação

```bash
npx @aredes.me/mcp-dadosbr
```

### 🔌 Configuração (qualquer cliente MCP)

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
<summary>📍 Localização do arquivo de configuração por IDE</summary>

| IDE / Cliente | Localização |
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

### 🛠️ 23 Ferramentas OSINT

#### 🏛️ Governo & Transparência
| Ferramenta | Descrição | API Key |
|---|---|---|
| `ibge_localidades` | Estados, municípios, regiões do IBGE | — |
| `transparencia_lookup` | Contratos, convênios, licitações federais | `TRANSPARENCIA_API_KEY` |
| `ceis_cnep_lookup` | Empresas sancionadas (CEIS/CNEP) | `TRANSPARENCIA_API_KEY` |
| `pncp_licitacoes` | Portal Nacional de Contratações Públicas | — |
| `querido_diario` | Diários oficiais municipais (Open Knowledge) | — |

#### ⚖️ Jurídico & Compliance
| Ferramenta | Descrição | API Key |
|---|---|---|
| `datajud_processos` | Processos judiciais em todos os tribunais | `DATAJUD_API_KEY` |
| `oab_advogado` | Consulta de advogados na OAB/CNA | — |
| `bnmp_mandados` | Mandados de prisão (BNMP/CNJ) | — |
| `procurados_lookup` | Pessoas procuradas (MJSP/Interpol) | — |
| `lista_suja_lookup` | Lista suja do trabalho escravo | — |

#### 🏢 Empresas & Pessoas
| Ferramenta | Descrição | API Key |
|---|---|---|
| `cnpj_lookup` | Dados cadastrais completos por CNPJ | — |
| `cep_lookup` | Endereço completo por CEP | — |
| `cpf_validate` | Validação matemática de CPF | — |
| `domain_whois` | WHOIS de domínios .br (Registro.br) | — |
| `consumidor_reclamacoes` | Reclamações no Consumidor.gov.br | — |
| `company_deep_profile` | Perfil completo orquestrado (6 fontes) | Múltiplas |

#### 💰 Financeiro
| Ferramenta | Descrição | API Key |
|---|---|---|
| `bacen_taxas` | SELIC, IPCA, Dólar, Euro, CDI (Banco Central) | — |
| `fipe_veiculos` | Tabela FIPE de veículos | — |

#### 🏥 Saúde
| Ferramenta | Descrição | API Key |
|---|---|---|
| `cnes_saude` | Estabelecimentos de saúde (CNES/DataSUS) | — |

#### 🧠 Intelligence
| Ferramenta | Descrição | API Key |
|---|---|---|
| `cnpj_search` | Busca web com Google Dorks via Tavily | `TAVILY_API_KEY` |
| `cnpj_intelligence` | Busca inteligente multi-categoria | `TAVILY_API_KEY` |
| `strategic_osint_prompt` | Templates de análise estratégica (due diligence, fraude, ESG) | — |
| `sequentialthinking` | Raciocínio estruturado passo a passo | — |

---

### 🎯 Exemplos de Uso (Prompts)

**Due Diligence Completa:**
```
Faça uma investigação completa da empresa CNPJ 00.000.000/0001-91:
1. Use cnpj_lookup para dados cadastrais
2. Use transparencia_lookup para contratos governamentais
3. Use datajud_processos para processos judiciais
4. Use lista_suja_lookup para verificar trabalho escravo
5. Use company_deep_profile para perfil consolidado
```

**Análise de Fraude:**
```
Use strategic_osint_prompt com template "fraud_detection" para o CNPJ 11.222.333/0001-81.
Depois execute cada ferramenta indicada no prompt gerado.
```

**Consulta Financeira:**
```
Quais são as taxas atuais do Banco Central? Use bacen_taxas para SELIC, IPCA e Dólar.
```

**Pesquisa Jurídica:**
```
Use datajud_processos para buscar processos contra "Empresa XYZ" no TJSP.
Depois use oab_advogado para verificar o advogado "João Silva" na OAB/SP.
```

**Inteligência Territorial:**
```
Use ibge_localidades para listar municípios de MG,
depois use cnes_saude para encontrar hospitais em Belo Horizonte.
```

---

### 🔑 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `TAVILY_API_KEY` | Para buscas | [tavily.com](https://tavily.com) — habilita `cnpj_search` + `cnpj_intelligence` |
| `PERPLEXITY_API_KEY` | Alternativo | [perplexity.ai](https://docs.perplexity.ai/) — provider alternativo de busca (se Tavily não configurado) |
| `TRANSPARENCIA_API_KEY` | Para transparência | [portaldatransparencia.gov.br](http://portaldatransparencia.gov.br/api-de-dados) |
| `DATAJUD_API_KEY` | Para processos | [datajud.cnj.jus.br](https://datajud-wiki.cnj.jus.br/) |
| `MCP_TRANSPORT` | — | `stdio` (padrão) ou `http` |
| `MCP_HTTP_PORT` | — | Porta HTTP (padrão: `3000`) |

### 🧬 Arquitetura

```
lib/
├── adapters/          # CLI, Cloudflare Workers, Smithery
├── config/            # Configuração e timeouts
├── core/              # Registry, search, intelligence, dork-templates
│   └── registry.ts    # Tool registry pattern (auto-registration)
├── infrastructure/    # Cache, circuit breaker, rate limiting
├── tools/             # ← Domain-organized tools
│   ├── core.ts        #   CNPJ, CEP, search, intelligence, thinking
│   ├── government.ts  #   IBGE, Transparência, CEIS/CNEP, PNCP, Q. Diário
│   ├── legal.ts       #   Datajud, OAB, BNMP, Procurados, Lista Suja
│   ├── company.ts     #   CPF, WHOIS, Consumidor, Deep Profile
│   ├── financial.ts   #   Banco Central, FIPE
│   ├── health.ts      #   CNES/DataSUS
│   ├── osint.ts       #   Strategic prompts
│   └── index.ts       #   Barrel (triggers auto-registration)
├── types/             # TypeScript type definitions
└── workers/           # Cloudflare Workers adapter
```

**Padrões de Design:**
- **Tool Registry** — Auto-registration, zero boilerplate para novas tools
- **Circuit Breaker** — Proteção contra falhas de API
- **Result Pattern** — Tratamento funcional de erros
- **Google Dorks Engine** — 64 templates em 10 categorias OSINT

### 📊 Métricas

- **23 ferramentas** OSINT registradas
- **257 testes unitários** (100% passing)
- **64 dork templates** em 10 categorias
- **TypeScript estrito** em todo o codebase
- **Node.js 18+** · Vitest · Express 5

---

### 🤝 Contribuição

```bash
git clone https://github.com/cristianoaredes/mcp-dadosbr.git
cd mcp-dadosbr
npm install
npm run build
npm test
```

### 📄 Licença & Créditos

MIT License — [LICENSE](LICENSE)

Dados fornecidos por: [OpenCNPJ](https://opencnpj.org/), [OpenCEP](https://opencep.com/), [IBGE API](https://servicodados.ibge.gov.br/), [Portal da Transparência](https://portaldatransparencia.gov.br/), [CNJ Datajud](https://datajud-wiki.cnj.jus.br/), [Banco Central](https://www.bcb.gov.br/), [BrasilAPI](https://brasilapi.com.br/), [CNES/DataSUS](https://cnes.datasus.gov.br/)

### 👨‍💻 Mantenedor

| [Cristiano Aredes](https://github.com/cristianoaredes) |
|---|
| [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) · cristiano@aredes.me |

### 🌐 Links

- **NPM**: https://www.npmjs.com/package/@aredes.me/mcp-dadosbr
- **Smithery**: https://smithery.ai/server/@cristianoaredes/mcp-dadosbr
- **GitHub**: https://github.com/cristianoaredes/mcp-dadosbr

---

## English

> **🕵️ The most complete Brazilian OSINT toolkit as an MCP server** — 23 tools covering company data, government transparency, legal proceedings, financial indicators, healthcare, and strategic intelligence.

### ⚡ Quick Install

```bash
npx @aredes.me/mcp-dadosbr
```

### 🔌 Configuration (any MCP client)

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

### 🛠️ 23 OSINT Tools

| Domain | Tools | Description |
|---|---|---|
| 🏛️ Government | `ibge_localidades` · `transparencia_lookup` · `ceis_cnep_lookup` · `pncp_licitacoes` · `querido_diario` | IBGE geography, federal contracts, sanctions, public procurement, municipal gazettes |
| ⚖️ Legal | `datajud_processos` · `oab_advogado` · `bnmp_mandados` · `procurados_lookup` · `lista_suja_lookup` | Court proceedings, lawyer verification, arrest warrants, wanted persons, slave labor blacklist |
| 🏢 Company | `cnpj_lookup` · `cep_lookup` · `cpf_validate` · `domain_whois` · `consumidor_reclamacoes` · `company_deep_profile` | Company registration, address lookup, CPF validation, domain WHOIS, consumer complaints, deep profile |
| 💰 Financial | `bacen_taxas` · `fipe_veiculos` | Central Bank rates (SELIC, IPCA, USD, EUR, CDI), FIPE vehicle pricing |
| 🏥 Health | `cnes_saude` | Healthcare facility search (CNES/DataSUS) |
| 🧠 Intelligence | `cnpj_search` · `cnpj_intelligence` · `strategic_osint_prompt` · `sequentialthinking` | Web search with dorks, multi-source intelligence, strategic analysis templates, structured reasoning |

### 🔑 Environment Variables

| Variable | Required for | How to get |
|---|---|---|
| `TAVILY_API_KEY` | Web search tools | [tavily.com](https://tavily.com) |
| `PERPLEXITY_API_KEY` | Alternative search | [perplexity.ai](https://docs.perplexity.ai/) (used if Tavily not set) |
| `TRANSPARENCIA_API_KEY` | Government transparency | [Portal da Transparência API](http://portaldatransparencia.gov.br/api-de-dados) |
| `DATAJUD_API_KEY` | Court proceedings | [Datajud Wiki](https://datajud-wiki.cnj.jus.br/) |

### 🎯 Example Prompts

```
Run a full due diligence on CNPJ 00.000.000/0001-91:
cnpj_lookup → transparencia_lookup → datajud_processos → lista_suja_lookup → company_deep_profile
```

```
What are the current Brazilian Central Bank rates? Use bacen_taxas for SELIC, IPCA, and USD exchange.
```

```
Search for lawsuits against "Company XYZ" using datajud_processos in tribunal TJSP.
Then verify lawyer "João Silva" with oab_advogado in OAB/SP.
```

### 📊 Stats

- **23 tools** · **257 tests** · **64 dork templates** · **10 OSINT categories**
- TypeScript strict mode · Node.js 18+ · Vitest · Express 5

### 📄 License

MIT — [LICENSE](LICENSE)

Data sources: [OpenCNPJ](https://opencnpj.org/), [OpenCEP](https://opencep.com/), [IBGE](https://servicodados.ibge.gov.br/), [Portal da Transparência](https://portaldatransparencia.gov.br/), [CNJ Datajud](https://datajud-wiki.cnj.jus.br/), [Banco Central](https://www.bcb.gov.br/), [BrasilAPI](https://brasilapi.com.br/), [CNES/DataSUS](https://cnes.datasus.gov.br/)

### 👨‍💻 Maintainer

[Cristiano Aredes](https://github.com/cristianoaredes) · [LinkedIn](https://www.linkedin.com/in/cristianoaredes/) · cristiano@aredes.me