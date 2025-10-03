#!/usr/bin/env node

const MCP_BASE_URL = process.env.MCP_BASE_URL || "http://localhost:3000";

let sseReader = null;
let sseDecoder = null;
let sseBuffer = "";
let messageHandlers = new Map();

async function establishSession() {
  const response = await fetch(`${MCP_BASE_URL}/mcp`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      Connection: "keep-alive"
    }
  });

  if (!response.body) {
    throw new Error("SSE stream not supported");
  }

  sseReader = response.body.getReader();
  sseDecoder = new TextDecoder();

  let sessionId = null;

  while (!sessionId) {
    const { value, done } = await sseReader.read();
    if (done) break;

    sseBuffer += sseDecoder.decode(value, { stream: true });

    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() || "";
    
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        
        // Try JSON format first
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.sessionId) {
            sessionId = parsed.sessionId;
            break;
          }
        } catch (error) {
          // Try URL format: /messages?sessionId=xxx
          const match = data.match(/sessionId=([a-f0-9-]+)/i);
          if (match) {
            sessionId = match[1];
            break;
          }
        }
      }
    }
  }

  if (!sessionId) {
    throw new Error("Unable to obtain sessionId from SSE stream");
  }

  // Start listening for messages in background
  listenForMessages();

  return sessionId;
}

async function listenForMessages() {
  while (true) {
    try {
      const { value, done } = await sseReader.read();
      if (done) break;

      sseBuffer += sseDecoder.decode(value, { stream: true });

      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.id && messageHandlers.has(data.id)) {
              const handler = messageHandlers.get(data.id);
              handler(data);
              messageHandlers.delete(data.id);
            }
          } catch (error) {
            // Ignore malformed JSON
          }
        }
      }
    } catch (error) {
      break;
    }
  }
}

async function callMcp(method, payload, sessionId) {
  const id = Date.now();
  
  // Set up promise to wait for response via SSE
  const responsePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      messageHandlers.delete(id);
      reject(new Error("Request timeout"));
    }, 30000);
    
    messageHandlers.set(id, (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });

  const response = await fetch(
    `${MCP_BASE_URL}/messages?sessionId=${sessionId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params: payload
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    messageHandlers.delete(id);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  // Wait for response via SSE
  return await responsePromise;
}

async function callTool(toolName, args, sessionId) {
  return await callMcp(
    "tools/call",
    {
      name: toolName,
      arguments: args
    },
    sessionId
  );
}

async function listTools(sessionId) {
  return await callMcp("tools/list", {}, sessionId);
}

async function main() {
  const args = process.argv.slice(2);

  if (!args[0]) {
    console.log("Usage: node scripts/mcp-client.js <command> [args]");
    console.log("");
    console.log("Commands:");
    console.log("  list-tools                      List available tools");
    console.log("  cnpj <cnpj>                     Run cnpj_lookup");
    console.log("  cep <cep>                       Run cep_lookup");
    console.log("  intelligence <cnpj>             Run cnpj_intelligence");
    console.log("");
    console.log(
      "Env: MCP_BASE_URL=http://localhost:3000 (override to target other hosts)"
    );
    console.log(
      "Start server: MCP_TRANSPORT=http MCP_HTTP_PORT=3000 node build/lib/adapters/cli.js"
    );
    return;
  }

  let sessionId;

  try {
    sessionId = await establishSession();
  } catch (error) {
    console.error("Failed to establish SSE session:", error.message);
    process.exit(1);
  }

  try {
    const command = args[0];

    if (command === "list-tools") {
      const result = await listTools(sessionId);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === "cnpj" && args[1]) {
      const result = await callTool("cnpj_lookup", { cnpj: args[1] }, sessionId);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === "cep" && args[1]) {
      const result = await callTool("cep_lookup", { cep: args[1] }, sessionId);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === "intelligence" && args[1]) {
      const result = await callTool(
        "cnpj_intelligence",
        {
          cnpj: args[1],
          max_results_per_query: Number(process.env.MAX_RESULTS || 5),
          max_queries: Number(process.env.MAX_QUERIES || 10),
        },
        sessionId
      );
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("Unknown command or missing argument.");
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
