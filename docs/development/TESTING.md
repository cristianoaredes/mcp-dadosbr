# 🧪 Guia de Testes - MCP DadosBR

**Versão:** 0.2.0  
**Framework:** Vitest 2.0  
**Data:** 30/09/2025

---

## 📋 Índice

1. [Configuração Inicial](#configuração-inicial)
2. [Rodando os Testes](#rodando-os-testes)
3. [Estrutura de Testes](#estrutura-de-testes)
4. [Testes Implementados](#testes-implementados)
5. [Coverage](#coverage)
6. [Debugging](#debugging)
7. [CI/CD](#cicd)

---

## 🚀 Configuração Inicial

### Pré-requisitos
```bash
node >= 18.0.0
npm >= 9.0.0
```

### Instalação de Dependências

```bash
# Instalar todas as dependências (incluindo dev)
npm install

# Verificar instalação do Vitest
npx vitest --version
```

### Dependências de Teste

```json
{
  "vitest": "^2.0.0",        // Test runner
  "@vitest/ui": "^2.0.0",    // UI dashboard
  "c8": "^9.0.0",            // Coverage
  "msw": "^2.0.0"            // API mocking (futuro)
}
```

---

## 🏃 Rodando os Testes

### Comandos Disponíveis

```bash
# Rodar todos os testes (uma vez)
npm test

# Rodar em modo watch (rerun ao salvar)
npm run test:watch

# Rodar com UI interativa
npm run test:ui

# Gerar coverage report
npm run test:coverage

# Rodar testes de integração legados
npm run test:integration
```

### Exemplos de Uso

**Rodar testes específicos:**
```bash
# Por arquivo
npx vitest test/unit/circuit-breaker.test.ts

# Por pattern
npx vitest circuit

# Por test name
npx vitest -t "should execute successfully"
```

**Watch mode com filtros:**
```bash
# Watch apenas testes relacionados a cache
npx vitest cache --watch

# Watch com UI
npm run test:ui
```

---

## 📁 Estrutura de Testes

### Organização Atual

```
test/
├── unit/                          # Testes unitários
│   └── circuit-breaker.test.ts   ✅ 35 tests
│
├── integration/                   # Testes de integração (legado)
│   └── integration.js
│
└── fixtures/                      # Dados de teste (futuro)
    ├── cnpj-responses.json
    └── search-results.json
```

### Organização Proposta (Futura)

```
test/
├── unit/
│   ├── circuit-breaker.test.ts   ✅ Implementado
│   ├── logger.test.ts             ⏳ Pendente
│   ├── result.test.ts             ⏳ Pendente
│   ├── cache.test.ts              ⏳ Pendente
│   ├── http-client.test.ts        ⏳ Pendente
│   ├── validation.test.ts         ⏳ Pendente
│   ├── dork-templates.test.ts     ⏳ Pendente
│   └── search-providers.test.ts   ⏳ Pendente
│
├── integration/
│   ├── cnpj-lookup.test.ts        ⏳ Pendente
│   ├── cep-lookup.test.ts         ⏳ Pendente
│   ├── intelligence.test.ts       ⏳ Pendente
│   └── mcp-server.test.ts         ⏳ Pendente
│
├── e2e/
│   ├── stdio-transport.test.ts    ⏳ Pendente
│   └── http-transport.test.ts     ⏳ Pendente
│
└── fixtures/
    ├── cnpj-responses.json
    ├── cep-responses.json
    └── search-results.json
```

---

## ✅ Testes Implementados

### Circuit Breaker (35 testes)

**Arquivo:** `test/unit/circuit-breaker.test.ts`  
**Coverage:** 100% statements, 100% branches, 100% functions

#### Estados (12 testes)
- ✅ CLOSED: Execução normal
- ✅ CLOSED: Permanece após falha única
- ✅ CLOSED → OPEN: Transição após threshold
- ✅ OPEN: Rejeita imediatamente
- ✅ OPEN: Mensagem com retry time
- ✅ OPEN → HALF_OPEN: Após timeout
- ✅ HALF_OPEN → CLOSED: Em sucesso
- ✅ HALF_OPEN → OPEN: Em falha
- ✅ HALF_OPEN: Limita tentativas

#### Métricas (3 testes)
- ✅ Rastreia contagem de falhas
- ✅ Reseta contagem em sucesso
- ✅ Rastreia tempo da última falha

#### Reset (1 teste)
- ✅ Retorna ao estado inicial

#### Concorrência (2 testes)
- ✅ Lida com execuções concorrentes
- ✅ Conta falhas corretamente sob carga

#### Edge Cases (3 testes)
- ✅ Erros síncronos
- ✅ Promise rejections
- ✅ Preserva tipos de erro customizados

**Exemplo de Teste:**
```typescript
it('should transition to OPEN after threshold failures', async () => {
  // Fail 3 times (threshold)
  for (let i = 0; i < 3; i++) {
    await expect(
      circuitBreaker.execute(async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');
  }

  expect(circuitBreaker.getState()).toBe('OPEN');
});
```

---

## 📊 Coverage

### Configuração

**Arquivo:** `vitest.config.ts`

```typescript
coverage: {
  provider: 'c8',
  reporter: ['text', 'json', 'html', 'lcov'],
  thresholds: {
    lines: 80,      // 80% linhas cobertas
    functions: 80,  // 80% funções cobertas
    branches: 75,   // 75% branches cobertas
    statements: 80  // 80% statements cobertas
  }
}
```

### Rodando Coverage

```bash
# Gerar report
npm run test:coverage

# Saída
✓ test/unit/circuit-breaker.test.ts (35 tests) 
  Coverage: 
    Lines     : 100%
    Functions : 100%
    Branches  : 100%
```

### Visualizando Reports

**HTML Report:**
```bash
# Gerar e abrir no browser
npm run test:coverage
open coverage/index.html
```

**Terminal Report:**
```bash
npm test -- --coverage
```

### Exclusões

Os seguintes arquivos/diretórios são excluídos do coverage:
- `node_modules/`
- `build/`
- `test/`
- `**/*.test.ts`
- `lib/workers/` (Cloudflare-specific)
- `lib/bin/` (CLI entry point)
- `scripts/`
- `examples/`

---

## 🐛 Debugging

### Debug com VS Code

**Configuração:** `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Específico

```bash
# Debug um teste específico
node --inspect-brk ./node_modules/.bin/vitest test/unit/circuit-breaker.test.ts
```

### Logs de Debug

```typescript
// Adicionar console.log nos testes
it('should debug', () => {
  console.log('Debug info:', circuitBreaker.getMetrics());
  expect(true).toBe(true);
});
```

---

## 🔄 CI/CD

### GitHub Actions (Proposto)

**Arquivo:** `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hooks

**Usar Husky:**

```bash
# Instalar husky
npm install --save-dev husky

# Configurar pre-commit
npx husky install
npx husky add .husky/pre-commit "npm test"
```

---

## 📝 Escrevendo Novos Testes

### Template de Teste Unitário

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyClass } from '../../lib/path/to/module';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass();
  });

  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = instance.methodName(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should throw error when invalid input', () => {
      expect(() => {
        instance.methodName(null);
      }).toThrow('Expected error message');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const result = instance.methodName('');
      expect(result).toBe('');
    });

    it('should handle concurrent calls', async () => {
      const promises = [
        instance.asyncMethod(),
        instance.asyncMethod(),
        instance.asyncMethod()
      ];
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
    });
  });
});
```

### Boas Práticas

1. **Nomenclatura:**
   - Use "should" no nome dos testes
   - Seja específico: "should return empty array when no results"

2. **Arrange-Act-Assert:**
   - Separe claramente setup, execution, verification

3. **Testes Independentes:**
   - Cada teste deve rodar independentemente
   - Use beforeEach para reset de estado

4. **Mocks:**
   - Mock apenas o necessário
   - Prefira spies a stubs quando possível

5. **Async Tests:**
   - Sempre use async/await
   - Teste tanto sucesso quanto falha

---

## 🎯 Metas de Coverage

### Atual
- Circuit Breaker: 100% ✅
- Resto do projeto: 0% ⚠️

### Meta de Curto Prazo (1 semana)
- Core modules: 80%+
- Total: 50%+

### Meta de Médio Prazo (1 mês)
- Core modules: 90%+
- Infrastructure: 80%+
- Total: 80%+

### Meta de Longo Prazo (3 meses)
- Todos os módulos: 90%+
- Total: 90%+

---

## 📚 Recursos Adicionais

### Documentação
- [Vitest Docs](https://vitest.dev/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
- [C8 Coverage](https://github.com/bcoe/c8)

### Exemplos
- Ver `test/unit/circuit-breaker.test.ts` para exemplos completos
- Ver `CODE_REVIEW.md` para problemas conhecidos

### Contribuindo
- Toda nova feature deve ter testes
- Coverage deve ser mantido acima de 80%
- PRs sem testes não serão aceitos

---

## 🆘 Troubleshooting

### Testes não rodam

**Problema:** `Cannot find module 'vitest'`

**Solução:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Coverage não gera

**Problema:** `c8 not found`

**Solução:**
```bash
npm install --save-dev c8
```

### Testes lentos

**Problema:** Testes demoram muito

**Solução:**
- Use `it.only()` para rodar teste específico
- Aumente timeout: `testTimeout: 10000` em vitest.config.ts
- Verifique se há loops infinitos

### Falsos positivos

**Problema:** Testes passam mas código está quebrado

**Solução:**
- Verifique se está testando o comportamento correto
- Adicione assertions mais específicas
- Teste edge cases

---

## ✉️ Contato

Dúvidas sobre testes:
- **Issues:** https://github.com/cristianoaredes/mcp-dadosbr/issues
- **Email:** cristiano@aredes.me

---

**Última Atualização:** 30/09/2025  
**Próxima Revisão:** Após adicionar mais testes
