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
            // Baseline measured in TCK-0027 across lib/**/*.ts (incl. workers/ & cloudflare.ts):
            // 75.76% stmts, 69.56% branches, 74.53% funcs, 77.47% lines.
            // Ratcheted progressively across TCK-0028 and TCK-0029 toward 80/80/75/80.
            thresholds: {
                lines: 75,
                functions: 72,
                branches: 67,
                statements: 73,
            },
        },
        testTimeout: 10000,
        hookTimeout: 10000,
    },
});
