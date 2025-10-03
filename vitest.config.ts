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
            exclude: [
                'node_modules/',
                'build/',
                'test/',
                '**/*.test.ts',
                '**/*.spec.ts',
                'lib/workers/', // Cloudflare Workers specific
                'lib/adapters/cloudflare.ts',
                'lib/bin/',
                'scripts/',
                'examples/',
            ],
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
