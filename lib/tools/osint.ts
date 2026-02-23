/**
 * OSINT tools — Strategic Prompt Generator + Dork Templates
 */

import { registerTool } from "../core/registry.js";
import { LookupResult } from "../types/index.js";

type PromptTemplate = "due_diligence" | "competitor_analysis" | "fraud_detection" | "esg_compliance" | "investment_screening";

interface StrategicPromptArgs {
    template: PromptTemplate;
    company_name?: string;
    cnpj?: string;
    context?: string;
}

const PROMPT_TEMPLATES: Record<PromptTemplate, string> = {
    due_diligence: `# Due Diligence Report — {company}

Conduct a comprehensive due diligence analysis for the company identified by CNPJ {cnpj}. Use all available MCP tools systematically:

1. **Company Registration**: Use \`cnpj_lookup\` to get official registration data, QSA (partners), CNAE codes, and status.
2. **Government Contracts**: Use \`transparencia_lookup\` to check for federal contracts, tenders, and agreements.
3. **Legal Proceedings**: Use \`datajud_processos\` to search for active lawsuits across relevant tribunals (TJSP, TST, STJ).
4. **Compliance Check**: Use \`lista_suja_lookup\` to verify absence from the slave labor blacklist.
5. **Digital Presence**: If a domain is known, use \`domain_whois\` to verify domain registration age and ownership.
6. **Reputation**: Use \`cnpj_search\` to find recent news, complaints, and public mentions.
7. **Partner Validation**: Use \`cpf_validate\` on each partner's CPF from the QSA data.

Produce a structured report with: Executive Summary, Company Overview, Risk Assessment (Low/Medium/High/Critical), Findings by Category, and Recommendations.
{context}`,

    competitor_analysis: `# Competitive Intelligence — {company}

Analyze the competitive landscape for {company} (CNPJ: {cnpj}):

1. Use \`cnpj_lookup\` to identify the company's CNAE codes and market segment.
2. Use \`cnpj_search\` to find competitors in the same segment.
3. Use \`ibge_localidades\` to understand the geographic market (state, municipality).
4. Use \`transparencia_lookup\` to check if competitors hold government contracts.
5. Use \`domain_whois\` to compare digital maturity (domain age, infrastructure).

Produce: Market Position, Key Competitors, Differentiators, Market Opportunities, and Strategic Recommendations.
{context}`,

    fraud_detection: `# Fraud Risk Assessment — {company}

Evaluate fraud indicators for {company} (CNPJ: {cnpj}):

RED FLAGS TO CHECK:
1. **Shell Company Indicators**: Use \`cnpj_lookup\` — check if recently created, minimal capital, suspicious address.
2. **Phantom Partners**: Use \`cpf_validate\` on QSA members — invalid CPFs are a major red flag.
3. **Digital Fraud**: Use \`domain_whois\` — recently registered domains (<6 months) are suspicious.
4. **Legal History**: Use \`datajud_processos\` — fraud-related proceedings.
5. **Location Verification**: Use \`ibge_localidades\` — verify the municipality exists and makes sense for the business type.
6. **Government Sanctions**: Use \`lista_suja_lookup\` — check for sanctions.

Score each indicator and produce a Fraud Risk Score (0-100) with detailed justification.
{context}`,

    esg_compliance: `# ESG Compliance Report — {company}

Evaluate Environmental, Social, and Governance compliance for {company} (CNPJ: {cnpj}):

SOCIAL:
1. Use \`lista_suja_lookup\` — CRITICAL: Check slave labor blacklist.
2. Use \`datajud_processos\` with TST (labor court) — Check for labor violations.
3. Use \`cnpj_search\` — Search for environmental incidents, worker complaints.

GOVERNANCE:
4. Use \`cnpj_lookup\` — Analyze ownership structure, related companies.
5. Use \`transparencia_lookup\` — Government relationships and potential conflicts of interest.
6. Use \`cpf_validate\` — Verify all partners are real persons.

Produce: ESG Score (A-F), Risk Matrix, Findings by Pillar (E/S/G), and Remediation Recommendations.
{context}`,

    investment_screening: `# Investment Screening — {company}

Conduct pre-investment screening for {company} (CNPJ: {cnpj}):

1. **Legal Standing**: Use \`cnpj_lookup\` — Verify active status, legal nature, founding date.
2. **Partner Background**: Use \`cpf_validate\` + \`cnpj_search\` on each QSA member.
3. **Legal Risk**: Use \`datajud_processos\` — Active litigation exposure.
4. **Public Sector Revenue**: Use \`transparencia_lookup\` — Government contracts (concentration risk).
5. **Compliance**: Use \`lista_suja_lookup\` — Regulatory sanctions.
6. **Market Position**: Use \`cnpj_search\` — Recent news, market perception.
7. **Digital Maturity**: Use \`domain_whois\` — Online presence assessment.

Produce: Investment Viability Score, Key Risks, Deal Breakers, and Recommended Next Steps.
{context}`,
};

function executeStrategicPrompt(args: StrategicPromptArgs): LookupResult {
    const { template, company_name, cnpj, context } = args;
    const templateStr = PROMPT_TEMPLATES[template];
    if (!templateStr) {
        return { ok: false, error: `Unknown template: ${template}. Available: ${Object.keys(PROMPT_TEMPLATES).join(", ")}` };
    }
    const prompt = templateStr
        .replace(/\{company\}/g, company_name || "the target company")
        .replace(/\{cnpj\}/g, cnpj || "[CNPJ not provided]")
        .replace(/\{context\}/g, context ? `\nAdditional context: ${context}` : "");

    return {
        ok: true,
        data: {
            template, prompt,
            tools_referenced: ["cnpj_lookup", "cnpj_search", "transparencia_lookup", "datajud_processos", "lista_suja_lookup", "domain_whois", "cpf_validate", "ibge_localidades"],
            instruction: "Execute the tools listed in the prompt above in sequence, then compile the final report based on collected data.",
        },
    };
}

registerTool({
    name: "strategic_osint_prompt",
    description: `Generate strategic OSINT analysis prompts using predefined templates.

Available templates:
- due_diligence: Complete risk analysis for partners/suppliers
- competitor_analysis: Competitive landscape analysis
- fraud_detection: Fraud risk scoring with red flag indicators
- esg_compliance: Environmental, Social, and Governance audit
- investment_screening: Pre-investment due diligence

Each template produces a structured prompt referencing all available MCP tools.`,
    inputSchema: {
        type: "object",
        properties: {
            template: { type: "string", enum: ["due_diligence", "competitor_analysis", "fraud_detection", "esg_compliance", "investment_screening"], description: "Template to use" },
            company_name: { type: "string", description: "Company name (optional)" },
            cnpj: { type: "string", description: "CNPJ (optional)" },
            context: { type: "string", description: "Additional context to append (optional)" },
        },
        required: ["template"],
    },
    execute: async (args) => executeStrategicPrompt(args as StrategicPromptArgs),
});
