# Contratos de dados

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

As ferramentas são descritas com nome, descrição e `inputSchema`. O handler do CLI devolve o objeto serializado em `content[0].text` ou um erro MCP com `isError: true`. `LookupResult` pode carregar `source: { url, fetchedAt }` com a proveniência da consulta bem-sucedida.

## Respostas estruturadas com MCP Apps

Todas as ferramentas preservam o JSON no conteúdo textual. Quando o cliente negocia a extensão `io.modelcontextprotocol/ui` com MIME `text/html;profile=mcp-app`, o servidor Node (`lib/core/mcp-server.ts`) inclui `structuredContent`:

- `ibge_localidades`: `{ items, source }` com o array de localidades e URL/horário da API do IBGE.
- `querido_diario`, `bacen_taxas` e `pncp_licitacoes`: `{ ...result.data, provenance: result.source }`, preservando o objeto retornado e acrescentando a proveniência da consulta.
- `cnpj_lookup`: `{ profile }` projetado por `readCnpjProfile` (`lib/shared/cnpj-profile.ts`), com `cnpj`, `name`, `tradeName`, `status`, `statusDate`, CNAEs `primary`/`secondary`, `address`, `provider` (hostname validado), `fetchedAt` (horário da consulta no servidor) e `updatedAt` (atualização informada pelo provedor).

Erros preservam `isError: true` e a resposta textual estruturada.

## Fontes

- `lib/core/registry.ts:L8-L30`
- `lib/core/mcp-server.ts:L90-L160`
- `lib/types/index.ts:L35-L41`
- `lib/tools/government.ts:L31-L59`
- `lib/shared/cnpj-profile.ts:L1-L119`
