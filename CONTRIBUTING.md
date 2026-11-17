# Contributing to MCP DadosBR

_Obrigado por seu interesse em contribuir! / Thank you for your interest in contributing!_

## 🌍 Languages / Idiomas

- [English](#english)
- [Português](#português)

---

## English

We welcome contributions from developers around the world! This guide will help you get started.

### 🚀 Quick Start

Use Node.js 22.12+, 24, or 26.

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/your-username/mcp-dadosbr.git`
3. **Install** dependencies: `npm ci`
4. **Build** the project: `npm run build`
5. **Run** tests: `npm test`

### 🏗️ Development Guidelines

#### Code Standards

- **Single File Architecture**: Keep all implementation in `server.ts`
- **Line Limit**: Target ~300 lines, maximum 350 lines
- **Pure Functions**: Prefer functions over classes (except for cache and HTTP server)
- **TypeScript**: Use strict TypeScript with proper typing
- **ESM Modules**: Use import/export syntax
- **Minimal Dependencies**: Only add essential packages

#### Architecture Principles

- **KISS**: Keep It Simple, Stupid
- **YAGNI**: You Aren't Gonna Need It
- **SRP**: Single Responsibility Principle
- **Performance**: Built-in caching, deduplication, circuit breaker
- **Reliability**: Comprehensive error handling and timeout protection

#### Testing Requirements

- All new features must include tests
- Run `npm test` before submitting
- Run `npm run test:transport` after the build to check stdio and HTTP/SSE
- Validate with real MCP clients when possible

### 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment**: Node.js version, OS, MCP client used
2. **Steps to reproduce**: Clear, step-by-step instructions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Logs**: Include relevant error messages or logs
6. **Configuration**: Share your .mcprc.json or environment variables

### 💡 Feature Requests

Before requesting features:

1. **Check existing issues** to avoid duplicates
2. **Consider the scope**: Does it fit the minimal, single-file architecture?
3. **Provide use cases**: Explain why the feature is needed
4. **Consider alternatives**: Are there existing ways to achieve the goal?

### 🔧 Development Process

We use **Git Flow** workflow to keep the master branch stable:

1. **Create an issue** to discuss your changes
2. **Fork and branch**: Create a feature branch from `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```
3. **Develop**: Make your changes following the guidelines
4. **Test**: Ensure all tests pass and add new tests
5. **Document**: Update README and docs as needed
6. **Submit**: Create a pull request to `develop` branch (not master)
7. **Review**: Wait for code review and address feedback
8. **Merge**: After approval, feature is merged to develop
9. **Release**: Periodically, develop is merged to master for releases

### 🌳 Branch Structure

- **`master`**: Stable release branch (protected)
- **`develop`**: Main development branch (default for PRs)
- **`feature/*`**: Feature development branches
- **`hotfix/*`**: Emergency fixes (branch from master, merge to both master and develop)

### 📝 Commit Messages

Use conventional commits format:

```
type(scope): description

feat(cnpj): add CNPJ validation enhancement
fix(cache): resolve memory leak in LRU eviction
docs(readme): update integration examples
test(http): add HTTP transport integration tests
```

### 🔍 Code Review Process

All contributions go through code review:

1. **Automated checks**: CI/CD pipeline runs tests and linting
2. **Manual review**: Maintainers review code quality and architecture
3. **Testing**: Changes are tested with real MCP clients
4. **Documentation**: Ensure docs are updated appropriately

---

## Português

Damos as boas-vindas a contribuições de desenvolvedores do mundo todo! Este guia ajudará você a começar.

### 🚀 Início Rápido

Use Node.js 22.12+, 24 ou 26.

1. **Faça um fork** do repositório
2. **Clone** seu fork: `git clone https://github.com/seu-usuario/mcp-dadosbr.git`
3. **Instale** dependências: `npm ci`
4. **Construa** o projeto: `npm run build`
5. **Execute** testes: `npm test`

### 🏗️ Diretrizes de Desenvolvimento

#### Padrões de Código

- **Arquitetura de Arquivo Único**: Mantenha toda implementação em `server.ts`
- **Limite de Linhas**: Meta ~300 linhas, máximo 350 linhas
- **Funções Puras**: Prefira funções a classes (exceto para cache e servidor HTTP)
- **TypeScript**: Use TypeScript estrito com tipagem adequada
- **Módulos ESM**: Use sintaxe import/export
- **Dependências Mínimas**: Adicione apenas pacotes essenciais

#### Princípios de Arquitetura

- **KISS**: Mantenha Simples
- **YAGNI**: Você Não Vai Precisar Disso
- **SRP**: Princípio da Responsabilidade Única
- **Performance**: Cache integrado, deduplicação, circuit breaker
- **Confiabilidade**: Tratamento abrangente de erros e proteção por timeout

#### Requisitos de Teste

- Todas as novas funcionalidades devem incluir testes
- Execute `npm test` antes de submeter
- Execute `npm run test:transport` após o build para validar stdio e HTTP/SSE
- Valide com clientes MCP reais quando possível

### 🐛 Relatórios de Bug

Ao relatar bugs, inclua:

1. **Ambiente**: Versão do Node.js, SO, cliente MCP usado
2. **Passos para reproduzir**: Instruções claras, passo a passo
3. **Comportamento esperado**: O que deveria acontecer
4. **Comportamento atual**: O que realmente acontece
5. **Logs**: Inclua mensagens de erro ou logs relevantes
6. **Configuração**: Compartilhe seu .mcprc.json ou variáveis de ambiente

### 💡 Solicitações de Funcionalidades

Antes de solicitar funcionalidades:

1. **Verifique issues existentes** para evitar duplicatas
2. **Considere o escopo**: Se encaixa na arquitetura mínima de arquivo único?
3. **Forneça casos de uso**: Explique por que a funcionalidade é necessária
4. **Considere alternativas**: Existem maneiras existentes de alcançar o objetivo?

### 🔧 Processo de Desenvolvimento

Usamos o fluxo **Git Flow** para manter a branch master estável:

1. **Crie uma issue** para discutir suas mudanças
2. **Fork e branch**: Crie uma branch de funcionalidade a partir de `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nome-da-sua-funcionalidade
   ```
3. **Desenvolva**: Faça suas mudanças seguindo as diretrizes
4. **Teste**: Garanta que todos os testes passem e adicione novos testes
5. **Documente**: Atualize README e docs conforme necessário
6. **Submeta**: Crie um pull request para a branch `develop` (não master)
7. **Revisão**: Aguarde revisão de código e atenda ao feedback
8. **Merge**: Após aprovação, funcionalidade é mesclada ao develop
9. **Release**: Periodicamente, develop é mesclado ao master para releases

### 🌳 Estrutura de Branches

- **`master`**: Branch de release estável (protegida)
- **`develop`**: Branch principal de desenvolvimento (padrão para PRs)
- **`feature/*`**: Branches de desenvolvimento de funcionalidades
- **`hotfix/*`**: Correções emergenciais (branch do master, merge para master e develop)

### 📝 Mensagens de Commit

Use o formato de commits convencionais:

```
tipo(escopo): descrição

feat(cnpj): adicionar melhoria na validação de CNPJ
fix(cache): resolver vazamento de memória na remoção LRU
docs(readme): atualizar exemplos de integração
test(http): adicionar testes de integração do transporte HTTP
```

### 🔍 Processo de Revisão de Código

Todas as contribuições passam por revisão de código:

1. **Verificações automatizadas**: Pipeline CI/CD executa testes e linting
2. **Revisão manual**: Mantenedores revisam qualidade do código e arquitetura
3. **Testes**: Mudanças são testadas com clientes MCP reais
4. **Documentação**: Garantir que docs sejam atualizadas adequadamente

---

## 🎯 Areas for Contribution

### High Priority

- **HTTP Transport Improvements**: Fix Streamable HTTP connection issues
- **Performance Optimization**: Further reduce line count while maintaining features
- **MCP Resources**: Re-implement resources feature within line constraints
- **Error Handling**: Enhanced error codes and context

### Medium Priority

- **Additional Validation**: Enhanced CNPJ/CEP validation algorithms
- **Monitoring**: Advanced metrics and alerting
- **Configuration**: Hot reload and validation improvements
- **Documentation**: More real-world examples and tutorials

### Low Priority

- **Internationalization**: Support for additional languages
- **Additional APIs**: Integration with other Brazilian public data sources
- **Performance**: Micro-optimizations and benchmarking
- **Tooling**: Development and debugging improvements

---

## 🏆 Recognition

Contributors will be recognized in:

- **README.md**: Maintainers section
- **CHANGELOG.md**: Feature attribution
- **GitHub**: Contributor graphs and statistics
- **Releases**: Contribution highlights

---

## 📞 Questions?

- **GitHub Discussions**: For general questions and ideas
- **Issues**: For bugs and feature requests
- **Email**: [cristiano@aredes.me](mailto:cristiano@aredes.me) for private matters

---

**Thank you for helping make Brazilian public data more accessible! 🇧🇷**
**Obrigado por ajudar a tornar os dados públicos brasileiros mais acessíveis! 🇧🇷**
