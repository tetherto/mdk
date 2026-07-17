import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import mdkLayer from './postcss-mdk-layer.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => ({
  publicDir: false,
  resolve: {
    alias: {
      '@primitives': resolve(__dirname, 'src/primitives'),
    },
  },
  build: {
    lib: {
      // Two stylesheets: generic primitives (styles.css) and the mining-domain
      // components (styles-domain.css). Apps that only use primitives import
      // styles.css alone and ship ~half the CSS.
      entry: {
        styles: resolve(__dirname, 'src/styles.scss'),
        'styles-domain': resolve(__dirname, 'src/styles-domain.scss'),
      },
      formats: ['es'],
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    // Must stay `true`: under Vite 8 / rolldown, the internal `vite:css-post`
    // plugin only registers entry CSS assets in its lookup map when code
    // splitting is enabled. With `cssCodeSplit: false` that map is empty and
    // its pure-CSS-chunk cleanup crashes (`Cannot read properties of undefined
    // (reading 'referenceId')`). It also keeps the two CSS entries above as
    // separate `styles.css` / `styles-domain.css` outputs.
    cssCodeSplit: true,
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        // CSS asset inherits its entry's name → styles.css / styles-domain.css
        assetFileNames: '[name].css',
      },
    },
  },
  css: {
    devSourcemap: true,
    postcss: {
      plugins: [mdkLayer()],
    },
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['import'],
        // Expose the shared SCSS foundation as a top-level load path so any
        // component stylesheet can write `@use "mixins" as *;` (or
        // `@use "colors" as *;`, etc.) without long relative paths like
        // `../../../../../primitives/styles/mixins`.
        loadPaths: [resolve(__dirname, 'src/primitives/styles')],
      },
    },
  },
}))
