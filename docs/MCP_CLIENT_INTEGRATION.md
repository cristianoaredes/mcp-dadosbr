# MCP Client Integration Guide

_Complete guide for integrating MCP DadosBR with popular MCP clients_

## Table of Contents

- [Claude Desktop](#claude-desktop)
- [Continue.dev](#continuedev)
- [Cline (VSCode Extension)](#cline-vscode-extension)
- [MCP Inspector](#mcp-inspector)
- [Custom TypeScript Client](#custom-typescript-client)
- [Web Browser Integration](#web-browser-integration)
- [Python Client](#python-client)
- [Troubleshooting](#troubleshooting)

---

## Claude Desktop

### Installation Steps

1. **Build the MCP server:**

   ```bash
   cd mcp-dadosbr
   npm run build
   ```

2. **Find your Claude Desktop config file:**

   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

3. **Add MCP DadosBR to your configuration:**

   ```json
   {
     "mcpServers": {
       "dadosbr": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-dadosbr/build/lib/adapters/cli.js"],
         "env": {
           "MCP_TRANSPORT": "stdio",
           "MCP_CACHE_SIZE": "512",
           "MCP_CACHE_TTL": "60000",
           "MCP_API_TIMEOUT": "8000",
           "CNPJ_API_BASE_URL": "https://your-custom-cnpj-api.com/api/cnpj/",
           "CEP_API_BASE_URL": "https://your-custom-cep-api.com/api/cep/"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop**

### Usage in Claude

Once configured, you can use the tools in your conversations:

```
Can you look up information for CNPJ 11.222.333/0001-81?
```

```
What's the address for CEP 01310-100?
```

Claude will automatically use the MCP DadosBR tools to fetch the information.

---

## Continue.dev

### Installation Steps

1. **Install Continue.dev extension** in VSCode

2. **Open Continue configuration:**

   - Press `Cmd/Ctrl + Shift + P`
   - Type "Continue: Open Config"
   - Select the command

3. **Add MCP DadosBR to `.continue/config.json`:**

   ```json
   {
     "models": [
       {
         "title": "GPT-4",
         "provider": "openai",
         "model": "gpt-4",
         "apiKey": "your-api-key"
       }
     ],
     "mcpServers": [
       {
         "name": "dadosbr",
         "command": "node",
         "args": ["/absolute/path/to/mcp-dadosbr/build/lib/adapters/cli.js"],
         "env": {
           "MCP_TRANSPORT": "stdio",
           "CNPJ_API_BASE_URL": "https://your-custom-cnpj-api.com/api/cnpj/",
           "CEP_API_BASE_URL": "https://your-custom-cep-api.com/api/cep/"
         }
       }
     ]
   }
   ```

4. **Reload VSCode window**

### Usage in Continue

In the Continue chat panel:

```
@dadosbr Look up CNPJ 12.345.678/0001-90
```

```
@dadosbr What's the address for CEP 04038-001?
```

---

## Cline (VSCode Extension)

### Installation Steps

1. **Install Cline extension** from VSCode marketplace

2. **Open Cline settings:**

   - Go to VSCode Settings
   - Search for "Cline"
   - Find "MCP Servers" section

3. **Add configuration in settings.json:**

   ```json
   {
     "cline.mcpServers": {
       "dadosbr": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-dadosbr/build/lib/adapters/cli.js"],
         "env": {
           "MCP_TRANSPORT": "stdio",
           "MCP_CACHE_SIZE": "512",
           "CNPJ_API_BASE_URL": "https://your-custom-cnpj-api.com/api/cnpj/",
           "CEP_API_BASE_URL": "https://your-custom-cep-api.com/api/cep/"
         }
       }
     }
   }
   ```

4. **Restart Cline**

### Usage in Cline

In Cline chat:

```
Use the dadosbr tool to look up company information for CNPJ 11.222.333/0001-81
```

---

## MCP Inspector

The MCP Inspector is perfect for development and testing.

### Installation and Usage

1. **Install MCP Inspector:**

   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. **Test with stdio transport:**

   ```bash
   cd mcp-dadosbr
   npm run build
   npx @modelcontextprotocol/inspector node build/lib/adapters/cli.js
   ```

3. **Test with HTTP transport:**

   ```bash
   # Terminal 1: Start HTTP server
   MCP_TRANSPORT=http npm start

   # Terminal 2: Connect inspector
   npx @modelcontextprotocol/inspector http://localhost:3000/mcp
   ```

4. **Use the web interface** to test tools interactively

---

## Custom TypeScript Client

### Basic Implementation

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

class DadosBRClient {
  private client: Client;
  private serverProcess: any;

  async connect() {
    // Start the MCP server
    this.serverProcess = spawn("node", ["build/lib/adapters/cli.js"], {
      cwd: "/path/to/mcp-dadosbr",
    });

    // Create transport
    const transport = new StdioClientTransport({
      readable: this.serverProcess.stdout,
      writable: this.serverProcess.stdin,
    });

    // Create and connect client
    this.client = new Client({
      name: "dadosbr-client",
      version: "1.0.0",
    });

    await this.client.connect(transport);
  }

  async lookupCNPJ(cnpj: string) {
    const result = await this.client.request({
      method: "tools/call",
      params: {
        name: "cnpj_lookup",
        arguments: { cnpj },
      },
    });
    return result;
  }

  async lookupCEP(cep: string) {
    const result = await this.client.request({
      method: "tools/call",
      params: {
        name: "cep_lookup",
        arguments: { cep },
      },
    });
    return result;
  }

  async disconnect() {
    await this.client.close();
    this.serverProcess?.kill();
  }
}

// Usage
const client = new DadosBRClient();
await client.connect();

const cnpjResult = await client.lookupCNPJ("11.222.333/0001-81");
console.log(cnpjResult);

const cepResult = await client.lookupCEP("01310-100");
console.log(cepResult);

await client.disconnect();
```

### Advanced Client with Error Handling

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

interface CNPJResult {
  ok: boolean;
  data?: any;
  error?: string;
}

interface CEPResult {
  ok: boolean;
  data?: any;
  error?: string;
}

class AdvancedDadosBRClient {
  private client: Client;
  private serverProcess: any;
  private connected = false;

  async connect(serverPath: string = "/path/to/mcp-dadosbr/build/lib/adapters/cli.js") {
    try {
      this.serverProcess = spawn("node", [serverPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Handle server errors
      this.serverProcess.stderr.on("data", (data: Buffer) => {
        console.error("Server error:", data.toString());
      });

      const transport = new StdioClientTransport({
        readable: this.serverProcess.stdout,
        writable: this.serverProcess.stdin,
      });

      this.client = new Client({
        name: "advanced-dadosbr-client",
        version: "1.0.0",
      });

      await this.client.connect(transport);
      this.connected = true;

      console.log("Connected to MCP DadosBR server");
    } catch (error) {
      throw new Error(`Failed to connect: ${error}`);
    }
  }

  async lookupCNPJ(cnpj: string): Promise<CNPJResult> {
    if (!this.connected) {
      throw new Error("Client not connected");
    }

    try {
      const result = await this.client.request({
        method: "tools/call",
        params: {
          name: "cnpj_lookup",
          arguments: { cnpj },
        },
      });

      if (result.error) {
        return { ok: false, error: result.error.message };
      }

      const content = result.result?.content?.[0];
      if (content?.type === "text") {
        try {
          const data = JSON.parse(content.text);
          return { ok: true, data };
        } catch {
          return { ok: false, error: content.text };
        }
      }

      return { ok: false, error: "Invalid response format" };
    } catch (error) {
      return { ok: false, error: `Request failed: ${error}` };
    }
  }

  async lookupCEP(cep: string): Promise<CEPResult> {
    if (!this.connected) {
      throw new Error("Client not connected");
    }

    try {
      const result = await this.client.request({
        method: "tools/call",
        params: {
          name: "cep_lookup",
          arguments: { cep },
        },
      });

      if (result.error) {
        return { ok: false, error: result.error.message };
      }

      const content = result.result?.content?.[0];
      if (content?.type === "text") {
        try {
          const data = JSON.parse(content.text);
          return { ok: true, data };
        } catch {
          return { ok: false, error: content.text };
        }
      }

      return { ok: false, error: "Invalid response format" };
    } catch (error) {
      return { ok: false, error: `Request failed: ${error}` };
    }
  }

  async listTools() {
    if (!this.connected) {
      throw new Error("Client not connected");
    }

    const result = await this.client.request({
      method: "tools/list",
    });

    return result.result?.tools || [];
  }

  async disconnect() {
    if (this.connected) {
      await this.client.close();
      this.serverProcess?.kill();
      this.connected = false;
      console.log("Disconnected from MCP DadosBR server");
    }
  }
}

// Usage example
async function example() {
  const client = new AdvancedDadosBRClient();

  try {
    await client.connect();

    // List available tools
    const tools = await client.listTools();
    console.log("Available tools:", tools);

    // Lookup CNPJ
    const cnpjResult = await client.lookupCNPJ("11.222.333/0001-81");
    if (cnpjResult.ok) {
      console.log("CNPJ data:", cnpjResult.data);
    } else {
      console.error("CNPJ error:", cnpjResult.error);
    }

    // Lookup CEP
    const cepResult = await client.lookupCEP("01310-100");
    if (cepResult.ok) {
      console.log("CEP data:", cepResult.data);
    } else {
      console.error("CEP error:", cepResult.error);
    }
  } finally {
    await client.disconnect();
  }
}

example().catch(console.error);
```

---

## Web Browser Integration

### HTTP Client for Web Applications

```html
<!DOCTYPE html>
<html>
  <head>
    <title>MCP DadosBR Web Client</title>
  </head>
  <body>
    <h1>Brazilian Data Lookup</h1>

    <div>
      <h2>CNPJ Lookup</h2>
      <input type="text" id="cnpjInput" placeholder="11.222.333/0001-81" />
      <button onclick="lookupCNPJ()">Lookup CNPJ</button>
      <div id="cnpjResult"></div>
    </div>

    <div>
      <h2>CEP Lookup</h2>
      <input type="text" id="cepInput" placeholder="01310-100" />
      <button onclick="lookupCEP()">Lookup CEP</button>
      <div id="cepResult"></div>
    </div>

    <script>
      const MCP_SERVER_URL = "http://localhost:3000/mcp";

      async function mcpRequest(method, params = {}) {
        try {
          const response = await fetch(MCP_SERVER_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json, text/event-stream",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: Date.now(),
              method,
              params,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return await response.json();
        } catch (error) {
          console.error("MCP request failed:", error);
          throw error;
        }
      }

      async function lookupCNPJ() {
        const cnpj = document.getElementById("cnpjInput").value;
        const resultDiv = document.getElementById("cnpjResult");

        if (!cnpj) {
          resultDiv.innerHTML =
            '<p style="color: red;">Please enter a CNPJ</p>';
          return;
        }

        resultDiv.innerHTML = "<p>Loading...</p>";

        try {
          const result = await mcpRequest("tools/call", {
            name: "cnpj_lookup",
            arguments: { cnpj },
          });

          if (result.error) {
            resultDiv.innerHTML = `<p style="color: red;">Error: ${result.error.message}</p>`;
            return;
          }

          const content = result.result?.content?.[0];
          if (content?.type === "text") {
            try {
              const data = JSON.parse(content.text);
              resultDiv.innerHTML = `<pre>${JSON.stringify(
                data,
                null,
                2
              )}</pre>`;
            } catch {
              resultDiv.innerHTML = `<p style="color: red;">${content.text}</p>`;
            }
          } else {
            resultDiv.innerHTML =
              '<p style="color: red;">Invalid response format</p>';
          }
        } catch (error) {
          resultDiv.innerHTML = `<p style="color: red;">Request failed: ${error.message}</p>`;
        }
      }

      async function lookupCEP() {
        const cep = document.getElementById("cepInput").value;
        const resultDiv = document.getElementById("cepResult");

        if (!cep) {
          resultDiv.innerHTML = '<p style="color: red;">Please enter a CEP</p>';
          return;
        }

        resultDiv.innerHTML = "<p>Loading...</p>";

        try {
          const result = await mcpRequest("tools/call", {
            name: "cep_lookup",
            arguments: { cep },
          });

          if (result.error) {
            resultDiv.innerHTML = `<p style="color: red;">Error: ${result.error.message}</p>`;
            return;
          }

          const content = result.result?.content?.[0];
          if (content?.type === "text") {
            try {
              const data = JSON.parse(content.text);
              resultDiv.innerHTML = `<pre>${JSON.stringify(
                data,
                null,
                2
              )}</pre>`;
            } catch {
              resultDiv.innerHTML = `<p style="color: red;">${content.text}</p>`;
            }
          } else {
            resultDiv.innerHTML =
              '<p style="color: red;">Invalid response format</p>';
          }
        } catch (error) {
          resultDiv.innerHTML = `<p style="color: red;">Request failed: ${error.message}</p>`;
        }
      }

      // Test server connection on page load
      window.onload = async function () {
        try {
          const result = await mcpRequest("tools/list");
          console.log(
            "Connected to MCP server. Available tools:",
            result.result?.tools
          );
        } catch (error) {
          console.error("Failed to connect to MCP server:", error);
          document.body.innerHTML +=
            '<div style="background: #ffebee; padding: 10px; margin: 10px; border-radius: 4px; color: #c62828;">⚠️ MCP Server not available. Make sure to start it with: MCP_TRANSPORT=http npm start</div>';
        }
      };
    </script>
  </body>
</html>
```

---

## Python Client

### Basic Python Implementation

```python
import asyncio
import json
import subprocess
from typing import Dict, Any, Optional

class DadosBRClient:
    def __init__(self, server_path: str = "/path/to/mcp-dadosbr/build/lib/adapters/cli.js"):
        self.server_path = server_path
        self.process = None
        self.request_id = 0

    async def connect(self):
        """Start the MCP server process"""
        self.process = await asyncio.create_subprocess_exec(
            "node", self.server_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

    async def _send_request(self, method: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Send a JSON-RPC request to the MCP server"""
        if not self.process:
            raise RuntimeError("Client not connected")

        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method
        }

        if params:
            request["params"] = params

        # Send request
        request_json = json.dumps(request) + "\n"
        self.process.stdin.write(request_json.encode())
        await self.process.stdin.drain()

        # Read response
        response_line = await self.process.stdout.readline()
        response = json.loads(response_line.decode().strip())

        return response

    async def list_tools(self) -> Dict[str, Any]:
        """List available tools"""
        return await self._send_request("tools/list")

    async def lookup_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """Lookup CNPJ information"""
        return await self._send_request("tools/call", {
            "name": "cnpj_lookup",
            "arguments": {"cnpj": cnpj}
        })

    async def lookup_cep(self, cep: str) -> Dict[str, Any]:
        """Lookup CEP information"""
        return await self._send_request("tools/call", {
            "name": "cep_lookup",
            "arguments": {"cep": cep}
        })

    async def disconnect(self):
        """Disconnect from the MCP server"""
        if self.process:
            self.process.terminate()
            await self.process.wait()

# Usage example
async def main():
    client = DadosBRClient()

    try:
        await client.connect()

        # List tools
        tools = await client.list_tools()
        print("Available tools:", tools)

        # Lookup CNPJ
        cnpj_result = await client.lookup_cnpj("11.222.333/0001-81")
        print("CNPJ result:", cnpj_result)

        # Lookup CEP
        cep_result = await client.lookup_cep("01310-100")
        print("CEP result:", cep_result)

    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

### Advanced Python Client with HTTP Support

```python
import asyncio
import aiohttp
import json
from typing import Dict, Any, Optional, Union

class AdvancedDadosBRClient:
    def __init__(self,
                 server_path: Optional[str] = None,
                 http_url: Optional[str] = None):
        self.server_path = server_path
        self.http_url = http_url
        self.process = None
        self.session = None
        self.request_id = 0
        self.transport_type = "http" if http_url else "stdio"

    async def connect(self):
        """Connect using the configured transport"""
        if self.transport_type == "http":
            self.session = aiohttp.ClientSession()
        else:
            self.process = await asyncio.create_subprocess_exec(
                "node", self.server_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

    async def _send_request_stdio(self, method: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Send request via stdio transport"""
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method
        }

        if params:
            request["params"] = params

        request_json = json.dumps(request) + "\n"
        self.process.stdin.write(request_json.encode())
        await self.process.stdin.drain()

        response_line = await self.process.stdout.readline()
        return json.loads(response_line.decode().strip())

    async def _send_request_http(self, method: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Send request via HTTP transport"""
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method
        }

        if params:
            request["params"] = params

        async with self.session.post(
            self.http_url,
            json=request,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream"
            }
        ) as response:
            return await response.json()

    async def _send_request(self, method: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Send request using the configured transport"""
        if self.transport_type == "http":
            return await self._send_request_http(method, params)
        else:
            return await self._send_request_stdio(method, params)

    async def list_tools(self) -> Dict[str, Any]:
        """List available tools"""
        return await self._send_request("tools/list")

    async def lookup_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """Lookup CNPJ information"""
        return await self._send_request("tools/call", {
            "name": "cnpj_lookup",
            "arguments": {"cnpj": cnpj}
        })

    async def lookup_cep(self, cep: str) -> Dict[str, Any]:
        """Lookup CEP information"""
        return await self._send_request("tools/call", {
            "name": "cep_lookup",
            "arguments": {"cep": cep}
        })

    async def disconnect(self):
        """Disconnect from the MCP server"""
        if self.session:
            await self.session.close()
        if self.process:
            self.process.terminate()
            await self.process.wait()

# Usage examples
async def stdio_example():
    client = AdvancedDadosBRClient(
        server_path="/path/to/mcp-dadosbr/build/lib/adapters/cli.js"
    )

    try:
        await client.connect()
        result = await client.lookup_cnpj("11.222.333/0001-81")
        print("CNPJ (stdio):", result)
    finally:
        await client.disconnect()

async def http_example():
    client = AdvancedDadosBRClient(
        http_url="http://localhost:3000/mcp"
    )

    try:
        await client.connect()
        result = await client.lookup_cep("01310-100")
        print("CEP (HTTP):", result)
    finally:
        await client.disconnect()

if __name__ == "__main__":
    # Test stdio transport
    asyncio.run(stdio_example())

    # Test HTTP transport (make sure server is running with MCP_TRANSPORT=http)
    asyncio.run(http_example())
```

---

## Troubleshooting

### Common Issues

1. **"Command not found" error:**

   - Make sure Node.js is installed and in PATH
   - Use absolute paths in configuration files
   - Verify the server builds correctly with `npm run build`

2. **Connection timeout:**

   - Check if the server process starts correctly
   - Verify no other process is using the same port (for HTTP transport)
   - Check server logs for error messages

3. **Permission denied:**

   - Ensure the server file has execute permissions
   - Check file paths are correct and accessible

4. **Invalid JSON response:**
   - Make sure you're using the correct MCP protocol version
   - Check that request format matches the expected schema
   - Verify server is responding with valid JSON-RPC

### Debug Mode

Enable debug logging by setting environment variables:

```bash
# For stdio transport
DEBUG=mcp* node build/lib/adapters/cli.js

# For HTTP transport
DEBUG=mcp* MCP_TRANSPORT=http node build/lib/adapters/cli.js
```

### Testing Connection

Use the MCP Inspector to test your setup:

```bash
# Test stdio
npx @modelcontextprotocol/inspector node /path/to/mcp-dadosbr/build/lib/adapters/cli.js

# Test HTTP
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

### Performance Tuning

Adjust configuration for better performance:

```json
{
  "cacheSize": 512,
  "cacheTTL": 300000,
  "apiTimeout": 5000
}
```

---

## Support

For additional help:

1. Check the [main README](../README.md) for basic setup
2. Review the [integration tests](../test/) for working examples
3. Open an issue on GitHub for specific problems
4. Check MCP client documentation for client-specific configuration
