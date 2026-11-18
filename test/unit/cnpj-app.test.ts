import { afterEach, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { createMCPServer } from "../../lib/core/mcp-server.js";
import { readCnpjProfile } from "../../lib/shared/cnpj-profile.js";

const cnpj = "00394460000141";
const defaultUrl = "https://api.opencnpj.org/" + cnpj;
const open = {
  cnpj, razao_social: "Órgão público", situacao_cadastral: "Ativa",
  cnae_principal: "8411600", cnaes_secundarios: ["6499999"],
  cnaes: [{ codigo: "8411600", descricao: "Administração pública", is_principal: true },
    { codigo: "6499999", descricao: "Outra atividade", is_principal: false }],
  tipo_logradouro: "ESPLANADA", logradouro: "ESPLANADA DOS MINISTÉRIOS", numero: "SN",
  municipio: "BRASÍLIA", uf: "DF", cep: "07000000",
  updated_at: "2026-09-01", socios: [{ nome: "Dado de teste fora da ficha" }],
};

async function call(capability: boolean) {
  const server = createMCPServer({ apiConfig: { ...resolveApiConfig(), cnpjBaseUrl: "https://api.opencnpj.org/" } });
  const client = new Client({ name: "cnpj-test", version: "1.0.0" }, {
    capabilities: capability ? { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } } : {},
  });
  const [left, right] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(right);
    await client.connect(left);
    return await client.callTool({ name: "cnpj_lookup", arguments: { cnpj: "00.394.460/0001-41" } });
  } finally {
    await client.close();
    await server.close();
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("serves the same legacy JSON and adds a scoped profile to App clients", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T23:00:00Z"));
  const upstream = vi.fn(async (_url: string) => Response.json(open));
  vi.stubGlobal("fetch", upstream);
  const plain = await call(false);
  const enhanced = await call(true);
  expect(upstream.mock.calls[0][0]).toBe(defaultUrl);
  expect(plain).toEqual({ content: [{ type: "text", text: JSON.stringify({
    ...open, source: defaultUrl, fetchedAt: "2026-11-17T23:00:00.000Z",
  }, null, 2) }] });
  expect(enhanced.content).toEqual(plain.content);
  expect(enhanced.structuredContent?.profile).toEqual(expect.objectContaining({
    cnpj, status: "Ativa", provider: "api.opencnpj.org",
    fetchedAt: "2026-11-17T23:00:00.000Z", updatedAt: "2026-09-01",
    primary: { code: "8411600", description: "Administração pública" },
    secondary: [{ code: "6499999", description: "Outra atividade" }],
    address: ["ESPLANADA DOS MINISTÉRIOS, SN", "BRASÍLIA · DF", "CEP 07000-000"],
  }));
  expect(JSON.stringify(enhanced.structuredContent)).not.toContain("socios");
});

it("preserves the protocol error when the CNPJ is missing upstream", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
  const result = await call(true);
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toBeUndefined();
});

it("handles a flat BrasilAPI / Minha Receita response and coded status", () => {
  expect(readCnpjProfile({
    cnpj, situacao_cadastral: 8, cnae_fiscal: 8411600, cnae_fiscal_descricao: "Administração",
    cnaes_secundarios: [{ codigo: 6499999, descricao: "Outra" }], descricao_tipo_de_logradouro: "RUA",
    logradouro: "A", cep: 7000000,
  })).toMatchObject({ status: "Baixada", primary: { code: "8411600", description: "Administração" },
    secondary: [{ code: "6499999", description: "Outra" }], address: ["RUA A", "CEP 07000-000"] });
});

it("uses the CNPJ.ws establishment data and timestamp per address", () => {
  expect(readCnpjProfile({
    razao_social: "Órgão público", atualizado_em: "2026-10-01",
    estabelecimento: { cnpj, situacao_cadastral: "Ativa", atualizado_em: "2026-10-20",
      atividade_principal: { id: "8411600", descricao: "Administração" },
      cidade: { nome: "Brasília" }, estado: { sigla: "DF" } },
  })).toMatchObject({ name: "Órgão público", updatedAt: "2026-10-20", address: ["Brasília · DF"], status: "Ativa" });
});

it("distinguishes API status from company status and skips placeholder activities", () => {
  expect(readCnpjProfile({ cnpj, status: "OK", situacao: "SUSPENSA", nome: "Empresa",
    atividade_principal: [{ code: "84.11-6-00", text: "Administração" }],
    atividades_secundarias: [{ code: "00.00-0-00", text: "Não informada" }],
    source: "https://receitaws.com.br/v1/cnpj/" + cnpj + "?private=secret",
  })).toMatchObject({ status: "SUSPENSA", provider: "receitaws.com.br", secondary: [],
    primary: { code: "8411600", description: "Administração" } });
  expect(readCnpjProfile({ cnpj, status: "ERROR" })).toBeUndefined();
  expect(readCnpjProfile({ cnpj })?.status).toBeUndefined();
});
