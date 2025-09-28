# MCP DadosBR Examples

This directory contains example implementations and usage patterns for MCP DadosBR.

## 📁 Files

### `sse-client.js`

Example Server-Sent Events client that connects to the Cloudflare Worker SSE endpoint.

**Usage:**

```bash
# Install dependencies
npm install

# Set your worker URL (optional)
export WORKER_URL="https://your-worker.your-subdomain.workers.dev"

# Run the SSE client
npm run test:sse

# Or run directly
node examples/sse-client.js
```

**Features:**

- Connects to `/sse` endpoint
- Handles connection, message, ping, and error events
- Demonstrates real-time MCP communication
- Graceful shutdown on Ctrl+C

**Expected Output:**

```
🔗 Connecting to SSE endpoint: https://your-worker.workers.dev/sse
✅ SSE connection established
🔌 Connection event: { type: 'connection', status: 'connected', server: 'mcp-dadosbr' }
📨 MCP message: {
  "jsonrpc": "2.0",
  "id": "init",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} }
  }
}
🏓 Ping received: 2024-01-15T10:30:45.123Z
```

## 🔗 Related Documentation

- [Cloudflare Deployment Guide](../docs/CLOUDFLARE_DEPLOYMENT.md)
- [Cloudflare SSE Documentation](https://developers.cloudflare.com/agents/api-reference/http-sse/)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## 🚀 Integration Examples

### Claude Desktop with SSE

```json
{
  "mcpServers": {
    "dadosbr-sse": {
      "command": "node",
      "args": ["examples/sse-client.js"],
      "env": {
        "WORKER_URL": "https://your-worker.workers.dev"
      }
    }
  }
}
```

### Custom HTTP Client

```javascript
// HTTP JSON-RPC
const response = await fetch("https://your-worker.workers.dev/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "cnpj_lookup",
      arguments: { cnpj: "11.222.333/0001-81" },
    },
  }),
});
```

### Browser SSE Client

```javascript
const eventSource = new EventSource("https://your-worker.workers.dev/sse");

eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log("MCP Response:", data);
});
```
