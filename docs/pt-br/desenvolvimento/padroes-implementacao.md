# Padrões de Implementação

> **Metadados do Documento**
> - **Categoria**: Desenvolvimento
> - **Nível**: Intermediário
> - **Tempo de Leitura**: 15 minutos
> - **Última Atualização**: ${new Date().toLocaleDateString('pt-BR')}
> - **Versão**: 1.0.0

## 📋 Índice

- [Padrões de Validação](#padrões-de-validação)
- [Padrões de Resposta](#padrões-de-resposta)
- [Padrões de Logging](#padrões-de-logging)
- [Padrões de Cache](#padrões-de-cache)
- [Padrões de Erro](#padrões-de-erro)
- [Integração com APIs](#integração-com-apis)

## 🛡️ Padrões de Validação

### Validação com Zod para Dados Brasileiros

```typescript
import { z } from 'zod';

// Schema para CNPJ brasileiro
const EsquemaCnpj = z.object({
  cnpj: z.string()
    .min(11, "CNPJ deve ter pelo menos 11 dígitos")
    .max(18, "CNPJ não pode exceder 18 caracteres")
    .regex(/^[\d\.\-\/]+$/, "CNPJ contém caracteres inválidos")
    .transform(cnpj => cnpj.replace(/\D/g, "")) // Normalização automática
    .refine(cnpj => cnpj.length === 14, "CNPJ deve ter 14 dígitos")
    .refine(validarDigitosCnpj, "CNPJ com dígitos verificadores inválidos");
});

// Schema para CEP brasileiro
const EsquemaCep = z.object({
  cep: z.string()
    .regex(/^\d{5}-?\d{3}$/, "CEP deve ter formato XXXXX-XXX ou XXXXXXXX")
    .transform(cep => cep.replace(/\D/g, ""))
    .refine(cep => cep.length === 8, "CEP deve ter 8 dígitos")
    .refine(cep => !cep.startsWith('00'), "CEP não pode começar com 00");
});

// Validação de dígitos verificadores do CNPJ
function validarDigitosCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  
  // Algoritmo de validação da Receita Federal
  const calcularDigito = (base: string, pesos: number[]): number => {
    const soma = base
      .split('')
      .reduce((acc, digit, index) => acc + parseInt(digit) * pesos[index], 0);
    
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  
  const base = cnpj.substring(0, 12);
  const digito1 = calcularDigito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digito2 = calcularDigito(base + digito1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  
  return cnpj.endsWith(`${digito1}${digito2}`);
}

// Uso dos schemas
async function processarRequisicaoCnpj(entrada: unknown): Promise<ResultadoValidacao> {
  try {
    const { cnpj } = EsquemaCnpj.parse(entrada);
    
    return {
      valido: true,
      dados: { cnpj },
      mensagem: "CNPJ validado com sucesso"
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valido: false,
        erros: error.errors.map(err => ({
          campo: err.path.join('.'),
          mensagem: err.message,
          valorRecebido: err.input
        })),
        mensagem: "Dados de entrada inválidos"
      };
    }
    
    throw error;
  }
}
```

### Validação de Estados Brasileiros

```typescript
// Enum para estados brasileiros
enum EstadoBrasileiro {
  AC = 'AC', AL = 'AL', AP = 'AP', AM = 'AM', BA = 'BA', CE = 'CE',
  DF = 'DF', ES = 'ES', GO = 'GO', MA = 'MA', MT = 'MT', MS = 'MS',
  MG = 'MG', PA = 'PA', PB = 'PB', PR = 'PR', PE = 'PE', PI = 'PI',
  RJ = 'RJ', RN = 'RN', RS = 'RS', RO = 'RO', RR = 'RR', SC = 'SC',
  SP = 'SP', SE = 'SE', TO = 'TO'
}

// Schema para endereço brasileiro
const EsquemaEnderecoBrasileiro = z.object({
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  uf: z.nativeEnum(EstadoBrasileiro, {
    errorMap: () => ({ message: "UF deve ser um estado brasileiro válido" })
  }),
  cep: EsquemaCep.shape.cep
});
```

## 📤 Padrões de Resposta

### Estrutura de Resposta Padronizada

```typescript
// Tipo base para todas as respostas
type RespostaBase<T> = {
  ok: boolean;
  timestamp: string;
  fonte: string;
} & (
  | { ok: true; data: T; tempoResposta: number }
  | { ok: false; error: string; codigo: string }
);

// Implementações específicas
type RespostaCnpj = RespostaBase<DadosEmpresa>;
type RespostaCep = RespostaBase<DadosEndereco>;

// Função para criar resposta de sucesso
function criarRespostaSucesso<T>(
  dados: T,
  fonte: string,
  tempoResposta: number
): RespostaBase<T> {
  return {
    ok: true,
    data: dados,
    fonte,
    tempoResposta,
    timestamp: new Date().toISOString()
  };
}

// Função para criar resposta de erro
function criarRespostaErro(
  mensagem: string,
  codigo: string,
  fonte: string = 'mcp-dadosbr'
): RespostaBase<never> {
  return {
    ok: false,
    error: mensagem,
    codigo,
    fonte,
    timestamp: new Date().toISOString()
  };
}

// Exemplo de uso
async function consultarCnpj(cnpj: string): Promise<RespostaCnpj> {
  const inicioTempo = Date.now();
  
  try {
    const dados = await buscarDadosEmpresa(cnpj);
    const tempoResposta = Date.now() - inicioTempo;
    
    return criarRespostaSucesso(dados, 'api.opencnpj.org', tempoResposta);
    
  } catch (error) {
    if (error.code === 'CNPJ_NOT_FOUND') {
      return criarRespostaErro(
        "CNPJ não encontrado na base da Receita Federal",
        'CNPJ_NOT_FOUND'
      );
    }
    
    return criarRespostaErro(
      "Erro interno do servidor",
      'INTERNAL_ERROR'
    );
  }
}
```

### Formatação para MCP

```typescript
// Converter resposta interna para formato MCP
function formatarParaMCP<T>(resposta: RespostaBase<T>): ToolResult {
  const conteudo = JSON.stringify(resposta, null, 2);
  
  return {
    content: [{
      type: "text",
      text: conteudo
    }],
    isError: !resposta.ok
  };
}

// Handler MCP completo
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let resultado: RespostaBase<unknown>;
    
    switch (name) {
      case 'cnpj_lookup':
        const { cnpj } = EsquemaCnpj.parse(args);
        resultado = await consultarCnpj(cnpj);
        break;
        
      case 'cep_lookup':
        const { cep } = EsquemaCep.parse(args);
        resultado = await consultarCep(cep);
        break;
        
      default:
        resultado = criarRespostaErro(
          `Ferramenta desconhecida: ${name}`,
          'UNKNOWN_TOOL'
        );
    }
    
    return formatarParaMCP(resultado);
    
  } catch (error) {
    const respostaErro = criarRespostaErro(
      error.message,
      'VALIDATION_ERROR'
    );
    
    return formatarParaMCP(respostaErro);
  }
});
```

## 📝 Padrões de Logging

### Formato de Log Padronizado

```typescript
// Estrutura de log para MCP DadosBR
interface EntradaLog {
  timestamp: string;
  ferramenta: string;
  entrada: string;
  status: 'success' | 'error' | 'cache_hit' | 'timeout' | 'rate_limit';
  tempoMs: number;
  transporte: 'stdio' | 'http';
  detalhes?: string;
}

// Função de logging padronizada
function logarOperacao(
  ferramenta: string,
  entrada: string,
  status: EntradaLog['status'],
  tempoMs: number,
  detalhes?: string
): void {
  const timestamp = new Date().toISOString();
  const transporte = process.env.MCP_TRANSPORT === 'http' ? 'http' : 'stdio';
  
  const logEntry: EntradaLog = {
    timestamp,
    ferramenta,
    entrada,
    status,
    tempoMs,
    transporte,
    detalhes
  };
  
  // Formato de uma linha para facilitar parsing
  const logLine = `[${timestamp}] [${ferramenta}] [${entrada}] [${status}] [${tempoMs}ms] [${transporte}]${detalhes ? ` ${detalhes}` : ''}`;
  
  // Log para stderr para não interferir com stdio MCP
  console.error(logLine);
  
  // Em produção, também enviar para sistema de monitoramento
  if (process.env.NODE_ENV === 'production') {
    enviarParaMonitoramento(logEntry);
  }
}

// Wrapper para funções com logging automático
function comLogging<T extends unknown[], R>(
  ferramenta: string,
  funcao: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const entrada = JSON.stringify(args[0]); // Primeiro argumento como entrada
    const inicioTempo = Date.now();
    
    try {
      const resultado = await funcao(...args);
      const tempoResposta = Date.now() - inicioTempo;
      
      // Determinar status baseado no resultado
      const status = determinarStatusLog(resultado);
      logarOperacao(ferramenta, entrada, status, tempoResposta);
      
      return resultado;
      
    } catch (error) {
      const tempoResposta = Date.now() - inicioTempo;
      const status = mapearErroParaStatus(error);
      
      logarOperacao(
        ferramenta, 
        entrada, 
        status, 
        tempoResposta, 
        error.message
      );
      
      throw error;
    }
  };
}

// Aplicar logging às funções principais
const consultarCnpjComLog = comLogging('cnpj_lookup', consultarCnpj);
const consultarCepComLog = comLogging('cep_lookup', consultarCep);
```

### Métricas e Monitoramento

```typescript
// Coletor de métricas simples
class ColetorMetricas {
  private metricas = new Map<string, number>();
  private contadores = new Map<string, number>();
  
  incrementar(metrica: string, valor: number = 1): void {
    const atual = this.contadores.get(metrica) || 0;
    this.contadores.set(metrica, atual + valor);
  }
  
  registrarTempo(metrica: string, tempoMs: number): void {
    const tempos = this.metricas.get(metrica) || 0;
    this.metricas.set(metrica, tempos + tempoMs);
  }
  
  obterEstatisticas(): EstatisticasUso {
    const totalRequisicoes = this.contadores.get('total_requests') || 0;
    const cacheHits = this.contadores.get('cache_hits') || 0;
    const erros = this.contadores.get('errors') || 0;
    
    return {
      totalRequisicoes,
      cacheHits,
      taxaCacheHit: totalRequisicoes > 0 ? cacheHits / totalRequisicoes : 0,
      taxaErro: totalRequisicoes > 0 ? erros / totalRequisicoes : 0,
      tempoMedioResposta: this.calcularTempoMedio(),
      uptime: process.uptime()
    };
  }
  
  private calcularTempoMedio(): number {
    const totalTempo = Array.from(this.metricas.values())
      .reduce((acc, tempo) => acc + tempo, 0);
    const totalRequisicoes = this.contadores.get('total_requests') || 0;
    
    return totalRequisicoes > 0 ? totalTempo / totalRequisicoes : 0;
  }
}

// Instância global de métricas
const metricas = new ColetorMetricas();

// Middleware para coletar métricas automaticamente
function coletarMetricas<T>(ferramenta: string, operacao: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const inicioTempo = Date.now();
    metricas.incrementar('total_requests');
    metricas.incrementar(`${ferramenta}_requests`);
    
    try {
      const resultado = await operacao();
      const tempoResposta = Date.now() - inicioTempo;
      
      metricas.registrarTempo('response_time', tempoResposta);
      metricas.registrarTempo(`${ferramenta}_response_time`, tempoResposta);
      
      resolve(resultado);
      
    } catch (error) {
      metricas.incrementar('errors');
      metricas.incrementar(`${ferramenta}_errors`);
      
      reject(error);
    }
  });
}
```

## 💾 Padrões de Cache

### Implementação de Cache com TTL e LRU

```typescript
interface EntradaCache {
  dados: unknown;
  expiraEm: number;
  criadoEm: number;
  acessadoEm: number;
  acessos: number;
}

class CacheInteligente {
  private cache = new Map<string, EntradaCache>();
  private ordemAcesso = new Map<string, number>();
  private contadorAcesso = 0;
  private readonly tamanhoMaximo: number;
  
  constructor(tamanhoMaximo: number = 256) {
    this.tamanhoMaximo = tamanhoMaximo;
    
    // Limpeza automática a cada minuto
    setInterval(() => this.limpezaAutomatica(), 60000);
  }
  
  definir(chave: string, dados: unknown, ttlMs: number): void {
    // Remover entrada mais antiga se cache estiver cheio
    if (this.cache.size >= this.tamanhoMaximo) {
      this.removerMenosUsado();
    }
    
    const agora = Date.now();
    const entrada: EntradaCache = {
      dados,
      expiraEm: agora + ttlMs,
      criadoEm: agora,
      acessadoEm: agora,
      acessos: 1
    };
    
    this.cache.set(chave, entrada);
    this.ordemAcesso.set(chave, ++this.contadorAcesso);
  }
  
  obter(chave: string): unknown | null {
    const entrada = this.cache.get(chave);
    
    if (!entrada) {
      return null;
    }
    
    // Verificar se expirou
    if (Date.now() > entrada.expiraEm) {
      this.cache.delete(chave);
      this.ordemAcesso.delete(chave);
      return null;
    }
    
    // Atualizar estatísticas de acesso
    entrada.acessadoEm = Date.now();
    entrada.acessos++;
    this.ordemAcesso.set(chave, ++this.contadorAcesso);
    
    return entrada.dados;
  }
  
  private removerMenosUsado(): void {
    let chaveMenosUsada = '';
    let menorAcesso = Infinity;
    
    for (const [chave, numeroAcesso] of this.ordemAcesso) {
      if (numeroAcesso < menorAcesso) {
        menorAcesso = numeroAcesso;
        chaveMenosUsada = chave;
      }
    }
    
    if (chaveMenosUsada) {
      this.cache.delete(chaveMenosUsada);
      this.ordemAcesso.delete(chaveMenosUsada);
    }
  }
  
  private limpezaAutomatica(): void {
    const agora = Date.now();
    const chavesExpiradas: string[] = [];
    
    for (const [chave, entrada] of this.cache) {
      if (agora > entrada.expiraEm) {
        chavesExpiradas.push(chave);
      }
    }
    
    for (const chave of chavesExpiradas) {
      this.cache.delete(chave);
      this.ordemAcesso.delete(chave);
    }
    
    if (chavesExpiradas.length > 0) {
      console.error(`[${new Date().toISOString()}] [cache] [cleanup] [${chavesExpiradas.length} entradas removidas]`);
    }
  }
  
  obterEstatisticas(): EstatisticasCache {
    return {
      tamanho: this.cache.size,
      tamanhoMaximo: this.tamanhoMaximo,
      utilizacao: this.cache.size / this.tamanhoMaximo,
      entradasExpiradas: this.contarExpiradas(),
      tempoMedioVida: this.calcularTempoMedioVida()
    };
  }
  
  private contarExpiradas(): number {
    const agora = Date.now();
    return Array.from(this.cache.values())
      .filter(entrada => agora > entrada.expiraEm)
      .length;
  }
  
  private calcularTempoMedioVida(): number {
    const agora = Date.now();
    const idades = Array.from(this.cache.values())
      .map(entrada => agora - entrada.criadoEm);
    
    return idades.length > 0 
      ? idades.reduce((acc, idade) => acc + idade, 0) / idades.length 
      : 0;
  }
}
```

### Estratégias de Cache por Tipo de Dados

```typescript
// Configurações de cache otimizadas para dados brasileiros
const CONFIGURACOES_CACHE = {
  CNPJ: {
    ttl: 60 * 1000,        // 60 segundos
    prefixo: 'cnpj:',
    motivo: 'Dados empresariais podem mudar (situação cadastral)'
  },
  
  CEP: {
    ttl: 5 * 60 * 1000,    // 5 minutos
    prefixo: 'cep:',
    motivo: 'Dados de endereço são mais estáveis'
  },
  
  ERRO: {
    ttl: 10 * 1000,        // 10 segundos
    prefixo: 'erro:',
    motivo: 'Permitir retry rápido em caso de erro temporário'
  }
} as const;

// Gerenciador de cache tipado
class GerenciadorCache {
  private cache = new CacheInteligente(256);
  
  async obterOuBuscar<T>(
    tipo: keyof typeof CONFIGURACOES_CACHE,
    identificador: string,
    buscador: () => Promise<T>
  ): Promise<T> {
    const config = CONFIGURACOES_CACHE[tipo];
    const chave = `${config.prefixo}${identificador}`;
    
    // Tentar obter do cache
    const dadosCache = this.cache.obter(chave) as T;
    if (dadosCache) {
      metricas.incrementar('cache_hits');
      metricas.incrementar(`${tipo.toLowerCase()}_cache_hits`);
      return dadosCache;
    }
    
    // Cache miss - buscar dados
    metricas.incrementar('cache_misses');
    const dados = await buscador();
    
    // Armazenar no cache
    this.cache.definir(chave, dados, config.ttl);
    
    return dados;
  }
  
  invalidar(tipo: keyof typeof CONFIGURACOES_CACHE, identificador: string): void {
    const config = CONFIGURACOES_CACHE[tipo];
    const chave = `${config.prefixo}${identificador}`;
    
    // Implementar invalidação (cache atual não suporta delete individual)
    // Em implementação real, adicionar método delete ao cache
  }
}

// Instância global
const gerenciadorCache = new GerenciadorCache();

// Uso nas funções de consulta
async function consultarCnpjComCache(cnpj: string): Promise<DadosEmpresa> {
  return gerenciadorCache.obterOuBuscar(
    'CNPJ',
    cnpj,
    () => buscarDadosEmpresaAPI(cnpj)
  );
}
```

## 🚀 Próximos Passos

Agora que você conhece os padrões de implementação:

1. **[Configuração do Ambiente](configuracao-ambiente.md)** - Setup do ambiente de desenvolvimento
2. **[Exemplos Básicos](../exemplos/basicos/)** - Ver os padrões em prática
3. **[Troubleshooting](troubleshooting.md)** - Solução de problemas comuns

---

**💡 Dica**: Estes padrões foram testados em produção com milhares de consultas diárias. Seguir essas práticas garante código robusto e manutenível.

**🏷️ Tags**: padrões, implementação, validação, cache, logging, apis-brasileiras