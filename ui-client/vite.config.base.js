import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/**
 * Base Vite config for SCSS compilation in packages
 *
 * This config is designed for library mode with SCSS support.
 * Each package can extend this base config.
 */
export const createLibConfig = ({ packageDir }) => {
  return defineConfig({
    build: {
      lib: {
        entry: resolve(packageDir, 'src/styles.scss'),
        formats: ['es'],
        fileName: () => 'styles.css',
      },
      outDir: resolve(packageDir, 'src'),
      emptyOutDir: false,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          assetFileNames: 'styles.css',
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Enable modern SCSS API
          api: 'modern-compiler',
          // Add workspace packages to load paths
          loadPaths: [resolve(packageDir, '../../packages')],
          // Custom importer for @tetherto/* packages
          importers: [
            {
              canonicalize(url) {
                if (url.startsWith('@tetherto/')) {
                  const [, pkgName, ...pathParts] = url.split('/')
                  const pkgPath = resolve(
                    packageDir,
                    '../../packages',
                    pkgName,
                    'src',
                    pathParts.join('/') || 'styles',
                  )
                  return new URL(`file://${pkgPath}.scss`)
                }
                return null
              },
            },
          ],
        },
      },
    },
    resolve: {
      alias: {
        '@tetherto/mdk-core-ui': resolve(packageDir, '../core/src'),
        '@tetherto/mdk-foundation-ui': resolve(packageDir, '../foundation/src'),
      },
    },
  })
}
