# Primeira Consulta CNPJ

> **Exemplo Prático**
> - **Nível**: Iniciante
> - **Tempo**: 5 minutos
> - **Pré-requisitos**: Node.js instalado

## 🎯 Objetivo

Aprender a fazer sua primeira consulta de CNPJ usando o MCP DadosBR, desde a instalação até ver os dados da empresa na tela.

## 🚀 Passo a Passo

### 1. Instalação Rápida

```bash
# Opção 1: Instalar globalmente
npm install -g @aredes.me/mcp-dadosbr

# Opção 2: Usar diretamente (recomendado para teste)
npx @aredes.me/mcp-dadosbr@latest
```

### 2. Teste Básico

```bash
# Testar se está funcionando
echo '{"method": "tools/list"}' | npx @aredes.me/mcp-dadosbr
```

**Resposta esperada:**
```json
{
  "tools": [
    {
      "name": "cnpj_lookup",
      "description": "Consulta dados de empresa brasileira por CNPJ"
    },
    {
      "name": "cep_lookup", 
      "description": "Consulta dados de endereço brasileiro por CEP"
    }
  ]
}
```

### 3. Primeira Consulta CNPJ

```bash
# Consultar CNPJ da Petrobras
echo '{
  "method": "tools/call",
  "params": {
    "name": "cnpj_lookup",
    "arguments": {
      "cnpj": "33.000.167/0001-01"
    }
  }
}' | npx @aredes.me/mcp-dadosbr
```

**Resposta esperada:**
```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"ok\": true,
      \"data\": {
        \"cnpj\": \"33000167000101\",
        \"razaoSocial\": \"PETRÓLEO BRASILEIRO S.A. - PETROBRAS\",
        \"nomeFantasia\": \"PETROBRAS\",
        \"situacao\": \"ATIVA\",
        \"dataAbertura\": \"1954-10-03\",
        \"endereco\": {
          \"logradouro\": \"AVENIDA REPÚBLICA DO CHILE\",
          \"numero\": \"65\",
          \"bairro\": \"CENTRO\",
          \"cidade\": \"RIO DE JANEIRO\",
          \"uf\": \"RJ\",
          \"cep\": \"20031912\"
        }
      },
      \"fonte\": \"https://api.opencnpj.org\",
      \"timestamp\": \"2024-01-15T10:30:45.123Z\"
    }"
  }]
}
```

## 💻 Exemplo em JavaScript

### Script Node.js Simples

```javascript
// consulta-cnpj.js
const { spawn } = require('child_process');

async function consultarCnpj(cnpj) {
  return new Promise((resolve, reject) => {
    const processo = spawn('npx', ['@aredes.me/mcp-dadosbr@latest']);
    
    let resposta = '';
    let erro = '';
    
    // Capturar resposta
    processo.stdout.on('data', (data) => {
      resposta += data.toString();
    });
    
    // Capturar erros
    processo.stderr.on('data', (data) => {
      erro += data.toString();
    });
    
    // Quando terminar
    processo.on('close', (codigo) => {
      if (codigo === 0) {
        try {
          const resultado = JSON.parse(resposta);
          resolve(resultado);
        } catch (e) {
          reject(new Error('Resposta inválida: ' + resposta));
        }
      } else {
        reject(new Error('Erro na consulta: ' + erro));
      }
    });
    
    // Enviar requisição
    const requisicao = {
      method: "tools/call",
      params: {
        name: "cnpj_lookup",
        arguments: { cnpj }
      }
    };
    
    processo.stdin.write(JSON.stringify(requisicao));
    processo.stdin.end();
  });
}

// Usar a função
async function main() {
  try {
    console.log('Consultando CNPJ da Petrobras...');
    
    const resultado = await consultarCnpj('33.000.167/0001-01');
    const dados = JSON.parse(resultado.content[0].text);
    
    if (dados.ok) {
      console.log('✅ Empresa encontrada!');
      console.log('Razão Social:', dados.data.razaoSocial);
      console.log('Nome Fantasia:', dados.data.nomeFantasia);
      console.log('Situação:', dados.data.situacao);
      console.log('Cidade:', dados.data.endereco.cidade, '/', dados.data.endereco.uf);
    } else {
      console.log('❌ Erro:', dados.error);
    }
    
  } catch (error) {
    console.error('❌ Falha na consulta:', error.message);
  }
}

main();
```

### Executar o Script

```bash
# Salvar como consulta-cnpj.js e executar
node consulta-cnpj.js
```

**Saída esperada:**
```
Consultando CNPJ da Petrobras...
✅ Empresa encontrada!
Razão Social: PETRÓLEO BRASILEIRO S.A. - PETROBRAS
Nome Fantasia: PETROBRAS
Situação: ATIVA
Cidade: RIO DE JANEIRO / RJ
```

## 🔧 Exemplo com TypeScript

### Versão Tipada

```typescript
// consulta-cnpj.ts
interface DadosEmpresa {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao: 'ATIVA' | 'SUSPENSA' | 'INAPTA' | 'BAIXADA';
  dataAbertura: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
}

interface RespostaMCP {
  ok: boolean;
  data?: DadosEmpresa;
  error?: string;
  fonte?: string;
  timestamp?: string;
}

class ConsultorCnpj {
  async consultar(cnpj: string): Promise<RespostaMCP> {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const processo = spawn('npx', ['@aredes.me/mcp-dadosbr@latest']);
      
      let resposta = '';
      
      processo.stdout.on('data', (data) => {
        resposta += data.toString();
      });
      
      processo.on('close', (codigo) => {
        if (codigo === 0) {
          try {
            const resultado = JSON.parse(resposta);
            const dados = JSON.parse(resultado.content[0].text);
            resolve(dados);
          } catch (e) {
            reject(new Error('Resposta inválida'));
          }
        } else {
          reject(new Error('Erro na consulta'));
        }
      });
      
      const requisicao = {
        method: "tools/call",
        params: {
          name: "cnpj_lookup",
          arguments: { cnpj }
        }
      };
      
      processo.stdin.write(JSON.stringify(requisicao));
      processo.stdin.end();
    });
  }
  
  formatarCnpj(cnpj: string): string {
    const limpo = cnpj.replace(/\D/g, '');
    return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  
  async consultarEExibir(cnpj: string): Promise<void> {
    try {
      console.log(`Consultando CNPJ: ${this.formatarCnpj(cnpj)}`);
      
      const resultado = await this.consultar(cnpj);
      
      if (resultado.ok && resultado.data) {
        const empresa = resultado.data;
        
        console.log('\n✅ Empresa encontrada!');
        console.log('━'.repeat(50));
        console.log(`Razão Social: ${empresa.razaoSocial}`);
        
        if (empresa.nomeFantasia) {
          console.log(`Nome Fantasia: ${empresa.nomeFantasia}`);
        }
        
        console.log(`Situação: ${empresa.situacao}`);
        console.log(`Data de Abertura: ${new Date(empresa.dataAbertura).toLocaleDateString('pt-BR')}`);
        
        console.log('\n📍 Endereço:');
        console.log(`${empresa.endereco.logradouro}, ${empresa.endereco.numero}`);
        console.log(`${empresa.endereco.bairro} - ${empresa.endereco.cidade}/${empresa.endereco.uf}`);
        console.log(`CEP: ${empresa.endereco.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}`);
        
      } else {
        console.log('❌ Erro:', resultado.error);
      }
      
    } catch (error) {
      console.error('❌ Falha na consulta:', error.message);
    }
  }
}

// Usar a classe
async function main() {
  const consultor = new ConsultorCnpj();
  
  // Testar com diferentes empresas
  const empresas = [
    '33.000.167/0001-01', // Petrobras
    '60.701.190/0001-04', // Itaú
    '07.526.557/0001-00'  // Ambev
  ];
  
  for (const cnpj of empresas) {
    await consultor.consultarEExibir(cnpj);
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

main();
```

## 🧪 Testando Diferentes CNPJs

### CNPJs de Empresas Conhecidas

```javascript
// Teste com várias empresas brasileiras
const EMPRESAS_TESTE = {
  'Petrobras': '33.000.167/0001-01',
  'Vale': '33.592.510/0001-54',
  'Itaú Unibanco': '60.701.190/0001-04',
  'Bradesco': '60.746.948/0001-12',
  'Ambev': '07.526.557/0001-00',
  'JBS': '02.916.265/0001-60',
  'Magazine Luiza': '47.960.950/0001-21'
};

async function testarEmpresas() {
  for (const [nome, cnpj] of Object.entries(EMPRESAS_TESTE)) {
    console.log(`\nTestando: ${nome} (${cnpj})`);
    
    try {
      const resultado = await consultarCnpj(cnpj);
      const dados = JSON.parse(resultado.content[0].text);
      
      if (dados.ok) {
        console.log(`✅ ${dados.data.razaoSocial}`);
        console.log(`   Situação: ${dados.data.situacao}`);
        console.log(`   Cidade: ${dados.data.endereco.cidade}/${dados.data.endereco.uf}`);
      } else {
        console.log(`❌ ${dados.error}`);
      }
      
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
    
    // Aguardar um pouco entre consultas para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testarEmpresas();
```

## ⚠️ Tratamento de Erros

### Erros Comuns e Soluções

```javascript
async function consultarCnpjComTratamento(cnpj) {
  try {
    const resultado = await consultarCnpj(cnpj);
    const dados = JSON.parse(resultado.content[0].text);
    
    if (dados.ok) {
      return dados.data;
    } else {
      // Tratar diferentes tipos de erro
      switch (dados.codigo) {
        case 'CNPJ_NOT_FOUND':
          throw new Error(`CNPJ ${cnpj} não encontrado na Receita Federal`);
          
        case 'RATE_LIMIT':
          throw new Error('Muitas consultas. Aguarde alguns segundos e tente novamente');
          
        case 'TIMEOUT':
          throw new Error('Timeout na consulta. Verifique sua conexão');
          
        case 'VALIDATION_ERROR':
          throw new Error(`CNPJ ${cnpj} tem formato inválido`);
          
        default:
          throw new Error(dados.error || 'Erro desconhecido');
      }
    }
    
  } catch (error) {
    console.error('Erro na consulta CNPJ:', error.message);
    throw error;
  }
}

// Exemplo de uso com retry
async function consultarComRetry(cnpj, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await consultarCnpjComTratamento(cnpj);
    } catch (error) {
      if (error.message.includes('Rate limit') && i < tentativas - 1) {
        console.log(`Tentativa ${i + 1} falhou. Aguardando 5 segundos...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      throw error;
    }
  }
}
```

## 🚀 Próximos Passos

Agora que você fez sua primeira consulta CNPJ:

1. **[Primeira Consulta CEP](primeira-consulta-cep.md)** - Aprender a consultar endereços
2. **[VS Code + Claude](vscode-claude.md)** - Integrar com seu IDE
3. **[React Integration](react-integration.md)** - Usar em aplicações web

---

**💡 Dica**: Salve os scripts de exemplo e use como base para seus próprios projetos. Eles já incluem tratamento de erro e boas práticas.

**🏷️ Tags**: cnpj, primeira-consulta, tutorial, javascript, typescript