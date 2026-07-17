import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/**
 * Base Vite config for SCSS compilation in packages.
 *
 * Designed for library mode with SCSS support. Each package can extend this base config.
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
          api: 'modern-compiler',
          loadPaths: [resolve(packageDir, '../../packages')],
          importers: [
            {
              canonicalize(url) {
                if (url.startsWith('@tetherto/')) {
                  const [, pkgName, ...pathParts] = url.split('/')
                  // Map workspace package names to their internal source folders.
                  const pkgMap = {
                    'mdk-react-devkit': 'react-devkit',
                    'mdk-ui-foundation': 'ui-foundation',
                    'mdk-react-adapter': 'react-adapter',
                    'mdk-fonts': 'fonts',
                  }
                  const pkgFolder = pkgMap[pkgName] ?? pkgName
                  const pkgPath = resolve(
                    packageDir,
                    '../../packages',
                    pkgFolder,
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
        '@tetherto/mdk-react-devkit': resolve(packageDir, '../react-devkit/src'),
      },
    },
  })
}
