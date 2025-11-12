# 🤖 ChatGPT Integration Guide

Complete guide to integrate dadosbr-mcp with ChatGPT for Brazilian company and postal code lookups.

---

## 📋 Prerequisites

### 1. Deployed MCP Server

Your MCP server must be deployed and accessible via HTTPS:
- **Staging**: `https://mcp-dadosbr-aredes-staging.cristianoaredes.workers.dev`
- **Production**: `https://mcp-dadosbr.aredes.me` (or your custom domain)

### 2. ChatGPT Plus or Enterprise Account

MCP server integration requires:
- ChatGPT Plus subscription, or
- ChatGPT Enterprise/Team account

### 3. Verify Server is Running

Test your server before connecting:

```bash
# Health check
curl https://mcp-dadosbr-aredes-staging.cristianoaredes.workers.dev/health

# OAuth discovery
curl https://mcp-dadosbr-aredes-staging.cristianoaredes.workers.dev/.well-known/oauth-authorization-server | jq
```

---

## 🚀 Step-by-Step Integration

### Step 1: Access ChatGPT Settings

1. Open [ChatGPT](https://chat.openai.com)
2. Click your **profile icon** (bottom left)
3. Select **Settings**
4. Navigate to **Beta features** or **Integrations** section

> **Note**: The exact menu location may vary based on ChatGPT version. Look for "MCP", "External Tools", or "API Integrations"

### Step 2: Add MCP Server

1. Click **"Add Custom MCP Server"** or **"Connect API"**
2. Enter the server details:

**Server Configuration**:
```
Server URL: https://mcp-dadosbr-aredes-staging.cristianoaredes.workers.dev
Server Name: DadosBR (optional)
Description: Brazilian company (CNPJ) and postal code (CEP) lookup
```

### Step 3: OAuth Authorization Flow

ChatGPT will now automatically perform the OAuth flow:

#### What Happens Behind the Scenes:

1. **Discovery** (Automatic)
   - ChatGPT calls: `GET /.well-known/oauth-authorization-server`
   - Discovers all OAuth endpoints

2. **Client Registration** (Automatic)
   - ChatGPT calls: `POST /oauth/register`
   - Receives `client_id` and `client_secret`

3. **Authorization** (May require your approval)
   - ChatGPT opens: `/oauth/authorize?client_id=...&redirect_uri=...`
   - You may see a consent screen
   - Click **"Authorize"** or **"Allow Access"**

4. **Token Exchange** (Automatic)
   - ChatGPT calls: `POST /oauth/token`
   - Receives `access_token` with scopes: `openid profile mcp`

5. **Tools Discovery** (Automatic)
   - ChatGPT calls: `POST /mcp` with `tools/list`
   - Discovers 5 available tools

### Step 4: Verify Integration

After authorization, you should see:
- ✅ **Status**: Connected
- ✅ **5 tools available**:
  - cnpj_lookup
  - cep_lookup
  - cnpj_search
  - sequentialthinking
  - cnpj_intelligence

---

## 🛠️ Available Tools

### 1. cnpj_lookup - Company Lookup

**Purpose**: Look up Brazilian company information by CNPJ number

**Example Prompts**:
```
"Can you look up CNPJ 11.222.333/0001-81?"

"What information can you find about the company with CNPJ 28526270000150?"

"Look up the company AC SOLUCOES using their CNPJ"
```

**Returns**:
- Company name (razão social)
- Tax status (situação cadastral)
- Address
- CNAE code (business activity)
- Registration date
- And more...

---

### 2. cep_lookup - Postal Code Lookup

**Purpose**: Look up Brazilian address information by CEP (postal code)

**Example Prompts**:
```
"What's the address for CEP 01310-100?"

"Look up postal code 20040-020"

"Can you tell me what street corresponds to CEP 30130-100?"
```

**Returns**:
- Street name (logradouro)
- Neighborhood (bairro)
- City (localidade)
- State (UF)
- Area code (DDD)

---

### 3. cnpj_search - Web Search for Companies

**Purpose**: Search the web for information about Brazilian companies using intelligent search queries (Google Dorks)

**Example Prompts**:
```
"Search for AC SOLUCOES on government websites"

"Find legal information about CNPJ 28526270000150 on jusbrasil"

"Search for documents related to company with CNPJ 11.222.333/0001-81"
```

**Supports Advanced Operators**:
- `site:gov.br` - Search government sites
- `site:jusbrasil.com.br` - Search legal cases
- `filetype:pdf` - Search for PDF documents
- `intext:"CNPJ"` - Search for exact text

**Example with Operators**:
```
"Search for: 28526270000150 site:transparencia.gov.br filetype:pdf"
```

---

### 4. sequentialthinking - Structured Reasoning

**Purpose**: Break down complex problems into step-by-step thoughts for better analysis

**Example Prompts**:
```
"Use sequential thinking to plan a due diligence investigation for CNPJ 28526270000150"

"Think step by step about how to research this company's legal history"

"Help me analyze whether this CNPJ is suitable for a business partnership"
```

**Best For**:
- Due diligence planning
- Complex analysis tasks
- Multi-step investigations
- Problem-solving that requires reasoning

---

### 5. cnpj_intelligence - Intelligent Company Research

**Purpose**: Automatically orchestrate multiple searches and generate a comprehensive report about a company

**Example Prompts**:
```
"Do a complete intelligence search on CNPJ 28526270000150"

"Research everything you can find about company with CNPJ 11.222.333/0001-81"

"Generate an intelligence report for this CNPJ including legal cases and news"
```

**What It Does**:
1. Looks up company data
2. Generates smart search queries for:
   - Government records
   - Legal cases
   - News articles
   - Documents
   - Social media
   - Partners information
3. Filters results to ensure CNPJ appears (100% accuracy)
4. Returns consolidated report

**Search Categories**:
- `government` - Government portals (transparência.gov.br, etc.)
- `legal` - Legal cases (jusbrasil, tjsp, etc.)
- `news` - News articles
- `documents` - PDF, DOC files
- `social` - LinkedIn, social media
- `partners` - Information about business partners

**Advanced Example**:
```
"Do an intelligence search for CNPJ 28526270000150 focusing only on legal and news categories, with maximum 3 results per query"
```

---

## 💬 Example Conversations

### Basic Company Lookup

**You**:
```
Can you look up information about the company with CNPJ 11.222.333/0001-81?
```

**ChatGPT**:
```
I'll look that up using the cnpj_lookup tool.

[Calls cnpj_lookup with CNPJ 11222333000181]

Here's what I found:
- Company Name: AC SOLUCOES DIGITAIS LTDA
- Tax Status: Active (Ativa)
- Address: Rua Exemplo, 123, São Paulo - SP
- CNAE: 6201-5/00 - Software Development
- Registration Date: 2010-01-15
...
```

### Complex Due Diligence

**You**:
```
I need to do due diligence on CNPJ 28.526.270/0001-50. 
Can you first look up the company info, then search for any legal cases, 
and finally check for any news articles?
```

**ChatGPT**:
```
I'll help you with a comprehensive due diligence. Let me break this down:

1. First, I'll look up the company information
[Calls cnpj_lookup]

Company: [Company Name]
Status: [Active/Inactive]
...

2. Now let me search for legal cases
[Calls cnpj_search with site:jusbrasil.com.br]

Found 5 legal cases:
- [Case 1 details]
- [Case 2 details]
...

3. Finally, checking for news articles
[Calls cnpj_search for news]

Recent news:
- [Article 1]
- [Article 2]
...

Summary:
[ChatGPT provides analysis based on all findings]
```

### Using Intelligence Tool

**You**:
```
Generate a complete intelligence report for CNPJ 28526270000150
```

**ChatGPT**:
```
I'll use the cnpj_intelligence tool to perform a comprehensive search.

[Calls cnpj_intelligence with all categories]

Intelligence Report for CNPJ 28.526.270/0001-50:

Company Data:
- Name: [Company Name]
- Status: [Status]
- Address: [Address]

Search Results:

Government Records (5 results):
- [Result 1]
- [Result 2]
...

Legal Cases (3 results):
- [Case 1]
- [Case 2]
...

News Articles (4 results):
- [Article 1]
- [Article 2]
...

[ChatGPT provides comprehensive analysis]
```

---

## 🔧 Troubleshooting

### Issue: "Could not connect to server"

**Solutions**:
1. Verify server is running:
   ```bash
   curl https://mcp-dadosbr-aredes-staging.cristianoaredes.workers.dev/health
   ```

2. Check if HTTPS is working (not HTTP)

3. Ensure no firewall blocking Cloudflare Workers

---

### Issue: "Not all requested permissions were granted"

**Solutions**:
1. Remove the server from ChatGPT
2. Clear ChatGPT cache (if available)
3. Re-add the server
4. Make sure you clicked "Authorize" during OAuth flow

**Technical Verification**:
```bash
# Test token endpoint returns all scopes
curl -X POST https://mcp-dadosbr-aredes-staging.cristianoaredes.workers.dev/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=test_code&redirect_uri=https://example.com/callback"
```

Should return:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile mcp",
  "id_token": "..."
}
```

---

### Issue: "Server doesn't support RFC 7591"

**Solution**: This was fixed in version 1550c18. Update your deployment:

```bash
git pull origin main
npm run build:worker
npm run deploy:staging
```

---

### Issue: "Tool execution failed"

**Possible Causes**:
1. **TAVILY_API_KEY not set** (for cnpj_search and cnpj_intelligence)
   ```bash
   wrangler secret put TAVILY_API_KEY --env staging
   ```

2. **CNPJ format invalid** - Try without formatting: `11222333000181`

3. **CEP format invalid** - Try without formatting: `01310100`

**Check Logs**:
```bash
wrangler tail --env staging
```

---

### Issue: "Rate limit exceeded"

The server has rate limiting (30 requests/minute per IP).

**Solutions**:
1. Wait 1 minute before retrying
2. Spread out your requests
3. For development, temporarily disable:
   ```bash
   # Add to environment variables
   MCP_DISABLE_RATE_LIMIT=true
   ```

---

## 🔐 Security & Privacy

### What Data is Shared?

**From ChatGPT to MCP Server**:
- OAuth client credentials (generated dynamically)
- Search queries you type
- CNPJ/CEP numbers you request

**From MCP Server to ChatGPT**:
- Public company data from OpenCNPJ
- Public postal code data from OpenCEP
- Web search results from Tavily

### Data Storage

**Not Stored**:
- Your ChatGPT conversations
- OAuth tokens (generated per session)
- Personal identifying information

**Temporarily Cached** (60 seconds):
- CNPJ/CEP lookup results (for performance)
- Search results

### Rate Limiting

- Default: 30 requests per minute per IP
- Configurable via `MCP_DISABLE_RATE_LIMIT` environment variable

---

## 🚀 Production Deployment

When ready to use in production with your custom domain:

### 1. Deploy to Production

```bash
npm run deploy
```

### 2. Set up Custom Domain

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker: `mcp-dadosbr-aredes-prod`
3. Go to Settings → Triggers
4. Add Custom Domain: `mcp-dadosbr.aredes.me`

### 3. Update ChatGPT Configuration

Change server URL to:
```
https://mcp-dadosbr.aredes.me
```

### 4. Test Production

```bash
# Health check
curl https://mcp-dadosbr.aredes.me/health

# OAuth discovery
curl https://mcp-dadosbr.aredes.me/.well-known/oauth-authorization-server | jq
```

---

## 📊 Monitoring

### View Live Logs

```bash
# Staging
wrangler tail --env staging

# Production
wrangler tail --env production
```

### Check Metrics

Cloudflare Dashboard → Workers & Pages → Your Worker → Metrics

Monitor:
- Requests per second
- Success rate
- Error rate
- CPU time
- KV operations

---

## 🆘 Support

### Documentation

- **Main README**: [README.md](../README.md)
- **Configuration**: [CONFIGURATION.md](CONFIGURATION.md)
- **Deployment**: [DEPLOYMENT_READY.md](DEPLOYMENT_READY.md)

### Get Help

- **GitHub Issues**: [Report a bug](https://github.com/cristianoaredes/mcp-dadosbr/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/cristianoaredes/mcp-dadosbr/discussions)
- **Email**: cristiano@aredes.me

---

## 📝 Quick Reference

### Server URLs

| Environment | URL |
|-------------|-----|
| Staging | `https://mcp-dadosbr-aredes-staging.cristianoaredes.workers.dev` |
| Production | `https://mcp-dadosbr.aredes.me` |

### OAuth Endpoints

| Endpoint | Path |
|----------|------|
| Discovery | `/.well-known/oauth-authorization-server` |
| Registration | `/oauth/register` |
| Authorization | `/oauth/authorize` |
| Token | `/oauth/token` |
| User Info | `/oauth/userinfo` |

### MCP Endpoints

| Endpoint | Path |
|----------|------|
| JSON-RPC | `/mcp` |
| SSE | `/sse` |
| Health | `/health` |

### Tools Quick Reference

| Tool | Purpose | Example |
|------|---------|---------|
| cnpj_lookup | Company info | "Look up CNPJ 11.222.333/0001-81" |
| cep_lookup | Postal code | "What's CEP 01310-100?" |
| cnpj_search | Web search | "Search for AC SOLUCOES on gov sites" |
| sequentialthinking | Reasoning | "Think step by step about this company" |
| cnpj_intelligence | Full research | "Intelligence report for CNPJ 28526270000150" |

---

**Last Updated**: 2025-11-12  
**Version**: 0.3.6  
**Status**: ✅ ChatGPT Ready
