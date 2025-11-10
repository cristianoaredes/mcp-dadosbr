import { describe, it, expect, beforeEach, vi } from "vitest";
import * as BrasilAPI from "../../lib/core/brasilapi-providers";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("BrasilAPI Providers", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("fetchBank", () => {
    it("should return bank data for valid code", async () => {
      const mockBankData = {
        ispb: "00000000",
        name: "Banco do Brasil S.A.",
        code: 1,
        fullName: "Banco do Brasil S.A."
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBankData
      });

      const result = await BrasilAPI.fetchBank("001");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("Banco do Brasil S.A.");
        expect(result.value.code).toBe(1);
      }
    });

    it("should return error for invalid code", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await BrasilAPI.fetchBank("999");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await BrasilAPI.fetchBank("001");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Network error");
      }
    });
  });

  describe("fetchAllBanks", () => {
    it("should return list of banks", async () => {
      const mockBanks = [
        { ispb: "00000000", name: "Banco do Brasil S.A.", code: 1, fullName: "Banco do Brasil S.A." },
        { ispb: "00000208", name: "Banco BTG Pactual S.A.", code: 208, fullName: "Banco BTG Pactual S.A." }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks
      });

      const result = await BrasilAPI.fetchAllBanks();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBeGreaterThan(0);
      }
    });
  });

  describe("fetchHolidays", () => {
    it("should return holidays for valid year", async () => {
      const mockHolidays = [
        { date: "2024-01-01", name: "Confraternização Universal", type: "national" },
        { date: "2024-12-25", name: "Natal", type: "national" }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHolidays
      });

      const result = await BrasilAPI.fetchHolidays(2024);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    it("should return error for invalid year", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      const result = await BrasilAPI.fetchHolidays(1900);

      expect(result.ok).toBe(false);
    });
  });

  describe("fetchDDD", () => {
    it("should return cities for valid DDD", async () => {
      const mockDDDData = {
        state: "SP",
        cities: ["São Paulo", "Guarulhos", "Osasco"]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDDDData
      });

      const result = await BrasilAPI.fetchDDD("11");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.state).toBe("SP");
        expect(Array.isArray(result.value.cities)).toBe(true);
      }
    });

    it("should return error for invalid DDD", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await BrasilAPI.fetchDDD("00");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("fetchIBGEState", () => {
    it("should return state data for valid UF", async () => {
      const mockStateData = {
        id: 35,
        sigla: "SP",
        nome: "São Paulo",
        regiao: {
          id: 3,
          sigla: "SE",
          nome: "Sudeste"
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStateData
      });

      const result = await BrasilAPI.fetchIBGEState("SP");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sigla).toBe("SP");
        expect(result.value.nome).toBe("São Paulo");
      }
    });

    it("should handle lowercase UF", async () => {
      const mockStateData = {
        id: 33,
        sigla: "RJ",
        nome: "Rio de Janeiro",
        regiao: { id: 3, sigla: "SE", nome: "Sudeste" }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStateData
      });

      const result = await BrasilAPI.fetchIBGEState("rj");

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/RJ"));
    });
  });

  describe("fetchIBGEMunicipalities", () => {
    it("should return municipalities for valid UF", async () => {
      const mockMunicipalities = [
        { nome: "São Paulo", codigo_ibge: "3550308" },
        { nome: "Guarulhos", codigo_ibge: "3518800" }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMunicipalities
      });

      const result = await BrasilAPI.fetchIBGEMunicipalities("SP");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value.length).toBeGreaterThan(0);
      }
    });
  });

  describe("fetchISBN", () => {
    it("should return book data for valid ISBN", async () => {
      const mockISBNData = {
        isbn: "9788545702870",
        title: "O Senhor dos Anéis",
        authors: ["J.R.R. Tolkien"],
        publisher: "HarperCollins",
        year: 2019
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockISBNData
      });

      const result = await BrasilAPI.fetchISBN("978-85-457-0287-0");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("O Senhor dos Anéis");
      }
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("9788545702870"));
    });

    it("should strip formatting from ISBN", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isbn: "9788545702870", title: "Test" })
      });

      await BrasilAPI.fetchISBN("978-85-457-0287-0");

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("9788545702870"));
    });
  });

  describe("fetchNCM", () => {
    it("should return NCM data for valid code", async () => {
      const mockNCMData = {
        codigo: "01012100",
        descricao: "Cavalos reprodutores de raça pura",
        data_inicio: "2022-04-01",
        data_fim: "9999-12-31",
        tipo_ato: "Resolução Gecex",
        numero_ato: "272",
        ano_ato: "2021"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNCMData
      });

      const result = await BrasilAPI.fetchNCM("01012100");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.codigo).toBe("01012100");
        expect(result.value.descricao).toBeTruthy();
      }
    });
  });

  describe("fetchFIPEBrands", () => {
    it("should return car brands", async () => {
      const mockBrands = [
        { nome: "Fiat", valor: "21" },
        { nome: "Ford", valor: "22" }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBrands
      });

      const result = await BrasilAPI.fetchFIPEBrands("carros");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it("should handle different vehicle types", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await BrasilAPI.fetchFIPEBrands("motos");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/motos"));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await BrasilAPI.fetchFIPEBrands("caminhoes");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/caminhoes"));
    });
  });

  describe("fetchFIPEPrice", () => {
    it("should return vehicle price for valid FIPE code", async () => {
      const mockPriceData = {
        valor: "R$ 50.000,00",
        marca: "Fiat",
        modelo: "Uno",
        anoModelo: 2020,
        combustivel: "Gasolina",
        codigoFipe: "001004-1",
        mesReferencia: "dezembro de 2024",
        tipoVeiculo: 1,
        siglaCombustivel: "G",
        dataConsulta: "segunda-feira, 11 de novembro de 2024 00:00"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPriceData
      });

      const result = await BrasilAPI.fetchFIPEPrice("001004-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.marca).toBe("Fiat");
        expect(result.value.modelo).toBe("Uno");
      }
    });
  });

  describe("fetchTaxas", () => {
    it("should return all rates when no name specified", async () => {
      const mockTaxas = [
        { nome: "SELIC", valor: 11.75 },
        { nome: "CDI", valor: 11.65 }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTaxas
      });

      const result = await BrasilAPI.fetchTaxas();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it("should return specific rate when name specified", async () => {
      const mockTaxa = { nome: "SELIC", valor: 11.75 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTaxa
      });

      const result = await BrasilAPI.fetchTaxas("selic");

      expect(result.ok).toBe(true);
      if (result.ok && !Array.isArray(result.value)) {
        expect(result.value.nome).toBe("SELIC");
      }
    });
  });

  describe("fetchCEPBrasilAPI", () => {
    it("should return CEP data for valid CEP", async () => {
      const mockCEPData = {
        cep: "01310100",
        state: "SP",
        city: "São Paulo",
        neighborhood: "Bela Vista",
        street: "Avenida Paulista",
        service: "brasilapi"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCEPData
      });

      const result = await BrasilAPI.fetchCEPBrasilAPI("01310-100");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.street).toBe("Avenida Paulista");
        expect(result.value.city).toBe("São Paulo");
      }
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("01310100"));
    });

    it("should strip formatting from CEP", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cep: "01310100", state: "SP", city: "São Paulo" })
      });

      await BrasilAPI.fetchCEPBrasilAPI("01310-100");

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("01310100"));
    });
  });

  describe("fetchCNPJBrasilAPI", () => {
    it("should return CNPJ data for valid CNPJ", async () => {
      const mockCNPJData = {
        cnpj: "19131243000197",
        identificador_matriz_filial: 1,
        descricao_matriz_filial: "Matriz",
        razao_social: "OPEN KNOWLEDGE BRASIL",
        nome_fantasia: "REDE PELO CONHECIMENTO LIVRE",
        situacao_cadastral: 2,
        descricao_situacao_cadastral: "Ativa",
        data_situacao_cadastral: "2013-10-03",
        codigo_natureza_juridica: 3999,
        data_inicio_atividade: "2013-10-03",
        cnae_fiscal: 9430800,
        cnae_fiscal_descricao: "Atividades de associações de defesa de direitos sociais",
        uf: "SP",
        municipio: "São Paulo",
        capital_social: 0,
        porte: 5,
        descricao_porte: "Demais"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCNPJData
      });

      const result = await BrasilAPI.fetchCNPJBrasilAPI("19.131.243/0001-97");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.razao_social).toBe("OPEN KNOWLEDGE BRASIL");
      }
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("19131243000197"));
    });

    it("should strip formatting from CNPJ", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cnpj: "19131243000197", razao_social: "Test" })
      });

      await BrasilAPI.fetchCNPJBrasilAPI("19.131.243/0001-97");

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("19131243000197"));
    });
  });
});
