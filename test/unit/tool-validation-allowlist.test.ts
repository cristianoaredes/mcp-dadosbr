import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, afterEach } from "vitest";
import "../../lib/tools/index.js";
import { TOOL_DEFINITIONS } from "../../lib/core/tools.js";
import {
  executeRegisteredTool,
  getToolCount,
  hasToolSchema,
} from "../../lib/core/registry.js";
import { TOOL_SCHEMAS } from "../../lib/core/tool-schemas.js";
import { CNPJ_INTELLIGENCE_TOOL } from "../../lib/core/intelligence.js";
import { resolveApiConfig } from "../../lib/config/index.js";

describe("TCK-0016 / TCK-0044: Runtime Zod Validation Across All 29 MCP Tools", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers all 29 tools with a runtime Zod schema and zero api_key parameters", () => {
    expect(getToolCount()).toBe(29);
    expect(TOOL_DEFINITIONS).toHaveLength(29);

    for (const def of TOOL_DEFINITIONS) {
      expect(hasToolSchema(def.name)).toBe(true);
      expect(TOOL_SCHEMAS[def.name]).toBeDefined();
      const props = (def.inputSchema as { properties?: Record<string, unknown> })
        .properties;
      expect(props).not.toHaveProperty("api_key");
    }

    expect(
      CNPJ_INTELLIGENCE_TOOL.inputSchema.properties as Record<string, unknown>
    ).not.toHaveProperty("api_key");
  });

  it("rejects invalid types, missing fields, and out-of-bounds limits for every tool without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const apiConfig = resolveApiConfig();

    const invalidCases: Array<{ tool: string; args: unknown; label: string }> = [
      { tool: "cnpj_lookup", args: { cnpj: 123 }, label: "non-string cnpj" },
      { tool: "cnpj_lookup", args: { cnpj: "11222333000180" }, label: "bad checksum" },
      { tool: "cep_lookup", args: { cep: "123" }, label: "short cep" },
      { tool: "cnpj_search", args: { query: "", max_results: 5 }, label: "empty query" },
      { tool: "cnpj_search", args: { query: "acme", max_results: 999 }, label: "unbounded max_results" },
      { tool: "cnpj_intelligence", args: { cnpj: "11222333000181", api_key: "client-key" }, label: "forbidden api_key" },
      { tool: "cnpj_intelligence", args: { cnpj: "11222333000181", max_queries: 100 }, label: "unbounded max_queries" },
      { tool: "cnpj_intelligence", args: { cnpj: "11222333000181", categories: ["invalid_cat"] }, label: "invalid category" },
      { tool: "sequentialthinking", args: { thought: "hi", thoughtNumber: 0, totalThoughts: 1, nextThoughtNeeded: true }, label: "thoughtNumber < 1" },
      { tool: "sequentialthinking", args: { thought: "", thoughtNumber: 1, totalThoughts: 1, nextThoughtNeeded: "yes" }, label: "wrong boolean type" },
      { tool: "cpf_validate", args: { cpf: 12345678900 }, label: "non-string cpf" },
      { tool: "domain_whois", args: { domain: "" }, label: "empty domain" },
      { tool: "consumidor_reclamacoes", args: { empresa: null }, label: "null empresa" },
      { tool: "company_deep_profile", args: { cnpj: "invalid" }, label: "invalid cnpj" },
      { tool: "ibge_localidades", args: { tipo: "municipios_por_uf" }, label: "missing uf" },
      { tool: "ibge_localidades", args: { tipo: "bairros" }, label: "invalid tipo enum" },
      { tool: "transparencia_lookup", args: { cnpj: "123", tipo: "contratos" }, label: "short cnpj" },
      { tool: "transparencia_lookup", args: { cnpj: "11222333000181", tipo: "contratos", dataInicio: "2026-01-01" }, label: "bad date format" },
      { tool: "transparencia_lookup", args: { cnpj: "11222333000181", tipo: "contratos", pagina: 0 }, label: "pagina < 1" },
      { tool: "ceis_cnep_lookup", args: { query: "", pagina: -1 }, label: "empty query and negative pagina" },
      { tool: "pncp_licitacoes", args: { query: "ti", modalidade_id: 0 }, label: "modalidade_id < 1" },
      { tool: "pncp_licitacoes", args: { query: "ti", pagina: 5000 }, label: "pagina > 1000" },
      { tool: "querido_diario", args: { query: "licitacao", size: 500 }, label: "size > 100" },
      { tool: "querido_diario", args: { query: "licitacao", size: 0 }, label: "size < 1" },
      { tool: "querido_diario", args: { query: "licitacao", since: "01/01/2026" }, label: "invalid since date" },
      { tool: "querido_diario", args: { query: "licitacao", territory_id: "../etc" }, label: "non-numeric territory_id" },
      { tool: "datajud_processos", args: { query: "teste", tribunal: "unknown_court" }, label: "unknown tribunal" },
      { tool: "datajud_processos", args: { query: "teste", tamanho: -5 }, label: "negative tamanho" },
      { tool: "oab_advogado", args: {}, label: "missing nome and inscricao" },
      { tool: "oab_advogado", args: { nome: "Maria", uf: "123" }, label: "invalid UF" },
      { tool: "bnmp_mandados", args: { nome: "A" }, label: "name too short" },
      { tool: "procurados_lookup", args: { nome: "" }, label: "empty nome" },
      { tool: "lista_suja_lookup", args: null, label: "null args" },
      { tool: "bacen_taxas", args: { indicador: "bitcoin" }, label: "invalid indicador" },
      { tool: "bacen_taxas", args: { indicador: "selic", ultimos: 0 }, label: "ultimos < 1" },
      { tool: "fipe_veiculos", args: {}, label: "missing codigo_fipe and tipo" },
      { tool: "fipe_veiculos", args: { tipo: "../../cnpj/v1/11222333000181" }, label: "traversal tipo" },
      { tool: "cnes_saude", args: { tipo: "invalid_type" }, label: "invalid cnes tipo" },
      { tool: "strategic_osint_prompt", args: { template: "unknown_tpl" }, label: "invalid template" },
      { tool: "tcu_certidoes", args: { cnpj: "11222333000180" }, label: "bad checksum cnpj" },
      { tool: "cnae_ncm_lookup", args: { tipo: "cnae" }, label: "missing codigo and termo" },
      { tool: "sistema_financeiro_lookup", args: { tipo: "pix", ispb: "123" }, label: "short ispb" },
      { tool: "feriados_ddd_lookup", args: { tipo: "ddd" }, label: "missing ddd" },
      { tool: "bcb_olinda", args: { consulta: "ptax", data: "2026-02-30" }, label: "invalid calendar date" },
      { tool: "ibge_indicadores", args: { codigo_ibge: "123" }, label: "invalid codigo_ibge length" },
    ];

    // Confirm invalidCases covers all 29 registered tools at least once
    const testedTools = new Set(invalidCases.map((c) => c.tool));
    expect(testedTools.size).toBe(29);

    for (const { tool, args, label } of invalidCases) {
      const res = await executeRegisteredTool(tool, args, apiConfig);
      expect(res.ok, `Expected ${tool} (${label}) to fail Zod validation`).toBe(false);
      expect(res.error, `Expected parameter error on ${tool} (${label})`).toMatch(
        /^Invalid parameters for /
      );
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("versions valid .archagents/_capabilities.json and .archagents/mcp-tool-allowlist.json matching all 29 tools", () => {
    const capPath = resolve(process.cwd(), ".archagents/_capabilities.json");
    const allowlistPath = resolve(
      process.cwd(),
      ".archagents/mcp-tool-allowlist.json"
    );

    const cap = JSON.parse(readFileSync(capPath, "utf-8"));
    expect(cap.enabled).toBe(false);
    expect(cap.agentic?.mcp).toBe(true);
    expect(cap.agentic?.tool_count).toBe(29);

    const allowlist = JSON.parse(readFileSync(allowlistPath, "utf-8"));
    expect(
      allowlist.mcp_servers?.allowed?.some(
        (s: { server?: string }) => s.server === "mcp-dadosbr"
      )
    ).toBe(true);

    const entries = allowlist.entries as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(29);

    const ids = new Set<string>();
    const names: string[] = [];
    for (const entry of entries) {
      expect(entry.id).toBeTypeOf("string");
      expect(entry.name).toBeTypeOf("string");
      expect(entry.risk_level).toBeTypeOf("string");
      expect(entry.destructive).toBe(false);
      expect(typeof entry.requires_approval).toBe("boolean");
      ids.add(String(entry.id));
      names.push(String(entry.name));
    }
    expect(ids.size).toBe(29);

    const registeredNames = TOOL_DEFINITIONS.map((t) => t.name).sort();
    expect(names.sort()).toEqual(registeredNames);
  });
});
