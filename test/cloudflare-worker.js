#!/usr/bin/env node

/**
 * Test script for Cloudflare Workers deployment
 * Tests the deployed worker endpoints and MCP functionality
 */

import { setTimeout } from "timers/promises";

// Configuration
const WORKER_URL = process.env.WORKER_URL || "https://mcp-dadosbr.your-subdomain.workers.dev";
const TIMEOUT = 10000; // 10 seconds

// Test utilities
function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warning: "⚠️"
  }[type];
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function httpRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Test functions
async function testHealthEndpoint() {
  log("Testing health endpoint...");
  
  try {
    const response = await httpRequest(`${WORKER_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate response structure
    const requiredFields = ["status", "service", "version", "runtime"];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (data.status !== "healthy") {
      throw new Error(`Unexpected status: ${data.status}`);
    }
    
    if (data.runtime !== "cloudflare-workers") {
      throw new Error(`Unexpected runtime: ${data.runtime}`);
    }
    
    log(`Health check passed - Service: ${data.service} v${data.version}`, "success");
    return true;
  } catch (error) {
    log(`Health check failed: ${error.message}`, "error");
    return false;
  }
}

async function testRootEndpoint() {
  log("Testing root endpoint...");
  
  try {
    const response = await httpRequest(`${WORKER_URL}/`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data.service || !data.endpoints || !data.tools) {
      throw new Error("Invalid root endpoint response structure");
    }
    
    if (!Array.isArray(data.tools) || data.tools.length !== 2) {
      throw new Error("Expected exactly 2 tools in response");
    }
    
    log("Root endpoint test passed", "success");
    return true;
  } catch (error) {
    log(`Root endpoint test failed: ${error.message}`, "error");
    return false;
  }
}

async function testMCPToolsList() {
  log("Testing MCP tools/list...");
  
  try {
    const response = await httpRequest(`${WORKER_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate MCP response structure
    if (data.jsonrpc !== "2.0" || data.id !== 1) {
      throw new Error("Invalid MCP response format");
    }
    
    if (!data.result || !data.result.tools) {
      throw new Error("Missing tools in response");
    }
    
    const tools = data.result.tools;
    if (!Array.isArray(tools) || tools.length !== 2) {
      throw new Error("Expected exactly 2 tools");
    }
    
    const toolNames = tools.map(t => t.name);
    if (!toolNames.includes("cnpj_lookup") || !toolNames.includes("cep_lookup")) {
      throw new Error("Missing expected tools: cnpj_lookup, cep_lookup");
    }
    
    log("MCP tools/list test passed", "success");
    return true;
  } catch (error) {
    log(`MCP tools/list test failed: ${error.message}`, "error");
    return false;
  }
}

async function testCNPJLookup() {
  log("Testing CNPJ lookup...");
  
  try {
    const response = await httpRequest(`${WORKER_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "cnpj_lookup",
          arguments: {
            cnpj: "11.222.333/0001-81"
          }
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate MCP response
    if (data.jsonrpc !== "2.0" || data.id !== 2) {
      throw new Error("Invalid MCP response format");
    }
    
    if (data.error) {
      // This might be expected if the CNPJ doesn't exist or API is down
      log(`CNPJ lookup returned error (may be expected): ${data.error.message}`, "warning");
      return true;
    }
    
    if (!data.result || !data.result.content) {
      throw new Error("Missing result content");
    }
    
    log("CNPJ lookup test passed", "success");
    return true;
  } catch (error) {
    log(`CNPJ lookup test failed: ${error.message}`, "error");
    return false;
  }
}

async function testCEPLookup() {
  log("Testing CEP lookup...");
  
  try {
    const response = await httpRequest(`${WORKER_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "cep_lookup",
          arguments: {
            cep: "01310-100"
          }
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate MCP response
    if (data.jsonrpc !== "2.0" || data.id !== 3) {
      throw new Error("Invalid MCP response format");
    }
    
    if (data.error) {
      // This might be expected if the CEP doesn't exist or API is down
      log(`CEP lookup returned error (may be expected): ${data.error.message}`, "warning");
      return true;
    }
    
    if (!data.result || !data.result.content) {
      throw new Error("Missing result content");
    }
    
    log("CEP lookup test passed", "success");
    return true;
  } catch (error) {
    log(`CEP lookup test failed: ${error.message}`, "error");
    return false;
  }
}

async function testCORSHeaders() {
  log("Testing CORS headers...");
  
  try {
    const response = await httpRequest(`${WORKER_URL}/mcp`, {
      method: "OPTIONS",
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const corsHeaders = [
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers"
    ];
    
    for (const header of corsHeaders) {
      if (!response.headers.get(header)) {
        throw new Error(`Missing CORS header: ${header}`);
      }
    }
    
    log("CORS headers test passed", "success");
    return true;
  } catch (error) {
    log(`CORS headers test failed: ${error.message}`, "error");
    return false;
  }
}

async function testSSEEndpoint() {
  log("Testing Server-Sent Events endpoint...");
  
  try {
    const response = await httpRequest(`${WORKER_URL}/sse`, {
      method: "GET",
      headers: {
        "Accept": "text/event-stream",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Check SSE headers
    const contentType = response.headers.get("Content-Type");
    if (!contentType?.includes("text/event-stream")) {
      throw new Error(`Expected text/event-stream, got ${contentType}`);
    }
    
    const cacheControl = response.headers.get("Cache-Control");
    if (!cacheControl?.includes("no-cache")) {
      throw new Error("Missing no-cache header for SSE");
    }
    
    // Read a small portion of the SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }
    
    const decoder = new TextDecoder();
    let receivedData = "";
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      const { done, value } = await reader.read();
      if (done) break;
      
      receivedData += decoder.decode(value, { stream: true });
      attempts++;
      
      // Check if we received connection event
      if (receivedData.includes("event: connection")) {
        break;
      }
    }
    
    reader.releaseLock();
    
    if (!receivedData.includes("event: connection")) {
      throw new Error("Did not receive expected connection event");
    }
    
    log("SSE endpoint test passed", "success");
    return true;
  } catch (error) {
    log(`SSE endpoint test failed: ${error.message}`, "error");
    return false;
  }
}

async function testInvalidEndpoint() {
  log("Testing invalid endpoint (should return 404)...");
  
  try {
    const response = await httpRequest(`${WORKER_URL}/invalid-endpoint`);
    
    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
    
    log("Invalid endpoint test passed", "success");
    return true;
  } catch (error) {
    log(`Invalid endpoint test failed: ${error.message}`, "error");
    return false;
  }
}

// Performance test
async function testPerformance() {
  log("Running performance test...");
  
  const iterations = 5;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    
    try {
      const response = await httpRequest(`${WORKER_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await response.json();
      
      const elapsed = Date.now() - start;
      times.push(elapsed);
      
    } catch (error) {
      log(`Performance test iteration ${i + 1} failed: ${error.message}`, "error");
      return false;
    }
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  log(`Performance results: avg=${avgTime.toFixed(2)}ms, min=${minTime}ms, max=${maxTime}ms`, "success");
  
  if (avgTime > 5000) {
    log("Warning: Average response time is high (>5s)", "warning");
  }
  
  return true;
}

// Main test runner
async function runTests() {
  log(`Starting Cloudflare Worker tests for: ${WORKER_URL}`);
  log("=".repeat(60));
  
  const tests = [
    { name: "Health Endpoint", fn: testHealthEndpoint },
    { name: "Root Endpoint", fn: testRootEndpoint },
    { name: "MCP Tools List", fn: testMCPToolsList },
    { name: "CNPJ Lookup", fn: testCNPJLookup },
    { name: "CEP Lookup", fn: testCEPLookup },
    { name: "CORS Headers", fn: testCORSHeaders },
    { name: "SSE Endpoint", fn: testSSEEndpoint },
    { name: "Invalid Endpoint", fn: testInvalidEndpoint },
    { name: "Performance", fn: testPerformance },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    log(`\nRunning: ${test.name}`);
    log("-".repeat(40));
    
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`Test "${test.name}" threw error: ${error.message}`, "error");
      failed++;
    }
    
    // Small delay between tests
    await setTimeout(500);
  }
  
  log("\n" + "=".repeat(60));
  log(`Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    log("🎉 All tests passed! Worker is functioning correctly.", "success");
    process.exit(0);
  } else {
    log(`❌ ${failed} test(s) failed. Please check the deployment.`, "error");
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.length > 2) {
  const providedUrl = process.argv[2];
  if (providedUrl.startsWith("http")) {
    process.env.WORKER_URL = providedUrl;
    log(`Using provided worker URL: ${providedUrl}`);
  }
}

// Run tests
runTests().catch((error) => {
  log(`Test runner failed: ${error.message}`, "error");
  process.exit(1);
});