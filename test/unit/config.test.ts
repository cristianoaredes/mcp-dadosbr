import { describe, it, expect } from "vitest";
import { resolveApiConfig } from "../../lib/config/index.js";

describe("Config SSRF Protection", () => {
  const originalEnv = process.env;

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
});
