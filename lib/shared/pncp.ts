export const PNCP_ORIGIN = "https://pncp.gov.br";

// Active modes from the PNCP domain catalogue (/api/pncp/v1/modalidades).
export const PNCP_MODALIDADES = [
  [1, "Leilão - Eletrônico"],
  [2, "Diálogo Competitivo"],
  [3, "Concurso"],
  [4, "Concorrência - Eletrônica"],
  [5, "Concorrência - Presencial"],
  [6, "Pregão - Eletrônico"],
  [7, "Pregão - Presencial"],
  [8, "Dispensa"],
  [9, "Inexigibilidade"],
  [10, "Manifestação de Interesse"],
  [11, "Pré-qualificação"],
  [12, "Credenciamento"],
  [13, "Leilão - Presencial"],
  [14, "Inaplicabilidade da Licitação"],
  [15, "Chamada pública"],
  [16, "Concorrência – Eletrônica Internacional"],
  [17, "Concorrência – Presencial Internacional"],
  [18, "Pregão – Eletrônico Internacional"],
  [19, "Pregão – Presencial Internacional"],
  [20, "Diálogo Competitivo Internacional"],
] as const;

const canonicalCnpj = /^[A-Z0-9]{12}[0-9]{2}$/;

export function pncpCnpj(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const cnpj = value.toUpperCase().replace(/[./\s-]/g, "");
  if (canonicalCnpj.test(cnpj)) return cnpj;
}

export function pncpDate(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const date = value.trim();
  const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(date);
  const iso = brazilian ? `${brazilian[3]}-${brazilian[2]}-${brazilian[1]}`
    : compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
  const time = Date.parse(iso);
  if (Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === iso) return iso;
}

export function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function pncpNoticeUrl(cnpj: unknown, year: unknown, sequence: unknown): string | undefined {
  const org = pncpCnpj(cnpj);
  if (org && positiveInteger(year) && year >= 1900 && year <= 9999 && positiveInteger(sequence)) {
    return `${PNCP_ORIGIN}/app/editais/${org}/${year}/${sequence}`;
  }
}
