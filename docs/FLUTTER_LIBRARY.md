# 📱 Flutter/Dart Library - DadosBR

> **🚧 Status**: In Development - Requirements finalized, design phase in progress

A comprehensive Flutter/Dart library that brings Brazilian public data lookup capabilities to mobile, web, and desktop applications. Built on the proven architecture of the MCP DadosBR server with Flutter-optimized patterns and additional features for mobile development.

## 🎯 Overview

The Flutter DadosBR library provides the same reliable CNPJ (company) and CEP (postal code) lookup functionality as the MCP server, but optimized for Flutter applications with additional features like AI integration, batch processing, and comprehensive utility functions.

## ✨ Key Features

### 🏢 Core Data Lookup
- **CNPJ Lookup**: Company information from OpenCNPJ API (configurable)
- **CEP Lookup**: Postal code data from OpenCEP API (configurable)
- **Input Normalization**: Automatic formatting removal (dots, slashes, hyphens)
- **Validation**: Offline CNPJ/CEP format and checksum validation

### ⚡ Performance & Reliability
- **Smart Caching**: 60-second TTL with LRU eviction (256 entries default)
- **Circuit Breaker**: Automatic failure protection with 30-second recovery
- **Request Deduplication**: Prevents concurrent identical API calls
- **Timeout Handling**: 8-second request timeouts with proper error mapping

### 🔄 Async & Streaming
- **Future-based API**: Full async/await support for Flutter integration
- **Batch Processing**: Stream-based processing for multiple documents
- **Cancellation Support**: Proper request cancellation and resource cleanup
- **FutureBuilder Ready**: Seamless integration with Flutter's async widgets

### 🌐 Cross-Platform Support
- **iOS & Android**: Native HTTP client with proper network permissions
- **Flutter Web**: CORS-compatible browser fetch API integration
- **Desktop**: Windows, macOS, Linux support with dart:io HttpClient
- **Platform Detection**: Automatic HTTP client selection per platform

### 🤖 AI & Agent Integration
- **LangChain Dart**: Built-in Tool implementations for agent workflows
- **LangGraph**: Stateful node implementations for complex workflows
- **MCP over HTTP**: Server implementation with SSE (Server-Sent Events)
- **Function Calling**: JSON schema definitions for OpenAI/Anthropic APIs

### 🛠️ Developer Experience
- **Type Safety**: Strongly typed Dart classes mirroring TypeScript interfaces
- **Utility Functions**: Formatting, validation, normalization helpers
- **Comprehensive Logging**: Configurable logging levels with performance metrics
- **Error Handling**: Structured error responses with user-friendly messages

## 🚀 Planned API

### Basic Usage

```dart
import 'package:dadosbr/dadosbr.dart';

// Initialize with default settings
final dadosBR = DadosBRClient();

// CNPJ lookup
final cnpjResult = await dadosBR.lookupCNPJ('00.000.000/0001-91');
if (cnpjResult.ok) {
  print('Company: ${cnpjResult.data!.name}');
  print('Status: ${cnpjResult.data!.status}');
} else {
  print('Error: ${cnpjResult.error}');
}

// CEP lookup
final cepResult = await dadosBR.lookupCEP('01310-100');
if (cepResult.ok) {
  print('Address: ${cepResult.data!.street}');
  print('City: ${cepResult.data!.city}');
}
```

### Custom Configuration

```dart
// Custom API endpoints and authentication
final client = DadosBRClient(
  config: DadosBRConfig(
    cnpjApiUrl: 'https://your-cnpj-api.com/',
    cepApiUrl: 'https://your-cep-api.com/',
    headers: {
      'Authorization': 'Bearer your-token',
      'X-API-Key': 'your-api-key',
    },
    cacheSize: 512,
    cacheTTL: Duration(minutes: 2),
    timeout: Duration(seconds: 10),
  ),
);
```

### Batch Processing

```dart
// Process multiple CNPJs with streaming results
final cnpjs = ['12345678000195', '98765432000187', '11222333000181'];

await for (final result in client.batchLookupCNPJ(cnpjs)) {
  print('CNPJ: ${result.input}');
  if (result.ok) {
    print('  Company: ${result.data!.name}');
  } else {
    print('  Error: ${result.error}');
  }
}

// Batch with progress tracking
final stream = client.batchLookupCEP(ceps);
await for (final batch in stream) {
  print('Progress: ${batch.completed}/${batch.total}');
  for (final result in batch.results) {
    // Process individual results
  }
}
```

### Utility Functions

```dart
// Validation (offline)
final isValidCNPJ = DadosBRUtils.validateCNPJ('00.000.000/0001-91'); // true
final isValidCEP = DadosBRUtils.validateCEP('01310-100'); // true

// Formatting
final formatted = DadosBRUtils.formatCNPJ('00000000000191'); // '00.000.000/0001-91'
final formattedCEP = DadosBRUtils.formatCEP('01310100'); // '01310-100'

// Normalization
final normalized = DadosBRUtils.normalizeCNPJ('00.000.000/0001-91'); // '00000000000191'

// Generate test data
final testCNPJ = DadosBRUtils.generateValidCNPJ(); // Random valid CNPJ
```

### AI Agent Integration

```dart
import 'package:langchain/langchain.dart';
import 'package:dadosbr/langchain.dart';

// LangChain integration
final tools = [
  CNPJLookupTool(client: dadosBR),
  CEPLookupTool(client: dadosBR),
  CNPJValidationTool(),
];

final agent = Agent(
  llm: ChatOpenAI(apiKey: 'your-key'),
  tools: tools,
);

final response = await agent.run(
  'Validate and lookup information for CNPJ 00.000.000/0001-91'
);
```

### MCP Server Mode

```dart
// Run as MCP server with HTTP transport
final server = DadosBRMCPServer(
  client: dadosBR,
  port: 3000,
  enableCORS: true,
);

await server.start();
print('MCP server running on http://localhost:3000');

// Server-Sent Events for real-time updates
server.onToolCall.listen((call) {
  print('Tool called: ${call.name} with ${call.arguments}');
});
```

## 🏗️ Architecture

### Core Components

```
lib/
├── src/
│   ├── client/
│   │   ├── dadosbr_client.dart          # Main client class
│   │   ├── http_client.dart             # Platform-specific HTTP handling
│   │   └── cache.dart                   # LRU cache with TTL
│   ├── models/
│   │   ├── cnpj_data.dart              # CNPJ response models
│   │   ├── cep_data.dart               # CEP response models
│   │   ├── lookup_result.dart          # Generic result wrapper
│   │   └── config.dart                 # Configuration classes
│   ├── utils/
│   │   ├── validation.dart             # CNPJ/CEP validation logic
│   │   ├── formatting.dart             # Display formatting functions
│   │   └── normalization.dart          # Input normalization
│   ├── ai/
│   │   ├── langchain_tools.dart        # LangChain Dart integration
│   │   ├── langgraph_nodes.dart        # LangGraph workflow nodes
│   │   └── function_schemas.dart       # JSON schemas for AI APIs
│   ├── mcp/
│   │   ├── server.dart                 # MCP server implementation
│   │   ├── transport.dart              # HTTP/SSE transport layer
│   │   └── tools.dart                  # MCP tool definitions
│   └── infrastructure/
│       ├── circuit_breaker.dart        # Circuit breaker pattern
│       ├── rate_limiter.dart           # Request rate limiting
│       └── logger.dart                 # Configurable logging
└── dadosbr.dart                        # Main library export
```

### Error Handling

```dart
// Structured error responses
class LookupResult<T> {
  final bool ok;
  final T? data;
  final String? error;
  final String? sourceUrl;
  final DateTime? fetchedAt;
  
  const LookupResult.success(this.data, this.sourceUrl, this.fetchedAt)
      : ok = true, error = null;
      
  const LookupResult.failure(this.error)
      : ok = false, data = null, sourceUrl = null, fetchedAt = null;
}

// Error types
enum DadosBRError {
  validation,      // Invalid input format
  notFound,        // 404 from API
  rateLimited,     // 429 from API
  timeout,         // Request timeout
  network,         // Network connectivity
  serviceError,    // 5xx from API
  circuitOpen,     // Circuit breaker triggered
}
```

## 📋 Implementation Status

### ✅ Requirements Phase (Complete)
- [x] Comprehensive requirements document
- [x] User stories and acceptance criteria
- [x] Technical specifications
- [x] Architecture planning

### 🚧 Design Phase (In Progress)
- [ ] API design and interfaces
- [ ] Platform-specific implementations
- [ ] AI integration patterns
- [ ] Testing strategy

### ⏳ Development Phase (Planned)
- [ ] Core client implementation
- [ ] Cross-platform HTTP handling
- [ ] Caching and circuit breaker
- [ ] Utility functions
- [ ] AI/LangChain integration
- [ ] MCP server mode
- [ ] Comprehensive testing
- [ ] Documentation and examples

### 🎯 Release Phase (Future)
- [ ] pub.dev package publication
- [ ] Example applications
- [ ] Integration guides
- [ ] Community feedback

## 🔗 Related Resources

- **[Requirements Document](../.kiro/specs/flutter-dadosbr-lib/requirements.md)** - Detailed requirements and acceptance criteria
- **[Design Document](../.kiro/specs/flutter-dadosbr-lib/design.md)** - Architecture and implementation design
- **[Task Breakdown](../.kiro/specs/flutter-dadosbr-lib/tasks.md)** - Development tasks and milestones
- **[MCP DadosBR Server](../README.md)** - Original Node.js/TypeScript implementation
- **[LangChain Dart](https://pub.dev/packages/langchain)** - Dart implementation of LangChain
- **[LangGraph](https://pub.dev/documentation/langgraph/latest/)** - Workflow orchestration for Dart

## 🤝 Contributing

The Flutter library is currently in the design phase. We welcome:

- **Feedback** on the planned API and architecture
- **Use case discussions** for mobile/web applications
- **AI integration patterns** and requirements
- **Platform-specific considerations** for iOS/Android/Web/Desktop

## 📞 Contact

For questions about the Flutter library development:

- **GitHub Issues**: [mcp-dadosbr/issues](https://github.com/cristianoaredes/mcp-dadosbr/issues)
- **Email**: [cristiano@aredes.me](mailto:cristiano@aredes.me)
- **Spec Discussion**: See [Flutter Library Spec](../.kiro/specs/flutter-dadosbr-lib/) for detailed planning

---

**🚀 Stay tuned for updates as we bring Brazilian data lookup to the Flutter ecosystem!**