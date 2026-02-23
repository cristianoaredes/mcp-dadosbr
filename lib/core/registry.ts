/**
 * Tool Registry — Auto-registration pattern for MCP tools
 * 
 * Each tool file imports `registerTool` and self-registers.
 * The registry provides tool definitions and execution without if/else chains.
 */

import { Cache, LookupResult, ApiConfig } from "../types/index.js";

export interface ToolHandler {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (args: unknown, apiConfig: ApiConfig, cache?: Cache) => Promise<LookupResult>;
}

const registry = new Map<string, ToolHandler>();

/**
 * Register a tool. Called by each domain tool file on import.
 */
export function registerTool(tool: ToolHandler): void {
    if (registry.has(tool.name)) {
        console.warn(`[registry] Tool "${tool.name}" already registered, overwriting.`);
    }
    registry.set(tool.name, tool);
}

/**
 * Get all tool definitions (for MCP server tool listing).
 * Returns schemas without execute functions.
 */
export function getToolDefinitions(): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
    return Array.from(registry.values()).map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
    }));
}

/**
 * Execute a registered tool by name.
 */
export async function executeRegisteredTool(
    name: string,
    args: unknown,
    apiConfig: ApiConfig,
    cache?: Cache,
): Promise<LookupResult> {
    const tool = registry.get(name);
    if (!tool) {
        throw new Error(`Unknown tool: ${name}. Available: ${Array.from(registry.keys()).join(", ")}`);
    }
    return tool.execute(args, apiConfig, cache);
}

/**
 * Check if a tool is registered.
 */
export function hasTool(name: string): boolean {
    return registry.has(name);
}

/**
 * Get the count of registered tools.
 */
export function getToolCount(): number {
    return registry.size;
}
