import { describe, it, expect } from "vitest";
import { resolveApiConfig } from "../../lib/config/index.js";

describe("Config SSRF Protection", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment after each test
    process.env = { ...originalEnv };
  });

  describe("CNPJ API URL Validation", () => {
    it("should accept default CNPJ API host", () => {
      delete process.env.CNPJ_API_BASE_URL;
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept allowed CNPJ API host - api.opencnpj.org", () => {
      process.env.CNPJ_API_BASE_URL = "https://api.opencnpj.org/v1/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept localhost for development (HTTP allowed)", () => {
      process.env.CNPJ_API_BASE_URL = "http://localhost:3000/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept 127.0.0.1 for development", () => {
      process.env.CNPJ_API_BASE_URL = "http://127.0.0.1:8080/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should reject non-HTTPS URLs (except localhost)", () => {
      process.env.CNPJ_API_BASE_URL = "http://api.opencnpj.org/";
      expect(() => resolveApiConfig()).toThrow(/Invalid or disallowed CNPJ API URL/);
    });

    it("should reject URLs with disallowed hosts (SSRF protection)", () => {
      process.env.CNPJ_API_BASE_URL = "https://evil.com/api/";
      expect(() => resolveApiConfig()).toThrow(/Invalid or disallowed CNPJ API URL/);
    });

    it("should reject internal network URLs (SSRF protection)", () => {
      process.env.CNPJ_API_BASE_URL = "https://192.168.1.1/api/";
      expect(() => resolveApiConfig()).toThrow(/Invalid or disallowed CNPJ API URL/);
    });

    it("should reject cloud metadata URLs (SSRF protection)", () => {
      process.env.CNPJ_API_BASE_URL = "https://169.254.169.254/latest/meta-data";
      expect(() => resolveApiConfig()).toThrow(/Invalid or disallowed CNPJ API URL/);
    });
  });

  describe("CEP API URL Validation", () => {
    it("should accept default CEP API host", () => {
      delete process.env.CEP_API_BASE_URL;
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept allowed CEP API host - opencep.com", () => {
      process.env.CEP_API_BASE_URL = "https://opencep.com/v1/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept viacep.com.br", () => {
      process.env.CEP_API_BASE_URL = "https://viacep.com.br/ws/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept brasilapi.com.br for CEP", () => {
      process.env.CEP_API_BASE_URL = "https://brasilapi.com.br/api/cep/v1/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should reject URLs with disallowed hosts (SSRF protection)", () => {
      process.env.CEP_API_BASE_URL = "https://malicious-site.com/";
      expect(() => resolveApiConfig()).toThrow(/Invalid or disallowed CEP API URL/);
    });
  });

  describe("Multiple API Providers", () => {
    it("should accept receitaws.com.br for CNPJ", () => {
      process.env.CNPJ_API_BASE_URL = "https://receitaws.com.br/v1/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept brasilapi.com.br for CNPJ", () => {
      process.env.CNPJ_API_BASE_URL = "https://brasilapi.com.br/api/cnpj/v1/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept publica.cnpj.ws", () => {
      process.env.CNPJ_API_BASE_URL = "https://publica.cnpj.ws/cnpj/";
      expect(() => resolveApiConfig()).not.toThrow();
    });

    it("should accept minhareceita.org", () => {
      process.env.CNPJ_API_BASE_URL = "https://minhareceita.org/";
      expect(() => resolveApiConfig()).not.toThrow();
    });
  });

  describe("Error Messages", () => {
    it("should include allowed hosts in error message", () => {
      process.env.CNPJ_API_BASE_URL = "https://unknown-host.com/";
      expect(() => resolveApiConfig()).toThrow(/Allowed hosts:/);
    });

    it("should clearly identify which API URL is invalid", () => {
      process.env.CEP_API_BASE_URL = "https://bad-host.com/";
      expect(() => resolveApiConfig()).toThrow(/Invalid or disallowed CEP API URL/);
    });
  });

  describe("resolveApiConfig Overrides SSRF Protection", () => {
    it("should reject cloud metadata override even when authHeaders are configured", () => {
      process.env.API_KEY_HEADER = "X-Secret-Key";
      process.env.API_KEY_VALUE = "top-secret-token";
      expect(() =>
        resolveApiConfig({
          cnpjBaseUrl: "https://169.254.169.254/latest/meta-data",
        })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
    });

    it("should reject disallowed CNPJ/CEP hosts and non-HTTPS overrides", () => {
      expect(() =>
        resolveApiConfig({ cnpjBaseUrl: "https://evil.com/api/" })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
      expect(() =>
        resolveApiConfig({ cepBaseUrl: "https://evil.com/cep/" })
      ).toThrow(/Invalid or disallowed CEP API URL/);
      expect(() =>
        resolveApiConfig({ cnpjBaseUrl: "http://api.opencnpj.org/" })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
      expect(() =>
        resolveApiConfig({ cnpjBaseUrl: "" })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
    });

    it("should normalize trailing slash on valid overrides and preserve defaults for undefined overrides", () => {
      const normalized = resolveApiConfig({
        cnpjBaseUrl: "https://api.opencnpj.org",
        cepBaseUrl: "https://opencep.com/v1",
      });
      expect(normalized.cnpjBaseUrl).toBe("https://api.opencnpj.org/");
      expect(normalized.cepBaseUrl).toBe("https://opencep.com/v1/");

      const defaulted = resolveApiConfig({ cnpjBaseUrl: undefined });
      expect(defaulted.cnpjBaseUrl).toBe("https://api.opencnpj.org/");
      expect(defaulted.cepBaseUrl).toBe("https://opencep.com/v1/");
    });
  });

  describe("Loopback Environment & Subdomain Restrictions", () => {
    it("should reject localhost and 127.0.0.1 in production via env or overrides", () => {
      process.env.NODE_ENV = "production";
      process.env.CNPJ_API_BASE_URL = "http://localhost:3000/";
      expect(() => resolveApiConfig()).toThrow(/Invalid or disallowed CNPJ API URL/);

      delete process.env.CNPJ_API_BASE_URL;
      expect(() =>
        resolveApiConfig({ cnpjBaseUrl: "http://127.0.0.1:8080/" })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
      expect(() =>
        resolveApiConfig({ cepBaseUrl: "https://localhost/" })
      ).toThrow(/Invalid or disallowed CEP API URL/);
    });

    it("should reject localhost and 127.0.0.1 when NODE_ENV is unset (fail-closed)", () => {
      delete process.env.NODE_ENV;
      process.env.CNPJ_API_BASE_URL = "http://localhost:3000/";
      expect(() => resolveApiConfig()).toThrow(/Invalid or disallowed CNPJ API URL/);

      delete process.env.CNPJ_API_BASE_URL;
      expect(() =>
        resolveApiConfig({ cepBaseUrl: "http://127.0.0.1:8080/" })
      ).toThrow(/Invalid or disallowed CEP API URL/);
    });

    it("should allow exact loopback in development/test while rejecting subdomains, IPv6 ::1, and non-HTTP schemes", () => {
      process.env.NODE_ENV = "development";
      const devCfg = resolveApiConfig({
        cnpjBaseUrl: "http://localhost:3000",
        cepBaseUrl: "http://127.0.0.1:8080",
      });
      expect(devCfg.cnpjBaseUrl).toBe("http://localhost:3000/");
      expect(devCfg.cepBaseUrl).toBe("http://127.0.0.1:8080/");

      expect(() =>
        resolveApiConfig({ cnpjBaseUrl: "http://evil.localhost:3000/" })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
      expect(() =>
        resolveApiConfig({ cepBaseUrl: "http://foo.127.0.0.1/" })
      ).toThrow(/Invalid or disallowed CEP API URL/);
      expect(() =>
        resolveApiConfig({ cnpjBaseUrl: "file://localhost/etc/passwd" })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
      expect(() =>
        resolveApiConfig({ cnpjBaseUrl: "http://[::1]:3000/" })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
    });
  });

  describe("Embedded Credentials Rejection & Log Sanitization", () => {
    const buildCredUrl = (proto: string, u: string, p: string, hostPath: string) =>
      `${proto}://${u}:${p}@${hostPath}`;

    it("should reject URLs with username/password and never leak them in thrown errors", () => {
      let caughtError = "";
      try {
        resolveApiConfig({
          cnpjBaseUrl: buildCredUrl("https", "secretUser", "secretPass", "api.opencnpj.org/v1/"),
        });
      } catch (err) {
        caughtError = err instanceof Error ? err.message : String(err);
      }
      expect(caughtError).toMatch(/Invalid or disallowed CNPJ API URL/);
      expect(caughtError).not.toContain("secretUser");
      expect(caughtError).not.toContain("secretPass");

      expect(() =>
        resolveApiConfig({ cepBaseUrl: "https://token@opencep.com/v1/" })
      ).toThrow(/Invalid or disallowed CEP API URL/);

      process.env.NODE_ENV = "development";
      expect(() =>
        resolveApiConfig({
          cnpjBaseUrl: buildCredUrl("http", "user", "pass", "localhost:3000/"),
        })
      ).toThrow(/Invalid or disallowed CNPJ API URL/);
    });
  });
});
