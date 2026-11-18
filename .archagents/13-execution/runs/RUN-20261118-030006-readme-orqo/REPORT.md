---
run_id: RUN-20261118-030006-readme-orqo
ticket: TCK-0006
design: DES-0006
operator: codex
status: completed
start_time: "2026-11-18T03:00:06Z"
end_time: 2026-11-18T03:06:16+00:00
environment: dev
mode: live
commits:
  - sha: 87a3073f7f865b6b6f592976337fb64370491119
    message: "[TCK-0006] Rewrite public README for Orqo launch"
    files: [README.md]
  - sha: 2a46048341f95de8a1b9a3d9f98ce11ec08dfd50
    message: "[TCK-0006] Clarify source setup and compatible CNPJ providers"
    files: [README.md]
files_modified: [README.md]
test_result:
  status: pass
  summary: "Configuração, referências, 286 testes, dois transportes, Worker e pacote local"
---
# TCK-0006 — README para divulgação com a Orqo

| Check | Resultado |
| --- | --- |
| README | JSON de configuração válido, entrada Node existe, referências locais resolvidas e cinco fontes na tabela. |
| Testes | 286 testes aprovados em 17 arquivos. |
| Build e transporte | 23 ferramentas e cinco recursos HTML em stdio e HTTP/SSE. |
| Worker | Build TypeScript aprovado. |
| Pacote | O dry run local lista cinco HTML. O tarball npm 0.4.1 de latest não contém esses arquivos. |
| Querido Diário | Exemplo documentado de Batalha com o termo orçamento retornou 29 correspondências em consulta direta à API usada pelo MCP. |
| Git | `git diff --check` aprovado. |

O HEAD local parte do merge a856173 em main. O CI do PR #18 passou. O CI e o deploy pós-merge estavam em fila na leitura do GitHub Actions. O README foi preparado no checkout local.

O parecer independente levou à correção dos links de instalação e do exemplo de provedor. O CLI iniciou via stdio com o endpoint CNPJ.ws documentado. O problema de stdout acima de 100 chamadas foi aberto como TCK-0007.
