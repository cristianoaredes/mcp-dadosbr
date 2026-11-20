import { describe, it, expect, vi, afterEach } from "vitest";
import createServer, { configSchema } from "../../lib/adapters/smithery.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { executeRegisteredTool } from "../../lib/core/registry.js";
import "../../lib/tools/financial.js";

describe("Smithery SSRF & ConfigSchema Hardening (TCK-0014)", () => {
  it("uses allowlisted HTTPS defaults when parsed with empty object", () => {
    const parsed = configSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cnpjBaseUrl).toBe("https://api.opencnpj.org/");
      expect(parsed.data.cepBaseUrl).toBe("https://opencep.com/v1/");
    }
  });

  it("rejects bare opencnpj.org, cloud metadata, external hosts, and embedded credentials in configSchema", () => {
    expect(
      configSchema.safeParse({ cnpjBaseUrl: "https://opencnpj.org/api/v1" }).success
    ).toBe(false);
    expect(
      configSchema.safeParse({
        cnpjBaseUrl: "https://169.254.169.254/latest/meta-data",
      }).success
    ).toBe(false);
    expect(
      configSchema.safeParse({ cepBaseUrl: "https://evil.com/cep/" }).success
    ).toBe(false);
    expect(
      configSchema.safeParse({
        cnpjBaseUrl: "https://user:pass@api.opencnpj.org/",
      }).success
    ).toBe(false);
  });

  it("enforces allowlist in createServer even when callers bypass configSchema", () => {
    expect(() => createServer()).not.toThrow();
    expect(() =>
      createServer({
        config: { cnpjBaseUrl: "https://169.254.169.254/latest/meta-data" },
      })
    ).toThrow(/Invalid or disallowed CNPJ API URL/);
    expect(() =>
      createServer({
        config: { cepBaseUrl: "https://evil.com/" },
      })
    ).toThrow(/Invalid or disallowed CEP API URL/);
  });
});

describe("fipe_veiculos Path Traversal & Input Validation (TCK-0014)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects path traversal and invalid tipo without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const apiConfig = resolveApiConfig();

    const traversal = await executeRegisteredTool(
      "fipe_veiculos",
      { tipo: "../../cnpj/v1/11222333000181" },
      apiConfig
    );
    expect(traversal.ok).toBe(false);
    expect(traversal.error).toMatch(/Invalid FIPE vehicle type/i);

    const unknown = await executeRegisteredTool(
      "fipe_veiculos",
      { tipo: "aviao" },
      apiConfig
    );
    expect(unknown.ok).toBe(false);

    const smuggled = await executeRegisteredTool(
      "fipe_veiculos",
      { tipo: "carros?foo=bar" },
      apiConfig
    );
    expect(smuggled.ok).toBe(false);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects path traversal and query smuggling in codigo_fipe without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const apiConfig = resolveApiConfig();

    const traversal = await executeRegisteredTool(
      "fipe_veiculos",
      { codigo_fipe: "../../cnpj/v1/11222333000181" },
      apiConfig
    );
    expect(traversal.ok).toBe(false);
    expect(traversal.error).toMatch(/Invalid codigo_fipe/i);

    const querySmuggling = await executeRegisteredTool(
      "fipe_veiculos",
      { codigo_fipe: "001004-9?x=1" },
      apiConfig
    );
    expect(querySmuggling.ok).toBe(false);

    const empty = await executeRegisteredTool(
      "fipe_veiculos",
      { codigo_fipe: "   " },
      apiConfig
    );
    expect(empty.ok).toBe(false);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts valid vehicle types (carros, motos, caminhoes) and valid codigo_fipe", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify([{ nome: "Mock", codigo: "1" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const apiConfig = resolveApiConfig();

    for (const tipo of ["carros", "motos", "caminhoes"] as const) {
      const res = await executeRegisteredTool("fipe_veiculos", { tipo }, apiConfig);
      expect(res.ok).toBe(true);
      expect(fetchSpy).toHaveBeenLastCalledWith(
        `https://brasilapi.com.br/api/fipe/marcas/v1/${tipo}`,
        expect.anything()
      );
    }

    const byCode = await executeRegisteredTool(
      "fipe_veiculos",
      { codigo_fipe: " 001004-9 " },
      apiConfig
    );
    expect(byCode.ok).toBe(true);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "https://brasilapi.com.br/api/fipe/preco/v1/001004-9",
      expect.anything()
    );
  });
});
