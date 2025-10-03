# MCP DadosBR - Project Structure

> **Complete overview of the MCP DadosBR project structure and organization**

## 📁 Root Directory Structure

```
mcp-dadosbr/
├── 📁 lib/                          # Source code
├── 📁 docs/                         # Documentation (multi-language)
├── 📁 test/                         # Test suite
├── 📁 examples/                     # Code examples
├── 📁 scripts/                      # Utility scripts
├── 📁 build/                        # Compiled output
├── 📁 .kiro/                        # Kiro IDE specifications
├── 📄 README.md                     # Main project documentation
├── 📄 PROJECT_STRUCTURE.md          # This file
├── 📄 OVERVIEW_CODEBASE_PT-BR.md    # Detailed Portuguese codebase overview
└── 📄 package.json                  # NPM package configuration
```

## 🏗️ Source Code Structure (`lib/`)

### Core Components
```
lib/
├── 📁 core/                         # Business logic
│   ├── mcp-server.ts               # MCP server implementation
│   ├── tools.ts                    # MCP tools (cnpj_lookup, cep_lookup)
│   ├── cache.ts                    # LRU cache with TTL
│   ├── http-client.ts              # HTTP client with retry
│   ├── search-providers.ts         # DuckDuckGo, Tavily, SerpAPI
│   ├── intelligence.ts             # Search orchestration
│   ├── sequential-thinking.ts      # Structured reasoning
│   └── validation.ts               # Input validation
│
├── 📁 adapters/                     # Platform adapters
│   ├── cli.ts                      # STDIO transport (NPM)
│   ├── cloudflare.ts               # Cloudflare Workers
│   └── smithery.ts                 # Smithery platform
│
├── 📁 infrastructure/               # Infrastructure components
│   ├── cache/thread-safe-cache.ts  # Thread-safe cache
│   ├── http/circuit-breaker.ts     # Circuit breaker pattern
│   ├── rate-limiting/               # Rate limiting
│   └── telemetry/logger.ts         # Logging with PII masking
│
├── 📁 shared/                       # Shared utilities
│   ├── types/result.ts             # Result<T,E> type
│   └── utils/constants.ts          # System constants
│
├── 📁 config/                       # Configuration
│   └── index.ts                    # Environment configuration
│
└── 📁 types/                        # TypeScript definitions
    └── index.ts                    # Type definitions
```

## 📚 Documentation Structure (`docs/`)

### Multi-Language Documentation
```
docs/
├── 📄 README.md                     # Documentation index
│
├── 📁 pt-br/                        # Portuguese Brazilian documentation
│   ├── 📄 README.md                # PT-BR main index
│   ├── 📄 _config.yml              # Documentation configuration
│   │
│   ├── 📁 _schemas/                 # TypeScript schemas
│   │   └── glossario-types.ts      # Glossary type definitions
│   │
│   ├── 📁 _validators/              # Validation tools
│   │   └── terminologia-validator.ts # Terminology validator
│   │
│   ├── 📁 _templates/               # Document templates
│   │   └── documento-base.md       # Base document template
│   │
│   ├── 📁 arquitetura/              # Architecture documentation
│   │   ├── visao-geral.md          # Architecture overview
│   │   ├── arquivo-unico.md        # Single-file architecture
│   │   ├── transporte-mcp.md       # MCP transport modes
│   │   ├── fluxo-dados.md          # Data flow diagrams
│   │   └── limitacoes-beneficios.md # Trade-offs analysis
│   │
│   ├── 📁 desenvolvimento/          # Development guides
│   │   ├── convencoes-nomenclatura.md # Naming conventions
│   │   ├── padroes-implementacao.md   # Implementation patterns
│   │   └── configuracao-ambiente.md   # Environment setup
│   │
│   ├── 📁 exemplos/                 # Examples and tutorials
│   │   └── basicos/                # Basic examples
│   │       ├── README.md           # Examples index
│   │       └── primeira-consulta-cnpj.md # First CNPJ query
│   │
│   └── 📁 glossario/                # Technical glossary
│       └── termos-tecnicos.md      # Technical terms in PT-BR
│
├── 📄 CONFIGURATION.md              # Configuration guide (EN)
├── 📄 PROVIDERS.md                  # Search providers (EN)
├── 📄 USAGE_EXAMPLES.md             # Usage examples (EN)
├── 📄 MCP_CLIENT_INTEGRATION.md     # MCP client setup (EN)
├── 📄 CLOUDFLARE_DEPLOYMENT.md      # Cloudflare deployment (EN)
├── 📄 SEQUENTIAL_THINKING.md        # Sequential thinking (EN)
├── 📄 WEB_SEARCH.md                 # Web search (EN)
│
└── 📁 development/                  # Development documentation
    ├── CODE_REVIEW.md              # Code review analysis
    ├── TESTING.md                  # Testing guide
    ├── PHASE1_SUMMARY.md           # Development phases
    └── FINAL_SUMMARY.md            # Project summary
```

## 🧪 Test Structure (`test/`)

### Comprehensive Test Suite
```
test/
├── 📁 unit/                         # Unit tests (88 tests)
│   ├── circuit-breaker.test.ts     # Circuit breaker tests (17)
│   ├── thread-safe-cache.test.ts   # Cache tests (23)
│   ├── logger.test.ts              # Logger tests (20)
│   └── result.test.ts              # Result type tests (28)
│
├── 📁 integration/                  # Integration tests
│   └── integration.js              # Full MCP server tests
│
└── 📁 manual/                       # Manual testing scripts
    ├── manual-http.js              # HTTP mode testing
    └── manual-stdio.js             # STDIO mode testing
```

## 📋 Configuration Files

### Build and Development
```
├── 📄 package.json                  # NPM package configuration
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 tsconfig.worker.json          # Cloudflare Workers TypeScript config
├── 📄 vitest.config.ts              # Test configuration
├── 📄 wrangler.toml                 # Cloudflare Workers configuration
├── 📄 smithery.config.js            # Smithery platform configuration
└── 📄 smithery.yaml                 # Smithery deployment config
```

### Project Management
```
├── 📄 .gitignore                    # Git ignore rules
├── 📄 .npmignore                    # NPM ignore rules
├── 📄 LICENSE                       # MIT license
├── 📄 CHANGELOG.md                  # Version changelog
├── 📄 CONTRIBUTING.md               # Contribution guidelines
└── 📄 EXAMPLE_USAGE.md              # Usage examples
```

## 🎯 Kiro IDE Specifications (`.kiro/`)

### Development Specifications
```
.kiro/
├── 📁 specs/                        # Feature specifications
│   ├── configurable-api-urls/      # Configurable API endpoints
│   ├── estrutura-arquitetura-ptbr/ # PT-BR documentation (completed)
│   ├── fix-mcp-version-issue/      # MCP version fixes
│   └── flutter-dadosbr-lib/        # Flutter library planning
│
├── 📁 steering/                     # Development guidelines
└── 📁 hooks/                        # Automation hooks
```

## 🚀 Deployment Artifacts

### Build Outputs
```
build/                               # Compiled TypeScript
├── 📁 lib/                         # Compiled source code
├── 📁 types/                       # Generated type definitions
└── 📄 package.json                 # Runtime package.json
```

### Platform-Specific
```
├── 📁 .wrangler/                   # Cloudflare Workers cache
├── 📁 .smithery/                   # Smithery deployment cache
└── 📁 node_modules/                # Dependencies
```

## 📊 Key Metrics

### Code Organization
- **Total Files**: ~50 source files
- **Documentation**: 15+ markdown files
- **Tests**: 88 unit tests (100% pass rate)
- **Languages**: TypeScript (primary), JavaScript (tests)
- **Platforms**: 3 (NPM, Cloudflare, Smithery)

### Documentation Coverage
- **Portuguese**: Complete technical documentation (15+ files)
- **English**: API and integration documentation (8+ files)
- **Examples**: 10+ practical examples
- **Diagrams**: 15+ Mermaid diagrams

## 🔄 Development Workflow

### 1. Local Development
```bash
npm run dev                          # Start development server
npm test                            # Run test suite
npm run build                       # Compile TypeScript
```

### 2. Testing
```bash
npm run test:watch                  # Watch mode testing
npm run test:ui                     # Interactive test UI
npm run test:coverage               # Coverage report
```

### 3. Deployment
```bash
npm run deploy                      # Cloudflare Workers
smithery deploy                     # Smithery platform
npm publish                         # NPM registry
```

## 🎨 Architecture Patterns

### Design Patterns Used
- **Adapter Pattern**: Multi-platform deployment
- **Circuit Breaker**: Failure protection
- **Result Pattern**: Functional error handling
- **Repository Pattern**: Abstract storage
- **Strategy Pattern**: Pluggable search providers

### Code Quality
- **TypeScript Strict Mode**: ✅
- **Thread Safety**: ✅ (async-mutex)
- **LGPD Compliance**: ✅ (PII masking)
- **Test Coverage**: ~60%
- **Production Ready**: ✅

## 📝 Documentation Philosophy

### Multi-Language Approach
- **Portuguese Brazilian**: Complete technical documentation for Brazilian developers
- **English**: API documentation and international integration guides
- **Cultural Adaptation**: Examples and context adapted for each audience

### Quality Standards
- **Comprehensive**: All features documented
- **Practical**: Real-world examples and use cases
- **Accessible**: Clear language and progressive complexity
- **Maintainable**: Structured templates and validation

## 🤝 Contributing Guidelines

### Code Contributions
1. Follow TypeScript strict mode
2. Add tests for new features
3. Update documentation
4. Follow conventional commits

### Documentation Contributions
1. Use appropriate language (PT-BR for Brazilian content)
2. Follow template structure
3. Include practical examples
4. Validate with terminology checker

---

**This structure supports a production-ready, multi-platform MCP server with comprehensive documentation in multiple languages, designed for both Brazilian and international developers.**