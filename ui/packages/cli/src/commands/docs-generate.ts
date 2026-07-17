import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { type DocsBuildResult, runDocsBuild } from './docs-build.js'

import { MAX_WALK_UP_DEPTH, PACKAGE_JSON, PACKAGES, PACKAGES_DIR } from '../constants.js'

/** Subfolder that may hold the UI workspace when the repo root is one level up. */
const UI_WORKSPACE_SUBDIR = 'ui'
/** Marker file (relative to a workspace root) that identifies the UI workspace. */
const CLI_PACKAGE_MARKER = [PACKAGES_DIR, 'cli', PACKAGE_JSON]
/** Command used to rebuild the monorepo so manifests are fresh. */
const BUILD_COMMAND = 'npm'
const BUILD_ARGS = ['run', 'build']

export type DocsGenerateOptions = {
  /**
   * Monorepo root (the folder that contains `packages/` or `ui/packages/`).
   * Auto-detected by walking up from `cwd` when omitted.
   */
  repo?: string
  /** A local mdk-docs checkout. Output resolves under src/data/<version>/generated. */
  docsRepo?: string
  /** Plain dataset output directory (mutually exclusive with docsRepo). */
  outDir?: string
  /** Version segment + meta stamp. */
  versionLabel: string
  /**
   * Reuse the packages' existing `dist/` instead of rebuilding. Off by default:
   * a full build guarantees the manifests (registry/hooks/stores/fonts) reflect
   * the code currently checked out. Stale dist silently drops surface.
   */
  skipBuild?: boolean
  /** CI-style check: diff against the committed tree, never write, signal drift. */
  reportOnly?: boolean
  /** Skip MDX page + nav scaffolding (dataset only). */
  scaffold?: boolean
  /** Include public:false entries (debug only — never commit). */
  includeInternal?: boolean
  cwd?: string
  out?: (line: string) => void
}

/** Walk up from `start` looking for the workspace that holds `packages/cli`. */
const findUiRoot = (start: string): string | null => {
  let dir = resolve(start)
  for (let i = 0; i < MAX_WALK_UP_DEPTH; i += 1) {
    // The UI workspace is either the dir itself or its `ui/` subfolder.
    const candidate = [dir, join(dir, UI_WORKSPACE_SUBDIR)].find((p) =>
      existsSync(join(p, ...CLI_PACKAGE_MARKER)),
    )
    if (candidate) return candidate
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  return null
}

/**
 * One-command orchestration: resolve the monorepo, (optionally) build it so the
 * manifests are fresh, resolve every package's built manifest, then delegate to
 * `docs:build`. This is the reusable half — a consuming docs site only has to
 * add its own config resolution + prose sync around it.
 */
export const runDocsGenerate = async (opts: DocsGenerateOptions): Promise<DocsBuildResult> => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })
  const cwd = opts.cwd ?? process.cwd()

  const uiRoot = findUiRoot(opts.repo ? resolve(opts.repo) : cwd)
  if (!uiRoot) {
    throw new Error(
      'Could not locate the MDK monorepo (no packages/cli found walking up from ' +
        `${opts.repo ?? cwd}). Pass --repo <monorepo-root>.`,
    )
  }
  const pkg = (name: string): string => join(uiRoot, PACKAGES_DIR, name)

  if (!opts.skipBuild) {
    out('▶ Building the monorepo (npm run build) so manifests are fresh…')
    try {
      execFileSync(BUILD_COMMAND, BUILD_ARGS, { cwd: uiRoot, stdio: 'inherit' })
    } catch {
      throw new Error(
        `Monorepo build failed in ${uiRoot}. Run \`npm install\` there, or pass --skip-build ` +
          'to reuse the existing dist/.',
      )
    }
  }

  // Resolve each package dir when it exists; fall back to package-name
  // resolution inside runDocsBuild when a checkout is absent.
  const dirIfPresent = (name: string): string | undefined => {
    const p = pkg(name)
    return existsSync(join(p, PACKAGE_JSON)) ? p : undefined
  }

  return runDocsBuild({
    packageName: PACKAGES.devkit,
    devkitDir: dirIfPresent('react-devkit'),
    adapterDir: dirIfPresent('react-adapter'),
    coreDir: dirIfPresent('ui-foundation'),
    fontsDir: dirIfPresent('fonts'),
    outDir: opts.outDir,
    docsRepo: opts.docsRepo,
    versionLabel: opts.versionLabel,
    reportOnly: opts.reportOnly,
    scaffold: opts.scaffold,
    includeInternal: opts.includeInternal,
    cwd,
    out,
  })
}
