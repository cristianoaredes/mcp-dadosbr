# Exemplos Básicos

> **Sobre esta Seção**
> - **Propósito**: Exemplos práticos para começar com MCP DadosBR
> - **Público-alvo**: Desenvolvedores brasileiros iniciantes e intermediários
> - **Pré-requisitos**: Conhecimento básico de TypeScript/JavaScript

## 📚 Índice de Exemplos

### 🚀 Primeiros Passos
- [**Instalação e Configuração**](instalacao-configuracao.md) - Setup inicial do MCP DadosBR
- [**Primeira Consulta CNPJ**](primeira-consulta-cnpj.md) - Exemplo básico de consulta
- [**Primeira Consulta CEP**](primeira-consulta-cep.md) - Exemplo básico de endereço

### 🔧 Integração com IDEs
- [**VS Code + Claude**](vscode-claude.md) - Configuração para desenvolvimento
- [**Cursor Integration**](cursor-integration.md) - Setup com Cursor AI
- [**Terminal Usage**](terminal-usage.md) - Uso via linha de comando

### 🌐 Aplicações Web
- [**React Integration**](react-integration.md) - Integração com React
- [**Node.js API**](nodejs-api.md) - Servidor HTTP simples
- [**Express Middleware**](express-middleware.md) - Middleware para Express

### 📊 Casos de Uso Brasileiros
- [**Validação de Fornecedores**](validacao-fornecedores.md) - Validar CNPJs de fornecedores
- [**Calculadora de Frete**](calculadora-frete.md) - Calcular frete por CEP
- [**Onboarding de Clientes**](onboarding-clientes.md) - Validação em cadastros

## 🎯 Exemplo Rápido

### Consulta Básica de CNPJ

```typescript
// Exemplo mínimo de consulta CNPJ
import { MCPClient } from '@modelcontextprotocol/client';

async function consultarEmpresa(cnpj: string) {
  const client = new MCPClient();
  
  try {
    const resultado = await client.call('cnpj_lookup', { cnpj });
    
    if (resultado.ok) {
      console.log('Empresa:', resultado.data.razaoSocial);
      console.log('Situação:', resultado.data.situacao);
    } else {
      console.error('Erro:', resultado.error);
    }
  } catch (error) {
    console.error('Falha na consulta:', error.message);
  }
}

// Usar com CNPJ da Petrobras
consultarEmpresa('33.000.167/0001-01');
```

### Consulta Básica de CEP

```typescript
// Exemplo mínimo de consulta CEP
async function consultarEndereco(cep: string) {
  const client = new MCPClient();
  
  try {
    const resultado = await client.call('cep_lookup', { cep });
    
    if (resultado.ok) {
      const { logradouro, bairro, cidade, uf } = resultado.data;
      console.log(`${logradouro}, ${bairro} - ${cidade}/${uf}`);
    } else {
      console.error('Erro:', resultado.error);
    }
  } catch (error) {
    console.error('Falha na consulta:', error.message);
  }
}

// Usar com CEP da Avenida Paulista
consultarEndereco('01310-100');
```

## 🛠️ Setup Rápido

### 1. Instalação

```bash
# Via npm
npm install -g @aredes.me/mcp-dadosbr

# Via npx (sem instalação)
npx @aredes.me/mcp-dadosbr
```

### 2. Configuração Básica

```json
// .mcprc.json (opcional)
{
  "timeout": 8000,
  "cache": {
    "ttl": 60000,
    "maxSize": 256
  },
  "apis": {
    "cnpj": "https://api.opencnpj.org",
    "cep": "https://opencep.com/v1"
  }
}
```

### 3. Teste de Funcionamento

```bash
# Testar via stdio
echo '{"method": "tools/list"}' | npx @aredes.me/mcp-dadosbr

# Testar via HTTP
MCP_TRANSPORT=http npx @aredes.me/mcp-dadosbr &
curl http://localhost:3000/health
```

## 📖 Guias por Nível

### 🟢 Iniciante
Se você está começando com MCP DadosBR:

1. **[Instalação e Configuração](instalacao-configuracao.md)** - Setup básico
2. **[Primeira Consulta CNPJ](primeira-consulta-cnpj.md)** - Exemplo simples
3. **[VS Code + Claude](vscode-claude.md)** - Integração com IDE

### 🟡 Intermediário
Se você já conhece o básico:

1. **[React Integration](react-integration.md)** - Aplicações web
2. **[Node.js API](nodejs-api.md)** - Servidor próprio
3. **[Validação de Fornecedores](validacao-fornecedores.md)** - Caso de uso real

### 🔴 Avançado
Para uso em produção:

1. **[Express Middleware](express-middleware.md)** - Integração robusta
2. **[Onboarding de Clientes](onboarding-clientes.md)** - Sistema completo
3. **[Performance e Monitoramento](../avancados/performance-monitoramento.md)** - Otimização

## 🇧🇷 Contexto Brasileiro

### Dados de Teste Reais

```typescript
// CNPJs de empresas conhecidas para teste
const CNPJS_TESTE = {
  PETROBRAS: '33.000.167/0001-01',
  VALE: '33.592.510/0001-54', 
  ITAU: '60.701.190/0001-04',
  BRADESCO: '60.746.948/0001-12',
  AMBEV: '07.526.557/0001-00'
};

// CEPs de locais conhecidos para teste
const CEPS_TESTE = {
  AVENIDA_PAULISTA: '01310-100',
  COPACABANA: '22070-900',
  CENTRO_BRASILIA: '70040-010',
  PELOURINHO_SALVADOR: '40026-010',
  CENTRO_RECIFE: '50030-230'
};
```

### Tratamento de Dados Brasileiros

```typescript
// Função para formatar CNPJ
function formatarCnpj(cnpj: string): string {
  const limpo = cnpj.replace(/\D/g, '');
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Função para formatar CEP
function formatarCep(cep: string): string {
  const limpo = cep.replace(/\D/g, '');
  return limpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

// Função para validar UF
function validarUF(uf: string): boolean {
  const ufsValidas = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  
  return ufsValidas.includes(uf.toUpperCase());
}
```

## 🔍 Troubleshooting Rápido

### Problemas Comuns

#### ❌ "Comando não encontrado"
```bash
# Solução: Instalar globalmente
npm install -g @aredes.me/mcp-dadosbr

# Ou usar npx
npx @aredes.me/mcp-dadosbr@latest
```

#### ❌ "Timeout na consulta"
```bash
# Solução: Aumentar timeout
MCP_TIMEOUT=15000 npx @aredes.me/mcp-dadosbr
```

#### ❌ "CNPJ não encontrado"
```typescript
// Verificar se CNPJ está correto
const cnpjLimpo = cnpj.replace(/\D/g, '');
console.log('CNPJ normalizado:', cnpjLimpo);
```

#### ❌ "Rate limit atingido"
```typescript
// Aguardar e tentar novamente
setTimeout(() => {
  consultarCnpj(cnpj);
}, 5000); // 5 segundos
```

## 📞 Suporte

### Recursos de Ajuda

- **Documentação**: [docs/pt-br/](../)
- **Issues**: [GitHub Issues](https://github.com/aredes-me/mcp-dadosbr/issues)
- **Discussões**: [GitHub Discussions](https://github.com/aredes-me/mcp-dadosbr/discussions)
- **Email**: Para questões específicas

### Comunidade Brasileira

- **Telegram**: Grupo de desenvolvedores brasileiros
- **Discord**: Canal #mcp-dadosbr
- **LinkedIn**: Grupo MCP Brasil

---

**💡 Dica**: Comece com os exemplos básicos e vá evoluindo. A documentação está organizada de forma progressiva para facilitar o aprendizado.

**🏷️ Tags**: exemplos, tutorial, iniciante, mcp, dados-brasileiros