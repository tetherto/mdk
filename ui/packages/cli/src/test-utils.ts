import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DIST_DIR, MDK_SCOPE, NODE_MODULES_DIR, PACKAGE_JSON, PACKAGES, PACKAGES_DIR } from './constants.js'

export const noop = (): void => {}

const TEST_DIR = dirname(fileURLToPath(import.meta.url))

/** Absolute path to the built `dist/bin.js`. */
export const CLI_BIN = resolve(TEST_DIR, '..', DIST_DIR, 'bin.js')

/** Absolute path to the workspace root (mdk/). */
export const WORKSPACE_ROOT = resolve(TEST_DIR, '..', '..', '..')

/** Absolute path to the react-devkit package (so the registry resolves). */
export const DEVKIT_DIR = join(WORKSPACE_ROOT, PACKAGES_DIR, 'react-devkit')

/** Absolute path to the react-adapter package (so the hooks manifest resolves). */
export const ADAPTER_DIR = join(WORKSPACE_ROOT, PACKAGES_DIR, 'react-adapter')

/** Absolute path to the ui-foundation package (so the stores manifest resolves). */
export const CORE_DIR = join(WORKSPACE_ROOT, PACKAGES_DIR, 'ui-foundation')

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
  mkdirSync(join(dir, NODE_MODULES_DIR, MDK_SCOPE), { recursive: true })

  writeFileSync(
    join(dir, PACKAGE_JSON),
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

  const linkPath = join(dir, NODE_MODULES_DIR, PACKAGES.devkit)
  symlinkSync(DEVKIT_DIR, linkPath, 'dir')

  const adapterLinkPath = join(dir, NODE_MODULES_DIR, PACKAGES.adapter)
  try {
    symlinkSync(ADAPTER_DIR, adapterLinkPath, 'dir')
  } catch {
    // Adapter is optional in some tests; ignore if it can't be linked.
  }

  const coreLinkPath = join(dir, NODE_MODULES_DIR, PACKAGES.core)
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
