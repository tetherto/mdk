/**
 * Shared literals for the CLI. Centralised so the same value isn't retyped
 * across the loaders, the docs pipeline, and the tests — one place to change a
 * manifest filename, a package name, or the directory-walk safety bound.
 */

/**
 * Maximum number of parent directories to climb when locating a package or
 * workspace root (registry loader, `docs:generate`, `check`). A bound rather
 * than an unconditional walk so a bad start path can't loop toward the FS root.
 */
export const MAX_WALK_UP_DEPTH = 8

/** npm scope shared by every MDK package. */
export const MDK_SCOPE = '@tetherto'

/** MDK package names the CLI reads manifests from (also the command defaults). */
export const PACKAGES = {
  devkit: `${MDK_SCOPE}/mdk-react-devkit`,
  adapter: `${MDK_SCOPE}/mdk-react-adapter`,
  core: `${MDK_SCOPE}/mdk-ui-foundation`,
  fonts: `${MDK_SCOPE}/mdk-fonts`,
} as const

/** Directory that holds the workspace packages inside the UI monorepo. */
export const PACKAGES_DIR = 'packages'

/** Well-known files and directories inside a package / project checkout. */
export const DIST_DIR = 'dist'
export const NODE_MODULES_DIR = 'node_modules'
export const PACKAGE_JSON = 'package.json'

/** Built manifest filenames published under a package's `dist/`. */
export const MANIFESTS = {
  registry: 'registry.json',
  blueprints: 'blueprints.json',
  hooks: 'hooks.json',
  stores: 'stores.json',
} as const
