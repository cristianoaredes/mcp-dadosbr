/**
 * BrasilAPI providers - Free Brazilian public data APIs
 * Documentation: https://brasilapi.com.br/docs
 */

import { Result } from "../shared/types/result.js";

const BRASILAPI_BASE = "https://brasilapi.com.br/api";

/**
 * Bank lookup - Get information about Brazilian banks
 */
export async function fetchBank(
  code: string
): Promise<Result<BankData, string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/banks/v1/${code}`);

    if (!response.ok) {
      return Result.err(`Bank ${code} not found`);
    }

    const data = await response.json() as BankData;
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch bank data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * List all Brazilian banks
 */
export async function fetchAllBanks(): Promise<Result<BankData[], string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/banks/v1`);

    if (!response.ok) {
      return Result.err("Failed to fetch banks list");
    }

    const data = await response.json() as BankData[];
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch banks: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * National holidays - Get Brazilian national holidays for a given year
 */
export async function fetchHolidays(
  year: number
): Promise<Result<HolidayData[], string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/feriados/v1/${year}`);

    if (!response.ok) {
      return Result.err(`Failed to fetch holidays for year ${year}`);
    }

    const data = await response.json() as HolidayData[];
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch holidays: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * DDD lookup - Get cities by area code (DDD)
 */
export async function fetchDDD(
  ddd: string
): Promise<Result<DDDData, string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/ddd/v1/${ddd}`);

    if (!response.ok) {
      return Result.err(`DDD ${ddd} not found`);
    }

    const data = await response.json() as DDDData;
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch DDD data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * IBGE - Get state information
 */
export async function fetchIBGEState(
  uf: string
): Promise<Result<IBGEStateData, string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/ibge/uf/v1/${uf.toUpperCase()}`);

    if (!response.ok) {
      return Result.err(`State ${uf} not found`);
    }

    const data = await response.json() as IBGEStateData;
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch state data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * IBGE - Get municipalities by state
 */
export async function fetchIBGEMunicipalities(
  uf: string
): Promise<Result<IBGEMunicipalityData[], string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/ibge/municipios/v1/${uf.toUpperCase()}`);

    if (!response.ok) {
      return Result.err(`Failed to fetch municipalities for state ${uf}`);
    }

    const data = await response.json() as IBGEMunicipalityData[];
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch municipalities: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * ISBN lookup - Get book information by ISBN
 */
export async function fetchISBN(
  isbn: string
): Promise<Result<ISBNData, string>> {
  try {
    const cleanIsbn = isbn.replace(/\D/g, "");
    const response = await fetch(`${BRASILAPI_BASE}/isbn/v1/${cleanIsbn}`);

    if (!response.ok) {
      return Result.err(`ISBN ${isbn} not found`);
    }

    const data = await response.json() as ISBNData;
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch ISBN data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * NCM lookup - Get Mercosul Common Nomenclature information
 */
export async function fetchNCM(
  code: string
): Promise<Result<NCMData, string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/ncm/v1/${code}`);

    if (!response.ok) {
      return Result.err(`NCM ${code} not found`);
    }

    const data = await response.json() as NCMData;
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch NCM data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * FIPE - Get vehicle brands
 */
export async function fetchFIPEBrands(
  vehicleType: "carros" | "motos" | "caminhoes"
): Promise<Result<FIPEBrandData[], string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/fipe/marcas/v1/${vehicleType}`);

    if (!response.ok) {
      return Result.err(`Failed to fetch ${vehicleType} brands`);
    }

    const data = await response.json() as FIPEBrandData[];
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch FIPE brands: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * FIPE - Get vehicle price by FIPE code
 */
export async function fetchFIPEPrice(
  fipeCode: string
): Promise<Result<FIPEPriceData, string>> {
  try {
    const response = await fetch(`${BRASILAPI_BASE}/fipe/preco/v1/${fipeCode}`);

    if (!response.ok) {
      return Result.err(`FIPE code ${fipeCode} not found`);
    }

    const data = await response.json() as FIPEPriceData;
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch FIPE price: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Taxas - Get Brazilian economic rates (SELIC, CDI, etc)
 */
export async function fetchTaxas(
  taxName?: string
): Promise<Result<TaxaData[] | TaxaData, string>> {
  try {
    const endpoint = taxName
      ? `${BRASILAPI_BASE}/taxas/v1/${taxName}`
      : `${BRASILAPI_BASE}/taxas/v1`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      return Result.err(taxName ? `Tax ${taxName} not found` : "Failed to fetch taxes");
    }

    const data = await response.json() as TaxaData | TaxaData[];
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch tax data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * CEP v2 - BrasilAPI CEP lookup with multiple providers and fallback
 */
export async function fetchCEPBrasilAPI(
  cep: string
): Promise<Result<CEPDataBrasilAPI, string>> {
  try {
    const cleanCep = cep.replace(/\D/g, "");
    const response = await fetch(`${BRASILAPI_BASE}/cep/v2/${cleanCep}`);

    if (!response.ok) {
      return Result.err(`CEP ${cep} not found`);
    }

    const data = await response.json() as CEPDataBrasilAPI;
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch CEP: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * CNPJ - BrasilAPI CNPJ lookup
 */
export async function fetchCNPJBrasilAPI(
  cnpj: string
): Promise<Result<CNPJDataBrasilAPI, string>> {
  try {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const response = await fetch(`${BRASILAPI_BASE}/cnpj/v1/${cleanCnpj}`);

    if (!response.ok) {
      return Result.err(`CNPJ ${cnpj} not found`);
    }

    const data = await response.json() as CNPJDataBrasilAPI;
    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to fetch CNPJ: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Type definitions
export interface BankData {
  ispb: string;
  name: string;
  code: number;
  fullName: string;
}

export interface HolidayData {
  date: string;
  name: string;
  type: string;
}

export interface DDDData {
  state: string;
  cities: string[];
}

export interface IBGEStateData {
  id: number;
  sigla: string;
  nome: string;
  regiao: {
    id: number;
    sigla: string;
    nome: string;
  };
}

export interface IBGEMunicipalityData {
  nome: string;
  codigo_ibge: string;
}

export interface ISBNData {
  isbn: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher: string;
  synopsis?: string;
  dimensions?: {
    width?: number;
    height?: number;
    unit?: string;
  };
  year?: number;
  format?: string;
  page_count?: number;
}

export interface NCMData {
  codigo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  tipo_ato: string;
  numero_ato: string;
  ano_ato: string;
}

export interface FIPEBrandData {
  nome: string;
  valor: string;
}

export interface FIPEPriceData {
  valor: string;
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  codigoFipe: string;
  mesReferencia: string;
  tipoVeiculo: number;
  siglaCombustivel: string;
  dataConsulta: string;
}

export interface TaxaData {
  nome: string;
  valor: number;
}

export interface CEPDataBrasilAPI {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
}

export interface CNPJDataBrasilAPI {
  cnpj: string;
  identificador_matriz_filial: number;
  descricao_matriz_filial: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: number;
  descricao_situacao_cadastral: string;
  data_situacao_cadastral: string;
  motivo_situacao_cadastral: number;
  nome_cidade_exterior?: string;
  codigo_natureza_juridica: number;
  data_inicio_atividade: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  descricao_tipo_logradouro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: number;
  uf: string;
  codigo_municipio: number;
  municipio: string;
  ddd_telefone_1: string;
  ddd_telefone_2?: string;
  ddd_fax?: string;
  qualificacao_do_responsavel: number;
  capital_social: number;
  porte: number;
  descricao_porte: string;
  opcao_pelo_simples: boolean;
  data_opcao_pelo_simples?: string;
  data_exclusao_do_simples?: string;
  opcao_pelo_mei: boolean;
  situacao_especial?: string;
  data_situacao_especial?: string;
  qsa?: Array<{
    identificador_de_socio: number;
    nome_socio: string;
    cnpj_cpf_do_socio: string;
    codigo_qualificacao_socio: number;
    percentual_capital_social: number;
    data_entrada_sociedade: string;
    cpf_representante_legal?: string;
    nome_representante_legal?: string;
    codigo_qualificacao_representante_legal?: number;
  }>;
}
