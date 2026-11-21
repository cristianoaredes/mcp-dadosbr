# Operação local

Base revisada: `786d7ed` (`0.6.0`, worktree `audit-remediation`; base inicial: `037dae4c`).

Execute `npm ci`, `npm run build` (inclui `npm run build:apps`), `npm test`, `npm run test:transport` e `npm run build:worker`. O smoke exige handshake, ping, catálogo de 23 ferramentas, os 5 recursos MCP Apps e 101 chamadas `stdio` sem erro de protocolo. O deploy deve seguir autorização e evidência do ambiente de destino.

## Fontes

- `package.json:L18-L48`
- `test/integration/transports.mjs:L44-L99`
- `lib/infrastructure/logger.ts:L1-L122`
- `lib/infrastructure/tracing.ts:L1-L150`
- `lib/core/tools.ts:L1-L203`
- `lib/adapters/cloudflare.ts:L165-L248`
- `lib/workers/auth.ts:L47-L107`

## Observabilidade, Logs Estruturados, Métricas RED e Health Check (`TCK-0025` / `FND-0013`)

- **Logs JSON em `stderr` (`lib/infrastructure/logger.ts`)**: todos os níveis (`debug`, `info`, `warn`, `error`) escrevem exclusivamente em `console.error` para preservar `stdout` limpo para JSON-RPC no transporte `stdio`. Configure `LOG_LEVEL=debug|info|warn|error` (padrão `INFO`; `DEBUG` apenas quando `NODE_ENV=development` sem `LOG_LEVEL`).
- **Correlação Web Crypto (`lib/infrastructure/tracing.ts`, `cli-http.ts`, `worker.ts`)**: requisições HTTP/SSE/Worker propagam ou geram `X-Request-Id` (`req_<uuid>`) via `globalThis.crypto.randomUUID()` / `getRandomValues()` e rejeitam cabeçalhos malformados/CRLF (`extractRequestId`).
- **Métricas RED e `cacheHits` (`lib/core/tools.ts`, `mcp-server.ts`)**: `executeTool` rastreia `requests`, `errors`, `cacheHits` reais e `totalTimeMs`/`avgTimeMs`/`maxTimeMs` por ferramenta (`getToolMetrics()`), mantendo `[metrics] ...` a cada 100 requisições sem zerar contadores globais entre sessões SSE (`createMCPServer()`).
- **Audit Log 401 & Health KV (`lib/workers/auth.ts`, `lib/adapters/cloudflare.ts`)**: falhas 401 no Worker registram JSON estruturado `auth.unauthorized` (`reason`, `method`, `path`, `requestId`) sem vazar API key ou query string. `/health` executa sonda KV com timeout limitado (`1000ms`), retornando `200` (`healthy`, `kv.status: "ok" | "unconfigured"`) ou `503` (`degraded`, `kv.status: "degraded"`). Diagnóstico e comportamento real no edge Workers via `wrangler tail` permanecem *a confirmar* em produção.

## Runner próprio

Use o supervisor efêmero Docker (`infra/runner/README.md`) em VPS Linux isolada:

- **Ativação / atualização de credencial:** grave o Fine-Grained PAT escopado apenas a `cristianoaredes/mcp-dadosbr` (`Actions: Read-only`, `Administration: Read and write`, `Metadata: Read-only`) em `/etc/dadosbr-runner/env` (`0600 root:root`) diretamente na VPS e execute `systemctl restart dadosbr-runner-supervisor.service`. Rotacione o PAT antes da expiração (recomendado: 90 dias).
- **Diagnóstico:** `systemctl status dadosbr-runner-supervisor.service`, `journalctl -u dadosbr-runner-supervisor.service -n 100 --no-pager` e `/opt/dadosbr-runner/setup-network-isolation.sh --status`.
- **Rollback / desativação:** `systemctl disable --now dadosbr-runner-supervisor.service && /opt/dadosbr-runner/setup-network-isolation.sh --teardown`.
- **Escopo automático:** `dadosbr-pr-<run_id>` (PR interno), `dadosbr-ci-<run_id>` (`main`) e `dadosbr-release-<run_id>` (`release.yml` em `main`). `cloudflare-deploy.yml` (`dadosbr-ubuntu-24.04`) permanece fora do supervisor automático. Mantenha configuração e tokens fora do repositório.

Após integrar, acompanhe o CI de push em `main` ou dispare o CI manualmente com `publish_dev` desmarcado. Registre URL, SHA, runner atribuído e conclusão.

Para publicar, dispare o workflow `Publish npm release` em `main` com o ID do CI verde para o SHA da versão. O secret de Actions `NPM_TOKEN` deve permitir publicação no pacote. Compare a integridade do tarball com o registro npm e confirme a instalação limpa e os cinco recursos. Associe o GitHub Release ao mesmo SHA. O deploy do Worker tem workflow próprio.

## Resposta a Incidentes de Segurança e Notificação à ANPD (LGPD Art. 48)

Este runbook define o fluxo operacional para incidentes de segurança envolvendo dados pessoais ou credenciais tratados por instâncias do **MCP DadosBR** (CLI local/HTTP ou Cloudflare Worker), em conformidade com a **LGPD Art. 48** e a **Resolução CD/ANPD nº 15/2024**.

### 1. Triagem (T0 — até 2 horas da detecção)

- **Detecção e abertura:** registrar o evento imediatamente (alerta de `auth.unauthorized` em excesso, vazamento de `MCP_API_KEY` ou chaves de APIs upstream, exposição indevida de cache `MCP_CACHE`/`MCP_KV`, falha de SSRF/CORS ou relato recebido pelo canal do Encarregado / DPO configurado em `MCP_DPO_CONTACT` / [Security Advisories](https://github.com/cristianoaredes/mcp-dadosbr/security/advisories/new)).
- **Classificação inicial:** identificar horário UTC da detecção e do evento, componente afetado (`worker.ts`, `cli-http.ts`, KV, logs, CI/CD), escopo de endpoints/tools e presença de dados pessoais (CPFs/CNPJs com sócios, nomes consultados em `procurados_lookup`/`bnmp_mandados`/`datajud_processos`/`ceis_cnep_lookup`, IPs ou tokens).
- **Acionamento:** notificar o responsável técnico da instância e o Encarregado pelo Tratamento de Dados Pessoais (DPO — LGPD Art. 41).

### 2. Contenção imediata

- **Revogação de credenciais:** rotacionar imediatamente `MCP_API_KEY` e quaisquer chaves afetadas (`TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `TRANSPARENCIA_API_KEY`, `DATAJUD_API_KEY`) via `wrangler secret put` ou variáveis do host.
- **Isolamento de tráfego e cache:** caso haja exposição de cache com dados pessoais ou resposta corrompida, purgar/invalidar as chaves afetadas em `MCP_CACHE`/`MCP_KV` (ou desabilitar temporariamente o binding KV/rota afetada) e restringir `MCP_ALLOWED_ORIGINS` / firewall.
- **Preservação antes de destruir:** antes de reiniciar containers ou apagar bindings, coletar os artefatos de diagnóstico necessários para perícia (sem sobrescrever logs).

### 3. Preservação de evidências

- Capturar logs estruturados (`stderr`, Cloudflare `wrangler tail` / Workers Logs) preservando `X-Request-Id`, timestamps UTC, status HTTP e origem do incidente, mantendo redação de segredos e minimização de PII nos registros de investigação.
- Registrar o SHA exato em produção (`git rev-parse HEAD`), versão publicada, configuração não-secreta de `wrangler.toml`/ambiente e lista de chaves KV afetadas (por prefixo/metadata, sem copiar cargas sensíveis para locais não autorizados).
- Armazenar evidências de incidente em canal restrito e criptografado fora do Git.

### 4. Avaliação de risco e dano aos titulares

Avaliar com o DPO e o responsável jurídico/técnico se o incidente pode acarretar **risco ou dano relevante aos titulares** (LGPD Art. 48 e Resolução CD/ANPD nº 15/2024):

- **Critérios objetivos:** natureza e categoria dos dados (ex.: dados relacionados a mandados/procurados/processos/sanções, CPF/nome, risco de estigmatização ou fraude), volume de titulares e registros afetados, autenticidade/integridade comprometida, facilidade de identificação e ocorrência de exfiltração confirmada ou provável.
- Documentar formalmente a matriz de avaliação (com data/hora da conclusão) mesmo quando o incidente for classificado como sem risco ou dano relevante.

### 5. Notificação à ANPD e comunicação aos titulares (LGPD Art. 48 / Resolução CD/ANPD nº 15/2024)

Quando confirmada (ou não descartada) possibilidade de risco ou dano relevante aos titulares:

- **Prazo regulamentar:** comunicar à **Autoridade Nacional de Proteção de Dados (ANPD)** e aos **titulares afetados** em prazo razoável, observando o prazo de **3 (três) dias úteis** contados do conhecimento do incidente previsto na **Resolução CD/ANPD nº 15/2024** (ou prazo diferenciado aplicável a agentes de pequeno porte, quando cabível, com complementação documentada dentro do prazo regulamentar caso todas as informações ainda estejam em apuração).
- **Conteúdo mínimo da comunicação (LGPD Art. 48, §1º):**
  1. Descrição da natureza dos dados pessoais afetados;
  2. Informações sobre os titulares envolvidos;
  3. Indicação das medidas técnicas e de segurança utilizadas para proteção dos dados;
  4. Riscos relacionados ao incidente;
  5. Motivos da eventual demora, se não houver comunicação imediata;
  6. Medidas adotadas ou planejadas para reverter ou mitigar os efeitos do prejuízo;
  7. Identificação e canal de contato do Encarregado / DPO (`MCP_DPO_CONTACT`).
- **Comunicação aos titulares:** utilizar linguagem clara e direta pelos canais de contato disponíveis (ou divulgação pública transparente quando a comunicação individual não for viável), informando recomendações práticas de mitigação e canal de atendimento do DPO.

### 6. Pós-incidente (Post-mortem e prevenção)

- Conduzir post-mortem sem culpabilização em até 5 dias úteis após a estabilização: linha do tempo, causa raiz, lacunas de detecção/contenção e eficácia da resposta.
- Abrir tickets corretivos no fluxo `codebase-ops` (`/ops-fix` ou `/ops-work`), atualizar testes de regressão, controles em `.archagents/07-security-compliance.md` e lições aprendidas (`ops-learn` / `.archagents/99-memory/`).
- Manter registro interno do incidente e das medidas adotadas pelo prazo mínimo exigido pela regulamentação da ANPD, mesmo nos casos em que não houver obrigação de notificação.

