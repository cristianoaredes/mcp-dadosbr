#!/usr/bin/env node

/**
 * Manual testing script for MCP DadosBR server (stdio transport)
 * 
 * This script tests the MCP server by sending JSON-RPC messages via stdio.
 * Run with: node test/manual-stdio.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, '..', 'server.ts');

// Test cases
const testCases = [
  {
    name: "List tools",
    message: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list"
    }
  },
  {
    name: "Valid CNPJ lookup (formatted)",
    message: {
      jsonrpc: "2.0", 
      id: 2,
      method: "tools/call",
      params: {
        name: "cnpj_lookup",
        arguments: { cnpj: "11.222.333/0001-81" }
      }
    }
  },
  {
    name: "Valid CNPJ lookup (unformatted)",
    message: {
      jsonrpc: "2.0",
      id: 3, 
      method: "tools/call",
      params: {
        name: "cnpj_lookup",
        arguments: { cnpj: "11222333000181" }
      }
    }
  },
  {
    name: "Invalid CNPJ (too short)",
    message: {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call", 
      params: {
        name: "cnpj_lookup",
        arguments: { cnpj: "123456" }
      }
    }
  },
  {
    name: "Valid CEP lookup (formatted)",
    message: {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "cep_lookup", 
        arguments: { cep: "01310-100" }
      }
    }
  },
  {
    name: "Valid CEP lookup (unformatted)",
    message: {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "cep_lookup",
        arguments: { cep: "01310100" }
      }
    }
  },
  {
    name: "Invalid CEP (too short)",
    message: {
      jsonrpc: "2.0", 
      id: 7,
      method: "tools/call",
      params: {
        name: "cep_lookup",
        arguments: { cep: "123" }
      }
    }
  },
  {
    name: "Cache test - repeat CNPJ lookup",
    message: {
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "cnpj_lookup",
        arguments: { cnpj: "11.222.333/0001-81" }
      }
    }
  }
];

async function runTest(testCase) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📤 Request: ${JSON.stringify(testCase.message)}`);
    
    const server = spawn('npx', ['tsx', serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    server.on('close', (code) => {
      console.log(`📥 Response: ${output.trim()}`);
      if (errorOutput.trim()) {
        console.log(`📋 Server logs: ${errorOutput.trim()}`);
      }
      resolve({ output, errorOutput, code });
    });

    server.on('error', (error) => {
      reject(error);
    });

    // Send the test message
    server.stdin.write(JSON.stringify(testCase.message) + '\n');
    server.stdin.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      server.kill();
      reject(new Error('Test timeout'));
    }, 10000);
  });
}

async function runAllTests() {
  console.log('🚀 Starting MCP DadosBR stdio transport tests...\n');
  
  for (const testCase of testCases) {
    try {
      await runTest(testCase);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ All tests completed!');
}

runAllTests().catch(console.error);