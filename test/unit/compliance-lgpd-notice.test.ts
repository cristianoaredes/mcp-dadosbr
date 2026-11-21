import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCache } from "../../lib/core/cache.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { resetCircuitBreakers } from "../../lib/core/http-client.js";
import { executeTool, resetMetrics } from "../../lib/core/tools.js";
import { attachLgpdNotice, HOMONYM_HUMAN_REVIEW_NOTICE } from "../../lib/shared/compliance-notices.js";
import { executeBnmp, executeDatajud, executeProcurados, PROCURADOS_CACHE_KEY } from "../../lib/tools/legal.js";
import type { Env } from "../../lib/adapters/cloudflare.js";
import { generateOpenAPISchema } from "../../lib/workers/openapi.js";
import worker from "../../lib/workers/worker.js";

const ROOT = resolve(import.meta.dirname, "../..");

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

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

describe("FND-0018 / TCK-0033: LGPD Privacy, DPO, ANPD Runbook & Art. 20 Homonym Notices", () => {
  const apiConfig = resolveApiConfig();
  const originalDatajud = process.env.DATAJUD_API_KEY;
  const originalTransparencia = process.env.TRANSPARENCIA_API_KEY;

  beforeEach(() => {
    delete process.env.DATAJUD_API_KEY;
    delete process.env.TRANSPARENCIA_API_KEY;
    resetMetrics();
    resetCircuitBreakers();
  });

  afterEach(() => {
    if (originalDatajud === undefined) delete process.env.DATAJUD_API_KEY;
    else process.env.DATAJUD_API_KEY = originalDatajud;

    if (originalTransparencia === undefined) delete process.env.TRANSPARENCIA_API_KEY;
    else process.env.TRANSPARENCIA_API_KEY = originalTransparencia;

    resetMetrics();
    resetCircuitBreakers();
    vi.restoreAllMocks();
  });

  it("publishes PRIVACY.md, README.md LGPD section, and ANPD Art. 48 incident runbook", () => {
    const privacyPath = resolve(ROOT, "PRIVACY.md");
    expect(existsSync(privacyPath)).toBe(true);
    const privacy = readFileSync(privacyPath, "utf8");

    expect(privacy).toContain("Art. 6º");
    expect(privacy).toContain("Art. 7º");
    expect(privacy).toContain("Art. 18");
    expect(privacy).toContain("Art. 20");
    expect(privacy).toContain("Art. 41");
    expect(privacy).toContain("Art. 48");
    expect(privacy).toContain("MCP_DPO_CONTACT");
    expect(privacy).toContain("Tavily");
    expect(privacy).toContain("Perplexity");
    expect(privacy).toContain("Cloudflare Workers");
    expect(privacy).toContain("homônimos");

    const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
    expect(readme).toContain("## Privacidade e LGPD");
    expect(readme).toContain("PRIVACY.md");
    expect(readme).toContain("MCP_DPO_CONTACT");

    const runbooks = readFileSync(resolve(ROOT, ".archagents/10-runbooks.md"), "utf8");
    expect(runbooks).toContain("## Resposta a Incidentes de Segurança e Notificação à ANPD (LGPD Art. 48)");
    expect(runbooks).toContain("Resolução CD/ANPD nº 15/2024");
    expect(runbooks).toContain("Triagem");
    expect(runbooks).toContain("Contenção");
    expect(runbooks).toContain("Preservação de evidências");
    expect(runbooks).toContain("Avaliação de risco");
    expect(runbooks).toContain("Post-mortem");
  });

  it("exposes privacy policy URL and configurable DPO contact on GET / and OpenAPI info", async () => {
    const ctx = createExecutionContext();
    const expectedPolicyUrl = "https://github.com/cristianoaredes/mcp-dadosbr/blob/main/PRIVACY.md";

    const defaultResp = await worker.fetch(
      new Request("https://worker.example/"),
      { MCP_DISABLE_RATE_LIMIT: "true" },
      ctx
    );
    expect(defaultResp.status).toBe(200);
    const defaultBody = (await defaultResp.json()) as {
      privacy?: { policy?: string; dpo_contact?: string };
    };
    expect(defaultBody.privacy).toEqual({
      policy: expectedPolicyUrl,
      dpo_contact: "See PRIVACY.md (LGPD Art. 41)",
    });

    const whitespaceResp = await worker.fetch(
      new Request("https://worker.example/"),
      { MCP_DISABLE_RATE_LIMIT: "true", MCP_DPO_CONTACT: "   " } as Env & { MCP_DPO_CONTACT: string },
      ctx
    );
    const whitespaceBody = (await whitespaceResp.json()) as {
      privacy?: { policy?: string; dpo_contact?: string };
    };
    expect(whitespaceBody.privacy?.dpo_contact).toBe("See PRIVACY.md (LGPD Art. 41)");

    const configuredResp = await worker.fetch(
      new Request("https://worker.example/"),
      {
        MCP_DISABLE_RATE_LIMIT: "true",
        MCP_DPO_CONTACT: "  dpo@example.org  ",
      } as Env & { MCP_DPO_CONTACT: string },
      ctx
    );
    const configuredBody = (await configuredResp.json()) as {
      privacy?: { policy?: string; dpo_contact?: string };
    };
    expect(configuredBody.privacy).toEqual({
      policy: expectedPolicyUrl,
      dpo_contact: "dpo@example.org",
    });

    const openApi = generateOpenAPISchema("https://worker.example/openapi.json") as {
      info: {
        contact?: { name?: string; url?: string };
        "x-privacy-policy"?: string;
      };
    };
    expect(openApi.info.contact).toEqual({
      name: "MCP DadosBR Maintainers / DPO",
      url: expectedPolicyUrl,
    });
    expect(openApi.info["x-privacy-policy"]).toBe(expectedPolicyUrl);
  });

  it("defines a Web-standard HOMONYM_HUMAN_REVIEW_NOTICE and safely attaches it to plain objects", () => {
    const noticeSrc = readFileSync(resolve(ROOT, "lib/shared/compliance-notices.ts"), "utf8");
    expect(noticeSrc).not.toMatch(/node:|from\s+["'](?:fs|path|os|crypto|http|https|process)["']/);

    expect(HOMONYM_HUMAN_REVIEW_NOTICE).toContain("LGPD Art. 20");
    expect(HOMONYM_HUMAN_REVIEW_NOTICE).toMatch(/homonyms|homônimos/i);
    expect(HOMONYM_HUMAN_REVIEW_NOTICE).toMatch(/human review|revisão humana/i);
    expect(HOMONYM_HUMAN_REVIEW_NOTICE).toMatch(/CPF/i);
    expect(HOMONYM_HUMAN_REVIEW_NOTICE).toMatch(/official source|fonte oficial/i);

    expect(attachLgpdNotice({ query: "Fulano", status: "FOUND" })).toEqual({
      query: "Fulano",
      status: "FOUND",
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });
    expect(attachLgpdNotice(null)).toBeNull();
    expect(attachLgpdNotice(["a"])).toEqual(["a"]);
  });

  it("attaches lgpd_notice across procurados_lookup live, inconclusive, not-found, and cached paths", async () => {
    const cache = new MemoryCache(20, 60_000);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (!url.includes("b_start:int=")) {
        return htmlResponse(
          '<a href="https://www.gov.br/mj/pt-br/assuntos/sua-seguranca/seguranca-publica/operacoes-integradas/projeto-captura/lista-de-procurados/joao-silva/view">\nJoão da Silva - SP\n20/11/2026</a>'
        );
      }
      return htmlResponse("<html><body>Sem registros</body></html>");
    });

    const liveFound = await executeTool("procurados_lookup", { nome: "Joao Silva" }, apiConfig, cache);
    expect(liveFound.ok).toBe(true);
    expect(liveFound.data).toMatchObject({
      query: "Joao Silva",
      status: "FOUND",
      total_matches: 1,
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    const cachedFound = await executeProcurados({ nome: "Joao Silva" }, cache);
    expect(cachedFound.ok).toBe(true);
    expect(cachedFound.data).toMatchObject({
      status: "FOUND",
      cached: true,
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    const cachedNotFound = await executeProcurados({ nome: "Nome Ausente" }, cache);
    expect(cachedNotFound.ok).toBe(true);
    expect(cachedNotFound.data).toMatchObject({
      status: "NOT_FOUND",
      cached: true,
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    cache.clear();
    expect(cache.get(PROCURADOS_CACHE_KEY)).toBeNull();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("b_start:int=15")) {
        return new Response(null, { status: 503 });
      }
      return htmlResponse("<html><body>Sem registros</body></html>");
    });

    const liveInconclusive = await executeTool("procurados_lookup", { nome: "Maria Oliveira" }, apiConfig);
    expect(liveInconclusive.ok).toBe(true);
    expect(liveInconclusive.data).toMatchObject({
      status: "INCONCLUSIVE",
      partial: true,
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      htmlResponse("<html><body>Sem registros</body></html>")
    );

    const liveNotFound = await executeTool("procurados_lookup", { nome: "Pessoa Inexistente" }, apiConfig);
    expect(liveNotFound.ok).toBe(true);
    expect(liveNotFound.data).toMatchObject({
      status: "NOT_FOUND",
      partial: false,
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });
  });

  it("attaches lgpd_notice to bnmp_mandados, ceis_cnep_lookup, and datajud_processos preserving existing fields", async () => {
    const cache = new MemoryCache(20, 60_000);

    // Pre-populate legacy cache entries without lgpd_notice to verify cache-hit enrichment
    cache.set("bnmp:legacy person:", {
      query: "Legacy Person",
      results: { content: [] },
      source: "BNMP — Banco Nacional de Mandados de Prisão (CNJ)",
    });
    const bnmpCached = await executeBnmp({ nome: "Legacy Person" }, cache);
    expect(bnmpCached.ok).toBe(true);
    expect(bnmpCached.data).toMatchObject({
      query: "Legacy Person",
      source: "BNMP — Banco Nacional de Mandados de Prisão (CNJ)",
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ content: [{ id: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({}, 403));

    const bnmpLive = await executeTool("bnmp_mandados", { nome: "Joao Silva" }, apiConfig);
    expect(bnmpLive.ok).toBe(true);
    expect(bnmpLive.data).toMatchObject({
      query: "Joao Silva",
      results: { content: [{ id: 1 }] },
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    const bnmpFallback = await executeTool("bnmp_mandados", { nome: "Maria Silva" }, apiConfig);
    expect(bnmpFallback.ok).toBe(true);
    expect(bnmpFallback.data).toMatchObject({
      query: "Maria Silva",
      source: "BNMP",
      search_url: "https://portalbnmp.cnj.jus.br/#/pesquisa-peca",
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    // CEIS/CNEP without key (fallback)
    const ceisFallback = await executeTool("ceis_cnep_lookup", { query: "ACME LTDA" }, apiConfig);
    expect(ceisFallback.ok).toBe(true);
    expect(ceisFallback.data).toMatchObject({
      query: "ACME LTDA",
      manual_check_urls: expect.any(Array),
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    // CEIS/CNEP with key: cached hit + live hit
    process.env.TRANSPARENCIA_API_KEY = "transp-key";
    cache.set("ceis_cnep:cnep:1:legacy corp", {
      query: "Legacy Corp",
      sanctions: { cnep: [] },
      databases_checked: ["cnep"],
    });
    const ceisCached = await executeTool(
      "ceis_cnep_lookup",
      { query: "Legacy Corp", tipo: "cnep", pagina: 1 },
      apiConfig,
      cache
    );
    expect(ceisCached.ok).toBe(true);
    expect(ceisCached.data).toMatchObject({
      query: "Legacy Corp",
      databases_checked: ["cnep"],
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([{ sancao: "IMPEDIMENTO" }]));
    const ceisLive = await executeTool(
      "ceis_cnep_lookup",
      { query: "EMPRESA TESTE", tipo: "ceis", pagina: 1 },
      apiConfig
    );
    expect(ceisLive.ok).toBe(true);
    expect(ceisLive.data).toMatchObject({
      query: "EMPRESA TESTE",
      databases_checked: ["ceis"],
      sanctions: { ceis: [{ sancao: "IMPEDIMENTO" }] },
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    // DataJud: cached hit + live hit
    process.env.DATAJUD_API_KEY = "cnj-key";
    cache.set("datajud:api_publica_tjsp:10:joao souza", {
      query: "Joao Souza",
      tribunal: "tjsp",
      results: { hits: { total: { value: 0 } } },
      source: "Datajud — CNJ (TJSP)",
    });
    const datajudCached = await executeDatajud({ query: "Joao Souza" }, cache);
    expect(datajudCached.ok).toBe(true);
    expect(datajudCached.data).toMatchObject({
      query: "Joao Souza",
      source: "Datajud — CNJ (TJSP)",
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ hits: { total: { value: 2 } } }));
    const datajudLive = await executeTool(
      "datajud_processos",
      { query: "Maria Souza", tribunal: "tjdf", tamanho: 5 },
      apiConfig
    );
    expect(datajudLive.ok).toBe(true);
    expect(datajudLive.data).toMatchObject({
      query: "Maria Souza",
      tribunal: "tjdf",
      source: "Datajud — CNJ (TJDF)",
      results: { hits: { total: { value: 2 } } },
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    });
  });
});
