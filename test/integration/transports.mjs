import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const cli = fileURLToPath(new URL("../../build/lib/adapters/cli.js", import.meta.url));
const env = { NODE_ENV: "production", MCP_TRANSPORT: "stdio" };
const timeout = 5_000;

// Keep this public catalogue explicit so a tool missing from both transports fails CI.
const expectedTools = [
  "bacen_taxas",
  "bnmp_mandados",
  "ceis_cnep_lookup",
  "cep_lookup",
  "cnes_saude",
  "cnpj_intelligence",
  "cnpj_lookup",
  "cnpj_search",
  "company_deep_profile",
  "consumidor_reclamacoes",
  "cpf_validate",
  "datajud_processos",
  "domain_whois",
  "fipe_veiculos",
  "ibge_localidades",
  "lista_suja_lookup",
  "oab_advogado",
  "pncp_licitacoes",
  "procurados_lookup",
  "querido_diario",
  "sequentialthinking",
  "strategic_osint_prompt",
  "transparencia_lookup",
];

async function listTools(transport, label) {
  const client = new Client({ name: "dadosbr-ci", version: "1.0.0" });
  try {
    await client.connect(transport, { timeout });
    const server = client.getServerVersion();
    assert.equal(server?.name, "mcp-dadosbr");
    assert.ok(server.version, "Server version is required");
    await client.ping({ timeout });

    const { tools } = await client.listTools({}, { timeout });
    const names = tools.map(({ name }) => name).sort();
    assert.deepEqual(names, expectedTools, `Unexpected MCP catalogue on ${label}`);
    console.log(`PASS ${label}: initialize, ping, tools/list (${names.length} tools)`);
    const mimeType = "text/html;profile=mcp-app";
    const apps = [
      ["ibge_localidades", "ui://dadosbr/ibge-localidades.html", "Localidades do Brasil"],
      ["querido_diario", "ui://dadosbr/querido-diario.html", "Querido Diário"],
    ];
    assert.equal(tools.filter((tool) => tool._meta?.ui).length, apps.length);
    const { resources } = await client.listResources({}, { timeout });
    for (const [tool, uri, title] of apps) {
      assert.equal(tools.find(({ name }) => name === tool)?._meta?.ui?.resourceUri, uri);
      assert.equal(resources.find((resource) => resource.uri === uri)?.mimeType, mimeType);
      const { contents } = await client.readResource({ uri }, { timeout });
      assert.equal(contents[0]?.mimeType, mimeType);
      assert.match(contents[0]?.text ?? "", /<!doctype html>/i);
      assert.ok(contents[0]?.text.includes(`<title>${title}</title>`));
      assert.match(contents[0]?.text ?? "", /<script>[\s\S]+<\/script>/);
    }
    await assert.rejects(client.readResource({ uri: "ui://dadosbr/unknown" }, { timeout }), /Unknown resource URI/);
    console.log(`PASS ${label}: bundled IBGE and Querido Diário MCP Apps discovery and resources/read`);

  } finally {
    await client.close();
  }
}

async function availablePort() {
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((resolve, reject) =>
    socket.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function listHttpTools() {
  const port = await availablePort();
  const server = spawn(process.execPath, [cli], {
    env: { ...env, MCP_TRANSPORT: "http", MCP_HTTP_PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"],
  });
  const exited = once(server, "close");
  // Keep cleanup bounded even if the server never starts or the stream gets stuck.
  const watchdog = setTimeout(() => server.kill("SIGKILL"), 15_000);
  const lines = createInterface({ input: server.stderr });

  try {
    for await (const line of lines) {
      if (line.includes(`started on HTTP+SSE transport (port ${port})`)) {
        await listTools(
          new SSEClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)),
          "HTTP/SSE",
        );
        return;
      }
    }
    throw new Error("CLI exited before announcing the HTTP/SSE endpoint");
  } finally {
    lines.close();
    server.kill();
    try {
      await exited;
    } finally {
      clearTimeout(watchdog);
    }
  }
}

await listTools(
  new StdioClientTransport({ command: process.execPath, args: [cli], env }),
  "stdio",
);
await listHttpTools();
console.log("PASS: both transports expose the expected catalogue");
