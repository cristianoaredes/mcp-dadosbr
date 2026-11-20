import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeoutError } from "../../lib/shared/types/result.js";

let mockTavilySearch = vi.fn();

vi.mock("tavily", () => ({
  TavilyClient: class MockTavilyClient {
    search(...args: unknown[]) {
      return mockTavilySearch(...args);
    }
  },
}));

import { PerplexityProvider, TavilyProvider } from "../../lib/core/search-providers.js";
import { executeIntelligence } from "../../lib/core/intelligence.js";
import { executeBnmp, executeDatajud, executeProcurados } from "../../lib/tools/legal.js";

function createAbortAwareHangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const onAbort = () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        reject(err);
      };
      if (init?.signal?.aborted) {
        onAbort();
        return;
      }
      init?.signal?.addEventListener("abort", onAbort, { once: true });
    });
  });
}

describe("FND-0007 / TCK-0019: Fetch timeouts, procurados fail-closed & intelligence cancellation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockTavilySearch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  describe("PerplexityProvider timeouts & AbortSignal", () => {
    it("passes AbortSignal, aborts hanging requests at timeout, and leaves zero active timers", async () => {
      vi.useFakeTimers();
      process.env.PERPLEXITY_API_KEY = "pplx-test-key";
      const fetchMock = createAbortAwareHangingFetch();
      vi.stubGlobal("fetch", fetchMock);

      const provider = new PerplexityProvider();
      const pending = provider.search("cnpj test", 3, { timeoutMs: 2500 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.signal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(2500);
      const res = await pending;

      expect(init?.signal?.aborted).toBe(true);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(TimeoutError);
        expect(res.error.message).toContain("timed out after 2500ms");
      }
      expect(vi.getTimerCount()).toBe(0);
    });

    it("skips fetch on pre-aborted signal and aborts mid-flight on parent signal", async () => {
      vi.useFakeTimers();
      process.env.PERPLEXITY_API_KEY = "pplx-test-key";
      const fetchMock = createAbortAwareHangingFetch();
      vi.stubGlobal("fetch", fetchMock);

      const provider = new PerplexityProvider();

      const preAborted = new AbortController();
      preAborted.abort();
      const preRes = await provider.search("query", 3, { signal: preAborted.signal });
      expect(preRes.ok).toBe(false);
      if (!preRes.ok) {
        expect(preRes.error).toBeInstanceOf(TimeoutError);
        expect(preRes.error.message).toContain("aborted");
      }
      expect(fetchMock).not.toHaveBeenCalled();

      const midFlight = new AbortController();
      const pending = provider.search("query", 3, { signal: midFlight.signal, timeoutMs: 10000 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      midFlight.abort();
      const midRes = await pending;

      expect(midRes.ok).toBe(false);
      if (!midRes.ok) {
        expect(midRes.error).toBeInstanceOf(TimeoutError);
        expect(midRes.error.message).toContain("aborted");
      }
      expect(vi.getTimerCount()).toBe(0);
    });

    it("cleans timeout timer on 200 OK and HTTP 500", async () => {
      vi.useFakeTimers();
      process.env.PERPLEXITY_API_KEY = "pplx-test-key";
      const provider = new PerplexityProvider();

      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json({
            choices: [{ message: { content: "ok" } }],
            citations: ["https://example.org"],
          }),
        ),
      );
      const okRes = await provider.search("ok", 3, { timeoutMs: 5000 });
      expect(okRes.ok).toBe(true);
      expect(vi.getTimerCount()).toBe(0);

      vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
      const errRes = await provider.search("fail", 3, { timeoutMs: 5000 });
      expect(errRes.ok).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("TavilyProvider timeout envelope & signal handling", () => {
    it("times out hanging client.search() without unhandled rejections on late SDK failures", async () => {
      vi.useFakeTimers();
      process.env.TAVILY_API_KEY = "tvly-test-key";

      let rejectLate!: (reason?: unknown) => void;
      mockTavilySearch.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectLate = reject;
          }),
      );

      const provider = new TavilyProvider();
      const pending = provider.search("empresa x", 5, { timeoutMs: 1500 });

      await vi.advanceTimersByTimeAsync(1500);
      const res = await pending;

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBeInstanceOf(TimeoutError);
        expect(res.error.message).toContain("timed out after 1500ms");
      }
      expect(vi.getTimerCount()).toBe(0);

      // Late SDK rejection after timeout must be safely swallowed
      rejectLate(new Error("late socket hangup"));
      await Promise.resolve();
      await Promise.resolve();
    });

    it("respects pre-aborted and mid-flight parent signal and clears timers on resolve/reject", async () => {
      vi.useFakeTimers();
      process.env.TAVILY_API_KEY = "tvly-test-key";
      const provider = new TavilyProvider();

      const preAborted = new AbortController();
      preAborted.abort();
      const preRes = await provider.search("q", 5, { signal: preAborted.signal });
      expect(preRes.ok).toBe(false);
      expect(mockTavilySearch).not.toHaveBeenCalled();

      mockTavilySearch.mockImplementation(() => new Promise(() => {}));
      const midFlight = new AbortController();
      const pending = provider.search("q", 5, { signal: midFlight.signal, timeoutMs: 10000 });
      expect(mockTavilySearch).toHaveBeenCalledTimes(1);
      midFlight.abort();
      const midRes = await pending;
      expect(midRes.ok).toBe(false);
      if (!midRes.ok) {
        expect(midRes.error).toBeInstanceOf(TimeoutError);
        expect(midRes.error.message).toContain("aborted");
      }
      expect(vi.getTimerCount()).toBe(0);

      mockTavilySearch.mockResolvedValueOnce({ results: [{ title: "T", url: "https://t.br", content: "C" }] });
      expect((await provider.search("ok", 5)).ok).toBe(true);
      expect(vi.getTimerCount()).toBe(0);

      mockTavilySearch.mockRejectedValueOnce(new Error("boom"));
      expect((await provider.search("err", 5)).ok).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("executeDatajud & executeBnmp timeouts", () => {
    it("passes AbortSignal in executeDatajud, aborts hanging calls, and cleans timers", async () => {
      vi.useFakeTimers();
      process.env.DATAJUD_API_KEY = "dj-test-key";
      process.env.MCP_API_TIMEOUT = "3000";

      const hangFetch = createAbortAwareHangingFetch();
      vi.stubGlobal("fetch", hangFetch);
      const pending = executeDatajud({ query: "12345678000190", tribunal: "tjsp" });
      expect((hangFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.signal).toBeInstanceOf(AbortSignal);
      await vi.advanceTimersByTimeAsync(3000);
      const timeoutRes = await pending;
      expect(timeoutRes).toEqual({ ok: false, error: "Datajud error: request timeout after 3 seconds" });
      expect(vi.getTimerCount()).toBe(0);

      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ hits: [] })));
      expect((await executeDatajud({ query: "abc" })).ok).toBe(true);
      expect(vi.getTimerCount()).toBe(0);

      vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
      expect(await executeDatajud({ query: "abc" })).toEqual({ ok: false, error: "Datajud API error: HTTP 500" });
      expect(vi.getTimerCount()).toBe(0);
    });

    it("passes AbortSignal in executeBnmp and annotates timed_out fallback cleanly", async () => {
      vi.useFakeTimers();
      process.env.MCP_API_TIMEOUT = "2000";

      const hangFetch = createAbortAwareHangingFetch();
      vi.stubGlobal("fetch", hangFetch);
      const pending = executeBnmp({ nome: "FULANO DE TAL" });
      expect((hangFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.signal).toBeInstanceOf(AbortSignal);
      await vi.advanceTimersByTimeAsync(2000);
      const res = await pending;

      expect(res.ok).toBe(true);
      if (res.ok) {
        const data = res.data as Record<string, unknown>;
        expect(data.timed_out).toBe(true);
        expect(String(data.note)).toContain("timed out");
      }
      expect(vi.getTimerCount()).toBe(0);

      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ content: [] })));
      expect((await executeBnmp({ nome: "FULANO DE TAL" })).ok).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("executeProcurados timeouts & fail-closed status", () => {
    it("returns ok:false error when all 13 pages fail instead of silent NOT_FOUND", async () => {
      const fetchMock = vi.fn(async () => new Response(null, { status: 503 }));
      vi.stubGlobal("fetch", fetchMock);

      const res = await executeProcurados({ nome: "ALVO TESTE" });
      expect(fetchMock).toHaveBeenCalledTimes(13);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("13/13 pages failed");
      }
    });

    it("returns INCONCLUSIVE with partial:true when some pages succeed empty and others fail", async () => {
      let callCount = 0;
      const fetchMock = vi.fn(async () => {
        callCount++;
        if (callCount <= 3) {
          return new Response(null, { status: 502 });
        }
        return new Response("<html><body>Sem ocorrencias</body></html>", { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const res = await executeProcurados({ nome: "ALVO TESTE" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        const data = res.data as Record<string, unknown>;
        expect(data.status).toBe("INCONCLUSIVE");
        expect(data.partial).toBe(true);
        expect(data.pages_checked).toBe(10);
        expect(data.pages_total).toBe(13);
        expect(data.pages_failed).toBe(3);
        expect(Array.isArray(data.failed_pages)).toBe(true);
      }
    });

    it("returns FOUND with partial:true when a match exists alongside a failing page", async () => {
      let idx = 0;
      const htmlMatch = `<a href="https://portal/lista-de-procurados/alvo-teste/view">ALVO TESTE - SP\n01/02/2025</a>`;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          idx++;
          if (idx === 1) {
            return new Response(htmlMatch, { status: 200 });
          }
          if (idx === 2) {
            return Promise.reject(new Error("ECONNRESET"));
          }
          return new Response("<html></html>", { status: 200 });
        }),
      );

      const res = await executeProcurados({ nome: "ALVO TESTE" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        const data = res.data as Record<string, unknown>;
        expect(data.status).toBe("FOUND");
        expect(data.partial).toBe(true);
        expect(data.total_matches).toBe(1);
        expect(data.pages_checked).toBe(12);
        expect(data.pages_failed).toBe(1);
      }
    });

    it("returns NOT_FOUND with partial:false only when all 13 pages succeed with 0 matches", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("<html><body>Vazio</body></html>", { status: 200 })),
      );

      const res = await executeProcurados({ nome: "PESSOA INEXISTENTE" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        const data = res.data as Record<string, unknown>;
        expect(data.status).toBe("NOT_FOUND");
        expect(data.partial).toBe(false);
        expect(data.pages_checked).toBe(13);
        expect(data.pages_total).toBe(13);
        expect(data.pages_failed).toBe(0);
      }
    });

    it("enforces per-page timeout and total loop deadline cleanly with zero leaked timers", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      process.env.MCP_API_TIMEOUT = "4000";
      process.env.MCP_INTELLIGENCE_TIMEOUT = "10000";

      const hangFetch = createAbortAwareHangingFetch();
      vi.stubGlobal("fetch", hangFetch);

      const pending = executeProcurados({ nome: "ALVO LENTO" });
      await vi.advanceTimersByTimeAsync(10000);
      const res = await pending;

      // 4000ms + 4000ms + 2000ms = 10000ms -> 3 fetches attempted, remaining 10 skipped at deadline
      expect(hangFetch).toHaveBeenCalledTimes(3);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("13/13 pages failed");
      }
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("executeIntelligence timer cleanup & abort propagation", () => {
    const apiConfig = {
      cnpjBaseUrl: "https://api.opencnpj.org/",
      cepBaseUrl: "https://opencep.com/v1/",
      authHeaders: undefined,
    };

    const cachedCompanyData = {
      cnpj: "12345678000190",
      razao_social: "EMPRESA TESTE LTDA",
      nome_fantasia: "EMPRESA TESTE",
      uf: "SP",
      municipio: "SAO PAULO",
    };

    it("clears the 25s intelligence timeout timer when completing quickly", async () => {
      vi.useFakeTimers();
      process.env.PERPLEXITY_API_KEY = "pplx-test-key";
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json({
            choices: [{ message: { content: "Sem ocorrencias 12345678000190" } }],
            citations: ["https://example.org/doc"],
          }),
        ),
      );

      const res = await executeIntelligence(
        {
          cnpj: "12345678000190",
          provider: "perplexity",
          maxQueries: 2,
          cachedCompanyData,
        },
        apiConfig,
      );

      expect(res.ok).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("aborts in-flight searches and prevents queued dorks when total timeout expires", async () => {
      vi.useFakeTimers();
      process.env.PERPLEXITY_API_KEY = "pplx-test-key";
      process.env.MCP_INTELLIGENCE_TIMEOUT = "1500";
      process.env.MCP_SEARCH_TIMEOUT = "10000";
      process.env.MCP_INTELLIGENCE_CONCURRENCY = "1";

      const hangFetch = createAbortAwareHangingFetch();
      vi.stubGlobal("fetch", hangFetch);

      const pending = executeIntelligence(
        {
          cnpj: "12345678000190",
          provider: "perplexity",
          maxQueries: 5,
          cachedCompanyData,
        },
        apiConfig,
      );

      // Flush microtasks up to first search fetch, then advance past total timeout
      await vi.advanceTimersByTimeAsync(1500);
      const res = await pending;

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Intelligence search timed out");
      }
      // Concurrency=1 means only query 1 started; queries 2..5 were never dispatched
      expect(hangFetch.mock.calls.length).toBeLessThan(5);
      const firstSignal = (hangFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.signal;
      expect(firstSignal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
