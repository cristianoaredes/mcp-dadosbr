import { describe, it, expect, beforeEach, vi } from "vitest";
import * as ViaCEP from "../../lib/core/viacep-provider";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("ViaCEP Provider", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("fetchCEPViaCEP", () => {
    it("should return CEP data for valid CEP", async () => {
      const mockCEPData = {
        cep: "01310-100",
        logradouro: "Avenida Paulista",
        complemento: "de 612 a 1510 - lado par",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
        ibge: "3550308",
        gia: "1004",
        ddd: "11",
        siafi: "7107"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCEPData
      });

      const result = await ViaCEP.fetchCEPViaCEP("01310-100");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.logradouro).toBe("Avenida Paulista");
        expect(result.value.localidade).toBe("São Paulo");
        expect(result.value.uf).toBe("SP");
      }
    });

    it("should strip formatting from CEP", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cep: "01310-100", logradouro: "Test" })
      });

      await ViaCEP.fetchCEPViaCEP("01310-100");

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("01310100"));
    });

    it("should return error for CEP not found (erro: true)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ erro: true })
      });

      const result = await ViaCEP.fetchCEPViaCEP("99999-999");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });

    it("should return error for CEP with invalid length", async () => {
      const result = await ViaCEP.fetchCEPViaCEP("123");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("8 digits");
      }
    });

    it("should return error for empty CEP", async () => {
      const result = await ViaCEP.fetchCEPViaCEP("");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("8 digits");
      }
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await ViaCEP.fetchCEPViaCEP("01310-100");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Failed to fetch CEP");
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await ViaCEP.fetchCEPViaCEP("01310-100");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Network error");
      }
    });

    it("should accept CEP with various formats", async () => {
      const mockData = { cep: "01310-100", logradouro: "Test" };

      // Format: XXXXX-XXX
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });
      await ViaCEP.fetchCEPViaCEP("01310-100");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("01310100"));

      // Format: XXXXXXXX
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });
      await ViaCEP.fetchCEPViaCEP("01310100");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("01310100"));

      // Format with spaces
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });
      await ViaCEP.fetchCEPViaCEP("01310 100");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("01310100"));
    });
  });

  describe("searchAddressViaCEP", () => {
    it("should return list of addresses for valid search", async () => {
      const mockAddresses = [
        {
          cep: "01310-100",
          logradouro: "Avenida Paulista",
          complemento: "de 612 a 1510 - lado par",
          bairro: "Bela Vista",
          localidade: "São Paulo",
          uf: "SP",
          ibge: "3550308",
          gia: "1004",
          ddd: "11",
          siafi: "7107"
        },
        {
          cep: "01310-200",
          logradouro: "Avenida Paulista",
          complemento: "de 1413 a 2265 - lado ímpar",
          bairro: "Bela Vista",
          localidade: "São Paulo",
          uf: "SP",
          ibge: "3550308",
          gia: "1004",
          ddd: "11",
          siafi: "7107"
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAddresses
      });

      const result = await ViaCEP.searchAddressViaCEP("SP", "São Paulo", "Paulista");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBe(2);
        expect(result.value[0].logradouro).toBe("Avenida Paulista");
      }
    });

    it("should encode special characters in search", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await ViaCEP.searchAddressViaCEP("SP", "São Paulo", "Avenida São João");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("S%C3%A3o%20Paulo")
      );
    });

    it("should return error when no results found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const result = await ViaCEP.searchAddressViaCEP("SP", "São Paulo", "NonexistentStreet");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("No addresses found");
      }
    });

    it("should return error for missing parameters", async () => {
      // Missing UF
      let result = await ViaCEP.searchAddressViaCEP("", "São Paulo", "Paulista");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("required");
      }

      // Missing city
      result = await ViaCEP.searchAddressViaCEP("SP", "", "Paulista");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("required");
      }

      // Missing street
      result = await ViaCEP.searchAddressViaCEP("SP", "São Paulo", "");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("required");
      }
    });

    it("should return error for street name too short", async () => {
      const result = await ViaCEP.searchAddressViaCEP("SP", "São Paulo", "AB");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("at least 3 characters");
      }
    });

    it("should trim whitespace from parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ cep: "01310-100", logradouro: "Test" }]
      });

      await ViaCEP.searchAddressViaCEP("  SP  ", "  São Paulo  ", "  Paulista  ");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/SP/")
      );
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await ViaCEP.searchAddressViaCEP("SP", "São Paulo", "Paulista");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Failed to search address");
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await ViaCEP.searchAddressViaCEP("SP", "São Paulo", "Paulista");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Network error");
      }
    });

    it("should work with different states", async () => {
      const mockRJData = [
        {
          cep: "20040-020",
          logradouro: "Avenida Rio Branco",
          bairro: "Centro",
          localidade: "Rio de Janeiro",
          uf: "RJ",
          ibge: "3304557",
          gia: "",
          ddd: "21",
          siafi: "6001"
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRJData
      });

      const result = await ViaCEP.searchAddressViaCEP("RJ", "Rio de Janeiro", "Rio Branco");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].uf).toBe("RJ");
        expect(result.value[0].localidade).toBe("Rio de Janeiro");
      }
    });
  });
});
