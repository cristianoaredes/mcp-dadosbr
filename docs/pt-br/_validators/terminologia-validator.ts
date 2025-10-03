/**
 * Validador de Terminologia para Documentação PT-BR
 * Garante consistência e qualidade dos termos técnicos
 */

import {
  TermoTecnico,
  GlossarioTecnico,
  ValidacaoTerminologia,
  ErroValidacao,
  AvisoValidacao,
  SugestaoMelhoria,
  CategoriaTermos,
  NivelTecnico,
  AmbitoUso,
} from "../_schemas/glossario-types.js";

export class ValidadorTerminologia {
  private glossario: GlossarioTecnico;
  private regrasValidacao: Map<string, RegraValidacao>;
  private dicionarioPTBR: Set<string>;
  private termosReservados: Set<string>;

  constructor(glossario: GlossarioTecnico) {
    this.glossario = glossario;
    this.regrasValidacao = this.inicializarRegras();
    this.dicionarioPTBR = this.carregarDicionarioPTBR();
    this.termosReservados = this.carregarTermosReservados();
  }

  /**
   * Valida um termo técnico completo
   */
  public validarTermo(termo: TermoTecnico): ValidacaoTerminologia {
    const resultado: ValidacaoTerminologia = {
      termo: termo.termo,
      valido: true,
      erros: [],
      avisos: [],
      sugestoes: [],
    };

    // Executar todas as regras de validação
    for (const [nomeRegra, regra] of this.regrasValidacao) {
      try {
        const resultadoRegra = regra.validar(termo, this.glossario);

        resultado.erros.push(...resultadoRegra.erros);
        resultado.avisos.push(...resultadoRegra.avisos);
        resultado.sugestoes.push(...resultadoRegra.sugestoes);
      } catch (error) {
        resultado.erros.push({
          codigo: "ERRO_VALIDACAO",
          tipo: "conteudo",
          mensagem: `Erro ao executar regra ${nomeRegra}: ${error.message}`,
          severidade: "alto",
        });
      }
    }

    // Determinar se o termo é válido
    resultado.valido =
      resultado.erros.filter(
        (e) => e.severidade === "critico" || e.severidade === "alto"
      ).length === 0;

    return resultado;
  }

  /**
   * Valida consistência entre termos
   */
  public validarConsistencia(documento: string): ValidacaoTerminologia[] {
    const termosEncontrados = this.extrairTermosDoTexto(documento);
    const resultados: ValidacaoTerminologia[] = [];

    for (const termoTexto of termosEncontrados) {
      const termo = this.glossario.termos.get(termoTexto);

      if (termo) {
        // Termo existe no glossário - validar uso
        const validacao = this.validarUsoTermo(termoTexto, documento, termo);
        resultados.push(validacao);
      } else {
        // Termo não existe no glossário - pode ser inconsistência
        const validacao = this.validarTermoNaoDefinido(termoTexto, documento);
        resultados.push(validacao);
      }
    }

    return resultados;
  }

  /**
   * Sugere melhorias para um termo
   */
  public sugerirMelhorias(termo: TermoTecnico): SugestaoMelhoria[] {
    const sugestoes: SugestaoMelhoria[] = [];

    // Verificar qualidade da definição
    if (termo.definicao.resumo.length < 20) {
      sugestoes.push({
        tipo: "definicao",
        descricao:
          "Definição resumida muito curta. Considere expandir para pelo menos 20 caracteres.",
        prioridade: "media",
        implementacao: "Adicione mais contexto à definição resumida",
      });
    }

    // Verificar exemplos
    if (termo.exemplos.length === 0) {
      sugestoes.push({
        tipo: "exemplo",
        descricao:
          "Termo sem exemplos práticos. Adicione pelo menos um exemplo de uso.",
        prioridade: "alta",
        implementacao: "Crie um exemplo prático mostrando o termo em contexto",
      });
    }

    // Verificar referências
    if (termo.fontes.length === 0) {
      sugestoes.push({
        tipo: "referencia",
        descricao:
          "Termo sem fontes de referência. Adicione pelo menos uma fonte confiável.",
        prioridade: "media",
        implementacao:
          "Inclua link para documentação oficial ou artigo técnico",
      });
    }

    // Verificar relacionamentos
    if (termo.termosRelacionados.length === 0 && termo.sinonimos.length === 0) {
      sugestoes.push({
        tipo: "relacionamento",
        descricao:
          "Termo isolado sem relacionamentos. Considere adicionar termos relacionados.",
        prioridade: "baixa",
        implementacao: "Identifique termos relacionados ou sinônimos",
      });
    }

    return sugestoes;
  }

  /**
   * Detecta inconsistências terminológicas no glossário
   */
  public detectarInconsistencias(): InconsistenciaTerminologia[] {
    const inconsistencias: InconsistenciaTerminologia[] = [];

    // Verificar traduções duplicadas
    const traducoes = new Map<string, string[]>();
    for (const [chave, termo] of this.glossario.termos) {
      if (termo.traducao) {
        if (!traducoes.has(termo.traducao)) {
          traducoes.set(termo.traducao, []);
        }
        traducoes.get(termo.traducao)!.push(chave);
      }
    }

    for (const [traducao, termos] of traducoes) {
      if (termos.length > 1) {
        inconsistencias.push({
          tipo: "traducao_duplicada",
          termos: termos,
          descricao: `Múltiplos termos com a mesma tradução: "${traducao}"`,
          severidade: "medio",
          sugestao:
            "Revisar se os termos são realmente sinônimos ou precisam de traduções distintas",
        });
      }
    }

    // Verificar relacionamentos bidirecionais
    for (const [chave, termo] of this.glossario.termos) {
      for (const relacionado of termo.termosRelacionados) {
        const termoRelacionado = this.glossario.termos.get(relacionado);
        if (
          termoRelacionado &&
          !termoRelacionado.termosRelacionados.includes(chave)
        ) {
          inconsistencias.push({
            tipo: "relacionamento_unidirecional",
            termos: [chave, relacionado],
            descricao: `Relacionamento unidirecional entre "${chave}" e "${relacionado}"`,
            severidade: "baixo",
            sugestao: "Considerar tornar o relacionamento bidirecional",
          });
        }
      }
    }

    return inconsistencias;
  }

  /**
   * Inicializa as regras de validação
   */
  private inicializarRegras(): Map<string, RegraValidacao> {
    const regras = new Map<string, RegraValidacao>();

    // Regra: Termo não pode estar vazio
    regras.set("termo_nao_vazio", {
      nome: "Termo Não Vazio",
      validar: (termo) => ({
        erros:
          termo.termo.trim().length === 0
            ? [
                {
                  codigo: "TERMO_VAZIO",
                  tipo: "formato",
                  mensagem: "O termo não pode estar vazio",
                  severidade: "critico",
                },
              ]
            : [],
        avisos: [],
        sugestoes: [],
      }),
    });

    // Regra: Definição resumida obrigatória
    regras.set("definicao_resumida", {
      nome: "Definição Resumida",
      validar: (termo) => ({
        erros:
          termo.definicao.resumo.trim().length === 0
            ? [
                {
                  codigo: "DEFINICAO_RESUMIDA_VAZIA",
                  tipo: "conteudo",
                  mensagem: "Definição resumida é obrigatória",
                  severidade: "alto",
                },
              ]
            : [],
        avisos:
          termo.definicao.resumo.length < 10
            ? [
                {
                  codigo: "DEFINICAO_MUITO_CURTA",
                  mensagem:
                    "Definição resumida muito curta (menos de 10 caracteres)",
                  recomendacao: "Expanda a definição para ser mais descritiva",
                },
              ]
            : [],
        sugestoes: [],
      }),
    });

    // Regra: Categoria válida
    regras.set("categoria_valida", {
      nome: "Categoria Válida",
      validar: (termo) => ({
        erros: !Object.values(CategoriaTermos).includes(termo.categoria)
          ? [
              {
                codigo: "CATEGORIA_INVALIDA",
                tipo: "formato",
                mensagem: `Categoria "${termo.categoria}" não é válida`,
                severidade: "alto",
                correcao: `Use uma das categorias válidas: ${Object.values(
                  CategoriaTermos
                ).join(", ")}`,
              },
            ]
          : [],
        avisos: [],
        sugestoes: [],
      }),
    });

    // Regra: Consistência de tradução
    regras.set("consistencia_traducao", {
      nome: "Consistência de Tradução",
      validar: (termo, glossario) => {
        const erros: ErroValidacao[] = [];
        const avisos: AvisoValidacao[] = [];

        if (termo.traducao) {
          // Verificar se a tradução não é igual ao termo original
          if (termo.traducao.toLowerCase() === termo.termo.toLowerCase()) {
            avisos.push({
              codigo: "TRADUCAO_IDENTICA",
              mensagem: "Tradução idêntica ao termo original",
              recomendacao:
                "Considere remover a tradução se não for necessária",
            });
          }

          // Verificar se existe outro termo com a mesma tradução
          for (const [outraChave, outroTermo] of glossario.termos) {
            if (
              outraChave !== termo.termo &&
              outroTermo.traducao?.toLowerCase() ===
                termo.traducao.toLowerCase()
            ) {
              erros.push({
                codigo: "TRADUCAO_DUPLICADA",
                tipo: "consistencia",
                mensagem: `Tradução "${termo.traducao}" já usada pelo termo "${outraChave}"`,
                severidade: "medio",
              });
            }
          }
        }

        return { erros, avisos, sugestoes: [] };
      },
    });

    // Regra: Qualidade dos exemplos
    regras.set("qualidade_exemplos", {
      nome: "Qualidade dos Exemplos",
      validar: (termo) => {
        const avisos: AvisoValidacao[] = [];
        const sugestoes: SugestaoMelhoria[] = [];

        if (termo.exemplos.length === 0) {
          avisos.push({
            codigo: "SEM_EXEMPLOS",
            mensagem: "Termo sem exemplos práticos",
            recomendacao: "Adicione pelo menos um exemplo de uso",
          });
        }

        // Verificar qualidade dos exemplos existentes
        for (const exemplo of termo.exemplos) {
          if (exemplo.explicacao.length < 10) {
            sugestoes.push({
              tipo: "exemplo",
              descricao: `Exemplo "${exemplo.contexto}" com explicação muito curta`,
              prioridade: "media",
            });
          }
        }

        return { erros: [], avisos, sugestoes };
      },
    });

    return regras;
  }

  /**
   * Carrega dicionário de palavras em português brasileiro
   */
  private carregarDicionarioPTBR(): Set<string> {
    // Em uma implementação real, isso carregaria de um arquivo
    return new Set([
      "servidor",
      "cliente",
      "requisição",
      "resposta",
      "dados",
      "configuração",
      "implementação",
      "validação",
      "autenticação",
      "autorização",
      "cache",
      "timeout",
      "endpoint",
      "middleware",
    ]);
  }

  /**
   * Carrega termos reservados que não devem ser redefinidos
   */
  private carregarTermosReservados(): Set<string> {
    return new Set([
      "MCP",
      "HTTP",
      "JSON",
      "API",
      "URL",
      "URI",
      "TCP",
      "UDP",
      "SSL",
      "TLS",
      "OAuth",
      "JWT",
      "REST",
      "GraphQL",
      "WebSocket",
    ]);
  }

  /**
   * Extrai termos técnicos de um texto
   */
  private extrairTermosDoTexto(texto: string): Set<string> {
    const termos = new Set<string>();

    // Buscar termos em código (entre backticks)
    const codigoRegex = /`([^`]+)`/g;
    let match;
    while ((match = codigoRegex.exec(texto)) !== null) {
      termos.add(match[1]);
    }

    // Buscar termos em maiúsculas (possíveis acrônimos)
    const acronimoRegex = /\b[A-Z]{2,}\b/g;
    while ((match = acronimoRegex.exec(texto)) !== null) {
      termos.add(match[0]);
    }

    // Buscar termos técnicos conhecidos
    for (const termo of this.glossario.termos.keys()) {
      if (texto.includes(termo)) {
        termos.add(termo);
      }
    }

    return termos;
  }

  /**
   * Valida o uso de um termo no contexto
   */
  private validarUsoTermo(
    termoTexto: string,
    documento: string,
    termo: TermoTecnico
  ): ValidacaoTerminologia {
    const resultado: ValidacaoTerminologia = {
      termo: termoTexto,
      valido: true,
      erros: [],
      avisos: [],
      sugestoes: [],
    };

    // Verificar se o contexto é apropriado
    const contextoInadequado = termo.contexto.contextosInadequados?.some(
      (contexto) => documento.toLowerCase().includes(contexto.toLowerCase())
    );

    if (contextoInadequado) {
      resultado.avisos.push({
        codigo: "CONTEXTO_INADEQUADO",
        mensagem: `Termo "${termoTexto}" pode não ser apropriado neste contexto`,
        recomendacao: "Verifique se o uso está adequado ao público-alvo",
      });
    }

    return resultado;
  }

  /**
   * Valida termo que não está definido no glossário
   */
  private validarTermoNaoDefinido(
    termoTexto: string,
    documento: string
  ): ValidacaoTerminologia {
    const resultado: ValidacaoTerminologia = {
      termo: termoTexto,
      valido: false,
      erros: [],
      avisos: [],
      sugestoes: [],
    };

    // Verificar se é um termo técnico que deveria estar no glossário
    if (this.pareceTermoTecnico(termoTexto)) {
      resultado.erros.push({
        codigo: "TERMO_NAO_DEFINIDO",
        tipo: "consistencia",
        mensagem: `Termo técnico "${termoTexto}" não está definido no glossário`,
        severidade: "medio",
        correcao: "Adicione o termo ao glossário ou use um termo já definido",
      });

      // Sugerir termos similares
      const similares = this.encontrarTermosSimilares(termoTexto);
      if (similares.length > 0) {
        resultado.sugestoes.push({
          tipo: "referencia",
          descricao: `Termos similares encontrados: ${similares.join(", ")}`,
          prioridade: "media",
          implementacao:
            "Considere usar um dos termos similares ou definir o novo termo",
        });
      }
    }

    return resultado;
  }

  /**
   * Verifica se uma string parece ser um termo técnico
   */
  private pareceTermoTecnico(texto: string): boolean {
    // Critérios para identificar termos técnicos:
    // 1. Está em maiúsculas (acrônimo)
    // 2. Contém caracteres especiais típicos de código
    // 3. Está na lista de termos reservados
    // 4. Segue padrões de nomenclatura técnica

    if (/^[A-Z]{2,}$/.test(texto)) return true;
    if (this.termosReservados.has(texto)) return true;
    if (/^[a-z]+[A-Z]/.test(texto)) return true; // camelCase
    if (/^[A-Z][a-z]+[A-Z]/.test(texto)) return true; // PascalCase
    if (/_/.test(texto)) return true; // snake_case

    return false;
  }

  /**
   * Encontra termos similares no glossário
   */
  private encontrarTermosSimilares(termo: string): string[] {
    const similares: string[] = [];
    const termoLower = termo.toLowerCase();

    for (const [chave, termoObj] of this.glossario.termos) {
      const chaveLower = chave.toLowerCase();

      // Verificar similaridade por substring
      if (chaveLower.includes(termoLower) || termoLower.includes(chaveLower)) {
        similares.push(chave);
      }

      // Verificar similaridade por tradução
      if (
        termoObj.traducao &&
        (termoObj.traducao.toLowerCase().includes(termoLower) ||
          termoLower.includes(termoObj.traducao.toLowerCase()))
      ) {
        similares.push(chave);
      }
    }

    return similares.slice(0, 3); // Retornar apenas os 3 mais relevantes
  }
}

// Interfaces auxiliares
interface RegraValidacao {
  nome: string;
  validar: (
    termo: TermoTecnico,
    glossario?: GlossarioTecnico
  ) => {
    erros: ErroValidacao[];
    avisos: AvisoValidacao[];
    sugestoes: SugestaoMelhoria[];
  };
}

interface InconsistenciaTerminologia {
  tipo:
    | "traducao_duplicada"
    | "relacionamento_unidirecional"
    | "categoria_inconsistente";
  termos: string[];
  descricao: string;
  severidade: "critico" | "alto" | "medio" | "baixo";
  sugestao: string;
}
