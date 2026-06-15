import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { findTemplate } from '../templates.js'
import { runInit } from './init.js'

const MDK_PACKAGES = [
  '@tetherto/mdk-fonts',
  '@tetherto/mdk-ui-core',
  '@tetherto/mdk-react-adapter',
  '@tetherto/mdk-react-devkit',
] as const

/**
 * Walk up from `start` looking for an MDK monorepo root. Detected by the
 * presence of `packages/ui-core/package.json` whose name is `@tetherto/mdk-ui-core`.
 * Returns the absolute path of the monorepo root, or null if not inside one.
 */
const findMdkMonorepoRoot = (start: string): string | null => {
  let dir = start
  while (dir !== dirname(dir)) {
    const probe = join(dir, 'packages', 'ui-core', 'package.json')
    if (existsSync(probe)) {
      try {
        const pkg = JSON.parse(readFileSync(probe, 'utf8')) as { name?: string }
        if (pkg.name === '@tetherto/mdk-ui-core') return dir
      } catch {
        // ignore, keep walking
      }
    }
    dir = dirname(dir)
  }
  return null
}

/**
 * Rewrite the scaffolded package.json so it lives as a workspace child:
 *   - name → `@tetherto/<appName>` (scoped, matches the rest of the monorepo)
 *   - MDK dependencies → `"*"` (npm workspace protocol)
 * Used when scaffolding INSIDE the monorepo (`apps/<appName>`).
 */
const wireAsWorkspace = (pkgJsonPath: string, appName: string): void => {
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as {
    name?: string
    dependencies?: Record<string, string>
  }
  pkg.name = `@tetherto/${appName}`
  if (pkg.dependencies) {
    for (const name of MDK_PACKAGES) {
      if (name in pkg.dependencies) pkg.dependencies[name] = '*'
    }
  }
  writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
}

export type CreateOptions = {
  appName: string
  /** Template id. Defaults to `mdk-ui-shell` inside the monorepo, `starter` elsewhere. */
  template?: string
  /** Parent directory for the new app. Defaults to `apps/` inside the monorepo, `process.cwd()` elsewhere. */
  cwd?: string
  /** Run npm install after scaffold. Defaults to `true` for standalone, `false` inside the monorepo (the root install handles it). */
  install?: boolean
  /** Agent context to seed. Defaults to `none` inside the monorepo, `cursor` elsewhere. */
  ide?: 'cursor' | 'claude' | 'none'
  out?: (line: string) => void
}

const NPM_PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

const validateAppName = (name: string): void => {
  if (!NPM_PACKAGE_NAME.test(name)) {
    throw new Error(
      `Invalid app name "${name}". Use lowercase letters, digits, hyphens, dots, and underscores (npm package-name rules).`,
    )
  }
}

const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

/**
 * Post-process the freshly copied tree:
 *  - delete `_meta.json` (CLI-internal metadata).
 *  - rename `_gitignore` → `.gitignore` (npm strips real .gitignore on publish).
 *  - rename `package.json.tpl` → `package.json` and substitute `{{appName}}`.
 *  - substitute `{{appName}}` in any other text file that mentions it.
 */
const finalizeTree = (targetDir: string, appName: string): void => {
  const files = walk(targetDir)
  const substitute = (path: string): void => {
    const content = readFileSync(path, 'utf8')
    if (!content.includes('{{appName}}')) return
    writeFileSync(path, content.replaceAll('{{appName}}', appName), 'utf8')
  }

  for (const file of files) {
    const base = file.split('/').pop()!
    if (base === '_meta.json') {
      unlinkSync(file)
      continue
    }
    if (base === '_gitignore') {
      renameSync(file, join(file, '..', '.gitignore'))
      continue
    }
    if (base === 'package.json.tpl') {
      const renamed = join(file, '..', 'package.json')
      renameSync(file, renamed)
      substitute(renamed)
      continue
    }
    substitute(file)
  }
}

export const runCreate = (opts: CreateOptions): { appPath: string } => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })

  validateAppName(opts.appName)

  // Resolve monorepo context from the user-supplied cwd if any, otherwise
  // from the actual working directory. The defaults pivot off this.
  const probeCwd = opts.cwd ?? process.cwd()
  const monorepoRoot = findMdkMonorepoRoot(probeCwd)
  const isMonorepo = monorepoRoot !== null

  const template = findTemplate(opts.template ?? (isMonorepo ? 'mdk-ui-shell' : 'starter'))

  // Parent directory: inside the monorepo, default to `<root>/apps`.
  const parentDir = opts.cwd ?? (isMonorepo ? join(monorepoRoot!, 'apps') : process.cwd())

  // Inner install only makes sense for standalone apps. Inside the
  // monorepo, defer to a single `npm install` at the root that wires up
  // the new workspace via symlinks.
  const shouldInstall = opts.install ?? !isMonorepo
  const ide = opts.ide ?? (isMonorepo ? 'none' : 'cursor')

  const targetDir = resolve(parentDir, opts.appName)
  if (existsSync(targetDir)) {
    throw new Error(`${targetDir} already exists. Pick a different name or delete it.`)
  }

  mkdirSync(targetDir, { recursive: true })
  cpSync(template.path, targetDir, { recursive: true })
  finalizeTree(targetDir, opts.appName)
  out(`✓ Scaffolded ${opts.appName} from template "${template.meta.id}"`)

  if (isMonorepo) {
    // Inside the monorepo: live as a workspace child. Use `*` protocol and
    // scope the package name so it picks up the existing
    // node_modules/@tetherto symlinks on `npm install` at the root.
    wireAsWorkspace(join(targetDir, 'package.json'), opts.appName)
    out(
      `→ Detected MDK monorepo at ${monorepoRoot!}; wired as @tetherto/${opts.appName} workspace.`,
    )
  }

  if (shouldInstall) {
    /* v8 ignore start -- spawns real `npm install`, untestable without mocking */
    out('→ Running npm install (this may take a minute)…')
    const result = spawnSync('npm', ['install'], {
      cwd: targetDir,
      stdio: 'inherit',
    })
    if (result.status !== 0) {
      throw new Error(
        `npm install failed with exit code ${result.status}. Run it manually in ${targetDir}.`,
      )
    }
    out('✓ Dependencies installed')

    runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide,
      cwd: targetDir,
      force: true,
      out,
    })
    /* v8 ignore stop */
  } else if (isMonorepo && opts.install !== false) {
    /* v8 ignore start -- spawns real `npm install`, untestable without mocking */
    out('→ Running npm install at the monorepo root to wire the workspace…')
    const result = spawnSync('npm', ['install'], {
      cwd: monorepoRoot!,
      stdio: 'inherit',
    })
    if (result.status !== 0) {
      throw new Error(
        `Root npm install failed with exit code ${result.status}. Run it manually in ${monorepoRoot!}.`,
      )
    }
    out('✓ Workspace wired into root node_modules')
    /* v8 ignore stop */
  }

  out('')
  out('Next steps:')
  if (isMonorepo) {
    out(`  npm run dev --workspace @tetherto/${opts.appName}`)
  } else {
    out(`  cd ${opts.appName}`)
    if (!shouldInstall) {
      out('  npm install')
      out(`  npx mdk-ui init --ide ${ide}   # seed agent context files`)
    }
    out('  npm run dev')
  }

  return { appPath: targetDir }
}
