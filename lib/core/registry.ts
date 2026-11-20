/**
 * Tool Registry — Auto-registration pattern for MCP tools
 * 
 * Each tool file imports `registerTool` and self-registers.
 * The registry provides tool definitions and execution without if/else chains.
 */

import type { ZodTypeAny } from "zod";
import type { SequentialThinkingProcessor } from "./sequential-thinking.js";
import { Cache, LookupResult, ApiConfig } from "../types/index.js";

export interface ToolExecutionContext {
    sessionId?: string;
    thinkingProcessor?: SequentialThinkingProcessor;
}

export interface ToolHandler {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    zodSchema: ZodTypeAny;
    execute: (args: unknown, apiConfig: ApiConfig, cache?: Cache, context?: ToolExecutionContext) => Promise<LookupResult>;
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
 * Execute a registered tool by name after runtime Zod validation.
 */
export async function executeRegisteredTool(
    name: string,
    args: unknown,
    apiConfig: ApiConfig,
    cache?: Cache,
    context?: ToolExecutionContext,
): Promise<LookupResult> {
    const tool = registry.get(name);
    if (!tool) {
        throw new Error(`Unknown tool: ${name}. Available: ${Array.from(registry.keys()).join(", ")}`);
    }

    const input = args === undefined ? {} : args;
    const parsed = tool.zodSchema.safeParse(input);
    if (!parsed.success) {
        const details = parsed.error.issues
            .map((issue) => {
                const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
                return `${path}${issue.message}`;
            })
            .join("; ");
        return {
            ok: false,
            error: `Invalid parameters for ${name}: ${details}`,
        };
    }

    return tool.execute(parsed.data, apiConfig, cache, context);
}

/**
 * Check if a tool is registered.
 */
export function hasTool(name: string): boolean {
    return registry.has(name);
}

/**
 * Check if a registered tool has a runtime Zod schema attached.
 */
export function hasToolSchema(name: string): boolean {
    return Boolean(registry.get(name)?.zodSchema);
}

/**
 * Get the count of registered tools.
 */
export function getToolCount(): number {
    return registry.size;
}
