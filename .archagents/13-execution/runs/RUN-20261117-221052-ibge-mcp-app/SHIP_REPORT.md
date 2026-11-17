# Ship do TCK-0001

- Design: `DES-0001`.
- Run: `RUN-20261117-221052-ibge-mcp-app`.
- Verificação independente: `VER-20261117-222512-tck-0001`, aprovada com notas sobre os hosts exercitados.
- Produto: `4d31292b85b4fdedda9d75deb3a10bdc5719540f`.
- Integração observada: o [PR #13](https://github.com/cristianoaredes/mcp-dadosbr/pull/13), já integrado quando o ship foi retomado, levou o produto a `main` no merge `75e755c`.
- Validação do produto: o [CI na VPS](https://github.com/cristianoaredes/mcp-dadosbr/actions/runs/44188716170) encerrou com sucesso nos três Node da matriz. A conclusão terminal ocorreu depois do merge #13.
- Reconciliação: a entrega recompõe o CI que foi substituído pelo workflow temporário naquele PR e inclui o Run e o Verify nos registros versionados. O PR complementar é verificado na VPS com label por execução.
- Gate local: `verify-run`, checagem de diff e Gitleaks aprovados. A elegibilidade automática tem caráter informativo e não fundamentou o ship.
- Aprendizado: o workflow de validação de uma branch auxiliar deve preservar o CI principal. Para um PR público de origem interna, a label por execução isola os checks de um job pendente de deploy.
