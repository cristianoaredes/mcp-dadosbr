# Exemplos de Uso - MCP DadosBR

Este documento contém exemplos práticos de uso das ferramentas do MCP DadosBR.

## Sumário

- [Dados Empresariais e Endereços](#dados-empresariais-e-endereços)
- [Validação e Formatação](#validação-e-formatação)
- [Dados Governamentais - BrasilAPI](#dados-governamentais---brasilapi)
- [Dados Econômicos e Comerciais](#dados-econômicos-e-comerciais)
- [Raciocínio Avançado](#raciocínio-avançado)

---

## Dados Empresariais e Endereços

### 1. Consulta de CNPJ

**Ferramenta**: `cnpj_lookup`

Busca informações detalhadas de uma empresa pelo CNPJ.

**Exemplo de Uso**:
```json
{
  "tool": "cnpj_lookup",
  "arguments": {
    "cnpj": "19.131.243/0001-97"
  }
}
```

**Resposta**:
```json
{
  "cnpj": "19131243000197",
  "razao_social": "OPEN KNOWLEDGE BRASIL",
  "nome_fantasia": "REDE PELO CONHECIMENTO LIVRE",
  "situacao_cadastral": 2,
  "descricao_situacao_cadastral": "Ativa",
  "data_situacao_cadastral": "2013-10-03",
  "cnae_fiscal": 9430800,
  "cnae_fiscal_descricao": "Atividades de associações de defesa de direitos sociais",
  "uf": "SP",
  "municipio": "São Paulo",
  "capital_social": 0,
  "porte": 5,
  "descricao_porte": "Demais"
}
```

**Casos de Uso**:
- Validação de fornecedores
- Due diligence empresarial
- Verificação de dados cadastrais
- Integração com sistemas de CRM

---

### 2. Busca Inteligente de CNPJ

**Ferramenta**: `cnpj_search`

Busca empresas por nome ou razão social usando busca fuzzy.

**Exemplo de Uso**:
```json
{
  "tool": "cnpj_search",
  "arguments": {
    "query": "conhecimento livre"
  }
}
```

**Resposta**:
```json
{
  "results": [
    {
      "cnpj": "19131243000197",
      "razao_social": "OPEN KNOWLEDGE BRASIL",
      "nome_fantasia": "REDE PELO CONHECIMENTO LIVRE",
      "score": 0.95
    }
  ]
}
```

**Casos de Uso**:
- Busca de empresas quando não se tem o CNPJ completo
- Localizar filiais de uma empresa
- Pesquisa de mercado
- Análise de concorrência

---

### 3. Análise Inteligente de CNPJ

**Ferramenta**: `cnpj_intelligence`

Análise avançada com insights sobre a empresa.

**Exemplo de Uso**:
```json
{
  "tool": "cnpj_intelligence",
  "arguments": {
    "cnpj": "19.131.243/0001-97"
  }
}
```

**Resposta**:
```json
{
  "company": {
    "cnpj": "19131243000197",
    "razao_social": "OPEN KNOWLEDGE BRASIL",
    "status": "Ativa"
  },
  "insights": {
    "risk_level": "baixo",
    "age_years": 11,
    "sector": "Terceiro Setor",
    "size_category": "Pequeno Porte"
  },
  "analysis": "Empresa do terceiro setor, ativa há 11 anos..."
}
```

**Casos de Uso**:
- Análise de risco de crédito
- Avaliação de parceiros comerciais
- Decisões de investimento
- Compliance e auditoria

---

### 4. Consulta de CEP

**Ferramenta**: `cep_lookup`

Busca informações de endereço pelo CEP usando múltiplos provedores (BrasilAPI e ViaCEP).

**Exemplo de Uso**:
```json
{
  "tool": "cep_lookup",
  "arguments": {
    "cep": "01310-100"
  }
}
```

**Resposta - BrasilAPI**:
```json
{
  "cep": "01310100",
  "state": "SP",
  "city": "São Paulo",
  "neighborhood": "Bela Vista",
  "street": "Avenida Paulista",
  "service": "brasilapi"
}
```

**Resposta - ViaCEP**:
```json
{
  "cep": "01310-100",
  "logradouro": "Avenida Paulista",
  "complemento": "de 612 a 1510 - lado par",
  "bairro": "Bela Vista",
  "localidade": "São Paulo",
  "uf": "SP",
  "ibge": "3550308",
  "gia": "1004",
  "ddd": "11",
  "siafi": "7107"
}
```

**Casos de Uso**:
- Preenchimento automático de formulários
- Validação de endereços
- Cálculo de frete
- Geolocalização

---

## Validação e Formatação

### 5. Validação de CPF

**Ferramenta**: `cpf_validate`

Valida e formata números de CPF.

**Exemplo 1 - CPF Válido**:
```json
{
  "tool": "cpf_validate",
  "arguments": {
    "cpf": "12345678909"
  }
}
```

**Resposta**:
```json
{
  "valid": true,
  "formatted": "123.456.789-09",
  "cleaned": "12345678909"
}
```

**Exemplo 2 - CPF Inválido**:
```json
{
  "tool": "cpf_validate",
  "arguments": {
    "cpf": "12345678900"
  }
}
```

**Resposta**:
```json
{
  "valid": false,
  "error": "Invalid CPF checksum",
  "cleaned": "12345678900"
}
```

**Casos de Uso**:
- Validação de formulários
- Verificação antes de consultas
- Limpeza de bases de dados
- APIs de cadastro

---

### 6. Validação de CNPJ

**Ferramenta**: `cnpj_validate`

Valida e formata números de CNPJ.

**Exemplo 1 - CNPJ Válido**:
```json
{
  "tool": "cnpj_validate",
  "arguments": {
    "cnpj": "19131243000197"
  }
}
```

**Resposta**:
```json
{
  "valid": true,
  "formatted": "19.131.243/0001-97",
  "cleaned": "19131243000197"
}
```

**Exemplo 2 - CNPJ Inválido**:
```json
{
  "tool": "cnpj_validate",
  "arguments": {
    "cnpj": "11.222.333/0001-80"
  }
}
```

**Resposta**:
```json
{
  "valid": false,
  "error": "Invalid CNPJ checksum",
  "cleaned": "11222333000180"
}
```

**Casos de Uso**:
- Validação antes de consultas à Receita Federal
- Limpeza de bases de dados corporativas
- Integração com ERPs
- Compliance fiscal

---

### 7. Validação de CEP

**Ferramenta**: `cep_validate`

Valida e formata CEPs brasileiros.

**Exemplo 1 - CEP Válido**:
```json
{
  "tool": "cep_validate",
  "arguments": {
    "cep": "01310100"
  }
}
```

**Resposta**:
```json
{
  "valid": true,
  "formatted": "01310-100",
  "cleaned": "01310100"
}
```

**Exemplo 2 - CEP Inválido**:
```json
{
  "tool": "cep_validate",
  "arguments": {
    "cep": "123"
  }
}
```

**Resposta**:
```json
{
  "valid": false,
  "error": "CEP must have 8 digits",
  "cleaned": "123"
}
```

**Casos de Uso**:
- Validação de formulários de endereço
- Normalização de dados
- Integração com sistemas de logística
- Validação antes de consultas de CEP

---

## Dados Governamentais - BrasilAPI

### 8. Consulta de Banco

**Ferramenta**: `banco_lookup`

Busca informações sobre bancos brasileiros pelo código.

**Exemplo de Uso**:
```json
{
  "tool": "banco_lookup",
  "arguments": {
    "codigo": "001"
  }
}
```

**Resposta**:
```json
{
  "ispb": "00000000",
  "name": "Banco do Brasil S.A.",
  "code": 1,
  "fullName": "Banco do Brasil S.A."
}
```

**Casos de Uso**:
- Validação de dados bancários
- Preenchimento automático em transferências
- Sistemas financeiros
- Integração com boletos

---

### 9. Listar Todos os Bancos

**Ferramenta**: `bancos_list`

Lista todos os bancos brasileiros cadastrados.

**Exemplo de Uso**:
```json
{
  "tool": "bancos_list",
  "arguments": {}
}
```

**Resposta** (parcial):
```json
[
  {
    "ispb": "00000000",
    "name": "Banco do Brasil S.A.",
    "code": 1,
    "fullName": "Banco do Brasil S.A."
  },
  {
    "ispb": "00000208",
    "name": "Banco BTG Pactual S.A.",
    "code": 208,
    "fullName": "Banco BTG Pactual S.A."
  }
]
```

**Casos de Uso**:
- Criação de dropdowns de seleção
- Cache de informações bancárias
- Validação de códigos bancários
- Dashboards financeiros

---

### 10. Feriados Nacionais

**Ferramenta**: `feriados_nacionais`

Consulta feriados nacionais brasileiros por ano.

**Exemplo de Uso**:
```json
{
  "tool": "feriados_nacionais",
  "arguments": {
    "ano": 2024
  }
}
```

**Resposta**:
```json
[
  {
    "date": "2024-01-01",
    "name": "Confraternização Universal",
    "type": "national"
  },
  {
    "date": "2024-04-21",
    "name": "Tiradentes",
    "type": "national"
  },
  {
    "date": "2024-05-01",
    "name": "Dia do Trabalho",
    "type": "national"
  },
  {
    "date": "2024-09-07",
    "name": "Independência do Brasil",
    "type": "national"
  },
  {
    "date": "2024-12-25",
    "name": "Natal",
    "type": "national"
  }
]
```

**Casos de Uso**:
- Sistemas de agendamento
- Calendários corporativos
- Cálculo de dias úteis
- Planejamento de entregas

---

### 11. Consulta de DDD

**Ferramenta**: `ddd_lookup`

Busca cidades por código DDD.

**Exemplo de Uso**:
```json
{
  "tool": "ddd_lookup",
  "arguments": {
    "ddd": "11"
  }
}
```

**Resposta**:
```json
{
  "state": "SP",
  "cities": [
    "São Paulo",
    "Guarulhos",
    "Osasco",
    "Barueri",
    "Carapicuíba"
  ]
}
```

**Casos de Uso**:
- Validação de números de telefone
- Geolocalização por telefone
- Sistemas de call center
- Análise regional de clientes

---

### 12. Consulta de Estado (IBGE)

**Ferramenta**: `ibge_uf`

Busca informações oficiais sobre estados brasileiros.

**Exemplo de Uso**:
```json
{
  "tool": "ibge_uf",
  "arguments": {
    "uf": "SP"
  }
}
```

**Resposta**:
```json
{
  "id": 35,
  "sigla": "SP",
  "nome": "São Paulo",
  "regiao": {
    "id": 3,
    "sigla": "SE",
    "nome": "Sudeste"
  }
}
```

**Casos de Uso**:
- Normalização de dados geográficos
- Relatórios regionais
- Análise demográfica
- Sistemas de logística

---

### 13. Consulta de Municípios (IBGE)

**Ferramenta**: `ibge_municipios`

Lista todos os municípios de um estado.

**Exemplo de Uso**:
```json
{
  "tool": "ibge_municipios",
  "arguments": {
    "uf": "SP"
  }
}
```

**Resposta** (parcial):
```json
[
  {
    "nome": "São Paulo",
    "codigo_ibge": "3550308"
  },
  {
    "nome": "Guarulhos",
    "codigo_ibge": "3518800"
  },
  {
    "nome": "Campinas",
    "codigo_ibge": "3509502"
  }
]
```

**Casos de Uso**:
- Dropdowns de seleção de cidades
- Análise por município
- Sistemas de entregas regionais
- Dashboards geográficos

---

## Dados Econômicos e Comerciais

### 14. Consulta de ISBN

**Ferramenta**: `isbn_lookup`

Busca informações sobre livros pelo ISBN.

**Exemplo de Uso**:
```json
{
  "tool": "isbn_lookup",
  "arguments": {
    "isbn": "978-85-457-0287-0"
  }
}
```

**Resposta**:
```json
{
  "isbn": "9788545702870",
  "title": "O Senhor dos Anéis",
  "subtitle": "A Sociedade do Anel",
  "authors": ["J.R.R. Tolkien"],
  "publisher": "HarperCollins",
  "synopsis": "O volume inicial da trilogia...",
  "year": 2019,
  "format": "Capa comum",
  "page_count": 576
}
```

**Casos de Uso**:
- E-commerce de livros
- Sistemas de bibliotecas
- Catalogação automatizada
- Gestão de estoque

---

### 15. Consulta de NCM

**Ferramenta**: `ncm_lookup`

Busca informações sobre códigos NCM (Nomenclatura Comum do Mercosul).

**Exemplo de Uso**:
```json
{
  "tool": "ncm_lookup",
  "arguments": {
    "codigo": "01012100"
  }
}
```

**Resposta**:
```json
{
  "codigo": "01012100",
  "descricao": "Cavalos reprodutores de raça pura",
  "data_inicio": "2022-04-01",
  "data_fim": "9999-12-31",
  "tipo_ato": "Resolução Gecex",
  "numero_ato": "272",
  "ano_ato": "2021"
}
```

**Casos de Uso**:
- Classificação fiscal de produtos
- Cálculo de impostos de importação
- Sistemas de comércio exterior
- Emissão de notas fiscais

---

### 16. Marcas FIPE

**Ferramenta**: `fipe_marcas`

Lista marcas de veículos da tabela FIPE.

**Exemplo de Uso**:
```json
{
  "tool": "fipe_marcas",
  "arguments": {
    "tipo": "carros"
  }
}
```

**Resposta** (parcial):
```json
[
  {
    "nome": "Fiat",
    "valor": "21"
  },
  {
    "nome": "Ford",
    "valor": "22"
  },
  {
    "nome": "Chevrolet",
    "valor": "23"
  }
]
```

**Outros tipos suportados**: `motos`, `caminhoes`

**Casos de Uso**:
- Sistemas de venda de veículos
- Calculadoras de financiamento
- Avaliação de veículos usados
- Seguradoras

---

### 17. Preço FIPE

**Ferramenta**: `fipe_preco`

Consulta o preço de um veículo pelo código FIPE.

**Exemplo de Uso**:
```json
{
  "tool": "fipe_preco",
  "arguments": {
    "codigo_fipe": "001004-1"
  }
}
```

**Resposta**:
```json
{
  "valor": "R$ 50.000,00",
  "marca": "Fiat",
  "modelo": "Uno",
  "anoModelo": 2020,
  "combustivel": "Gasolina",
  "codigoFipe": "001004-1",
  "mesReferencia": "dezembro de 2024",
  "tipoVeiculo": 1,
  "siglaCombustivel": "G",
  "dataConsulta": "segunda-feira, 11 de novembro de 2024 00:00"
}
```

**Casos de Uso**:
- Avaliação de veículos
- Financiamento automotivo
- Seguros de veículos
- Comércio de seminovos

---

### 18. Taxas Econômicas

**Ferramenta**: `taxa_lookup`

Consulta taxas econômicas brasileiras (SELIC, CDI, etc).

**Exemplo 1 - Taxa Específica**:
```json
{
  "tool": "taxa_lookup",
  "arguments": {
    "nome": "selic"
  }
}
```

**Resposta**:
```json
{
  "nome": "SELIC",
  "valor": 11.75
}
```

**Exemplo 2 - Todas as Taxas**:
```json
{
  "tool": "taxa_lookup",
  "arguments": {}
}
```

**Resposta**:
```json
[
  {
    "nome": "SELIC",
    "valor": 11.75
  },
  {
    "nome": "CDI",
    "valor": 11.65
  }
]
```

**Casos de Uso**:
- Calculadoras financeiras
- Dashboards econômicos
- Análise de investimentos
- Sistemas bancários

---

## Raciocínio Avançado

### 19. Raciocínio Sequencial

**Ferramenta**: `sequentialthinking`

Permite ao LLM fazer análises complexas passo a passo.

**Exemplo de Uso**:
```json
{
  "tool": "sequentialthinking",
  "arguments": {
    "thought": "Analisando a situação financeira da empresa..."
  }
}
```

**Resposta**:
```json
{
  "status": "thinking",
  "thought": "Analisando a situação financeira da empresa...",
  "next_step": "continue"
}
```

**Casos de Uso**:
- Análises complexas multi-etapa
- Due diligence empresarial
- Avaliação de riscos
- Tomada de decisão estruturada

---

## Cenários de Uso Completos

### Cenário 1: Validação de Fornecedor

```
1. Validar CNPJ: cnpj_validate → "11.222.333/0001-81"
2. Consultar CNPJ: cnpj_lookup → Dados da empresa
3. Analisar empresa: cnpj_intelligence → Insights de risco
4. Validar endereço: cep_lookup → Confirmar localização
```

### Cenário 2: E-commerce com Cálculo de Frete

```
1. Validar CPF do cliente: cpf_validate
2. Validar CEP de entrega: cep_validate
3. Consultar CEP: cep_lookup → Obter cidade/estado
4. Consultar feriados: feriados_nacionais → Calcular prazo
5. Validar NCM do produto: ncm_lookup → Calcular impostos
```

### Cenário 3: Sistema Financeiro

```
1. Validar dados bancários: banco_lookup
2. Consultar taxas: taxa_lookup → SELIC, CDI
3. Validar telefone: ddd_lookup → Verificar DDD
4. Análise regional: ibge_uf + ibge_municipios
```

### Cenário 4: Comércio de Veículos

```
1. Listar marcas: fipe_marcas → Dropdown de seleção
2. Consultar preço: fipe_preco → Valor de mercado
3. Análise de financiamento: taxa_lookup → Taxas atuais
4. Validação de documentos: cpf_validate + cnpj_validate
```

---

## Integração com Claude Desktop

Para usar essas ferramentas no Claude Desktop, adicione ao seu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dadosbr": {
      "command": "npx",
      "args": ["-y", "mcp-dadosbr"]
    }
  }
}
```

Depois, basta conversar naturalmente com o Claude:

```
User: "Valida esse CNPJ pra mim: 19.131.243/0001-97"
Claude: [usa cnpj_validate e cnpj_lookup automaticamente]

User: "Qual o preço FIPE do código 001004-1?"
Claude: [usa fipe_preco]

User: "Quais são os feriados de 2024?"
Claude: [usa feriados_nacionais]
```

---

## Notas Importantes

1. **Todas as APIs são gratuitas** e não requerem autenticação
2. **Formatação flexível**: Todas as ferramentas aceitam dados formatados ou não
3. **Múltiplos provedores**: CEP usa BrasilAPI e ViaCEP como fallback
4. **Validação antes de consulta**: Use os validadores antes de fazer consultas
5. **Dados oficiais**: IBGE, FIPE, Receita Federal, etc.

---

## Suporte e Documentação

- **GitHub**: https://github.com/cristianoaredes/mcp-dadosbr
- **BrasilAPI Docs**: https://brasilapi.com.br/docs
- **ViaCEP Docs**: https://viacep.com.br/
- **MCP Protocol**: https://modelcontextprotocol.io/
