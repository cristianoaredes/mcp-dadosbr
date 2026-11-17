# Mapa de módulos

Base inicial: `037dae4c`.

`lib/core` mantém registro, execução e infraestrutura de consultas. `lib/tools` contém os módulos de domínio. `lib/adapters` conecta o CLI e os demais adaptadores. `lib/workers` contém o ponto de entrada e as rotas do Cloudflare Worker.

## Fontes no snapshot inicial

- `lib/tools/index.ts:L1-L19`
- `lib/core/registry.ts:L8-L46`
- `lib/adapters/cli.ts:L1-L18`
- `lib/workers/worker.ts:L63-L92`
