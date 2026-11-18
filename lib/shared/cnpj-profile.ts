type Activity = { code: string; description?: string };

export type CnpjProfile = {
  cnpj: string;
  name?: string;
  tradeName?: string;
  status?: string;
  statusDate?: string;
  primary?: Activity;
  secondary: Activity[];
  address: string[];
  provider?: string;
  fetchedAt?: string;
  updatedAt?: string;
};

type Fields = Record<string, unknown>;

function record(value: unknown): Fields {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Fields : {};
}

function field(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function activity(value: unknown, label?: unknown): Activity | undefined {
  const item = record(value);
  const code = field(item.codigo, item.code, item.id, value)?.replace(/[.\s-]/g, "");
  if (code && /^\d{7}$/.test(code) && code !== "0000000") {
    return { code, description: field(item.descricao, item.text, label) };
  }
}

const statuses: Record<string, string> = {
  "1": "Nula", "2": "Ativa", "3": "Suspensa", "4": "Inapta", "8": "Baixada",
};

export function readCnpjProfile(value: unknown): CnpjProfile | undefined {
  const root = record(value);
  const nested = record(root.estabelecimento);
  const data = root.estabelecimento ? nested : root;
  const cnpj = field(data.cnpj)?.replace(/[.\s/-]/g, "");
  if (!cnpj || !/^\d{14}$/.test(cnpj) || root.status === "ERROR") return;

  const details = array(data.cnaes);
  const labelled = new Map(details.flatMap((item) => {
    const parsed = activity(item);
    return parsed ? [[parsed.code, parsed] as const] : [];
  }));
  const primary = activity(data.cnae_principal)
    ?? activity(data.cnae_fiscal, data.cnae_fiscal_descricao)
    ?? activity(data.atividade_principal)
    ?? activity(array(data.atividade_principal)[0])
    ?? activity(details.find((item) => record(item).is_principal === true));
  const secondary = new Map<string, Activity>();
  const candidates = [
    ...array(data.cnaes_secundarios), ...array(data.atividades_secundarias),
    ...details.filter((item) => record(item).is_principal === false),
  ];
  for (const item of candidates) {
    const parsed = activity(item);
    if (!parsed || parsed.code === primary?.code) continue;
    secondary.set(parsed.code, {
      code: parsed.code,
      description: parsed.description ?? labelled.get(parsed.code)?.description ?? secondary.get(parsed.code)?.description,
    });
  }

  const numericStatus = field(data.situacao_cadastral);
  const textStatus = field(data.descricao_situacao_cadastral, data.situacao);
  const status = textStatus ?? (numericStatus && /^\d+$/.test(numericStatus)
    ? statuses[String(Number(numericStatus))] ?? "Código " + numericStatus : numericStatus);
  const streetType = field(data.tipo_logradouro, data.descricao_tipo_de_logradouro);
  const streetName = field(data.logradouro);
  const street = streetType && streetName
    && !streetName.toUpperCase().startsWith(streetType.toUpperCase() + " ")
    ? streetType + " " + streetName : streetName;
  const cepDigits = field(data.cep)?.replace(/[.\s-]/g, "");
  const cep = cepDigits && /^\d{1,8}$/.test(cepDigits) && Number(cepDigits) ? cepDigits.padStart(8, "0") : undefined;
  const locality = [
    field(record(data.cidade).nome, data.municipio, data.nome_cidade_exterior),
    field(record(data.estado).sigla, data.uf),
  ].filter(Boolean).join(" · ");
  let provider: string | undefined;
  if (typeof root.source === "string") {
    try {
      const url = new URL(root.source);
      if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) provider = url.hostname;
    } catch {
      // A missing or non-URL source does not identify a provider.
    }
  }
  return {
    cnpj,
    name: field(root.razao_social, data.razao_social, root.nome),
    tradeName: field(data.nome_fantasia, data.fantasia),
    status,
    statusDate: field(data.data_situacao_cadastral, data.data_situacao),
    primary: primary && { code: primary.code, description: primary.description ?? labelled.get(primary.code)?.description },
    secondary: [...secondary.values()],
    address: [
      [street || undefined, field(data.numero), field(data.complemento)].filter(Boolean).join(", "),
      field(data.bairro),
      locality,
      cep && "CEP " + cep.slice(0, 5) + "-" + cep.slice(5),
    ].filter((part): part is string => Boolean(part)),
    provider,
    fetchedAt: field(root.fetchedAt),
    updatedAt: field(data.updated_at, data.atualizado_em, data.ultima_atualizacao, root.atualizado_em),
  };
}
