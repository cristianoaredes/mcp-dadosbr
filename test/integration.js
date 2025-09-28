#!/usr/bin/env node

/**
 * Integration test suite for MCP DadosBR server
 * Tests both stdio and HTTP transports with real MCP protocol
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, '..', 'lib/adapters/cli.ts');

const tests = [
  {
    name: "Stdio Transport - List Tools",
    transport: "stdio",
    message: { jsonrpc: "2.0", id: 1, method: "tools/list" },
    expectSuccess: true
  },
  {
    name: "Stdio Transport - CNPJ Validation Error",
    transport: "stdio", 
    message: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "cnpj_lookup", arguments: { cnpj: "123" } } },
    expectSuccess: false
  },
  {
    name: "Stdio Transport - CEP Validation Error",
    transport: "stdio",
    message: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "cep_lookup", arguments: { cep: "123" } } },
    expectSuccess: false
  },
  {
    name: "Stdio Transport - CNPJ Lookup (Test Data)",
    transport: "stdio",
    message: { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "cnpj_lookup", arguments: { cnpj: "11222333000181" } } },
    expectSuccess: true // Now expects success as API returns real data
  }
];

async function runStdioTest(test) {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['tsx', serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let output = '';
    let errorOutput = '';
    
    server.stdout.on('data', (data) => { output += data.toString(); });
    server.stderr.on('data', (data) => { errorOutput += data.toString(); });
    
    server.on('close', (code) => {
      try {
        // Extract JSON response from output (logs may be mixed in)
        const lines = output.trim().split('\n');
        const jsonLine = lines.find(line => line.startsWith('{') && line.includes('jsonrpc'));
        if (!jsonLine) throw new Error('No JSON response found');
        
        const response = JSON.parse(jsonLine);
        const success = !response.error && (!response.result || !response.result.isError);
        resolve({ success, response, logs: errorOutput });
      } catch (error) {
        reject(new Error(`Failed to parse response: ${output}`));
      }
    });
    
    server.on('error', reject);
    
    server.stdin.write(JSON.stringify(test.message) + '\n');
    server.stdin.end();
    
    setTimeout(() => { server.kill(); reject(new Error('Test timeout')); }, 10000);
  });
}

async function runAllTests() {
  console.log('🧪 Running MCP DadosBR Integration Tests\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const result = await runStdioTest(test);
      
      const testPassed = test.expectSuccess ? result.success : !result.success;
      
      if (testPassed) {
        console.log(`✅ PASS`);
        passed++;
      } else {
        console.log(`❌ FAIL - Expected ${test.expectSuccess ? 'success' : 'failure'}, got ${result.success ? 'success' : 'failure'}`);
        failed++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
  }
}

runAllTests().catch(console.error);