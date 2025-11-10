/**
 * ViaCEP provider - Free Brazilian CEP (postal code) API
 * Documentation: https://viacep.com.br/
 */

import { Result } from "../shared/types/result.js";

const VIACEP_BASE = "https://viacep.com.br/ws";

/**
 * CEP lookup using ViaCEP
 */
export async function fetchCEPViaCEP(
  cep: string
): Promise<Result<CEPDataViaCEP, string>> {
  try {
    const cleanCep = cep.replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      return Result.err("CEP must have 8 digits");
    }

    const response = await fetch(`${VIACEP_BASE}/${cleanCep}/json/`);

    if (!response.ok) {
      return Result.err(`Failed to fetch CEP ${cep}`);
    }

    const data = await response.json() as CEPDataViaCEP & { erro?: boolean };

    // ViaCEP returns {"erro": true} when CEP is not found
    if (data.erro) {
      return Result.err(`CEP ${cep} not found`);
    }

    return Result.ok(data as CEPDataViaCEP);
  } catch (error) {
    return Result.err(`Failed to fetch CEP from ViaCEP: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Address search - Find CEPs by address
 * Format: UF/City/Street
 * Example: SP/São Paulo/Paulista
 */
export async function searchAddressViaCEP(
  uf: string,
  city: string,
  street: string
): Promise<Result<CEPDataViaCEP[], string>> {
  try {
    const cleanUf = uf.trim();
    const cleanCity = encodeURIComponent(city.trim());
    const cleanStreet = encodeURIComponent(street.trim());

    if (!cleanUf || !cleanCity || !cleanStreet) {
      return Result.err("UF, city, and street are required");
    }

    if (cleanStreet.length < 3) {
      return Result.err("Street name must have at least 3 characters");
    }

    const response = await fetch(
      `${VIACEP_BASE}/${cleanUf}/${cleanCity}/${cleanStreet}/json/`
    );

    if (!response.ok) {
      return Result.err("Failed to search address");
    }

    const data = await response.json() as CEPDataViaCEP[];

    // ViaCEP returns empty array when no results found
    if (Array.isArray(data) && data.length === 0) {
      return Result.err("No addresses found");
    }

    return Result.ok(data);
  } catch (error) {
    return Result.err(`Failed to search address: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Type definitions
export interface CEPDataViaCEP {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}
