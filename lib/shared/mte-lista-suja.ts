/**
 * Web-standard MTE Lista Suja (Cadastro de Empregadores) CSV decoder, parser, and matcher.
 * Keep free of Node-only imports (`node:*`) and `../core/*` / `../tools/*` dependencies (`ADR-0001` / `ADR-0002`).
 */

import { sanitizeUntrustedText } from "./agentic-guard.js";

export const MTE_LISTA_SUJA_CSV_URL =
  "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/areas-de-atuacao/cadastro_de_empregadores.csv";

export const LISTA_SUJA_CACHE_KEY = "lista_suja:mte_csv:v1";

export interface MteListaSujaEntry {
  id: string;
  ano_acao_fiscal: string;
  uf: string;
  empregador: string;
  cnpj_cpf: string;
  cnpj_cpf_digits: string;
  estabelecimento: string;
  trabalhadores_envolvidos: string;
  cnae: string;
  decisao_procedencia: string;
  inclusao_cadastro: string;
  normalized_employer: string;
}

export type MteListaSujaPublicEntry = Omit<
  MteListaSujaEntry,
  "cnpj_cpf_digits" | "normalized_employer"
>;

export interface MteListaSujaMatchResult {
  total_matches: number;
  matches: MteListaSujaPublicEntry[];
}

interface ColumnMap {
  id: number;
  ano_acao_fiscal: number;
  uf: number;
  empregador: number;
  cnpj_cpf: number;
  estabelecimento: number;
  trabalhadores_envolvidos: number;
  cnae: number;
  decisao_procedencia: number;
  inclusao_cadastro: number;
}

/**
 * Decode MTE Lista Suja CSV bytes as UTF-8, falling back to ISO-8859-1 on invalid UTF-8 sequences.
 */
export function decodeMteCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("iso-8859-1").decode(buffer);
  }
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeEmployerForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function parseSemicolonCsvRows(csvText: string): string[][] {
  const input = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"' && currentField.length === 0) {
      inQuotes = true;
    } else if (ch === ";") {
      currentRow.push(currentField);
      currentField = "";
    } else if (ch === "\r") {
      if (input[i + 1] === "\n") {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else if (ch === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

function findColumnIndex(
  normalizedHeaders: string[],
  exactNames: string[],
  partialCheck?: (header: string) => boolean,
): number {
  const exactIdx = normalizedHeaders.findIndex((h) => exactNames.includes(h));
  if (exactIdx !== -1) {
    return exactIdx;
  }
  if (partialCheck) {
    return normalizedHeaders.findIndex(partialCheck);
  }
  return -1;
}

function resolveColumns(headerCells: string[]): ColumnMap {
  if (
    headerCells.length < 2 ||
    headerCells.some((cell) => /<[a-z!/]/i.test(cell.trim()))
  ) {
    throw new Error("Invalid MTE Lista Suja CSV header");
  }

  const normalized = headerCells.map(normalizeHeader);

  const empregador = findColumnIndex(
    normalized,
    ["empregador", "nome empregador", "razao social"],
    (h) => h.includes("empregador") && !h.includes("inclusao"),
  );
  const resolvedEmpregador =
    empregador !== -1
      ? empregador
      : normalized.findIndex((h) => h.includes("empregador"));

  const cnpj_cpf = findColumnIndex(
    normalized,
    ["cnpj/cpf", "cpf/cnpj", "cnpj", "cpf"],
    (h) => h.includes("cnpj"),
  );

  if (
    resolvedEmpregador === -1 ||
    cnpj_cpf === -1 ||
    resolvedEmpregador === cnpj_cpf
  ) {
    throw new Error("Invalid MTE Lista Suja CSV header");
  }

  return {
    id: findColumnIndex(normalized, ["id"]),
    ano_acao_fiscal: findColumnIndex(
      normalized,
      ["ano da acao fiscal"],
      (h) => h.includes("ano") && h.includes("acao"),
    ),
    uf: findColumnIndex(normalized, ["uf"]),
    empregador: resolvedEmpregador,
    cnpj_cpf,
    estabelecimento: findColumnIndex(
      normalized,
      ["estabelecimento"],
      (h) => h.includes("estabelecimento"),
    ),
    trabalhadores_envolvidos: findColumnIndex(
      normalized,
      ["trabalhadores envolvidos"],
      (h) => h.includes("trabalhadores"),
    ),
    cnae: findColumnIndex(normalized, ["cnae"], (h) => h.includes("cnae")),
    decisao_procedencia: findColumnIndex(
      normalized,
      ["decisao administrativa de procedencia", "decisao de procedencia"],
      (h) => h.includes("decisao") || h.includes("procedencia"),
    ),
    inclusao_cadastro: findColumnIndex(
      normalized,
      ["inclusao no cadastro de empregadores", "inclusao no cadastro"],
      (h) => h.includes("inclusao"),
    ),
  };
}

function readCell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) {
    return "";
  }
  return sanitizeUntrustedText(row[index] ?? "", 300);
}

/**
 * Parse MTE Lista Suja semicolon-delimited CSV text into sanitized structured entries.
 */
export function parseMteListaSujaCsv(csvText: string): MteListaSujaEntry[] {
  const rows = parseSemicolonCsvRows(csvText);
  if (rows.length === 0) {
    throw new Error("Invalid MTE Lista Suja CSV header");
  }

  const columns = resolveColumns(rows[0]);
  const entries: MteListaSujaEntry[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const empregador = readCell(row, columns.empregador);
    const cnpj_cpf = readCell(row, columns.cnpj_cpf);
    if (!empregador && !cnpj_cpf) {
      continue;
    }

    entries.push({
      id: readCell(row, columns.id),
      ano_acao_fiscal: readCell(row, columns.ano_acao_fiscal),
      uf: readCell(row, columns.uf),
      empregador,
      cnpj_cpf,
      cnpj_cpf_digits: cnpj_cpf.replace(/\D/g, ""),
      estabelecimento: readCell(row, columns.estabelecimento),
      trabalhadores_envolvidos: readCell(row, columns.trabalhadores_envolvidos),
      cnae: readCell(row, columns.cnae),
      decisao_procedencia: readCell(row, columns.decisao_procedencia),
      inclusao_cadastro: readCell(row, columns.inclusao_cadastro),
      normalized_employer: normalizeEmployerForSearch(empregador),
    });
  }

  return entries;
}

function toPublicEntry(entry: MteListaSujaEntry): MteListaSujaPublicEntry {
  const { cnpj_cpf_digits: _digits, normalized_employer: _norm, ...publicFields } = entry;
  return publicFields;
}

/**
 * Filter parsed MTE Lista Suja entries by CNPJ/CPF digits (>= 8 digits) or accent-insensitive employer tokens.
 */
export function matchMteListaSuja(
  entries: MteListaSujaEntry[],
  query: string,
  maxMatches: number = 50,
): MteListaSujaMatchResult {
  const limit = Number.isFinite(maxMatches) && maxMatches > 0 ? Math.floor(maxMatches) : 0;
  const digits = query.replace(/\D/g, "");

  let matched: MteListaSujaEntry[];
  if (digits.length >= 8) {
    const exactLength = digits.length === 11 || digits.length === 14;
    matched = entries.filter((entry) =>
      exactLength
        ? entry.cnpj_cpf_digits === digits
        : entry.cnpj_cpf_digits.includes(digits),
    );
  } else {
    const tokens = normalizeEmployerForSearch(query)
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0) {
      return { total_matches: 0, matches: [] };
    }
    matched = entries.filter((entry) =>
      tokens.every((token) => entry.normalized_employer.includes(token)),
    );
  }

  return {
    total_matches: matched.length,
    matches: matched.slice(0, limit).map(toPublicEntry),
  };
}
