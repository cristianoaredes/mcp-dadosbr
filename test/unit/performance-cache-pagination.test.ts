import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { MemoryCache } from "../../lib/core/cache.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { createMCPServer } from "../../lib/core/mcp-server.js";
import { resetCircuitBreakers } from "../../lib/core/http-client.js";
import { executeTool, resetMetrics } from "../../lib/core/tools.js";
import {
  PROCURADOS_CACHE_KEY,
  PROCURADOS_CONCURRENCY,
  executeProcurados,
} from "../../lib/tools/legal.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

describe("FND-0011 / TCK-0023: Caching, IBGE Pagination/Filtering, DeepProfile Lookup Reuse & Bounded Procurados", () => {
  const apiConfig = resolveApiConfig();
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.DATAJUD_API_KEY;
    delete process.env.TRANSPARENCIA_API_KEY;
    delete process.env.TAVILY_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    resetMetrics();
    resetCircuitBreakers();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetMetrics();
    resetCircuitBreakers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("ibge_localidades caching, nome/id filtering & optional pagination", () => {
    const municipalities = [
      { id: 3550308, nome: "São Paulo" },
      { id: 2111300, nome: "São Luís" },
      { id: 3304557, nome: "Rio de Janeiro" },
      { id: 3106200, nome: "Belo Horizonte" },
      { id: 2927408, nome: "Salvador" },
    ];

    it("caches raw upstream IBGE list and paginates/filters in memory on a single fetch", async () => {
      const cache = new MemoryCache(50, 60_000);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async () => jsonResponse(municipalities));

      const page1 = await executeTool(
        "ibge_localidades",
        { tipo: "municipios", page: 1, limit: 2 },
        apiConfig,
        cache
      );
      expect(page1.ok).toBe(true);
      expect(page1.source?.url).toContain("/municipios?orderBy=nome");
      expect(page1.data).toEqual({
        items: municipalities.slice(0, 2),
        pagination: { page: 1, limit: 2, total: 5, total_pages: 3, has_more: true },
      });

      const page2 = await executeTool(
        "ibge_localidades",
        { tipo: "municipios", page: 2, limit: 2 },
        apiConfig,
        cache
      );
      expect(page2.ok).toBe(true);
      expect(page2.source?.url).toContain("/municipios?orderBy=nome");
      expect(page2.data).toEqual({
        items: municipalities.slice(2, 4),
        pagination: { page: 2, limit: 2, total: 5, total_pages: 3, has_more: true },
      });

      // Accent- and case-insensitive filter combined with pagination, hitting cache
      const filtered = await executeTool(
        "ibge_localidades",
        { tipo: "municipios", nome: "sao", page: 1, limit: 1 },
        apiConfig,
        cache
      );
      expect(filtered.ok).toBe(true);
      expect(filtered.data).toEqual({
        items: [municipalities[0]],
        pagination: { page: 1, limit: 1, total: 2, total_pages: 2, has_more: true },
        filter: { nome: "sao" },
      });

      // Exact ID filter without pagination preserves raw array return
      const byId = await executeTool(
        "ibge_localidades",
        { tipo: "municipios", id: 2927408 },
        apiConfig,
        cache
      );
      expect(byId.ok).toBe(true);
      expect(byId.data).toEqual([municipalities[4]]);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("preserves MCP Apps structuredContent on both legacy arrays and paginated cache hits", async () => {
      const cache = new MemoryCache(50, 60_000);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async () => jsonResponse(municipalities));

      const server = createMCPServer({ apiConfig, cache });
      const client = new Client(
        { name: "ibge-pagination-test", version: "1.0.0" },
        { capabilities: { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } } }
      );
      const [cTransport, sTransport] = InMemoryTransport.createLinkedPair();

      try {
        await server.connect(sTransport);
        await client.connect(cTransport);

        const legacyRes = await client.callTool({
          name: "ibge_localidades",
          arguments: { tipo: "municipios" },
        });
        expect(legacyRes.structuredContent).toMatchObject({
          items: municipalities,
          source: { url: expect.any(String), fetchedAt: expect.any(String) },
        });

        const pagedRes = await client.callTool({
          name: "ibge_localidades",
          arguments: { tipo: "municipios", page: 2, limit: 2 },
        });
        expect(pagedRes.structuredContent).toMatchObject({
          items: municipalities.slice(2, 4),
          pagination: { page: 2, limit: 2, total: 5, total_pages: 3, has_more: true },
          source: { url: expect.any(String), fetchedAt: expect.any(String) },
        });
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      } finally {
        await client.close();
        await server.close();
      }
    });

    it("rejects out-of-range page and limit parameters at runtime Zod validation", async () => {
      const badPage = await executeTool("ibge_localidades", { tipo: "estados", page: 0 }, apiConfig);
      expect(badPage.ok).toBe(false);
      const badLimit = await executeTool("ibge_localidades", { tipo: "estados", limit: 5000 }, apiConfig);
      expect(badLimit.ok).toBe(false);
    });
  });

  describe("Read-heavy tools caching & fail-closed guarantees", () => {
    it("caches bacen_taxas, fipe_veiculos, pncp_licitacoes and querido_diario while preserving source", async () => {
      const cache = new MemoryCache(50, 60_000);
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("api.bcb.gov.br")) return jsonResponse([{ data: "20/11/2026", valor: "11.25" }]);
        if (url.includes("brasilapi.com.br/api/fipe/preco")) return jsonResponse([{ Valor: "R$ 50.000,00" }]);
        if (url.includes("brasilapi.com.br/api/fipe/marcas")) return jsonResponse([{ nome: "Fiat", valor: "21" }]);
        if (url.includes("pncp.gov.br")) return jsonResponse({ data: [{ numeroControlePNCP: "1" }] });
        if (url.includes("api.queridodiario.org.br")) return jsonResponse({ total_gazettes: 1, gazettes: [] });
        return jsonResponse({}, 404);
      });

      const b1 = await executeTool("bacen_taxas", { indicador: "selic", ultimos: 5 }, apiConfig, cache);
      const b2 = await executeTool("bacen_taxas", { indicador: "selic", ultimos: 5 }, apiConfig, cache);
      expect(b1.ok && b2.ok).toBe(true);
      expect(b2.source).toEqual(b1.source);

      const f1 = await executeTool("fipe_veiculos", { codigo_fipe: "001004-9" }, apiConfig, cache);
      const f2 = await executeTool("fipe_veiculos", { codigo_fipe: "001004-9" }, apiConfig, cache);
      expect(f1.ok && f2.ok).toBe(true);

      const fm1 = await executeTool("fipe_veiculos", { tipo: "carros" }, apiConfig, cache);
      const fm2 = await executeTool("fipe_veiculos", { tipo: "carros" }, apiConfig, cache);
      expect(fm1.ok && fm2.ok).toBe(true);

      const p1 = await executeTool(
        "pncp_licitacoes",
        { query: "", modalidade_id: 6, data_inicial: "2026-01-01", data_final: "2026-01-10" },
        apiConfig,
        cache
      );
      const p2 = await executeTool(
        "pncp_licitacoes",
        { query: "", modalidade_id: 6, data_inicial: "2026-01-01", data_final: "2026-01-10" },
        apiConfig,
        cache
      );
      expect(p1.ok && p2.ok).toBe(true);
      expect(p2.source).toEqual(p1.source);

      const q1 = await executeTool("querido_diario", { query: "contrato" }, apiConfig, cache);
      const q2 = await executeTool("querido_diario", { query: "contrato" }, apiConfig, cache);
      expect(q1.ok && q2.ok).toBe(true);
      expect(q2.source).toEqual(q1.source);

      // Exactly 5 upstream fetches across 10 calls (100% cache hit on repeat)
      expect(fetchSpy).toHaveBeenCalledTimes(5);
    });

    it("caches authenticated transparencia/ceis/datajud only with keys present, omits keys from cache keys, and never caches errors or fallbacks", async () => {
      const seenKeys: string[] = [];
      const baseCache = new MemoryCache(50, 60_000);
      const spyCache = {
        get: <T = unknown>(key: string) => {
          seenKeys.push(key);
          return baseCache.get<T>(key);
        },
        set: <T = unknown>(key: string, data: T) => {
          seenKeys.push(key);
          return baseCache.set(key, data);
        },
      };

      process.env.TRANSPARENCIA_API_KEY = "SECRET-TRANSP-TOKEN";
      process.env.DATAJUD_API_KEY = "SECRET-DATAJUD-TOKEN";

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/ceis?")) return jsonResponse({}, 404);
        if (url.includes("/cnep?")) return jsonResponse([{ sancao: "ok" }]);
        if (url.includes("portaldatransparencia.gov.br/api-de-dados/contratos")) return jsonResponse([{ id: 1 }]);
        if (url.includes("api-publica.datajud.cnj.jus.br")) return jsonResponse({ hits: [] });
        if (url.includes("cna.oab.org.br")) return jsonResponse({ Data: [] });
        if (url.includes("portalbnmp.cnj.jus.br")) return jsonResponse({ content: [] });
        if (url.includes("portaldatransparencia.gov.br/sancoes/consulta")) return jsonResponse({ rows: [] });
        if (url.includes("apidadosabertos.saude.gov.br")) return jsonResponse({ estabelecimentos: [] });
        if (url.includes("rdap.registro.br")) return jsonResponse({ ldhName: "exemplo.com.br" });
        if (url.includes("consumidor.gov.br")) return jsonResponse({ empresas: [] });
        return jsonResponse({}, 404);
      });

      // Cache hit on repeated authenticated calls
      await executeTool("transparencia_lookup", { cnpj: "11222333000181", tipo: "contratos" }, apiConfig, spyCache);
      await executeTool("transparencia_lookup", { cnpj: "11222333000181", tipo: "contratos" }, apiConfig, spyCache);
      await executeTool("datajud_processos", { query: "11222333000181" }, apiConfig, spyCache);
      await executeTool("datajud_processos", { query: "11222333000181" }, apiConfig, spyCache);

      // Missing API key must still fail even though cache already holds the query result
      delete process.env.TRANSPARENCIA_API_KEY;
      delete process.env.DATAJUD_API_KEY;
      const missingTransp = await executeTool(
        "transparencia_lookup",
        { cnpj: "11222333000181", tipo: "contratos" },
        apiConfig,
        spyCache
      );
      expect(missingTransp.ok).toBe(false);
      const missingDatajud = await executeTool(
        "datajud_processos",
        { query: "11222333000181" },
        apiConfig,
        spyCache
      );
      expect(missingDatajud.ok).toBe(false);

      // Partial errors in ceis_cnep_lookup must NOT be cached
      process.env.TRANSPARENCIA_API_KEY = "SECRET-TRANSP-TOKEN";
      const partial1 = await executeTool(
        "ceis_cnep_lookup",
        { query: "11222333000181", tipo: "all" },
        apiConfig,
        spyCache
      );
      expect(partial1.ok).toBe(true);
      expect((partial1.data as { errors?: string[] }).errors?.length).toBeGreaterThan(0);

      const callsBeforeSecondPartial = fetchSpy.mock.calls.length;
      await executeTool("ceis_cnep_lookup", { query: "11222333000181", tipo: "all" }, apiConfig, spyCache);
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBeforeSecondPartial);

      // Public read-heavy tools hit cache on 2nd call
      const callsBeforePublic = fetchSpy.mock.calls.length;
      await executeTool("oab_advogado", { inscricao: "12345" }, apiConfig, spyCache);
      await executeTool("oab_advogado", { inscricao: "12345" }, apiConfig, spyCache);
      await executeTool("bnmp_mandados", { nome: "Maria Souza" }, apiConfig, spyCache);
      await executeTool("bnmp_mandados", { nome: "Maria Souza" }, apiConfig, spyCache);
      await executeTool("lista_suja_lookup", { query: "ACME" }, apiConfig, spyCache);
      await executeTool("lista_suja_lookup", { query: "ACME" }, apiConfig, spyCache);
      await executeTool("cnes_saude", { tipo: "estabelecimento", uf: "35" }, apiConfig, spyCache);
      await executeTool("cnes_saude", { tipo: "estabelecimento", uf: "35" }, apiConfig, spyCache);
      await executeTool("domain_whois", { domain: "exemplo.com.br" }, apiConfig, spyCache);
      await executeTool("domain_whois", { domain: "exemplo.com.br" }, apiConfig, spyCache);
      await executeTool("consumidor_reclamacoes", { empresa: "ACME" }, apiConfig, spyCache);
      await executeTool("consumidor_reclamacoes", { empresa: "ACME" }, apiConfig, spyCache);
      expect(fetchSpy.mock.calls.length - callsBeforePublic).toBe(6);

      // Missing TRANSPARENCIA_API_KEY on ceis_cnep_lookup must fall back rather than serving cached data
      await executeTool("ceis_cnep_lookup", { query: "CACHEADO", tipo: "cnep" }, apiConfig, spyCache);
      delete process.env.TRANSPARENCIA_API_KEY;
      const missingCeis = await executeTool(
        "ceis_cnep_lookup",
        { query: "CACHEADO", tipo: "cnep" },
        apiConfig,
        spyCache
      );
      expect(missingCeis.ok).toBe(true);
      expect(missingCeis.data).toMatchObject({ manual_check_urls: expect.any(Array) });

      // Error/fallback responses on public tools must NOT be cached
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse({}, 403));
      const callsBeforeFallbacks = fetchSpy.mock.calls.length;
      await executeTool("oab_advogado", { inscricao: "99999" }, apiConfig, spyCache);
      await executeTool("oab_advogado", { inscricao: "99999" }, apiConfig, spyCache);
      await executeTool("bnmp_mandados", { nome: "Sem Cache" }, apiConfig, spyCache);
      await executeTool("bnmp_mandados", { nome: "Sem Cache" }, apiConfig, spyCache);
      await executeTool("lista_suja_lookup", { query: "FALLBACK" }, apiConfig, spyCache);
      await executeTool("lista_suja_lookup", { query: "FALLBACK" }, apiConfig, spyCache);
      await executeTool("cnes_saude", { tipo: "estabelecimento", uf: "33" }, apiConfig, spyCache);
      await executeTool("cnes_saude", { tipo: "estabelecimento", uf: "33" }, apiConfig, spyCache);
      await executeTool("consumidor_reclamacoes", { empresa: "FALLBACK" }, apiConfig, spyCache);
      await executeTool("consumidor_reclamacoes", { empresa: "FALLBACK" }, apiConfig, spyCache);
      const whoisFail1 = await executeTool("domain_whois", { domain: "notfound.invalid" }, apiConfig, spyCache);
      const whoisFail2 = await executeTool("domain_whois", { domain: "notfound.invalid" }, apiConfig, spyCache);
      expect(whoisFail1.ok || whoisFail2.ok).toBe(false);
      // 2 uncached attempts x (5 single-call tools + 2 RDAP hops for domain_whois) = 14 fetches
      expect(fetchSpy.mock.calls.length - callsBeforeFallbacks).toBe(14);

      // Security invariant: cache keys must never contain API secrets
      expect(seenKeys.every((k) => !k.includes("SECRET-TRANSP-TOKEN") && !k.includes("SECRET-DATAJUD-TOKEN"))).toBe(true);
    });
  });

  describe("company_deep_profile lookup() reuse & deduplication", () => {
    it("reuses cnpj_lookup cache and deduplicates concurrent company_deep_profile CNPJ fetches", async () => {
      const cache = new MemoryCache(50, 60_000);
      let resolveCnpjFetch!: (resp: Response) => void;
      const cnpjDeferred = new Promise<Response>((resolve) => {
        resolveCnpjFetch = resolve;
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("api.opencnpj.org")) return cnpjDeferred;
        return jsonResponse({});
      });

      const p1 = executeTool(
        "company_deep_profile",
        { cnpj: "11222333000181", include_government: false, include_legal: false, include_news: false },
        apiConfig,
        cache
      );
      const p2 = executeTool(
        "company_deep_profile",
        { cnpj: "11222333000181", include_government: false, include_legal: false, include_news: false },
        apiConfig,
        cache
      );

      resolveCnpjFetch(jsonResponse({ cnpj: "11222333000181", razao_social: "DEDUP LTDA" }));
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.ok && r2.ok).toBe(true);

      const cnpjFetches = fetchSpy.mock.calls.filter(([u]) => String(u).includes("api.opencnpj.org"));
      expect(cnpjFetches).toHaveLength(1);

      // Subsequent cnpj_lookup hits the same cache populated by deep_profile
      const cachedCnpj = await executeTool("cnpj_lookup", { cnpj: "11222333000181" }, apiConfig, cache);
      expect(cachedCnpj.ok).toBe(true);
      expect(
        fetchSpy.mock.calls.filter(([u]) => String(u).includes("api.opencnpj.org"))
      ).toHaveLength(1);
    });
  });

  describe("procurados_lookup bounded concurrency & fail-closed cache", () => {
    it("scrapes with concurrency <= PROCURADOS_CONCURRENCY and serves subsequent different names from cache with 0 fetches", async () => {
      const cache = new MemoryCache(50, 60_000);
      let active = 0;
      let peakActive = 0;

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        active++;
        peakActive = Math.max(peakActive, active);
        // Yield a microtask so overlapping concurrent dispatches are observable
        await Promise.resolve();
        await Promise.resolve();
        active--;

        if (!url.includes("b_start:int=")) {
          return htmlResponse(
            '<a href="https://www.gov.br/mj/pt-br/assuntos/sua-seguranca/seguranca-publica/operacoes-integradas/projeto-captura/lista-de-procurados/carlos-souza/view">\nCarlos Eduardo de Souza - RJ\n20/11/2026</a>'
          );
        }
        return htmlResponse("<html><body>Sem registros nesta pagina</body></html>");
      });

      const first = await executeProcurados({ nome: "Carlos Souza" }, cache);
      expect(first.ok).toBe(true);
      expect(first.data).toMatchObject({ status: "FOUND", total_matches: 1, pages_checked: 13 });
      expect(fetchSpy).toHaveBeenCalledTimes(13);
      expect(peakActive).toBeGreaterThan(1);
      expect(peakActive).toBeLessThanOrEqual(PROCURADOS_CONCURRENCY);

      // Different query uses cached entries without issuing any upstream fetch
      const cachedHit = await executeProcurados({ nome: "Carlos Eduardo" }, cache);
      expect(cachedHit.ok).toBe(true);
      expect(cachedHit.data).toMatchObject({ status: "FOUND", total_matches: 1, cached: true });

      const cachedMiss = await executeProcurados({ nome: "Pessoa Ausente" }, cache);
      expect(cachedMiss.ok).toBe(true);
      expect(cachedMiss.data).toMatchObject({ status: "NOT_FOUND", total_matches: 0, cached: true });

      expect(fetchSpy).toHaveBeenCalledTimes(13);
    });

    it("never caches partial/INCONCLUSIVE scrapes so the next lookup retries upstream cleanly", async () => {
      const cache = new MemoryCache(50, 60_000);
      let attempt = 0;

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        attempt++;
        if (String(input).endsWith("b_start:int=15") && attempt <= 13) {
          return new Response(null, { status: 403 });
        }
        return htmlResponse("<html><body>Sem registros</body></html>");
      });

      const partialRes = await executeProcurados({ nome: "Pessoa Inconclusiva" }, cache);
      expect(partialRes.ok).toBe(true);
      expect(partialRes.data).toMatchObject({ status: "INCONCLUSIVE", partial: true, pages_failed: 1 });
      expect(cache.get(PROCURADOS_CACHE_KEY)).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(13);

      // Second lookup must re-fetch all 13 pages rather than trusting an incomplete scrape
      const fullRes = await executeProcurados({ nome: "Pessoa Inconclusiva" }, cache);
      expect(fullRes.ok).toBe(true);
      expect(fullRes.data).toMatchObject({ status: "NOT_FOUND", partial: false, pages_failed: 0 });
      expect(fetchSpy).toHaveBeenCalledTimes(26);
    });

    it("enforces fail-closed accounting and zero cache poisoning under async abort settling race", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      process.env.MCP_API_TIMEOUT = "100";
      process.env.MCP_INTELLIGENCE_TIMEOUT = "100";

      const cache = new MemoryCache(50, 60_000);
      vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = String(input);
        // Pages 0..8 succeed immediately; wave 4 leaves pages 9..12 (b_start=135,150,165,180) in flight at abort
        if (url.includes("b_start:int=135")) {
          return new Promise<Response>((resolve) => {
            setTimeout(() => resolve(htmlResponse("<html><body>Sem registros</body></html>")), 105);
          });
        }
        if (
          url.includes("b_start:int=150") ||
          url.includes("b_start:int=165") ||
          url.includes("b_start:int=180")
        ) {
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => {
                setTimeout(() => {
                  const err = new Error("The operation was aborted");
                  err.name = "AbortError";
                  reject(err);
                }, 15);
              },
              { once: true }
            );
          });
        }
        return Promise.resolve(htmlResponse("<html><body>Sem registros</body></html>"));
      });

      const pending = executeProcurados({ nome: "ALVO TESTE" }, cache);
      await vi.advanceTimersByTimeAsync(110);
      const res = await pending;

      expect(res.ok).toBe(true);
      const data = res.data as Record<string, unknown>;
      expect(data.status).toBe("INCONCLUSIVE");
      expect(data.partial).toBe(true);
      expect(data.pages_failed).toBeGreaterThanOrEqual(3);
      expect(Number(data.pages_checked) + Number(data.pages_failed)).toBe(13);
      expect(cache.get(PROCURADOS_CACHE_KEY)).toBeNull();

      // Drain mock fetch async abort cleanup timers cleanly
      await vi.advanceTimersByTimeAsync(20);
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
