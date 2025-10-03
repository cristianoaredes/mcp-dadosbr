# Glossário de Termos Técnicos

> **Sobre este Glossário**
> - **Propósito**: Definições em português brasileiro para termos técnicos do MCP DadosBR
> - **Público-alvo**: Desenvolvedores brasileiros de todos os níveis
> - **Última atualização**: ${new Date().toLocaleDateString('pt-BR')}
> - **Versão**: 1.0.0

## 📋 Índice por Categoria

- [🔧 MCP (Model Context Protocol)](#mcp-model-context-protocol)
- [🌐 APIs e Rede](#apis-e-rede)
- [💾 Cache e Performance](#cache-e-performance)
- [🔒 Segurança](#segurança)
- [📊 Dados Brasileiros](#dados-brasileiros)
- [⚙️ Desenvolvimento](#desenvolvimento)
- [🏗️ Arquitetura](#arquitetura)

---

## 🔧 MCP (Model Context Protocol)

### MCP
**Termo**: MCP  
**Tradução**: Protocolo de Contexto de Modelo  
**Categoria**: MCP  
**Nível**: Básico

**Definição**: Protocolo de comunicação que permite que modelos de IA acessem recursos externos de forma padronizada e segura.

**Contexto Brasileiro**: No Brasil, o MCP é especialmente útil para integrar IAs com APIs de dados públicos brasileiros como CNPJ e CEP.

**Exemplos de Uso**:
```typescript
// Servidor MCP básico
const server = new Server({
  name: "dadosbr-mcp",
  version: "1.0.0"
});
```

**Termos Relacionados**: [Server](#server), [Tool](#tool), [Transport](#transport)

---

### Server
**Termo**: Server  
**Tradução**: Servidor  
**Categoria**: MCP  
**Nível**: Básico

**Definição**: Componente que implementa o protocolo MCP e fornece ferramentas (tools) para modelos de IA.

**Contexto Brasileiro**: Um servidor MCP brasileiro típico fornece acesso a dados como CNPJ da Receita Federal e CEP dos Correios.

**Exemplos de Uso**:
```typescript
// Configuração de servidor MCP para dados brasileiros
const server = new Server({
  name: "dadosbr-mcp",
  version: "1.2.0"
}, {
  capabilities: {
    tools: {}
  }
});
```

**Termos Relacionados**: [MCP](#mcp), [Tool](#tool), [Client](#client)

---

### Tool
**Termo**: Tool  
**Tradução**: Ferramenta  
**Categoria**: MCP  
**Nível**: Básico

**Definição**: Função específica disponibilizada por um servidor MCP que pode ser chamada por modelos de IA.

**Contexto Brasileiro**: No MCP DadosBR, temos duas ferramentas principais: `cnpj_lookup` e `cep_lookup`.

**Exemplos de Uso**:
```typescript
// Definição de ferramenta para consulta de CNPJ
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "cnpj_lookup",
    description: "Consulta dados de empresa por CNPJ",
    inputSchema: {
      type: "object",
      properties: {
        cnpj: { type: "string", description: "CNPJ da empresa" }
      }
    }
  }]
}));
```

**Convenção de Nomenclatura**: Sempre use `snake_case` para nomes de ferramentas MCP.

**Termos Relacionados**: [Server](#server), [Schema](#schema), [Input Validation](#input-validation)

---

### Transport
**Termo**: Transport  
**Tradução**: Transporte  
**Categoria**: MCP  
**Nível**: Intermediário

**Definição**: Mecanismo de comunicação usado para trocar mensagens entre cliente e servidor MCP.

**Contexto Brasileiro**: O MCP DadosBR suporta dois transportes: stdio (padrão) para integração com IDEs e HTTP para aplicações web.

**Exemplos de Uso**:
```typescript
// Transporte stdio (padrão)
const transport = new StdioServerTransport();

// Transporte HTTP (opcional)
const app = express();
const httpTransport = new HttpTransport(app, 3000);
```

**Modos Disponíveis**:
- **stdio**: Comunicação via entrada/saída padrão
- **HTTP**: Comunicação via protocolo HTTP

**Termos Relacionados**: [Server](#server), [Client](#client), [Protocol](#protocol)

---

## 🌐 APIs e Rede

### API
**Termo**: API  
**Tradução**: Interface de Programação de Aplicações  
**Categoria**: API  
**Nível**: Básico

**Definição**: Interface que permite comunicação entre diferentes sistemas de software através de um conjunto definido de regras e protocolos.

**Contexto Brasileiro**: O MCP DadosBR integra com APIs brasileiras como OpenCNPJ e OpenCEP para fornecer dados públicos nacionais.

**Exemplos de Uso**:
```typescript
// Chamada para API brasileira de CNPJ
const response = await fetch(`https://api.opencnpj.org/${cnpj}`);
const dadosEmpresa = await response.json();
```

**APIs Brasileiras Integradas**:
- **OpenCNPJ**: `https://api.opencnpj.org/`
- **OpenCEP**: `https://opencep.com/v1/`

**Termos Relacionados**: [Endpoint](#endpoint), [HTTP](#http), [JSON](#json)

---

### Endpoint
**Termo**: Endpoint  
**Tradução**: Ponto de Extremidade  
**Categoria**: API  
**Nível**: Básico

**Definição**: URL específica onde uma API pode ser acessada para realizar uma operação particular.

**Contexto Brasileiro**: Cada API brasileira tem endpoints específicos, como `/cnpj/{numero}` para consulta de CNPJ.

**Exemplos de Uso**:
```typescript
// Endpoints das APIs brasileiras
const ENDPOINTS = {
  CNPJ: "https://api.opencnpj.org/{cnpj}",
  CEP: "https://opencep.com/v1/{cep}"
};
```

**Padrões Brasileiros**:
- CNPJ: Aceita formato com ou sem máscara (12.345.678/0001-95 ou 12345678000195)
- CEP: Aceita formato com ou sem hífen (01310-100 ou 01310100)

**Termos Relacionados**: [API](#api), [URL](#url), [HTTP Method](#http-method)

---

### HTTP
**Termo**: HTTP  
**Tradução**: Protocolo de Transferência de Hipertexto  
**Categoria**: Rede  
**Nível**: Básico

**Definição**: Protocolo de comunicação usado para transferir dados na web, base para comunicação de APIs REST.

**Contexto Brasileiro**: Todas as APIs brasileiras integradas ao MCP DadosBR usam HTTP/HTTPS para comunicação segura.

**Exemplos de Uso**:
```typescript
// Requisição HTTP com timeout para API brasileira
const controller = new AbortController();
setTimeout(() => controller.abort(), 8000);

const response = await fetch(url, {
  method: 'GET',
  signal: controller.signal,
  headers: {
    'User-Agent': 'MCP-DadosBR/1.2.0'
  }
});
```

**Status Codes Comuns**:
- **200**: Sucesso - dados encontrados
- **404**: Não encontrado - CNPJ/CEP inexistente
- **429**: Rate limit - muitas requisições
- **500**: Erro do servidor

**Termos Relacionados**: [API](#api), [Request](#request), [Response](#response)

---

## 💾 Cache e Performance

### Cache
**Termo**: Cache  
**Tradução**: Cache  
**Categoria**: Cache  
**Nível**: Básico

**Definição**: Armazenamento temporário de dados frequentemente acessados para melhorar performance e reduzir requisições desnecessárias.

**Contexto Brasileiro**: O MCP DadosBR usa cache para evitar consultas repetidas às APIs de CNPJ e CEP, respeitando os limites de rate limiting.

**Exemplos de Uso**:
```typescript
// Implementação de cache com TTL
class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  
  set(key: string, value: unknown, ttl: number = 60000): void {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttl
    });
  }
  
  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
}
```

**Configurações Padrão**:
- **TTL**: 60 segundos
- **Tamanho máximo**: 256 entradas
- **Estratégia**: LRU (Least Recently Used)

**Termos Relacionados**: [TTL](#ttl), [LRU](#lru), [Performance](#performance)

---

### TTL
**Termo**: TTL  
**Tradução**: Tempo de Vida  
**Categoria**: Cache  
**Nível**: Intermediário

**Definição**: Período de tempo que um dado permanece válido no cache antes de expirar e precisar ser renovado.

**Contexto Brasileiro**: Para dados brasileiros como CNPJ e CEP, um TTL de 60 segundos é adequado pois esses dados mudam raramente.

**Exemplos de Uso**:
```typescript
// Configuração de TTL para diferentes tipos de dados
const TTL_CONFIG = {
  CNPJ_DATA: 60 * 1000,      // 60 segundos - dados empresariais
  CEP_DATA: 300 * 1000,      // 5 minutos - dados de endereço
  ERROR_CACHE: 10 * 1000     // 10 segundos - cache de erros
};
```

**Considerações**:
- Dados de CNPJ: Mudam raramente, TTL pode ser maior
- Dados de CEP: Praticamente estáticos, TTL pode ser muito maior
- Erros: TTL baixo para permitir retry rápido

**Termos Relacionados**: [Cache](#cache), [Expiration](#expiration), [Refresh](#refresh)

---

### LRU
**Termo**: LRU  
**Tradução**: Menos Recentemente Usado  
**Categoria**: Cache  
**Nível**: Avançado

**Definição**: Algoritmo de substituição de cache que remove os itens menos recentemente acessados quando o cache atinge sua capacidade máxima.

**Contexto Brasileiro**: No MCP DadosBR, o LRU garante que CNPJs e CEPs mais consultados permaneçam em cache, otimizando para padrões de uso brasileiros.

**Exemplos de Uso**:
```typescript
// Implementação LRU para cache de dados brasileiros
class LRUCache {
  private maxSize: number = 256;
  private cache = new Map<string, CacheEntry>();
  
  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (entry) {
      // Mover para o final (mais recente)
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.data;
    }
    return null;
  }
  
  set(key: string, value: unknown): void {
    if (this.cache.size >= this.maxSize) {
      // Remover o primeiro (menos recente)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data: value, timestamp: Date.now() });
  }
}
```

**Vantagens para Dados Brasileiros**:
- CNPJs de grandes empresas ficam em cache mais tempo
- CEPs de regiões metropolitanas são priorizados
- Otimização automática baseada no uso real

**Termos Relacionados**: [Cache](#cache), [Memory Management](#memory-management), [Algorithm](#algorithm)

---

## 🔒 Segurança

### Input Validation
**Termo**: Input Validation  
**Tradução**: Validação de Entrada  
**Categoria**: Segurança  
**Nível**: Básico

**Definição**: Processo de verificar e sanitizar dados de entrada para garantir que estejam no formato correto e sejam seguros.

**Contexto Brasileiro**: Validação é crucial para CNPJ e CEP, que têm formatos específicos e algoritmos de verificação próprios do Brasil.

**Exemplos de Uso**:
```typescript
// Validação de CNPJ brasileiro
const CnpjSchema = z.object({
  cnpj: z.string()
    .min(11, "CNPJ deve ter pelo menos 11 dígitos")
    .max(18, "CNPJ não pode exceder 18 caracteres")
    .regex(/^[\d\.\-\/]+$/, "CNPJ contém caracteres inválidos")
}).transform(dados => ({
  cnpj: dados.cnpj.replace(/\D/g, "") // Remove formatação
}));

// Validação de CEP brasileiro
const CepSchema = z.object({
  cep: z.string()
    .length(8, "CEP deve ter exatamente 8 dígitos")
    .regex(/^\d{8}$/, "CEP deve conter apenas números")
});
```

**Regras Brasileiras**:
- **CNPJ**: 14 dígitos, com ou sem formatação
- **CEP**: 8 dígitos, formato XXXXX-XXX ou XXXXXXXX
- **Normalização**: Sempre remover caracteres especiais antes da consulta

**Termos Relacionados**: [Schema](#schema), [Sanitization](#sanitization), [Zod](#zod)

---

### Schema
**Termo**: Schema  
**Tradução**: Esquema  
**Categoria**: Segurança  
**Nível**: Intermediário

**Definição**: Estrutura que define o formato, tipo e regras de validação para dados de entrada ou saída.

**Contexto Brasileiro**: Schemas garantem que dados brasileiros como CNPJ e CEP sejam validados corretamente antes de consultar as APIs.

**Exemplos de Uso**:
```typescript
// Schema para resposta de CNPJ brasileiro
const RespostaCnpjSchema = z.object({
  cnpj: z.string(),
  razao_social: z.string(),
  nome_fantasia: z.string().optional(),
  situacao: z.string(),
  data_abertura: z.string(),
  endereco: z.object({
    logradouro: z.string(),
    numero: z.string(),
    bairro: z.string(),
    cidade: z.string(),
    uf: z.string().length(2),
    cep: z.string().length(8)
  })
});
```

**Benefícios**:
- **Type Safety**: Garantia de tipos em TypeScript
- **Runtime Validation**: Validação durante execução
- **Auto-completion**: Melhor experiência de desenvolvimento
- **Documentation**: Schema serve como documentação

**Termos Relacionados**: [Validation](#input-validation), [TypeScript](#typescript), [Zod](#zod)

---

## 📊 Dados Brasileiros

### CNPJ
**Termo**: CNPJ  
**Tradução**: Cadastro Nacional da Pessoa Jurídica  
**Categoria**: Dados Brasileiros  
**Nível**: Básico

**Definição**: Número de identificação único de empresas brasileiras, emitido pela Receita Federal, composto por 14 dígitos.

**Contexto Técnico**: No MCP DadosBR, o CNPJ é o identificador principal para consulta de dados empresariais através da API OpenCNPJ.

**Exemplos de Uso**:
```typescript
// Consulta de dados empresariais por CNPJ
async function buscarDadosCnpj(cnpj: string): Promise<DadosEmpresa> {
  // Normalizar CNPJ (remover formatação)
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  
  // Validar formato
  if (cnpjLimpo.length !== 14) {
    throw new Error("CNPJ deve ter 14 dígitos");
  }
  
  // Consultar API
  const response = await fetch(`https://api.opencnpj.org/${cnpjLimpo}`);
  return await response.json();
}
```

**Formatos Aceitos**:
- **Com formatação**: 12.345.678/0001-95
- **Sem formatação**: 12345678000195
- **Parcial**: 12345678 (apenas os 8 primeiros dígitos)

**Dados Retornados**:
- Razão social da empresa
- Nome fantasia
- Situação cadastral
- Data de abertura
- Endereço completo
- Atividade econômica principal

**Termos Relacionados**: [Receita Federal](#receita-federal), [Pessoa Jurídica](#pessoa-juridica), [API](#api)

---

### CEP
**Termo**: CEP  
**Tradução**: Código de Endereçamento Postal  
**Categoria**: Dados Brasileiros  
**Nível**: Básico

**Definição**: Código numérico de 8 dígitos usado pelos Correios do Brasil para identificar logradouros e facilitar a entrega de correspondências.

**Contexto Técnico**: No MCP DadosBR, o CEP permite consultar informações completas de endereço através da API OpenCEP.

**Exemplos de Uso**:
```typescript
// Consulta de endereço por CEP
async function buscarEnderecoCep(cep: string): Promise<DadosEndereco> {
  // Normalizar CEP (remover hífen)
  const cepLimpo = cep.replace(/\D/g, "");
  
  // Validar formato
  if (cepLimpo.length !== 8) {
    throw new Error("CEP deve ter 8 dígitos");
  }
  
  // Consultar API
  const response = await fetch(`https://opencep.com/v1/${cepLimpo}`);
  return await response.json();
}
```

**Formatos Aceitos**:
- **Com hífen**: 01310-100
- **Sem hífen**: 01310100

**Dados Retornados**:
- Logradouro (rua, avenida, etc.)
- Bairro
- Cidade
- Estado (UF)
- Complemento (quando disponível)

**Padrões Regionais**:
- **Região 0**: São Paulo (SP)
- **Região 1**: Rio de Janeiro (RJ), Espírito Santo (ES)
- **Região 2**: Minas Gerais (MG)
- **Região 3**: Bahia (BA), Sergipe (SE)
- **Região 4**: Pernambuco (PE), Paraíba (PB), Rio Grande do Norte (RN), Alagoas (AL)
- **Região 5**: Ceará (CE), Piauí (PI), Maranhão (MA)
- **Região 6**: Distrito Federal (DF), Goiás (GO), Tocantins (TO)
- **Região 7**: Paraná (PR), Santa Catarina (SC)
- **Região 8**: Rio Grande do Sul (RS)
- **Região 9**: Acre (AC), Amazonas (AM), Amapá (AP), Pará (PA), Rondônia (RO), Roraima (RR)

**Termos Relacionados**: [Correios](#correios), [Logradouro](#logradouro), [UF](#uf)

---

## ⚙️ Desenvolvimento

### TypeScript
**Termo**: TypeScript  
**Tradução**: TypeScript  
**Categoria**: Desenvolvimento  
**Nível**: Intermediário

**Definição**: Linguagem de programação desenvolvida pela Microsoft que adiciona tipagem estática ao JavaScript, melhorando a detecção de erros e a experiência de desenvolvimento.

**Contexto Brasileiro**: O MCP DadosBR é implementado inteiramente em TypeScript para garantir type safety ao trabalhar com dados brasileiros estruturados.

**Exemplos de Uso**:
```typescript
// Tipos para dados brasileiros
interface DadosEmpresa {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao: 'ATIVA' | 'SUSPENSA' | 'INAPTA' | 'BAIXADA';
  dataAbertura: string;
  endereco: EnderecoEmpresa;
}

interface EnderecoEmpresa {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

// Função tipada para consulta de CNPJ
async function consultarCnpj(cnpj: string): Promise<DadosEmpresa> {
  // Implementação com type safety
}
```

**Benefícios para Dados Brasileiros**:
- **Type Safety**: Garante estrutura correta dos dados de CNPJ/CEP
- **IntelliSense**: Autocompletar para campos brasileiros específicos
- **Compile-time Errors**: Detecta erros antes da execução
- **Refactoring**: Mudanças seguras na estrutura de dados

**Termos Relacionados**: [JavaScript](#javascript), [Type Safety](#type-safety), [Interface](#interface)

---

### Zod
**Termo**: Zod  
**Tradução**: Zod  
**Categoria**: Desenvolvimento  
**Nível**: Intermediário

**Definição**: Biblioteca TypeScript para validação de esquemas e parsing de dados com inferência automática de tipos.

**Contexto Brasileiro**: Usado no MCP DadosBR para validar formatos específicos brasileiros como CNPJ e CEP, garantindo dados corretos antes das consultas às APIs.

**Exemplos de Uso**:
```typescript
import { z } from 'zod';

// Schema para validação de CNPJ brasileiro
const EsquemaCnpj = z.object({
  cnpj: z.string()
    .min(11, "CNPJ deve ter pelo menos 11 dígitos")
    .max(18, "CNPJ não pode exceder 18 caracteres")
    .regex(/^[\d\.\-\/]+$/, "CNPJ contém caracteres inválidos")
    .transform(cnpj => cnpj.replace(/\D/g, "")) // Normalização
    .refine(cnpj => cnpj.length === 14, "CNPJ deve ter 14 dígitos")
});

// Schema para validação de CEP brasileiro
const EsquemaCep = z.object({
  cep: z.string()
    .regex(/^\d{5}-?\d{3}$/, "CEP deve ter formato XXXXX-XXX ou XXXXXXXX")
    .transform(cep => cep.replace(/\D/g, ""))
});

// Uso dos schemas
try {
  const dadosValidados = EsquemaCnpj.parse({ cnpj: "12.345.678/0001-95" });
  console.log(dadosValidados.cnpj); // "12345678000195"
} catch (error) {
  console.error("CNPJ inválido:", error.message);
}
```

**Vantagens**:
- **Runtime Validation**: Validação durante execução
- **Type Inference**: Tipos TypeScript automáticos
- **Transform**: Normalização automática de dados
- **Error Messages**: Mensagens de erro em português

**Termos Relacionados**: [Schema](#schema), [Validation](#input-validation), [TypeScript](#typescript)

---

## 🏗️ Arquitetura

### Single File Architecture
**Termo**: Single File Architecture  
**Tradução**: Arquitetura de Arquivo Único  
**Categoria**: Arquitetura  
**Nível**: Avançado

**Definição**: Padrão arquitetural onde toda a lógica da aplicação é implementada em um único arquivo, limitado a 300 linhas no caso do MCP DadosBR.

**Contexto Brasileiro**: Escolhida para o MCP DadosBR para simplificar deployment e manutenção, especialmente importante para desenvolvedores brasileiros que precisam de soluções diretas e eficientes.

**Exemplos de Uso**:
```typescript
// Estrutura do server.ts (arquivo único)
// 1. Imports (dependências externas)
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";

// 2. Tipos e Interfaces
interface DadosEmpresa { /* ... */ }
interface CacheEntry { /* ... */ }

// 3. Constantes
const TIMEOUT_PADRAO = 8000;
const CACHE_TTL = 60000;

// 4. Classes (apenas MemoryCache e HttpTransportManager permitidas)
class MemoryCache { /* ... */ }

// 5. Funções Puras
async function fetchCnpjData(cnpj: string) { /* ... */ }
async function fetchCepData(cep: string) { /* ... */ }

// 6. Configuração MCP
const server = new Server(/* ... */);
```

**Limitações**:
- **Máximo 300 linhas** no arquivo principal
- **Apenas 2 classes permitidas**: MemoryCache e HttpTransportManager
- **Funções puras** para toda lógica de negócio
- **Sem módulos externos** além das dependências declaradas

**Benefícios**:
- **Simplicidade**: Fácil de entender e manter
- **Deploy**: Um único arquivo para distribuir
- **Debug**: Toda lógica em um lugar
- **Performance**: Menos overhead de módulos

**Termos Relacionados**: [Architecture](#architecture), [Modularity](#modularity), [Simplicity](#simplicity)

---

### Rate Limiting
**Termo**: Rate Limiting  
**Tradução**: Limitação de Taxa  
**Categoria**: Arquitetura  
**Nível**: Intermediário

**Definição**: Técnica para controlar o número de requisições que podem ser feitas a uma API em um período específico de tempo.

**Contexto Brasileiro**: APIs brasileiras como OpenCNPJ e OpenCEP implementam rate limiting para evitar sobrecarga. O MCP DadosBR precisa respeitar esses limites.

**Exemplos de Uso**:
```typescript
// Tratamento de rate limiting para APIs brasileiras
async function fetchWithRateLimit(url: string): Promise<Response> {
  const response = await fetch(url);
  
  if (response.status === 429) {
    // Rate limit atingido
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
    
    throw new Error(`Rate limit atingido. Tente novamente em ${waitTime/1000} segundos`);
  }
  
  return response;
}

// Cache para reduzir requisições
const cache = new Map<string, { data: unknown; expires: number }>();

async function consultarComCache(chave: string, consulta: () => Promise<unknown>) {
  // Verificar cache primeiro
  const cached = cache.get(chave);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  
  // Fazer requisição apenas se necessário
  const data = await consulta();
  cache.set(chave, { data, expires: Date.now() + 60000 });
  
  return data;
}
```

**Estratégias de Mitigação**:
- **Cache agressivo**: TTL de 60 segundos para reduzir requisições
- **Retry com backoff**: Aguardar antes de tentar novamente
- **Error handling**: Informar usuário sobre limitações
- **Monitoring**: Acompanhar uso das APIs

**Termos Relacionados**: [API](#api), [Cache](#cache), [Performance](#performance)

---

## 📚 Referências e Links

### Documentação Oficial
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Especificação oficial do protocolo
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Documentação oficial do TypeScript
- [Zod Documentation](https://zod.dev/) - Documentação da biblioteca Zod

### APIs Brasileiras
- [OpenCNPJ](https://api.opencnpj.org/) - API gratuita para consulta de CNPJ
- [OpenCEP](https://opencep.com/) - API gratuita para consulta de CEP
- [Receita Federal](https://www.gov.br/receitafederal/pt-br) - Portal oficial da Receita Federal

### Recursos da Comunidade Brasileira
- [Brasil.io](https://brasil.io/) - Dados públicos brasileiros
- [Governo Digital](https://www.gov.br/governodigital/pt-br) - Iniciativas de governo digital
- [SERPRO](https://www.serpro.gov.br/) - Serviços de processamento de dados do governo

---

**💡 Como Contribuir**

Encontrou um termo que deveria estar aqui? Tem uma definição melhor? 

1. Abra uma [issue](https://github.com/aredes-me/mcp-dadosbr/issues) com a tag `glossário`
2. Inclua o termo, definição sugerida e contexto brasileiro
3. Adicione exemplos práticos se possível

**🏷️ Tags**: glossário, terminologia, português-brasileiro, mcp, desenvolvimento