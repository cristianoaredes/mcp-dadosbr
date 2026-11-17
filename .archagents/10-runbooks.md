# Operação local

Base inicial: `037dae4c`.

Execute `npm ci`, `npm run build`, `npm test`, `npm run test:transport` e `npm run build:worker`. O smoke exige handshake, ping e catálogo MCP. O deploy deve seguir autorização e evidência do ambiente de destino.

## Fontes no snapshot inicial

- `package.json:L17-L48`
- `test/integration/transports.mjs:L47-L62`

## Runner próprio

Use runner Linux x64 dedicado ao DadosBR, com rótulo adicional `dadosbr-ubuntu-24.04`, em ambiente isolado da VPS. Cada job que usar um runner efêmero consome uma instância. Provisione capacidade para a matriz e os jobs dependentes, inclusive resumos. Mantenha a configuração e tokens de registro fora do repositório.

Após integrar os workflows e ativar o Actions, dispare o CI manualmente para `main` e registre URL, SHA, runner atribuído e conclusão. O disparo manual do CI deixa a etapa de publicação no npm inelegível. Valide publicação e deploy em seus fluxos próprios.
