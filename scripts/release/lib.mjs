// Shared helpers for the release scripts (bump.mjs, check.mjs).
//
// MDK ships on one fixed version: every package on the "release line" moves together, the way the
// AWS SDK for JS v3 does. The root package.json is the single source of truth for that version, and
// the scripts derive everything else from it: which manifests are on the line, which internal pins
// to rewrite, which lockfiles to regenerate. Nothing here needs a package list that someone has to
// remember to update.
//
// Manifests are edited by parsing, not by regex. Every tracked package.json round-trips through
// JSON.parse/JSON.stringify(…, null, 2) byte for byte; a file that stops doing so makes the script
// stop, rather than write a reformatted manifest.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// Every field that can carry an @tetherto/mdk-* pin. The publish step reads all of them.
export const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

export const INTERNAL_PREFIX = '@tetherto/mdk-'

// Everything tracked is on the release line except what is listed here. Keep this list short and
// give every entry a reason: a package missing from it moves with every release.
export const OFF_LINE = new Set([
  // Vendored library with its own upstream version (4.x); not released with MDK.
  'examples/mvp-site/lib/mdk-crypto-lib/package.json',
])

// Test fixtures and the scaffold template keep their mdk-app.yaml at this version on purpose:
// `mdk create app` resets a scaffold's package.json to it. Any other mdk-app.yaml is on the
// release line and moves with every release, whatever version it was at.
export const SCAFFOLD_APP_VERSION = '0.1.0'

const APP_VERSION_RE = /^version:[ \t]*(\S+)[ \t]*$/m

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

export function assertSemver(version) {
  if (!SEMVER_RE.test(version ?? '')) {
    throw new Error(`"${version}" is not a plain semver (expected X.Y.Z or X.Y.Z-tag)`)
  }
}

export function git(args, cwd = REPO_ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

export function trackedFiles(pattern, cwd = REPO_ROOT) {
  return git(['ls-files', pattern], cwd)
    .split('\n')
    .filter(Boolean)
    .filter((f) => !f.split('/').includes('node_modules'))
}

export function readManifest(file, cwd = REPO_ROOT) {
  const text = fs.readFileSync(path.join(cwd, file), 'utf8')
  const json = JSON.parse(text)
  if (`${JSON.stringify(json, null, 2)}\n` !== text) {
    throw new Error(`${file} does not round-trip through JSON.stringify(…, null, 2); normalise its formatting first`)
  }
  return json
}

export function writeManifest(file, json, cwd = REPO_ROOT) {
  fs.writeFileSync(path.join(cwd, file), `${JSON.stringify(json, null, 2)}\n`)
}

export function listManifests(cwd = REPO_ROOT) {
  return trackedFiles('*package.json', cwd).map((file) => ({ file, json: readManifest(file, cwd) }))
}

export function listAppManifests(cwd = REPO_ROOT) {
  return trackedFiles('*mdk-app.yaml', cwd).map((file) => {
    const text = fs.readFileSync(path.join(cwd, file), 'utf8')
    return { file, text, version: text.match(APP_VERSION_RE)?.[1] }
  })
}

export function rootVersion(cwd = REPO_ROOT) {
  return readManifest('package.json', cwd).version
}

// Pure: moves a manifest to `to` and returns the list of changes made. `json` is mutated in place.
// The version is fixed across the line, so a package that lagged is brought up too, and every
// internal `^X` pin becomes `^to` whatever X was. `*` (private packages) and `file:` links stay.
export function applyBump(json, to) {
  const changes = []
  if (json.version !== undefined && json.version !== to) {
    changes.push(`version ${json.version} -> ${to}`)
    json.version = to
  }
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(json[field] ?? {})) {
      if (name.startsWith(INTERNAL_PREFIX) && spec.startsWith('^') && spec !== `^${to}`) {
        json[field][name] = `^${to}`
        changes.push(`${field}.${name} ${spec} -> ^${to}`)
      }
    }
  }
  return changes
}

// Pure: returns the YAML text with its top-level `version:` set to `to`, or null when there is
// nothing to change: no version key, a scaffold/fixture manifest, or one already at `to`. A
// manifest that lagged behind the line is brought up, like a lagging package.json.
export function applyAppBump(text, to) {
  const match = text.match(APP_VERSION_RE)
  if (!match || match[1] === SCAFFOLD_APP_VERSION || match[1] === to) return null
  return text.replace(APP_VERSION_RE, `version: ${to}`)
}

// Pure: every internal pin that is not exactly ^<version>. `file:` links are fine, and `*` is fine
// only in a private package, which never reaches the registry. Reads all four dependency fields.
export function findBadPins(json, version) {
  const bad = []
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(json[field] ?? {})) {
      if (!name.startsWith(INTERNAL_PREFIX)) continue
      if (spec === `^${version}` || spec.startsWith('file:')) continue
      if (spec === '*' && json.private === true) continue
      bad.push({ field, name, spec })
    }
  }
  return bad
}

// Every directory that owns a package-lock.json. CI regenerates each one and fails on any diff.
export function lockDirs(cwd = REPO_ROOT) {
  return [...new Set(trackedFiles('*package-lock.json', cwd).map((f) => path.dirname(f)))].sort()
}

export function regenerateLock(dir, cwd = REPO_ROOT) {
  execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: path.join(cwd, dir),
    stdio: ['ignore', 'ignore', 'inherit'],
  })
}

export function registryStatus(name) {
  // 200 published, 404 not published. Anything else is surfaced to the caller as-is.
  // Encode the whole name as one path segment (`@scope/pkg` -> `@scope%2Fpkg`); the registry wants a literal `@`.
  const segment = encodeURIComponent(name).replace(/^%40/, '@')
  return fetch(`https://registry.npmjs.org/${segment}`, {
    method: 'HEAD',
    signal: AbortSignal.timeout(15_000),
  }).then((r) => r.status)
}
