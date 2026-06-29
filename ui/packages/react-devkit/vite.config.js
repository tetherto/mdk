import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import mdkLayer from './postcss-mdk-layer.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => ({
  publicDir: false,
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/styles.scss'),
      formats: ['es'],
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    cssCodeSplit: true,
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        assetFileNames: 'styles.css',
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
        // `../../../../../core/styles/mixins`.
        loadPaths: [resolve(__dirname, 'src/core/styles')],
      },
    },
  },
}))
