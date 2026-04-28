import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Build configuration for `@tetherto/fonts`.
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
 */
export default defineConfig({
  publicDir: false,
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
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
