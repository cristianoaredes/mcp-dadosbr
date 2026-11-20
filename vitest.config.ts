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
            // Baseline measured in TCK-0028 across lib/**/*.ts (incl. workers/ & cloudflare.ts):
            // 76.62% stmts, 70.17% branches, 75.66% funcs, 78.26% lines.
            // Ratcheted from TCK-0027 (75/72/67/73); target 80/80/75/80 after TCK-0029.
            thresholds: {
                lines: 76,
                functions: 73,
                branches: 68,
                statements: 74,
            },
        },
        testTimeout: 10000,
        hookTimeout: 10000,
    },
});
