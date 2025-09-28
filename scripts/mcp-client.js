#!/usr/bin/env node

const MCP_SERVER_URL = 'http://localhost:3000/mcp';

async function callMcpTool(toolName, args) {
  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling MCP tool:', error.message);
    console.error('Make sure MCP server is running: MCP_TRANSPORT=http mcp-dadosbr');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'cnpj' && args[1]) {
    const result = await callMcpTool('cnpj_lookup', { cnpj: args[1] });
    console.log(JSON.stringify(result, null, 2));
  } else if (args[0] === 'cep' && args[1]) {
    const result = await callMcpTool('cep_lookup', { cep: args[1] });
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('Usage: node scripts/mcp-client.js [cnpj|cep] <value>');
    console.log('Examples:');
    console.log('  node scripts/mcp-client.js cnpj 11222333000181');
    console.log('  node scripts/mcp-client.js cep 01310100');
    console.log('');
    console.log('Note: Start HTTP server first with: MCP_TRANSPORT=http mcp-dadosbr');
  }
}

main().catch(console.error);
