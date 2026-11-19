# Domínio e regras

Base revisada: `79aa712` (`v0.5.0`; base inicial: `037dae4c`).

O domínio cobre consultas cadastrais de empresas (CNPJ), endereços (CEP), dados geográficos (IBGE), diários oficiais municipais (Querido Diário), contratações públicas (PNCP), transparência e sanções federais (Portal da Transparência, CEIS/CNEP/CEPIM), séries financeiras (Banco Central SGS) e preços de veículos (FIPE).

- `ibge_localidades`: localidades por UF (`municipios_por_uf`) exige sigla `uf`.
- `bacen_taxas`: aceita `selic`, `ipca`, `dolar`, `euro` ou `cdi` e janelas explícitas `periodo_dias` em `30`, `90` ou `365` (sobrescrevendo `ultimos`, com data final no dia corrente em `America/Sao_Paulo`).
- `pncp_licitacoes`: o modo de publicações filtradas exige `modalidade_id` positivo, período `data_inicial`/`data_final` válido e `query` vazia (tratando HTTP 204 como página vazia); sem `modalidade_id`, mantém a busca legada por termo.
- `querido_diario`: aceita `territory_id` no padrão de código IBGE e ordena por data decrescente quando `query` é vazia.
- Distingua sempre dado retornado pelo provedor (e sua data de atualização cadastral, quando informada) de horário de consulta no servidor ou provedor indisponível.

## Fontes

- `lib/tools/core.ts:L45-L73`
- `lib/tools/government.ts:L20-L61`
- `lib/tools/government.ts:L225-L339`
- `lib/tools/financial.ts:L13-L64`
- `lib/shared/bacen.ts:L1-L37`
- `lib/shared/pncp.ts:L27-L56`
