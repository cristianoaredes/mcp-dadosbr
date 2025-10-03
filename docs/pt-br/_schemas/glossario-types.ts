/**
 * Tipos TypeScript para o sistema de glossário técnico
 * Estruturas de dados para gerenciar terminologia em PT-BR
 */

// Enums para categorização
export enum CategoriaTermos {
  MCP = 'mcp',
  NODEJS = 'nodejs',
  TYPESCRIPT = 'typescript',
  API = 'api',
  CACHE = 'cache',
  REDE = 'rede',
  SEGURANCA = 'seguranca',
  DADOS_BRASILEIROS = 'dados-brasileiros',
  DESENVOLVIMENTO = 'desenvolvimento',
  ARQUITETURA = 'arquitetura'
}

export enum NivelTecnico {
  BASICO = 'basico',
  INTERMEDIARIO = 'intermediario',
  AVANCADO = 'avancado'
}

export enum AmbitoUso {
  GERAL = 'geral',
  MCP_ESPECIFICO = 'mcp',
  NODEJS_ESPECIFICO = 'nodejs',
  TYPESCRIPT_ESPECIFICO = 'typescript',
  BRASILEIRO = 'brasileiro'
}

export enum FrequenciaUso {
  ALTA = 'alta',
  MEDIA = 'media',
  BAIXA = 'baixa'
}

export enum TipoRelacionamento {
  SINONIMO = 'sinonimo',
  ANTONIMO = 'antonimo',
  RELACIONADO = 'relacionado',
  PARTE_DE = 'parte-de',
  CONTEM = 'contem',
  DEPENDE_DE = 'depende-de'
}

// Interfaces principais
export interface TermoTecnico {
  /** Termo principal (geralmente em inglês se for padrão da indústria) */
  termo: string;
  
  /** Tradução para português brasileiro (quando aplicável) */
  traducao?: string;
  
  /** Definição completa do termo */
  definicao: DefinicaoTermo;
  
  /** Contexto de uso do termo */
  contexto: ContextoUso;
  
  /** Categoria principal do termo */
  categoria: CategoriaTermos;
  
  /** Exemplos práticos de uso */
  exemplos: ExemploUso[];
  
  /** Termos sinônimos */
  sinonimos: string[];
  
  /** Termos antônimos */
  antonimos: string[];
  
  /** Termos relacionados */
  termosRelacionados: string[];
  
  /** Fontes e referências */
  fontes: FonteReferencia[];
  
  /** Nível técnico necessário para compreender */
  nivelTecnico: NivelTecnico;
  
  /** Metadados do termo */
  metadados: MetadadosTermo;
}

export interface DefinicaoTermo {
  /** Definição resumida (1-2 frases) */
  resumo: string;
  
  /** Definição detalhada e completa */
  detalhada: string;
  
  /** Etimologia do termo (opcional) */
  etimologia?: string;
  
  /** Evolução histórica do conceito (opcional) */
  evolucaoHistorica?: string;
  
  /** Definição técnica formal (opcional) */
  definicaoTecnica?: string;
}

export interface ContextoUso {
  /** Âmbito de aplicação do termo */
  ambito: AmbitoUso;
  
  /** Frequência de uso na documentação */
  frequenciaUso: FrequenciaUso;
  
  /** Público-alvo que deve conhecer o termo */
  publico: NivelTecnico;
  
  /** Situações específicas onde o termo é usado */
  situacoes: string[];
  
  /** Contextos onde o termo NÃO deve ser usado */
  contextosInadequados?: string[];
}

export interface ExemploUso {
  /** Contexto do exemplo */
  contexto: string;
  
  /** Frase ou texto de exemplo */
  frase: string;
  
  /** Código de exemplo (opcional) */
  codigo?: string;
  
  /** Linguagem do código (se aplicável) */
  linguagem?: 'typescript' | 'javascript' | 'json' | 'bash' | 'markdown';
  
  /** Explicação do exemplo */
  explicacao: string;
  
  /** Nível de complexidade do exemplo */
  complexidade: NivelTecnico;
}

export interface FonteReferencia {
  /** Título da fonte */
  titulo: string;
  
  /** URL da fonte */
  url: string;
  
  /** Tipo de fonte */
  tipo: 'documentacao-oficial' | 'artigo' | 'livro' | 'video' | 'curso' | 'forum';
  
  /** Idioma da fonte */
  idioma: 'pt-BR' | 'en' | 'es' | 'outro';
  
  /** Confiabilidade da fonte (1-5) */
  confiabilidade: number;
  
  /** Data de acesso ou publicação */
  data?: string;
}

export interface MetadadosTermo {
  /** ID único do termo */
  id: string;
  
  /** Data de criação */
  criadoEm: Date;
  
  /** Data da última atualização */
  atualizadoEm: Date;
  
  /** Autor da definição */
  autor: string;
  
  /** Revisor da definição */
  revisor?: string;
  
  /** Versão da definição */
  versao: string;
  
  /** Status da definição */
  status: 'rascunho' | 'revisao' | 'aprovado' | 'publicado' | 'obsoleto';
  
  /** Tags para busca */
  tags: string[];
  
  /** Número de visualizações */
  visualizacoes?: number;
  
  /** Avaliação da comunidade (1-5) */
  avaliacao?: number;
}

// Estruturas de relacionamento
export interface RelacionamentoTermos {
  /** Termo origem */
  termoOrigem: string;
  
  /** Termo destino */
  termoDestino: string;
  
  /** Tipo de relacionamento */
  tipo: TipoRelacionamento;
  
  /** Descrição do relacionamento */
  descricao?: string;
  
  /** Força do relacionamento (1-5) */
  forca: number;
}

export interface CategoriaTermos {
  /** Nome da categoria */
  nome: CategoriaTermos;
  
  /** Descrição da categoria */
  descricao: string;
  
  /** Categoria pai (para hierarquia) */
  categoriaPai?: CategoriaTermos;
  
  /** Subcategorias */
  subcategorias: CategoriaTermos[];
  
  /** Cor para visualização */
  cor: string;
  
  /** Ícone para visualização */
  icone: string;
}

// Estrutura principal do glossário
export interface GlossarioTecnico {
  /** Mapa de todos os termos */
  termos: Map<string, TermoTecnico>;
  
  /** Mapa de categorias */
  categorias: Map<string, CategoriaTermos>;
  
  /** Mapa de relacionamentos */
  relacionamentos: Map<string, RelacionamentoTermos[]>;
  
  /** Índice de busca */
  indiceBusca: IndiceBusca;
  
  /** Metadados do glossário */
  metadados: MetadadosGlossario;
}

export interface IndiceBusca {
  /** Índice por termo */
  porTermo: Map<string, string[]>;
  
  /** Índice por categoria */
  porCategoria: Map<CategoriaTermos, string[]>;
  
  /** Índice por nível técnico */
  porNivel: Map<NivelTecnico, string[]>;
  
  /** Índice por tags */
  porTags: Map<string, string[]>;
  
  /** Índice de texto completo */
  textoCompleto: Map<string, string[]>;
}

export interface MetadadosGlossario {
  /** Versão do glossário */
  versao: string;
  
  /** Data de criação */
  criadoEm: Date;
  
  /** Data da última atualização */
  atualizadoEm: Date;
  
  /** Número total de termos */
  totalTermos: number;
  
  /** Estatísticas por categoria */
  estatisticasCategorias: Map<CategoriaTermos, number>;
  
  /** Idioma principal */
  idioma: 'pt-BR';
  
  /** Autores contribuidores */
  autores: string[];
  
  /** Revisores */
  revisores: string[];
}

// Tipos para validação e qualidade
export interface ValidacaoTerminologia {
  /** Termo sendo validado */
  termo: string;
  
  /** Resultado da validação */
  valido: boolean;
  
  /** Erros encontrados */
  erros: ErroValidacao[];
  
  /** Avisos */
  avisos: AvisoValidacao[];
  
  /** Sugestões de melhoria */
  sugestoes: SugestaoMelhoria[];
}

export interface ErroValidacao {
  /** Código do erro */
  codigo: string;
  
  /** Tipo do erro */
  tipo: 'consistencia' | 'formato' | 'conteudo' | 'referencia';
  
  /** Mensagem do erro */
  mensagem: string;
  
  /** Severidade */
  severidade: 'critico' | 'alto' | 'medio' | 'baixo';
  
  /** Sugestão de correção */
  correcao?: string;
}

export interface AvisoValidacao {
  /** Código do aviso */
  codigo: string;
  
  /** Mensagem do aviso */
  mensagem: string;
  
  /** Recomendação */
  recomendacao?: string;
}

export interface SugestaoMelhoria {
  /** Tipo de melhoria */
  tipo: 'definicao' | 'exemplo' | 'referencia' | 'relacionamento';
  
  /** Descrição da melhoria */
  descricao: string;
  
  /** Prioridade */
  prioridade: 'alta' | 'media' | 'baixa';
  
  /** Implementação sugerida */
  implementacao?: string;
}

// Tipos para exportação e importação
export interface ExportacaoGlossario {
  /** Formato de exportação */
  formato: 'json' | 'markdown' | 'csv' | 'xml' | 'yaml';
  
  /** Dados exportados */
  dados: unknown;
  
  /** Metadados da exportação */
  metadados: {
    dataExportacao: Date;
    versao: string;
    totalTermos: number;
    filtros?: FiltroExportacao;
  };
}

export interface FiltroExportacao {
  /** Categorias a incluir */
  categorias?: CategoriaTermos[];
  
  /** Níveis técnicos a incluir */
  niveis?: NivelTecnico[];
  
  /** Status a incluir */
  status?: MetadadosTermo['status'][];
  
  /** Tags a incluir */
  tags?: string[];
}