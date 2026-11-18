# Operação local

Base inicial: `037dae4c`.

Execute `npm ci`, `npm run build`, `npm test`, `npm run test:transport` e `npm run build:worker`. O smoke exige handshake, ping e catálogo MCP. O deploy deve seguir autorização e evidência do ambiente de destino.

## Fontes no snapshot inicial

- `package.json:L17-L48`
- `test/integration/transports.mjs:L47-L62`

## Runner próprio

Use runner Linux x64 dedicado ao DadosBR, em ambiente isolado da VPS. Confira repositório, evento, workflow, SHA e rótulo na API antes de iniciar cada instância. Os rótulos são `dadosbr-pr-<run_id>` para PR, `dadosbr-ci-<run_id>` para CI de main e `dadosbr-release-<run_id>` para release npm. Cada job usa uma instância efêmera. Mantenha configuração e tokens de registro fora do repositório.

Após integrar, acompanhe o CI de push em `main` ou dispare o CI manualmente com `publish_dev` desmarcado. Registre URL, SHA, runner atribuído e conclusão.

Para publicar, dispare o workflow `Publish npm release` em `main` com o ID do CI verde para o SHA da versão. O secret de Actions `NPM_TOKEN` deve permitir publicação no pacote. Compare a integridade do tarball com o registro npm e confirme a instalação limpa e os cinco recursos. Associe o GitHub Release ao mesmo SHA. O deploy do Worker tem workflow próprio.
