import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeTool, getMetrics, resetMetrics } from "../../lib/core/tools.js";
import { MemoryCache } from "../../lib/core/cache.js";
import { deduplicate, getPendingRequestCount, lookup } from "../../lib/tools/core.js";
import { resetCircuitBreakers } from "../../lib/core/http-client.js";
import { resolveApiConfig } from "../../lib/config/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

describe("MCP Tools (Company, Health, OSINT, Legal, Government) & Tool Orchestrator", () => {
  const apiConfig = resolveApiConfig();
  const originalDatajud = process.env.DATAJUD_API_KEY;
  const originalTransparencia = process.env.TRANSPARENCIA_API_KEY;
  const originalTavily = process.env.TAVILY_API_KEY;
  const originalPerplexity = process.env.PERPLEXITY_API_KEY;

  beforeEach(() => {
    delete process.env.DATAJUD_API_KEY;
    delete process.env.TRANSPARENCIA_API_KEY;
    delete process.env.TAVILY_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    resetMetrics();
    resetCircuitBreakers();
  });

  afterEach(() => {
    if (originalDatajud === undefined) delete process.env.DATAJUD_API_KEY;
    else process.env.DATAJUD_API_KEY = originalDatajud;

    if (originalTransparencia === undefined) delete process.env.TRANSPARENCIA_API_KEY;
    else process.env.TRANSPARENCIA_API_KEY = originalTransparencia;

    if (originalTavily === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = originalTavily;

    if (originalPerplexity === undefined) delete process.env.PERPLEXITY_API_KEY;
    else process.env.PERPLEXITY_API_KEY = originalPerplexity;

    resetMetrics();
    resetCircuitBreakers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("lib/core/tools.ts & lib/tools/core.ts", () => {
    it("tracks requests, errors, thrown exceptions, and logs periodic metrics every 100 calls to stderr", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const okRes = await executeTool("cpf_validate", { cpf: "52998224725" }, apiConfig);
      expect(okRes.ok).toBe(true);
      expect(getMetrics()).toMatchObject({ requests: 1, errors: 0 });

      const failRes = await executeTool("cpf_validate", { cpf: "123" }, apiConfig);
      expect(failRes.ok).toBe(false);
      expect(getMetrics()).toMatchObject({ requests: 2, errors: 1 });

      const failingCache = {
        get: vi.fn().mockRejectedValue(new Error("cache broken")),
        set: vi.fn().mockResolvedValue(undefined),
      };
      await expect(
        executeTool("cnpj_lookup", { cnpj: "11222333000181" }, apiConfig, failingCache)
      ).rejects.toThrow("cache broken");
      expect(getMetrics()).toMatchObject({ requests: 3, errors: 2 });

      for (let i = 0; i < 97; i++) {
        await executeTool("cpf_validate", { cpf: "52998224725" }, apiConfig);
      }
      expect(getMetrics().requests).toBe(100);
      expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[metrics\] requests=100 /));

      resetMetrics();
      expect(getMetrics()).toMatchObject({ requests: 0, errors: 0, cacheHits: 0, totalTime: 0 });
    });

    it("clears stale timeout when overwriting timestamp-expired entry in deduplicate and handles lookup 404/cache", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      let resolveStale!: (v: string) => void;
      const stalePromise = deduplicate(
        "stale-key",
        () =>
          new Promise<string>((resolve) => {
            resolveStale = resolve;
          })
      );

      // Advance system clock past DEDUP_TIMEOUT_MS without running timer callback yet
      vi.setSystemTime(new Date("2026-11-20T12:00:35Z"));

      const freshPromise = deduplicate("stale-key", async () => "fresh");
      // Existing stale timeout must be cleared synchronously before the fresh promise settles
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
      const freshValue = await freshPromise;
      expect(freshValue).toBe("fresh");
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

      resolveStale("stale");
      expect(await stalePromise).toBe("stale");
      expect(getPendingRequestCount()).toBe(0);

      // lookup cache miss + cache hit + 404 message
      const cache = new MemoryCache(10, 60000);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ cep: "01310100", logradouro: "Av Paulista" }))
        .mockResolvedValueOnce(jsonResponse({ message: "not found" }, 404));

      const cepOk = await lookup("cep", "01310100", apiConfig, cache);
      expect(cepOk.ok).toBe(true);
      const cepCached = await lookup("cep", "01310100", apiConfig, cache);
      expect(cepCached.ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const cepNotFound = await lookup("cep", "99999999", apiConfig, cache);
      expect(cepNotFound).toEqual({ ok: false, error: "CEP not found" });
    });
  });

  describe("lib/tools/company.ts", () => {
    it("cpf_validate validates mod-11 checksums across fiscal regions and rejects invalid/repeated CPFs", async () => {
      const validSp = await executeTool("cpf_validate", { cpf: "52998224725" }, apiConfig);
      expect(validSp.ok).toBe(true);
      expect(validSp.data).toMatchObject({ cpf: "529.982.247-25", valid: true, region: "ES/RJ" });

      // Exercises remainder < 2 -> check digit 0 branches
      const validZeroFirst = await executeTool("cpf_validate", { cpf: "123.456.783-05" }, apiConfig);
      expect(validZeroFirst.ok).toBe(true);
      expect(validZeroFirst.data).toMatchObject({ valid: true, region: "CE/MA/PI" });

      const validZeroBoth = await executeTool("cpf_validate", { cpf: "11111111200" }, apiConfig);
      expect(validZeroBoth.ok).toBe(true);
      expect(validZeroBoth.data).toMatchObject({ valid: true, region: "AC/AM/AP/PA/RO/RR" });

      const repeated = await executeTool("cpf_validate", { cpf: "111.111.111-11" }, apiConfig);
      expect(repeated.ok).toBe(true);
      expect(repeated.data).toMatchObject({ valid: false, region: undefined });

      const badCheck2 = await executeTool("cpf_validate", { cpf: "52998224726" }, apiConfig);
      expect(badCheck2.ok).toBe(true);
      expect(badCheck2.data).toMatchObject({ valid: false });

      const shortCpf = await executeTool("cpf_validate", { cpf: "12345" }, apiConfig);
      expect(shortCpf).toEqual({ ok: false, error: "CPF must have exactly 11 digits" });
    });

    it("domain_whois queries Registro.br RDAP, falls back to IANA, and reports errors cleanly", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ ldhName: "nubank.com.br" }))
        .mockResolvedValueOnce(jsonResponse({}, 404))
        .mockResolvedValueOnce(jsonResponse({ ldhName: "example.com" }))
        .mockResolvedValueOnce(jsonResponse({}, 404))
        .mockResolvedValueOnce(jsonResponse({}, 404));

      const brOk = await executeTool(
        "domain_whois",
        { domain: "https://nubank.com.br/contato" },
        apiConfig
      );
      expect(brOk.ok).toBe(true);
      expect(brOk.data).toMatchObject({ domain: "nubank.com.br", source: "RDAP — Registro.br" });
      expect(fetchSpy.mock.calls[0][0]).toContain("rdap.registro.br/domain/nubank.com.br");

      const ianaOk = await executeTool("domain_whois", { domain: "example.com" }, apiConfig);
      expect(ianaOk.ok).toBe(true);
      expect(ianaOk.data).toMatchObject({ domain: "example.com", source: "RDAP — IANA Bootstrap" });

      const notFound = await executeTool("domain_whois", { domain: "missing.invalid" }, apiConfig);
      expect(notFound).toEqual({ ok: false, error: "Domain not found in RDAP: missing.invalid" });
    });

    it("consumidor_reclamacoes returns API results on 200 and structured portal fallback on error", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ empresas: [{ nome: "ACME" }] }))
        .mockResolvedValueOnce(jsonResponse({}, 404));

      const apiOk = await executeTool("consumidor_reclamacoes", { empresa: "ACME" }, apiConfig);
      expect(apiOk.ok).toBe(true);
      expect(apiOk.data).toMatchObject({ source: "Consumidor.gov.br — SENACON" });

      const fallback = await executeTool("consumidor_reclamacoes", { empresa: "ACME" }, apiConfig);
      expect(fallback.ok).toBe(true);
      expect(fallback.data).toMatchObject({
        source: "Consumidor.gov.br",
        open_data: expect.stringContaining("dados.gov.br"),
      });
    });

    it("company_deep_profile orchestrates full profile (with keys + domain) and partial failure recovery", async () => {
      process.env.TRANSPARENCIA_API_KEY = "transp-key";
      process.env.DATAJUD_API_KEY = "datajud-key";
      process.env.PERPLEXITY_API_KEY = "pplx-key";

      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("api.opencnpj.org")) return jsonResponse({ cnpj: "11222333000181", uf: "SP" });
        if (url.includes("portaldatransparencia.gov.br/api-de-dados")) return jsonResponse([{ id: 1 }]);
        if (url.includes("api-publica.datajud.cnj.jus.br")) return jsonResponse({ hits: { total: 2 } });
        if (url.includes("rdap.registro.br")) return jsonResponse({ ldhName: "acme.com.br" });
        if (url.includes("portaldatransparencia.gov.br/sancoes")) return jsonResponse({ itens: [] });
        if (url.includes("perplexity.ai")) {
          return jsonResponse({ choices: [{ message: { content: "news item" } }] });
        }
        return jsonResponse({}, 404);
      });

      const fullProfile = await executeTool(
        "company_deep_profile",
        {
          cnpj: "11.222.333/0001-81",
          include_government: true,
          include_legal: true,
          include_news: true,
          domain: "acme.com.br",
        },
        apiConfig
      );
      expect(fullProfile.ok).toBe(true);
      expect(fullProfile.data).toMatchObject({
        cnpj: "11222333000181",
        errors_encountered: undefined,
      });
      const sources = (fullProfile.data as { sources_queried: string[] }).sources_queried;
      expect(sources).toEqual(
        expect.arrayContaining([
          "cnpj_data",
          "government_contracts",
          "court_records",
          "domain_whois",
          "lista_suja",
          "news_results",
        ])
      );

      // Partial failures: CNPJ upstream 404 + flags false -> recovers cleanly & records errors_encountered
      delete process.env.TRANSPARENCIA_API_KEY;
      delete process.env.DATAJUD_API_KEY;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
        jsonResponse({ error: "not found" }, 404)
      );

      const partialProfile = await executeTool(
        "company_deep_profile",
        {
          cnpj: "11222333000181",
          include_government: false,
          include_legal: false,
          include_news: false,
        },
        apiConfig
      );
      expect(partialProfile.ok).toBe(true);
      const partialData = partialProfile.data as {
        errors_encountered?: string[];
        sources_unavailable: string[];
      };
      expect(partialData.errors_encountered?.length).toBeGreaterThan(0);
      expect(partialData.sources_unavailable).toContain("cnpj_data");
    });
  });

  describe("lib/tools/health.ts & lib/tools/osint.ts", () => {
    it("cnes_saude covers estabelecimento, profissional, optional filters, and DataSUS fallback", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ estabelecimentos: [{ codigo_cnes: "2077485" }] }))
        .mockResolvedValueOnce(jsonResponse({ profissionais: [{ nome: "Dra Maria" }] }))
        .mockResolvedValueOnce(jsonResponse({}, 404));

      const est = await executeTool(
        "cnes_saude",
        {
          tipo: "estabelecimento",
          codigo_cnes: "2077485",
          nome: "HOSPITAL",
          uf: "35",
          municipio: "3550308",
        },
        apiConfig
      );
      expect(est.ok).toBe(true);
      expect(est.data).toMatchObject({ source: "CNES — DataSUS" });
      expect(fetchSpy.mock.calls[0][0]).toContain("/estabelecimentos");

      const prof = await executeTool(
        "cnes_saude",
        { tipo: "profissional", nome: "Maria" },
        apiConfig
      );
      expect(prof.ok).toBe(true);
      expect(fetchSpy.mock.calls[1][0]).toContain("/profissionais");

      const fallback = await executeTool(
        "cnes_saude",
        { tipo: "estabelecimento", uf: "35" },
        apiConfig
      );
      expect(fallback.ok).toBe(true);
      expect(fallback.data).toMatchObject({
        source: "CNES (DataSUS)",
        search_url: "http://cnes.datasus.gov.br/",
      });
    });

    it("strategic_osint_prompt renders all 5 templates cleanly with and without optional placeholders", async () => {
      const templates = [
        "due_diligence",
        "competitor_analysis",
        "fraud_detection",
        "esg_compliance",
        "investment_screening",
      ] as const;

      for (const template of templates) {
        const res = await executeTool(
          "strategic_osint_prompt",
          {
            template,
            company_name: "ACME Brasil S/A",
            cnpj: "11.222.333/0001-81",
            context: "Foco em contratos federais",
          },
          apiConfig
        );
        expect(res.ok).toBe(true);
        const data = res.data as { template: string; prompt: string };
        expect(data.template).toBe(template);
        expect(data.prompt).toContain("ACME Brasil S/A");
        expect(data.prompt).toContain("11.222.333/0001-81");
        expect(data.prompt).toContain("Foco em contratos federais");
        expect(data.prompt).not.toMatch(/\{(company|cnpj|context)\}/);
      }

      const defaultsRes = await executeTool(
        "strategic_osint_prompt",
        { template: "due_diligence" },
        apiConfig
      );
      expect(defaultsRes.ok).toBe(true);
      const defaultPrompt = (defaultsRes.data as { prompt: string }).prompt;
      expect(defaultPrompt).toContain("the target company");
      expect(defaultPrompt).toContain("[CNPJ not provided]");
    });
  });

  describe("lib/tools/legal.ts", () => {
    it("datajud_processos covers missing key, HTTP 200, HTTP 500, and network error", async () => {
      const noKey = await executeTool("datajud_processos", { query: "11222333000181" }, apiConfig);
      expect(noKey.ok).toBe(false);
      expect(noKey.error).toContain("DATAJUD_API_KEY");

      process.env.DATAJUD_API_KEY = "cnj-key";
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ hits: { total: { value: 1 } } }))
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockRejectedValueOnce(new Error("socket hangup"));

      const okRes = await executeTool(
        "datajud_processos",
        { query: "11222333000181", tribunal: "TJDF", tamanho: 5 },
        apiConfig
      );
      expect(okRes.ok).toBe(true);
      expect(okRes.data).toMatchObject({ source: "Datajud — CNJ (TJDF)" });

      const errHttp = await executeTool("datajud_processos", { query: "abc" }, apiConfig);
      expect(errHttp).toEqual({ ok: false, error: "Datajud API error: HTTP 500" });

      const errNet = await executeTool("datajud_processos", { query: "abc" }, apiConfig);
      expect(errNet).toEqual({ ok: false, error: "Datajud error: socket hangup" });
    });

    it("oab_advogado, bnmp_mandados, lista_suja_lookup and procurados_lookup cover happy paths and fallbacks", async () => {
      vi.spyOn(globalThis, "fetch")
        // OAB ok + fallback
        .mockResolvedValueOnce(jsonResponse({ Data: [{ Nome: "Dr Fulano", UF: "SP" }] }))
        .mockResolvedValueOnce(jsonResponse({}, 403))
        // BNMP ok + non-timeout 403 fallback
        .mockResolvedValueOnce(jsonResponse({ content: [] }))
        .mockResolvedValueOnce(jsonResponse({ message: "captcha" }, 403))
        // Lista Suja ok + fallback
        .mockResolvedValueOnce(jsonResponse({ data: [] }))
        .mockResolvedValueOnce(jsonResponse({}, 403));

      const oabOk = await executeTool(
        "oab_advogado",
        { nome: "Fulano", inscricao: "123456", uf: "SP" },
        apiConfig
      );
      expect(oabOk.ok).toBe(true);
      expect(oabOk.data).toMatchObject({ source: "Cadastro Nacional dos Advogados (CNA) — OAB" });

      const oabFallback = await executeTool("oab_advogado", { inscricao: "123456" }, apiConfig);
      expect(oabFallback.ok).toBe(true);
      expect(oabFallback.data).toMatchObject({ source: "OAB — CNA" });

      const bnmpOk = await executeTool(
        "bnmp_mandados",
        { nome: "Joao Silva", orgaoJulgador: "TJSP" },
        apiConfig
      );
      expect(bnmpOk.ok).toBe(true);
      expect(bnmpOk.data).toMatchObject({
        source: "BNMP — Banco Nacional de Mandados de Prisão (CNJ)",
      });

      const bnmpCaptcha = await executeTool("bnmp_mandados", { nome: "Joao Silva" }, apiConfig);
      expect(bnmpCaptcha.ok).toBe(true);
      expect((bnmpCaptcha.data as { timed_out?: boolean }).timed_out).toBeUndefined();

      const listaOk = await executeTool("lista_suja_lookup", { query: "ACME" }, apiConfig);
      expect(listaOk.ok).toBe(true);
      expect(listaOk.data).toMatchObject({ source: "Portal da Transparência — Lista Suja" });

      const listaFallback = await executeTool("lista_suja_lookup", { query: "ACME" }, apiConfig);
      expect(listaFallback.ok).toBe(true);
      expect(listaFallback.data).toMatchObject({ source: "Portal da Transparência / dados.gov.br" });

      // Procurados FOUND + NOT_FOUND (13 paginated pages each)
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (!url.includes("b_start:int=")) {
          return textResponse(
            '<a href="https://www.gov.br/mj/pt-br/assuntos/sua-seguranca/seguranca-publica/operacoes-integradas/projeto-captura/lista-de-procurados/joao-silva/view">\nJoão da Silva - SP\n20/11/2026</a>'
          );
        }
        return textResponse("<html><body>Sem registros</body></html>");
      });

      const procFound = await executeTool("procurados_lookup", { nome: "Joao Silva" }, apiConfig);
      expect(procFound.ok).toBe(true);
      expect(procFound.data).toMatchObject({
        status: "FOUND",
        total_matches: 1,
        matches: [expect.objectContaining({ name: "João da Silva", state: "SP", date: "20/11/2026" })],
      });

      const procNotFound = await executeTool(
        "procurados_lookup",
        { nome: "Nome Inexistente" },
        apiConfig
      );
      expect(procNotFound.ok).toBe(true);
      expect(procNotFound.data).toMatchObject({
        status: "NOT_FOUND",
        total_matches: 0,
        pages_checked: 13,
      });
    });
  });

  describe("lib/tools/government.ts happy/error coverage", () => {
    it("covers ibge_localidades, transparencia_lookup, ceis_cnep_lookup, and querido_diario via executeTool", async () => {
      process.env.TRANSPARENCIA_API_KEY = "transp-key";

      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("servicodados.ibge.gov.br")) {
          return jsonResponse([{ id: 35, sigla: "SP", nome: "São Paulo" }]);
        }
        if (url.includes("api.portaldatransparencia.gov.br/api-de-dados/servidores")) {
          return jsonResponse([{ nome: "SERVIDOR EXEMPLO" }]);
        }
        if (url.includes("api.portaldatransparencia.gov.br/api-de-dados/cnep")) {
          return jsonResponse([{ sancao: "MULTA" }]);
        }
        if (url.includes("api.queridodiario.org.br")) {
          return jsonResponse({ total_gazettes: 1, gazettes: [] });
        }
        return jsonResponse({}, 404);
      });

      const ibgeEstados = await executeTool("ibge_localidades", { tipo: "estados" }, apiConfig);
      expect(ibgeEstados.ok).toBe(true);

      const ibgeMunUf = await executeTool(
        "ibge_localidades",
        { tipo: "municipios_por_uf", uf: "SP" },
        apiConfig
      );
      expect(ibgeMunUf.ok).toBe(true);

      const transpServ = await executeTool(
        "transparencia_lookup",
        { cnpj: "12345678909", tipo: "servidores", pagina: 1 },
        apiConfig
      );
      expect(transpServ.ok).toBe(true);

      const ceisCnep = await executeTool(
        "ceis_cnep_lookup",
        { query: "ACME LTDA", tipo: "cnep", pagina: 1 },
        apiConfig
      );
      expect(ceisCnep.ok).toBe(true);
      expect(ceisCnep.data).toMatchObject({ databases_checked: ["cnep"] });

      const qdOk = await executeTool(
        "querido_diario",
        { query: "", territory_id: "3550308", since: "2026-01-01", until: "2026-01-31" },
        apiConfig
      );
      expect(qdOk.ok).toBe(true);
      expect(qdOk.data).toMatchObject({ source: "Querido Diário — Open Knowledge Brasil" });
    });
  });
});
