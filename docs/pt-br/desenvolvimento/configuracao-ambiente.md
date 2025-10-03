# Configuração do Ambiente

> **Metadados do Documento**
> - **Categoria**: Desenvolvimento
> - **Nível**: Básico
> - **Tempo de Leitura**: 10 minutos
> - **Última Atualização**: ${new Date().toLocaleDateString('pt-BR')}
> - **Versão**: 1.0.0

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração Básica](#configuração-básica)
- [Configuração para Desenvolvimento](#configuração-para-desenvolvimento)
- [Configuração para Produção](#configuração-para-produção)
- [Troubleshooting](#troubleshooting)

## 🎯 Pré-requisitos

### Sistema Operacional
- **macOS**: 10.15+ (Catalina ou superior)
- **Linux**: Ubuntu 18.04+, CentOS 7+, ou distribuições equivalentes
- **Windows**: 10/11 com WSL2 (recomendado) ou PowerShell

### Software Necessário

#### Node.js (Obrigatório)
```bash
# Verificar versão instalada
node --version  # Deve ser 18.0.0 ou superior
npm --version   # Deve ser 8.0.0 ou superior

# Instalar via nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### Git (Recomendado)
```bash
# Verificar instalação
git --version

# Instalar no Ubuntu/Debian
sudo apt update && sudo apt install git

# Instalar no macOS
brew install git
```

#### Editor de Código
- **VS Code** (recomendado): Melhor suporte para MCP
- **Cursor**: Integração nativa com AI
- **WebStorm**: Suporte via plugins
- **Vim/Neovim**: Suporte via plugins da comunidade

## 📦 Instalação

### Instalação Global (Recomendada)

```bash
# Instalar a versão mais recente
npm install -g @aredes.me/mcp-dadosbr

# Verificar instalação
mcp-dadosbr --version

# Testar funcionamento
echo '{"method": "tools/list"}' | mcp-dadosbr
```

### Instalação Local (Projeto Específico)

```bash
# Criar novo projeto
mkdir meu-projeto-mcp
cd meu-projeto-mcp
npm init -y

# Instalar como dependência
npm install @aredes.me/mcp-dadosbr

# Adicionar script no package.json
npm pkg set scripts.mcp="mcp-dadosbr"

# Testar
npm run mcp
```

### Uso via npx (Sem Instalação)

```bash
# Usar diretamente sem instalar
npx @aredes.me/mcp-dadosbr@latest

# Especificar versão
npx @aredes.me/mcp-dadosbr@1.2.0
```

## ⚙️ Configuração Básica

### Arquivo de Configuração (.mcprc.json)

```json
{
  "server": {
    "name": "dadosbr-mcp",
    "version": "1.2.0",
    "timeout": 8000
  },
  "cache": {
    "enabled": true,
    "ttl": {
      "cnpj": 60000,
      "cep": 300000,
      "error": 10000
    },
    "maxSize": 256
  },
  "apis": {
    "cnpj": {
      "baseUrl": "https://api.opencnpj.org",
      "timeout": 8000,
      "retries": 0
    },
    "cep": {
      "baseUrl": "https://opencep.com/v1",
      "timeout": 8000,
      "retries": 0
    }
  },
  "logging": {
    "level": "info",
    "format": "json",
    "timestamp": true
  }
}
```

### Variáveis de Ambiente

```bash
# Arquivo .env (para desenvolvimento)
MCP_TRANSPORT=stdio
MCP_HTTP_PORT=3000
MCP_TIMEOUT=8000
MCP_CACHE_TTL=60000
MCP_LOG_LEVEL=info

# APIs customizadas (opcional)
MCP_CNPJ_API_URL=https://api.opencnpj.org
MCP_CEP_API_URL=https://opencep.com/v1

# Autenticação (se necessário)
MCP_API_KEY=sua-chave-aqui
MCP_USER_AGENT=MeuApp/1.0.0
```

### Configuração por Plataforma

#### macOS
```bash
# Adicionar ao ~/.zshrc ou ~/.bash_profile
export MCP_TRANSPORT=stdio
export MCP_TIMEOUT=8000

# Recarregar configuração
source ~/.zshrc
```

#### Linux
```bash
# Adicionar ao ~/.bashrc
export MCP_TRANSPORT=stdio
export MCP_TIMEOUT=8000

# Recarregar configuração
source ~/.bashrc
```

#### Windows (PowerShell)
```powershell
# Adicionar ao perfil do PowerShell
$env:MCP_TRANSPORT = "stdio"
$env:MCP_TIMEOUT = "8000"

# Ou definir permanentemente
[Environment]::SetEnvironmentVariable("MCP_TRANSPORT", "stdio", "User")
```

## 🛠️ Configuração para Desenvolvimento

### Setup do VS Code

#### 1. Extensões Recomendadas

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "claude-ai.claude-dev"
  ]
}
```

#### 2. Configuração do Workspace

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.associations": {
    ".mcprc": "json"
  },
  "json.schemas": [
    {
      "fileMatch": [".mcprc.json", ".mcprc"],
      "url": "https://raw.githubusercontent.com/aredes-me/mcp-dadosbr/main/schema.json"
    }
  ]
}
```

#### 3. Configuração do Claude/MCP

```json
// ~/.config/claude-desktop/claude_desktop_config.json
{
  "mcpServers": {
    "dadosbr": {
      "command": "mcp-dadosbr",
      "args": [],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "MCP_TIMEOUT": "8000"
      }
    }
  }
}
```

### Setup do Cursor

```json
// .cursor/settings.json
{
  "mcp.servers": {
    "dadosbr": {
      "command": "npx",
      "args": ["@aredes.me/mcp-dadosbr@latest"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### Configuração de Linting

#### ESLint (.eslintrc.js)
```javascript
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    // Regras específicas para MCP DadosBR
    'camelcase': ['error', { 
      allow: ['^cnpj_', '^cep_'] // Permitir ferramentas MCP
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error'
  }
};
```

#### Prettier (.prettierrc)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Scripts de Desenvolvimento

```json
// package.json
{
  "scripts": {
    "dev": "mcp-dadosbr",
    "dev:http": "MCP_TRANSPORT=http mcp-dadosbr",
    "test": "echo '{\"method\": \"tools/list\"}' | mcp-dadosbr",
    "test:cnpj": "echo '{\"method\": \"tools/call\", \"params\": {\"name\": \"cnpj_lookup\", \"arguments\": {\"cnpj\": \"33000167000101\"}}}' | mcp-dadosbr",
    "test:cep": "echo '{\"method\": \"tools/call\", \"params\": {\"name\": \"cep_lookup\", \"arguments\": {\"cep\": \"01310100\"}}}' | mcp-dadosbr",
    "lint": "eslint . --ext .ts,.js",
    "format": "prettier --write ."
  }
}
```

## 🚀 Configuração para Produção

### Docker

#### Dockerfile
```dockerfile
FROM node:20-alpine

# Instalar dependências do sistema
RUN apk add --no-cache curl

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Instalar MCP DadosBR
RUN npm install -g @aredes.me/mcp-dadosbr@latest

# Mudar para usuário não-root
USER mcp

# Expor porta (apenas para modo HTTP)
EXPOSE 3000

# Comando padrão
CMD ["mcp-dadosbr"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  mcp-dadosbr:
    build: .
    environment:
      - MCP_TRANSPORT=http
      - MCP_HTTP_PORT=3000
      - MCP_TIMEOUT=8000
      - NODE_ENV=production
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Kubernetes

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-dadosbr
  labels:
    app: mcp-dadosbr
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-dadosbr
  template:
    metadata:
      labels:
        app: mcp-dadosbr
    spec:
      containers:
      - name: mcp-dadosbr
        image: mcp-dadosbr:latest
        ports:
        - containerPort: 3000
        env:
        - name: MCP_TRANSPORT
          value: "http"
        - name: MCP_HTTP_PORT
          value: "3000"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-dadosbr-service
spec:
  selector:
    app: mcp-dadosbr
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Monitoramento

#### Prometheus Metrics
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mcp-dadosbr'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "MCP DadosBR Metrics",
    "panels": [
      {
        "title": "Requests per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mcp_requests_total[5m])",
            "legendFormat": "{{method}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(mcp_response_time_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(mcp_cache_hits_total[5m]) / rate(mcp_requests_total[5m])",
            "legendFormat": "Hit Rate"
          }
        ]
      }
    ]
  }
}
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. "Comando não encontrado"
```bash
# Verificar se está no PATH
echo $PATH | grep npm

# Reinstalar globalmente
npm uninstall -g @aredes.me/mcp-dadosbr
npm install -g @aredes.me/mcp-dadosbr@latest

# Usar npx como alternativa
npx @aredes.me/mcp-dadosbr@latest
```

#### 2. "Permission denied"
```bash
# Configurar npm para não usar sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstalar
npm install -g @aredes.me/mcp-dadosbr
```

#### 3. "Timeout na consulta"
```bash
# Aumentar timeout
export MCP_TIMEOUT=15000
mcp-dadosbr

# Ou via configuração
echo '{"server": {"timeout": 15000}}' > .mcprc.json
```

#### 4. "Rate limit atingido"
```bash
# Aguardar e tentar novamente
sleep 60

# Ou configurar cache mais agressivo
echo '{"cache": {"ttl": {"cnpj": 300000}}}' > .mcprc.json
```

### Logs de Debug

```bash
# Habilitar logs detalhados
export MCP_LOG_LEVEL=debug
mcp-dadosbr

# Salvar logs em arquivo
mcp-dadosbr 2> mcp-debug.log

# Analisar logs
tail -f mcp-debug.log | grep ERROR
```

### Verificação de Saúde

```bash
# Script de verificação completa
#!/bin/bash

echo "🔍 Verificando MCP DadosBR..."

# Verificar Node.js
node_version=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ Node.js: $node_version"
else
  echo "❌ Node.js não encontrado"
  exit 1
fi

# Verificar instalação
if command -v mcp-dadosbr &> /dev/null; then
  echo "✅ MCP DadosBR instalado"
else
  echo "❌ MCP DadosBR não encontrado"
  exit 1
fi

# Testar funcionamento
echo "🧪 Testando ferramentas..."
result=$(echo '{"method": "tools/list"}' | mcp-dadosbr 2>/dev/null)
if echo "$result" | grep -q "cnpj_lookup"; then
  echo "✅ Ferramentas funcionando"
else
  echo "❌ Erro nas ferramentas"
  exit 1
fi

# Testar consulta CNPJ
echo "🧪 Testando consulta CNPJ..."
result=$(echo '{"method": "tools/call", "params": {"name": "cnpj_lookup", "arguments": {"cnpj": "33000167000101"}}}' | mcp-dadosbr 2>/dev/null)
if echo "$result" | grep -q "PETROBRAS"; then
  echo "✅ Consulta CNPJ funcionando"
else
  echo "⚠️  Consulta CNPJ com problemas (pode ser rate limit)"
fi

echo "🎉 Verificação concluída!"
```

## 🚀 Próximos Passos

Agora que seu ambiente está configurado:

1. **[Primeira Consulta CNPJ](../exemplos/basicos/primeira-consulta-cnpj.md)** - Fazer sua primeira consulta
2. **[Padrões de Implementação](padroes-implementacao.md)** - Aprender as melhores práticas
3. **[Exemplos Avançados](../exemplos/avancados/)** - Casos de uso complexos

---

**💡 Dica**: Mantenha sempre a versão mais recente instalada. O MCP DadosBR é atualizado frequentemente com melhorias e correções.

**🏷️ Tags**: configuração, ambiente, instalação, desenvolvimento, produção