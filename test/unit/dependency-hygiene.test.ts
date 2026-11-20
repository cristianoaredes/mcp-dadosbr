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

function parseSemverTuple(raw: string): [number, number, number] {
  const cleaned = raw.replace(/^[^0-9]*/, "");
  const parts = cleaned.split(".").map((n) => Number.parseInt(n, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isAtLeastSemver(actual: string, min: [number, number, number]): boolean {
  const [a0, a1, a2] = parseSemverTuple(actual);
  if (a0 !== min[0]) return a0 > min[0];
  if (a1 !== min[1]) return a1 > min[1];
  return a2 >= min[2];
}

describe("TCK-0022 / FND-0010: DevDependencies CVE patches & CI wranglerVersion alignment", () => {
  it("declares patched floors for vulnerable devDependencies in package.json", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    };

    expect(isAtLeastSemver(pkg.devDependencies.vitest, [4, 1, 12])).toBe(true);
    expect(isAtLeastSemver(pkg.devDependencies["@vitest/ui"], [4, 1, 12])).toBe(true);
    expect(isAtLeastSemver(pkg.devDependencies.vite, [7, 3, 8])).toBe(true);
    expect(isAtLeastSemver(pkg.devDependencies.wrangler, [4, 166, 0])).toBe(true);
    expect(pkg.devDependencies["@cloudflare/workers-types"]).toMatch(/^\^5\./);
  });

  it("aligns wranglerVersion in .github/workflows/cloudflare-deploy.yml with package.json", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    };
    const workflow = readFileSync(
      resolve(ROOT, ".github/workflows/cloudflare-deploy.yml"),
      "utf8",
    );
    const match = workflow.match(/wranglerVersion:\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    const ciWrangler = match![1];
    expect(ciWrangler).not.toMatch(/^3\./);
    expect(isAtLeastSemver(ciWrangler, [4, 166, 0])).toBe(true);
    expect(ciWrangler).toBe(pkg.devDependencies.wrangler.replace(/^\^/, ""));
  });

  it("pins patched versions of direct and transitive packages in package-lock.json", () => {
    const lock = JSON.parse(readFileSync(resolve(ROOT, "package-lock.json"), "utf8")) as {
      packages: Record<string, { version?: string }>;
    };

    expect(isAtLeastSemver(lock.packages["node_modules/vitest"]?.version ?? "0.0.0", [4, 1, 12])).toBe(true);
    expect(isAtLeastSemver(lock.packages["node_modules/@vitest/ui"]?.version ?? "0.0.0", [4, 1, 12])).toBe(true);
    expect(isAtLeastSemver(lock.packages["node_modules/vite"]?.version ?? "0.0.0", [7, 3, 8])).toBe(true);
    expect(isAtLeastSemver(lock.packages["node_modules/wrangler"]?.version ?? "0.0.0", [4, 166, 0])).toBe(true);
    expect(isAtLeastSemver(lock.packages["node_modules/handlebars"]?.version ?? "0.0.0", [4, 7, 10])).toBe(true);
  });
});

describe("TCK-0027 / FND-0014: Coverage tooling, Worker inclusion & circuit-breaker fake timers", () => {
  it("aligns @vitest/coverage-v8 with vitest in package.json and includes Workers in vitest.config.ts", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    };
    expect(pkg.devDependencies["@vitest/coverage-v8"]).toBe(pkg.devDependencies.vitest);

    const vitestCfg = readFileSync(resolve(ROOT, "vitest.config.ts"), "utf8");
    expect(vitestCfg).toContain("include: ['lib/**/*.ts']");
    expect(vitestCfg).not.toContain("'lib/workers/'");
    expect(vitestCfg).not.toContain("'lib/adapters/cloudflare.ts'");
  });

  it("uses fake timers without real 1100ms sleeps in test/unit/circuit-breaker.test.ts", () => {
    const testSrc = readFileSync(resolve(ROOT, "test/unit/circuit-breaker.test.ts"), "utf8");
    expect(testSrc).toContain("vi.useFakeTimers()");
    expect(testSrc).toContain("vi.useRealTimers()");
    expect(testSrc).not.toMatch(/setTimeout\(resolve,\s*1100\)/);
  });
});
