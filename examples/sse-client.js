#!/usr/bin/env node

/**
 * Example SSE client for MCP DadosBR Cloudflare Worker
 * Demonstrates how to connect to the Server-Sent Events endpoint
 */

import { EventSource } from 'eventsource';

// Configuration
const WORKER_URL = process.env.WORKER_URL || "https://mcp-dadosbr.your-subdomain.workers.dev";
const SSE_ENDPOINT = `${WORKER_URL}/sse`;

console.log(`🔗 Connecting to SSE endpoint: ${SSE_ENDPOINT}`);

// Create EventSource connection
const eventSource = new EventSource(SSE_ENDPOINT);

// Handle connection events
eventSource.onopen = () => {
  console.log("✅ SSE connection established");
};

eventSource.onerror = (error) => {
  console.error("❌ SSE connection error:", error);
};

// Handle specific event types
eventSource.addEventListener('connection', (event) => {
  const data = JSON.parse(event.data);
  console.log("🔌 Connection event:", data);
});

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log("📨 MCP message:", JSON.stringify(data, null, 2));
});

eventSource.addEventListener('ping', (event) => {
  const data = JSON.parse(event.data);
  console.log("🏓 Ping received:", data.timestamp);
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error("🚨 Error event:", data);
});

// Handle generic messages
eventSource.onmessage = (event) => {
  console.log("📩 Generic message:", event.data);
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log("\n🔌 Closing SSE connection...");
  eventSource.close();
  process.exit(0);
});

console.log("🎧 Listening for SSE events... (Press Ctrl+C to exit)");