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
            // Baseline measured in TCK-0025 across lib/**/*.ts (incl. logger.ts, tracing.ts, workers/ & cloudflare.ts):
            // 91.32% stmts, 83.57% branches, 93.25% funcs, 92.09% lines
            thresholds: {
                lines: 85,
                functions: 85,
                branches: 80,
                statements: 85,
            },
        },
        testTimeout: 10000,
        hookTimeout: 10000,
    },
});
