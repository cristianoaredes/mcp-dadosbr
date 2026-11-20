import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        exclude: [
            'test/integration/**', // Integration tests run separately via npm run test:integration
            '**/node_modules/**',
            '**/dist/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            include: ['lib/**/*.ts'],
            exclude: [
                'node_modules/',
                'build/',
                'test/',
                '**/*.test.ts',
                '**/*.spec.ts',
                'lib/bin/',
                'lib/index.ts',
                'lib/types/',
                'lib/workers/types.ts',
                'lib/adapters/cli.ts',
                'scripts/',
                'examples/',
                'apps/',
            ],
            // Baseline measured in TCK-0029 across lib/**/*.ts (incl. workers/ & cloudflare.ts):
            // 87.91% stmts, 80.27% branches, 86.89% funcs, 88.64% lines (FND-0014 target met; TCK-0025 will cover logger.ts/tracing.ts).
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },
        },
        testTimeout: 10000,
        hookTimeout: 10000,
    },
});
