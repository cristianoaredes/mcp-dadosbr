# Operação local

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

Execute `npm ci`, `npm run build` (inclui `npm run build:apps`), `npm test`, `npm run test:transport` e `npm run build:worker`. O smoke exige handshake, ping, catálogo de 23 ferramentas, os 5 recursos MCP Apps e 101 chamadas `stdio` sem erro de protocolo. O deploy deve seguir autorização e evidência do ambiente de destino.

## Fontes

- `package.json:L18-L48`
- `test/integration/transports.mjs:L44-L99`

## Runner próprio

Use o supervisor efêmero Docker (`infra/runner/README.md`) em VPS Linux isolada:

- **Ativação / atualização de credencial:** grave o Fine-Grained PAT escopado apenas a `cristianoaredes/mcp-dadosbr` (`Actions: Read-only`, `Administration: Read and write`, `Metadata: Read-only`) em `/etc/dadosbr-runner/env` (`0600 root:root`) diretamente na VPS e execute `systemctl restart dadosbr-runner-supervisor.service`. Rotacione o PAT antes da expiração (recomendado: 90 dias).
- **Diagnóstico:** `systemctl status dadosbr-runner-supervisor.service`, `journalctl -u dadosbr-runner-supervisor.service -n 100 --no-pager` e `/opt/dadosbr-runner/setup-network-isolation.sh --status`.
- **Rollback / desativação:** `systemctl disable --now dadosbr-runner-supervisor.service && /opt/dadosbr-runner/setup-network-isolation.sh --teardown`.
- **Escopo automático:** `dadosbr-pr-<run_id>` (PR interno), `dadosbr-ci-<run_id>` (`main`) e `dadosbr-release-<run_id>` (`release.yml` em `main`). `cloudflare-deploy.yml` (`dadosbr-ubuntu-24.04`) permanece fora do supervisor automático. Mantenha configuração e tokens fora do repositório.

Após integrar, acompanhe o CI de push em `main` ou dispare o CI manualmente com `publish_dev` desmarcado. Registre URL, SHA, runner atribuído e conclusão.

Para publicar, dispare o workflow `Publish npm release` em `main` com o ID do CI verde para o SHA da versão. O secret de Actions `NPM_TOKEN` deve permitir publicação no pacote. Compare a integridade do tarball com o registro npm e confirme a instalação limpa e os cinco recursos. Associe o GitHub Release ao mesmo SHA. O deploy do Worker tem workflow próprio.
