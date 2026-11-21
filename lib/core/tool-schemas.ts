/**
 * Runtime Zod validation schemas for all 29 registered MCP tools.
 * Enforces runtime type safety, explicit min/max bounds, and format allowlists
 * before any registered tool handler executes.
 */

import { z, type ZodType } from "zod";
import { CnpjSchema, CepSchema } from "./validation.js";
import { TcuCertidoesSchema } from "../shared/tcu-schema.js";
import {
  CnaeNcmSchema,
  SistemaFinanceiroSchema,
  FeriadosDddSchema,
} from "../shared/fiscal-banking-schemas.js";
import {
  BcbOlindaSchema,
  IbgeIndicadoresSchema,
} from "../shared/olinda-ibge-schemas.js";

export {
  TcuCertidoesSchema,
  CnaeNcmSchema,
  SistemaFinanceiroSchema,
  FeriadosDddSchema,
  BcbOlindaSchema,
  IbgeIndicadoresSchema,
};

export const DORK_CATEGORIES = [
  "government",
  "legal",
  "news",
  "documents",
  "social",
  "partners",
  "security",
  "databases",
  "infrastructure",
  "social_media",
] as const;

export const SEARCH_PROVIDERS = ["tavily", "perplexity"] as const;

export const DATAJUD_TRIBUNALS = new Set<string>([
  "tst",
  "trf1",
  "trf2",
  "trf3",
  "trf4",
  "trf5",
  "tjsp",
  "tjrj",
  "tjmg",
  "tjrs",
  "tjpr",
  "tjsc",
  "tjba",
  "tjpe",
  "tjce",
  "tjgo",
  "tjdf",
]);

export const CnpjLookupSchema = CnpjSchema;
export const CepLookupSchema = CepSchema;

export const CnpjSearchSchema = z.object({
  query: z.string().trim().min(1, "query is required").max(500),
  max_results: z.number().int().min(1).max(20).optional().default(5),
});

export const CnpjIntelligenceSchema = z
  .object({
    cnpj: CnpjSchema.shape.cnpj,
    categories: z.array(z.enum(DORK_CATEGORIES)).min(1).max(10).optional(),
    provider: z.enum(SEARCH_PROVIDERS).optional(),
    max_results_per_query: z.number().int().min(1).max(10).optional(),
    max_queries: z.number().int().min(1).max(20).optional(),
    max_results: z.number().int().min(1).max(10).optional(),
  })
  .strict();

export const SequentialThinkingSchema = z.object({
  thought: z.string().min(1, "thought is required").max(10000),
  thoughtNumber: z.number().int().min(1).max(1000),
  totalThoughts: z.number().int().min(1).max(1000),
  nextThoughtNeeded: z.boolean(),
  isRevision: z.boolean().optional(),
  revisesThought: z.number().int().min(1).max(1000).optional(),
  branchFromThought: z.number().int().min(1).max(1000).optional(),
  branchId: z.string().min(1).max(100).optional(),
  needsMoreThoughts: z.boolean().optional(),
});

export const CpfValidateSchema = z.object({
  cpf: z.string().trim().min(1, "cpf is required").max(30),
});

export const DomainWhoisSchema = z.object({
  domain: z.string().trim().min(1, "domain is required").max(255),
});

export const ConsumidorSchema = z.object({
  empresa: z.string().trim().min(1, "empresa is required").max(200),
});

export const DeepProfileSchema = z.object({
  cnpj: CnpjSchema.shape.cnpj,
  include_news: z.boolean().optional().default(true),
  include_legal: z.boolean().optional().default(true),
  include_government: z.boolean().optional().default(true),
  domain: z.string().trim().min(1).max(255).optional(),
});

export const IbgeSchema = z
  .object({
    tipo: z.enum(["estados", "municipios", "municipios_por_uf", "regioes"]),
    uf: z.string().trim().min(1).max(10).optional(),
    id: z.number().int().min(1).max(99999999).optional(),
    nome: z.string().trim().min(1).max(200).optional(),
    page: z.number().int().min(1).max(10000).optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  })
  .refine((v) => v.tipo !== "municipios_por_uf" || Boolean(v.uf), {
    message: "UF is required for municipios_por_uf",
    path: ["uf"],
  });

export const TransparenciaSchema = z.object({
  cnpj: z.string().trim().min(11).max(20),
  tipo: z.enum(["contratos", "licitacoes", "convenios", "servidores", "sancoes"]),
  dataInicio: z
    .string()
    .trim()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Expected DD/MM/YYYY")
    .optional(),
  dataFim: z
    .string()
    .trim()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Expected DD/MM/YYYY")
    .optional(),
  pagina: z.number().int().min(1).max(1000).optional().default(1),
});

export const CeisCnepSchema = z.object({
  query: z.string().trim().min(1, "query is required").max(200),
  tipo: z.enum(["ceis", "cnep", "cepim", "all"]).optional().default("all"),
  pagina: z.number().int().min(1).max(1000).optional().default(1),
});

export const PncpSchema = z.object({
  query: z.string().max(500),
  cnpj_orgao: z.string().trim().max(30).optional(),
  data_inicial: z.string().trim().max(20).optional(),
  data_final: z.string().trim().max(20).optional(),
  modalidade_id: z.number().int().min(1).max(100).optional(),
  pagina: z.number().int().min(1).max(1000).optional().default(1),
});

export const QueridoDiarioSchema = z.object({
  query: z.string().max(500),
  territory_id: z
    .string()
    .trim()
    .regex(/^\d{1,10}$/, "Expected numeric IBGE territory_id")
    .optional(),
  since: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  until: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  page: z.number().int().min(0).max(1000).optional().default(0),
  size: z.number().int().min(1).max(100).optional().default(10),
});

export const DatajudSchema = z.object({
  query: z.string().trim().min(1, "query is required").max(500),
  tribunal: z
    .string()
    .trim()
    .transform((s) => s.toLowerCase())
    .refine((s) => DATAJUD_TRIBUNALS.has(s), {
      message: "Unsupported tribunal code",
    })
    .optional()
    .default("tjsp"),
  tamanho: z.number().int().min(1).max(100).optional().default(10),
});

export const OabSchema = z
  .object({
    nome: z.string().trim().min(1).max(200).optional(),
    inscricao: z.string().trim().min(1).max(30).optional(),
    uf: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Expected 2-letter UF")
      .optional(),
  })
  .refine((v) => Boolean(v.nome || v.inscricao), {
    message: "Provide at least nome or inscricao",
  });

export const BnmpSchema = z.object({
  nome: z.string().trim().min(2).max(200),
  orgaoJulgador: z.string().trim().min(1).max(200).optional(),
});

export const ProcuradosSchema = z.object({
  nome: z.string().trim().min(2).max(200),
});

export const ListaSujaSchema = z.object({
  query: z.string().trim().min(1, "query is required").max(200),
});

export const BacenSchema = z.object({
  indicador: z.enum(["selic", "ipca", "dolar", "euro", "cdi"]),
  ultimos: z.number().int().min(1).max(1000).optional().default(10),
  periodo_dias: z.union([z.literal(30), z.literal(90), z.literal(365)]).optional(),
});

export const FipeSchema = z
  .object({
    codigo_fipe: z
      .string({
        error: "Invalid codigo_fipe format (expected e.g. '001004-9').",
      })
      .trim()
      .regex(/^[0-9]+(?:-[0-9]+)?$/, "Invalid codigo_fipe format (expected e.g. '001004-9').")
      .optional(),
    tipo: z
      .enum(["carros", "motos", "caminhoes"], {
        error: "Invalid FIPE vehicle type. Valid: carros, motos, caminhoes.",
      })
      .optional(),
  })
  .refine((v) => v.codigo_fipe !== undefined || v.tipo !== undefined, {
    message: "Provide either codigo_fipe or tipo (carros/motos/caminhoes).",
  });

export const CnesSchema = z.object({
  tipo: z.enum(["estabelecimento", "profissional"]),
  codigo_cnes: z.string().trim().max(30).optional(),
  nome: z.string().trim().max(200).optional(),
  uf: z.string().trim().max(10).optional(),
  municipio: z.string().trim().max(10).optional(),
});

export const StrategicOsintPromptSchema = z.object({
  template: z.enum([
    "due_diligence",
    "competitor_analysis",
    "fraud_detection",
    "esg_compliance",
    "investment_screening",
  ]),
  company_name: z.string().trim().max(200).optional(),
  cnpj: z.string().trim().max(30).optional(),
  context: z.string().trim().max(2000).optional(),
});

export const TOOL_SCHEMAS: Record<string, ZodType> = {
  cnpj_lookup: CnpjLookupSchema,
  cep_lookup: CepLookupSchema,
  cnpj_search: CnpjSearchSchema,
  cnpj_intelligence: CnpjIntelligenceSchema,
  sequentialthinking: SequentialThinkingSchema,
  cpf_validate: CpfValidateSchema,
  domain_whois: DomainWhoisSchema,
  consumidor_reclamacoes: ConsumidorSchema,
  company_deep_profile: DeepProfileSchema,
  ibge_localidades: IbgeSchema,
  transparencia_lookup: TransparenciaSchema,
  ceis_cnep_lookup: CeisCnepSchema,
  pncp_licitacoes: PncpSchema,
  querido_diario: QueridoDiarioSchema,
  datajud_processos: DatajudSchema,
  oab_advogado: OabSchema,
  bnmp_mandados: BnmpSchema,
  procurados_lookup: ProcuradosSchema,
  lista_suja_lookup: ListaSujaSchema,
  bacen_taxas: BacenSchema,
  fipe_veiculos: FipeSchema,
  cnes_saude: CnesSchema,
  strategic_osint_prompt: StrategicOsintPromptSchema,
  tcu_certidoes: TcuCertidoesSchema,
  cnae_ncm_lookup: CnaeNcmSchema,
  sistema_financeiro_lookup: SistemaFinanceiroSchema,
  feriados_ddd_lookup: FeriadosDddSchema,
  bcb_olinda: BcbOlindaSchema,
  ibge_indicadores: IbgeIndicadoresSchema,
};
