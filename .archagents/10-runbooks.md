# Operação local

Base inicial: `037dae4c`.

Execute `npm ci`, `npm run build`, `npm test`, `npm run test:transport` e `npm run build:worker`. O smoke exige handshake, ping e catálogo MCP. O deploy deve seguir autorização e evidência do ambiente de destino.

## Fontes no snapshot inicial

- `package.json:L17-L48`
- `test/integration/transports.mjs:L47-L62`
