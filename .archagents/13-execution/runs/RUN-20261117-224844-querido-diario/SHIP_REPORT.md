# Ship do TCK-0002

- Run: `RUN-20261117-224844-querido-diario`.
- Verify independente: `VER-20261117-225824-tck-0002`, aprovado com notas.
- Gate local: 2/2 critérios, build dos dois entrypoints, navegador, protocolo, manifesto npm e Gitleaks. O dry-run de autoaprovação retornou não elegível e tem caráter informativo.
- Gate remoto: o merge está condicionado ao sucesso do CI do PR na VPS. Os resultados e o merge ficam registrados nos checks e no histórico do PR.
- Limite observado: o caminho de sucesso usa fixture do contrato público. A consulta real ao provedor mostrou o estado de indisponibilidade em vez de simular resultados. O Cloudflare Worker oferece fallback textual.
- Aprendizado: a busca em MCP Apps precisa funcionar no iframe sem permissão de formulário nativo. A asserção de empacotamento deve cobrir os dois recursos.
