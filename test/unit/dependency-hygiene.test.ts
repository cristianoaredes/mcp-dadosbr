import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { configSchema } from "../../lib/adapters/smithery.js";

const ROOT = resolve(import.meta.dirname, "../..");

describe("TCK-0021 / FND-0009: Runtime dependency hygiene & CI audit gate", () => {
  it("removes dead runtime dependencies and upgrades zod and express", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };

    for (const removed of ["agents", "@smithery/sdk", "workers-mcp", "async-mutex"]) {
      expect(pkg.dependencies).not.toHaveProperty(removed);
    }

    expect(pkg.dependencies.zod).toMatch(/^\^4\./);
    expect(pkg.dependencies.express).toMatch(/^\^5\.[2-9]\./);
  });

  it("removes dead Durable Object module lib/workers/mcp-agent.ts", () => {
    expect(existsSync(resolve(ROOT, "lib/workers/mcp-agent.ts"))).toBe(false);
  });

  it("enforces production npm audit gate in .github/workflows/ci.yml", () => {
    const ci = readFileSync(resolve(ROOT, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toMatch(/npm audit --omit=dev --audit-level=high/);
  });

  it("validates Smithery configSchema authHeaders record and defaults under Zod v4", () => {
    const okDefault = configSchema.safeParse({});
    expect(okDefault.success).toBe(true);

    const okHeaders = configSchema.safeParse({
      authHeaders: { "X-Test": "1" },
    });
    expect(okHeaders.success).toBe(true);

    const badHeaders = configSchema.safeParse({
      authHeaders: { "X-Test": 123 },
    });
    expect(badHeaders.success).toBe(false);
  });
});
