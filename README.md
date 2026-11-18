# MCP DadosBR

**Consulte dados públicos brasileiros na conversa com seu assistente de IA.**

Explore municípios, leia publicações oficiais, acompanhe indicadores econômicos e consulte editais e fichas cadastrais. O MCP DadosBR conecta seu cliente MCP às APIs de dados e oferece painéis interativos na conversa quando o cliente suporta MCP Apps.

Projeto open source desenvolvido com governança do [Codebase OPS by Orqo](https://orqo.pro/). [English overview](#english)

## O que você pode explorar

| MCP App | O que você pode fazer | Fonte dos dados |
| --- | --- | --- |
| **Localidades do IBGE** · `ibge_localidades` | Navegar por região e UF, buscar municípios por nome ou código e seguir para as publicações do município selecionado. | [API de Localidades do IBGE](https://servicodados.ibge.gov.br/api/v1/localidades/estados) |
| **Diários municipais** · `querido_diario` | Buscar publicações por termo e período e abrir a edição original. A cobertura varia por município. | [API pública do Querido Diário](https://docs.queridodiario.ok.org.br/pt-br/latest/utilizando/api-publica.html) |
| **Indicadores do Banco Central** · `bacen_taxas` | Consultar gráficos e tabelas de Selic, IPCA, CDI, dólar e euro em janelas de 30, 90 ou 365 dias. | [Sistema Gerenciador de Séries Temporais (SGS)](https://www3.bcb.gov.br/sgspub/) |
| **Editais do PNCP** · `pncp_licitacoes` | Filtrar publicações por período, modalidade e CNPJ do órgão e abrir o edital no portal oficial. | [API de consultas do PNCP](https://pncp.gov.br/api/consulta/swagger-ui/index.html) |
| **Ficha por CNPJ** · `cnpj_lookup` | Consultar razão social, situação cadastral, atividades econômicas (CNAEs), endereço e provedor. A data de atualização aparece quando o provedor a informa. | [OpenCNPJ](https://opencnpj.org/) por padrão ou outro [provedor compatível](lib/config/index.ts#L17) |

Os cinco painéis fazem parte da versão atual do código-fonte e usam a extensão [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview). O servidor Node.js entrega os painéis via stdio e HTTP/SSE e também retorna os dados em JSON textual. O adaptador Cloudflare Worker oferece o retorno textual.

## Experimente em uma conversa

- **Descubra publicações municipais.** Peça “Abra o Explorador do IBGE para Alagoas”. Selecione Batalha, clique em **Ver publicações** e busque por “orçamento”.
- **Consulte uma ficha cadastral.** Peça “Abra a ficha do CNPJ 00.394.460/0001-41 e mostre a situação cadastral, as atividades e o provedor que respondeu”.
- **Confira uma série econômica.** Peça “Abra o painel do Banco Central e mostre a Selic dos últimos 90 dias com a fonte da série”.
- **Encontre um edital.** Peça “Abra o painel do PNCP e filtre os editais de pregão eletrônico publicados nos últimos 30 dias”.

## Instalação

Para testar os cinco painéis, use o código-fonte com Node.js **22.12 ou posterior na linha 22**, **24** ou **26**. Use um cliente com suporte a MCP Apps para interagir com os painéis. As cinco consultas funcionam sem credenciais na configuração padrão.

```bash
git clone https://github.com/cristianoaredes/mcp-dadosbr.git
cd mcp-dadosbr
npm ci
npm run build
```

Em clientes que usam a configuração `mcpServers`, adicione o servidor e substitua o caminho pelo caminho absoluto da sua cópia:

```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "node",
      "args": ["/caminho/absoluto/mcp-dadosbr/build/lib/adapters/cli.js"]
    }
  }
}
```

Reinicie o cliente e faça uma das consultas acima. Se o seu cliente usa outro formato de configuração, cadastre um servidor local stdio com o mesmo comando e caminho.

O [pacote publicado no npm](https://www.npmjs.com/package/@aredes.me/mcp-dadosbr) está na versão `0.4.1` e é anterior aos cinco painéis. Para usar essa versão em um cliente com stdio, configure `"command": "npx"` e `"args": ["-y", "@aredes.me/mcp-dadosbr@0.4.1"]`.

## Outras ferramentas e configuração

O servidor reúne 23 ferramentas. Além dos cinco painéis, o catálogo inclui consultas de CEP, transparência federal, sanções, dados judiciais, estabelecimentos de saúde, tabela FIPE, validação de CPF e pesquisa na web. Veja o [registro de ferramentas](lib/tools/index.ts), a [documentação](docs/README.md) e os [exemplos de uso](docs/USAGE_EXAMPLES.md).

| Variável opcional | Uso |
| --- | --- |
| `TRANSPARENCIA_API_KEY` | Consultas ao Portal da Transparência e a CEIS/CNEP. |
| `DATAJUD_API_KEY` | Consultas de processos no DataJud. |
| `TAVILY_API_KEY` ou `PERPLEXITY_API_KEY` | Busca web em `cnpj_search` e `cnpj_intelligence`. |
| `MCP_TRANSPORT` | `stdio` (padrão) ou `http` para HTTP/SSE. |
| `MCP_HTTP_PORT` | Porta do transporte HTTP. O padrão é `3000`. |

Para definir um provedor de CNPJ, informe uma URL HTTPS de um [host compatível](lib/config/index.ts#L17) na variável `CNPJ_API_BASE_URL`. Por exemplo, para o CNPJ.ws, use `https://publica.cnpj.ws/cnpj/`.

## Como o projeto foi desenvolvido

O DadosBR já existia quando adotou o Codebase OPS. O [PR do bootstrap](https://github.com/cristianoaredes/mcp-dadosbr/pull/12) registra a estrutura inicial de governança e a configuração do CI. Os [artefatos em `.archagents/`](.archagents/README.md) ligam os pedidos a decisões, execuções e verificações.

A [entrega da ficha por CNPJ](https://github.com/cristianoaredes/mcp-dadosbr/pull/18) mostra o ciclo em um caso concreto, do ticket e do design até o parecer independente e os checks do GitHub Actions. [Conheça o Codebase OPS by Orqo](https://orqo.pro/).

## Contribua

Depois de instalar e compilar o projeto, rode:

```bash
npm test
npm run test:transport
npm run build:worker
```

Leia o [guia de contribuição](CONTRIBUTING.md) ou abra uma [issue](https://github.com/cristianoaredes/mcp-dadosbr/issues/new). Código sob [licença MIT](LICENSE). Projeto iniciado por [Cristiano Arêdes](https://github.com/cristianoaredes).

## English

**MCP DadosBR brings Brazilian public data into AI conversations.** Its five interactive MCP Apps cover IBGE locations, municipal gazettes, Central Bank indicators, public procurement notices and company registration profiles. All five apps are available when you build from source and connect to an MCP Apps host. The Node.js server also returns text results over stdio or HTTP/SSE. The Cloudflare Worker adapter serves text results.

Follow the [source setup](#instalação) to configure your client. Development is governed with [Codebase OPS by Orqo](https://orqo.pro/).
