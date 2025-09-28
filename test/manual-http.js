#!/usr/bin/env node

/**
 * Manual testing script for MCP DadosBR server (HTTP transport)
 * 
 * This script tests the MCP server via HTTP Streamable transport.
 * Run with: MCP_TRANSPORT=http npm run dev (in another terminal)
 * Then: node test/manual-http.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, '..', 'server.ts');

const SERVER_URL = 'http://localhost:3000/mcp';

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
    name: "Valid CEP lookup (formatted)",
    message: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "cep_lookup", 
        arguments: { cep: "01310-100" }
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
    name: "Cache test - repeat CNPJ lookup",
    message: {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "cnpj_lookup",
        arguments: { cnpj: "11.222.333/0001-81" }
      }
    }
  }
];

async function sendHttpRequest(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📤 Request: ${JSON.stringify(testCase.message)}`);
    
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.message)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.text();
    console.log(`📥 Response: ${result}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    throw error;
  }
}

async function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting HTTP server...');
    
    const server = spawn('npx', ['tsx', serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MCP_TRANSPORT: 'http', MCP_HTTP_PORT: '3000' }
    });

    let started = false;

    server.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`📋 Server: ${output.trim()}`);
      
      if (output.includes('started on HTTP transport') && !started) {
        started = true;
        resolve(server);
      }
    });

    server.on('error', (error) => {
      reject(error);
    });

    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!started) {
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 10000);
  });
}

async function runAllTests() {
  let server;
  
  try {
    // Start the HTTP server
    server = await startServer();
    
    // Wait a bit for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🧪 Running HTTP transport tests...\n');
    
    // Run all test cases
    for (const testCase of testCases) {
      try {
        await sendHttpRequest(testCase);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
      } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
      }
    }
    
    console.log('\n✅ All HTTP tests completed!');
    
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
  } finally {
    if (server) {
      console.log('\n🛑 Stopping server...');
      server.kill();
    }
  }
}

runAllTests().catch(console.error);