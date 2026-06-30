import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Build configuration for `@tetherto/mdk-fonts`.
 *
 * Emits a single CSS file (`dist/jetbrains-mono.css`) along with the woff2
 * font assets it references (`dist/fonts/*.woff2`), so consumers only need
 * to import the CSS and the bundler / browser will resolve the fonts
 * automatically — no manual `public/` copy required.
 *
 * We deliberately avoid Vite's `build.lib` mode here because it forces
 * inlining of all referenced assets as base64 (which would balloon the CSS
 * to ~750 kB). Using `rollupOptions.input` instead keeps assets as separate
 * files emitted alongside the CSS.
 *
 * `cssCodeSplit` MUST stay `true` (Vite's default). With a stylesheet as the
 * direct entry, Vite 8 / rolldown's `vite:css-post` plugin only registers the
 * CSS entry in its internal `cssEntriesMap` when code-splitting is enabled,
 * yet it unconditionally reads that reference back for the resulting pure-CSS
 * chunk — so `cssCodeSplit: false` makes the build crash with
 * "Cannot read properties of undefined (reading 'referenceId')". Splitting is
 * a no-op for this single-entry build, so the emitted output is unchanged.
 */
export default defineConfig({
  publicDir: false,
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    copyPublicDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/jetbrains-mono.scss'),
      output: {
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? ''
          if (name.endsWith('.woff2') || name.endsWith('.woff')) {
            return 'fonts/[name][extname]'
          }
          if (name.endsWith('.css')) {
            return 'jetbrains-mono.css'
          }
          return '[name][extname]'
        },
      },
    },
  },
})
