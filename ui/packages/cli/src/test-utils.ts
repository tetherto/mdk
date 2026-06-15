import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const noop = (): void => {}

const TEST_DIR = dirname(fileURLToPath(import.meta.url))

/** Absolute path to the built `dist/bin.js`. */
export const CLI_BIN = resolve(TEST_DIR, '..', 'dist', 'bin.js')

/** Absolute path to the workspace root (mdk/). */
export const WORKSPACE_ROOT = resolve(TEST_DIR, '..', '..', '..')

/** Absolute path to the react-devkit package (so the registry resolves). */
export const DEVKIT_DIR = join(WORKSPACE_ROOT, 'packages', 'react-devkit')

/** Absolute path to the react-adapter package (so the hooks manifest resolves). */
export const ADAPTER_DIR = join(WORKSPACE_ROOT, 'packages', 'react-adapter')

/** Absolute path to the ui-core package (so the stores manifest resolves). */
export const CORE_DIR = join(WORKSPACE_ROOT, 'packages', 'ui-core')

/**
 * Create a temporary directory that pretends to be a consuming project.
 *
 * The fixture owns its own `package.json` and a `node_modules/@tetherto/`
 * directory containing a symlink to the workspace devkit, so the registry
 * loader's `require.resolve` calls succeed without us having to run
 * `npm install`.
 */
export const makeConsumerFixture = (): { dir: string; dispose: () => void } => {
  const dir = mkdtempSync(join(tmpdir(), 'mdk-ui-cli-'))
  mkdirSync(join(dir, 'node_modules', '@tetherto'), { recursive: true })

  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'mdk-ui-cli-fixture',
        version: '0.0.0',
        private: true,
        type: 'module',
      },
      null,
      2,
    ),
    'utf8',
  )

  const linkPath = join(dir, 'node_modules', '@tetherto', 'mdk-react-devkit')
  symlinkSync(DEVKIT_DIR, linkPath, 'dir')

  const adapterLinkPath = join(dir, 'node_modules', '@tetherto', 'mdk-react-adapter')
  try {
    symlinkSync(ADAPTER_DIR, adapterLinkPath, 'dir')
  } catch {
    // Adapter is optional in some tests; ignore if it can't be linked.
  }

  const coreLinkPath = join(dir, 'node_modules', '@tetherto', 'mdk-ui-core')
  try {
    symlinkSync(CORE_DIR, coreLinkPath, 'dir')
  } catch {
    // Core is optional in some tests; ignore if it can't be linked.
  }

  return {
    dir,
    dispose: () => {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // Best-effort cleanup; tmpdir is reaped by the OS.
      }
    },
  }
}
