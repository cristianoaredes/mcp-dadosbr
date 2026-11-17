# MCP DadosBR - Documentação em Português Brasileiro

## 📚 Índice da Documentação

Bem-vindo à documentação completa do MCP DadosBR em português brasileiro! Esta documentação foi criada especificamente para desenvolvedores brasileiros, com exemplos, terminologia e contexto adaptados para nossa realidade.

### 🏗️ Arquitetura

- [**Visão Geral da Arquitetura**](arquitetura/visao-geral.md) - Introdução à arquitetura do sistema
- [**Arquivo Único**](arquitetura/arquivo-unico.md) - Detalhes da arquitetura de arquivo único
- [**Transporte MCP**](arquitetura/transporte-mcp.md) - Modos de transporte stdio e HTTP
- [**Limitações e Benefícios**](arquitetura/limitacoes-beneficios.md) - Análise das escolhas arquiteturais
- [**Fluxo de Dados**](arquitetura/fluxo-dados.md) - Como os dados fluem pelo sistema

### 💻 Desenvolvimento

- [**Convenções de Nomenclatura**](desenvolvimento/convencoes-nomenclatura.md) - Padrões de nomes em PT-BR
- [**Padrões de Implementação**](desenvolvimento/padroes-implementacao.md) - Melhores práticas de código
- [**Configuração do Ambiente**](desenvolvimento/configuracao-ambiente.md) - Setup do ambiente de desenvolvimento
- [**Boas Práticas**](desenvolvimento/boas-praticas.md) - Diretrizes para desenvolvimento
- [**Troubleshooting**](desenvolvimento/troubleshooting.md) - Solução de problemas comuns

### 📖 Exemplos

- [**Exemplos Básicos**](exemplos/basicos/) - Implementações simples e diretas
- [**Casos de Uso Avançados**](exemplos/avancados/) - Cenários complexos e integração
- [**Integração com Sistemas**](exemplos/integracao/) - Conectando com outros sistemas

### 📝 Glossário

- [**Termos Técnicos**](glossario/termos-tecnicos.md) - Definições e traduções
- [**Acrônimos e Siglas**](glossario/acronimos-siglas.md) - Lista de abreviações
- [**Referências Externas**](glossario/referencias-externas.md) - Links e recursos úteis

## 🚀 Início Rápido

### Para Desenvolvedores Brasileiros

Se você é um desenvolvedor brasileiro começando com o MCP DadosBR, recomendamos esta sequência:

1. **Comece aqui**: [Visão Geral da Arquitetura](arquitetura/visao-geral.md)
2. **Entenda o código**: [Convenções de Nomenclatura](desenvolvimento/convencoes-nomenclatura.md)
3. **Configure seu ambiente**: [Configuração do Ambiente](desenvolvimento/configuracao-ambiente.md)
4. **Veja na prática**: [Exemplos Básicos](exemplos/basicos/)

### Instalação Rápida

```bash
# Clone o repositório
git clone https://github.com/cristianoaredes/mcp-dadosbr.git
cd mcp-dadosbr

# Instale as dependências
npm ci

# Execute em modo de desenvolvimento
npm run dev

# Ou execute via HTTP
MCP_TRANSPORT=http npm run dev
```

## 🤝 Contribuindo

Esta documentação é um projeto vivo! Contribuições da comunidade brasileira são muito bem-vindas:

- **Melhorias na tradução**: Ajude a tornar o conteúdo mais claro
- **Exemplos brasileiros**: Adicione casos de uso com contexto nacional
- **Correções**: Encontrou um erro? Abra uma issue ou PR
- **Sugestões**: Tem ideias para melhorar? Compartilhe conosco!

### Como Contribuir

1. Faça um fork do repositório
2. Crie uma branch para sua contribuição: `git checkout -b melhoria-documentacao`
3. Faça suas alterações seguindo nossos [padrões de documentação](desenvolvimento/boas-praticas.md)
4. Teste suas alterações localmente
5. Abra um Pull Request com descrição detalhada

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/aredes-me/mcp-dadosbr/issues)
- **Discussões**: [GitHub Discussions](https://github.com/aredes-me/mcp-dadosbr/discussions)
- **Email**: Para questões específicas sobre a documentação

## 📄 Licença

Esta documentação segue a mesma licença do projeto MCP DadosBR. Consulte o arquivo LICENSE no repositório principal para detalhes.

---

**Última atualização**: ${new Date().toLocaleDateString('pt-BR')}  
**Versão da documentação**: 1.0.0  
**Compatível com**: MCP DadosBR v1.2.0+