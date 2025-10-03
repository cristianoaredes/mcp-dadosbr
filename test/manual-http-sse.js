#!/usr/bin/env node

/**
 * Manual testing script for MCP DadosBR server (HTTP/SSE transport)
 * 
 * This script tests the MCP server via SSE transport using the MCP SDK client.
 * Run with: MCP_TRANSPORT=http npm run dev (in another terminal)
 * Then: node test/manual-http-sse.js
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, '..', 'lib', 'bin', 'mcp-dadosbr.ts');

const SERVER_URL = 'http://localhost:3000/mcp';

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
      
      if ((output.includes('started on HTTP transport') || output.includes('started on HTTP+SSE transport')) && !started) {
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

    setTimeout(() => {
      if (!started) {
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 10000);
  });
}

async function runTests() {
  let server;
  
  try {
    server = await startServer();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🧪 Running HTTP/SSE transport tests...\n');
    
    // Create MCP client with SSE transport
    const transport = new SSEClientTransport(new URL(SERVER_URL));
    const client = new Client({
      name: "test-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    console.log('✅ Connected to MCP server via SSE\n');

    // Test 1: List tools
    console.log('🧪 Test 1: List tools');
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => console.log(`   - ${tool.name}`));

    // Test 2: Call CNPJ lookup
    console.log('\n🧪 Test 2: CNPJ lookup (formatted)');
    const cnpjResult = await client.callTool({
      name: 'cnpj_lookup',
      arguments: { cnpj: '11.222.333/0001-81' }
    });
    console.log('✅ CNPJ lookup result:', JSON.stringify(cnpjResult, null, 2).substring(0, 200) + '...');

    // Test 3: Call CEP lookup
    console.log('\n🧪 Test 3: CEP lookup (formatted)');
    const cepResult = await client.callTool({
      name: 'cep_lookup',
      arguments: { cep: '01310-100' }
    });
    console.log('✅ CEP lookup result:', JSON.stringify(cepResult, null, 2).substring(0, 200) + '...');

    // Test 4: Invalid CNPJ
    console.log('\n🧪 Test 4: Invalid CNPJ (too short)');
    try {
      await client.callTool({
        name: 'cnpj_lookup',
        arguments: { cnpj: '123456' }
      });
    } catch (error) {
      console.log('✅ Correctly rejected invalid CNPJ:', error.message);
    }

    console.log('\n✅ All HTTP/SSE tests completed!');
    
    await client.close();
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  } finally {
    if (server) {
      console.log('\n🛑 Stopping server...');
      server.kill();
    }
  }
}

runTests().catch(console.error);