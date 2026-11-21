# Domínio e regras

Base revisada: `133dbd5` (`0.7.0`, `SPC-0001`; base inicial: `037dae4c`).

O domínio cobre consultas cadastrais de empresas (CNPJ), endereços (CEP), classificações econômicas e fiscais (CNAE IBGE `v2` e NCM), calendário/DDDs, dados geográficos e indicadores demográficos/econômicos (IBGE Localidades e Agregados `v3`), diários oficiais municipais (Querido Diário), contratações públicas (PNCP), transparência e integridade/sanções federais (Portal da Transparência, CEIS/CNEP/CEPIM, Certidões Consolidadas TCU, Lista Suja MTE via CSV aberto), séries financeiras e sistema financeiro (Banco Central SGS, Olinda PTAX/Focus, bancos/Pix/corretoras CVM) e preços de veículos (FIPE).

- `ibge_localidades`: localidades por UF (`municipios_por_uf`) exige sigla `uf`.
- `ibge_indicadores`: `codigo_ibge` estrito de 2 dígitos (`N3` UF) ou 7 dígitos (`N6` município) para População (`6579/9324`) e/ou PIB (`5938/37`), com cálculo explícito de PIB per capita indicando os anos das séries.
- `bacen_taxas`: aceita `selic`, `ipca`, `dolar`, `euro` ou `cdi` e janelas explícitas `periodo_dias` em `30`, `90` ou `365` (sobrescrevendo `ultimos`, com data final no dia corrente em `America/Sao_Paulo`).
- `bcb_olinda`: `ptax` resolve dia útil mais recente em janela de 7 dias corridos com flag `exact_date_match`, e `focus` aceita enums estritos de indicadores macroeconômicos.
- `pncp_licitacoes`: o modo de publicações filtradas exige `modalidade_id` positivo, período `data_inicial`/`data_final` válido e `query` vazia (tratando HTTP 204 como página vazia); sem `modalidade_id`, mantém a busca legada por termo.
- `querido_diario`: aceita `territory_id` no padrão de código IBGE e ordena por data decrescente quando `query` é vazia.
- `lista_suja_lookup`, `tcu_certidoes` e `consumidor_reclamacoes`: `lista_suja_lookup` consulta e filtra o CSV aberto oficial do MTE com `lgpd_notice`; `tcu_certidoes` consulta Certidões Consolidadas PJ sem API key e integra `company_deep_profile`; `consumidor_reclamacoes` devolve orientação oficial imediata sem tentar contornar proteção anti-bot.
- Distingua sempre dado retornado pelo provedor (e sua data de atualização cadastral, quando informada) de horário de consulta no servidor ou provedor indisponível.

## Fontes

- `lib/tools/core.ts:L45-L73`
- `lib/tools/government.ts:L20-L61`
- `lib/tools/government.ts:L225-L339`
- `lib/tools/financial.ts:L13-L64`
- `lib/tools/tcu.ts:L1-L186`
- `lib/tools/fiscal-banking.ts:L1-L915`
- `lib/tools/olinda.ts:L1-L456`
- `lib/tools/ibge-indicadores.ts:L1-L520`
- `lib/shared/mte-lista-suja.ts:L1-L301`
- `lib/shared/bacen.ts:L1-L37`
- `lib/shared/pncp.ts:L27-L56`
