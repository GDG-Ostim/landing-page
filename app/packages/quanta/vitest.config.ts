import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'codegen',
          environment: 'node',
          include: ['scripts/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'runtime',
          environment: 'happy-dom',
          include: ['src/runtime/**/*.test.ts'],
        },
      },
      {
        // Match the web app's public-registry icon replacement in component tests.
        plugins: [svgr({ svgrOptions: { icon: true, svgProps: { fill: 'currentColor' } } })],
        resolve: {
          alias: [{
            find: /^@higgsfield-ai\/icons(\/.*)?$/,
            replacement: fileURLToPath(new URL('../../src/lib/quanta-material-icons.ts', import.meta.url)),
          }],
        },
        test: {
          name: 'components',
          environment: 'happy-dom',
          include: ['src/components/**/*.test.tsx'],
          setupFiles: ['./src/test/setup-components.ts'],
          alias: {
            'use-sync-external-store/shim/with-selector':
              'use-sync-external-store/shim/with-selector.js',
            'use-sync-external-store/shim': 'use-sync-external-store/shim/index.js',
            'use-sync-external-store/with-selector': 'use-sync-external-store/with-selector.js',
          },
          server: {
            deps: {
              inline: [/use-sync-external-store/, /@base-ui\/react/],
            },
          },
        },
      },
    ],
  },
})
