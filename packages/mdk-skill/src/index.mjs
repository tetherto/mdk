// Programmatic entry point for @tetherto/mdk-skill.
//
// Consumers (e.g. the MDK CLI) import this module and call `installSkills()`
// to copy the assembled Agent Skills into a project's client directories.
// When published to npm the package ships a prebuilt `dist/skills/`; inside
// the monorepo the skills are assembled on demand from the source artifacts.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const PKG_DIR = path.dirname(SRC_DIR)
const REPO_ROOT = path.resolve(PKG_DIR, '..', '..')
const DIST = path.join(PKG_DIR, 'dist', 'skills')

const SKILL_MD_MAX_LINES = 500

// Installed skills leave the monorepo, so a relative link into the rest of the
// repo (`../../../../../examples/...`) dangles. Assembly pins those to this
// release on GitHub; links between files that ship in the bundle stay relative.
const REPO_URL = 'https://github.com/tetherto/mdk'

// Frontmatter key every suite skill carries (`metadata.suite`). installSkills
// only replaces an existing skill dir that has it, and only sweeps a stale one
// (no longer shipped) that has it, so a user's own skill is never deleted.
const SUITE_MARKER = /^\s+suite:\s*["']?mdk-developer-skill["']?\s*$/m

export const CLIENT_DIRS = {
  cursor: ['.cursor', 'skills'],
  claude: ['.claude', 'skills']
}

// Flat sibling skills — clients discover <skills-dir>/<name>/SKILL.md one
// level deep, so nested sub-skills would never trigger.
const REQUIRED = [
  'mdk/SKILL.md',
  'mdk/references/architecture.md',
  'mdk/references/package-index.md',
  'mdk/references/protocol.md',
  'mdk/references/glossary.md',
  'mdk/references/mdk-contract.schema.json',
  'mdk-app-routes/SKILL.md',
  'mdk-create-app/SKILL.md',
  'mdk-app-rbac/SKILL.md',
  'mdk-app-rbac/references/kernel-access.md',
  'mdk-app-rbac/scripts/derive-permissions.mjs',
  'mdk-ui-component/SKILL.md',
  'mdk-ui-component/references/ui-registry.json',
  'mdk-ui-component/references/app-ui-module.md',
  'mdk-ui-component/references/page-recipe.md',
  'mdk-ui-component/references/report-patterns.md',
  'mdk-deployment/SKILL.md',
  'mdk-site-sizing/SKILL.md',
  'mdk-site-sizing/references/envelope.json',
  'mdk-site-sizing/scripts/size-site.mjs',
  'mdk-site-sizing/scripts/eval-held-out.mjs',
  'mdk-worker/SKILL.md',
  'mdk-worker/references/mdk-contract.schema.json',
  'mdk-worker/references/contract-authoring.md',
  'mdk-worker/references/worker-base-api.md',
  'mdk-worker/references/device-families.md',
  'mdk-worker/references/local-testing.md',
  'mdk-worker/assets/mdk-contract.template.json',
  'mdk-worker/assets/worker-template/mdk-contract.json',
  'mdk-worker/assets/worker-template/src/client.js',
  'mdk-worker/assets/worker-template/mock/server.js',
  'mdk-worker/assets/worker-template/smoke.config.js',
  'mdk-worker/scripts/validate-contract.mjs',
  'mdk-worker/scripts/worker-smoke.mjs'
]

function copyEntry (entry, sources) {
  const src = path.resolve(REPO_ROOT, entry.source)
  const dest = path.resolve(DIST, entry.dest)
  if (!fs.existsSync(src)) throw new Error(`source missing: ${entry.source}`)

  const excluded = new Set(entry.exclude || [])
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (from) => {
      if (excluded.has(path.basename(from))) return false
      // Later entries layer onto earlier ones, so the last copy owns the file.
      if (!fs.statSync(from).isDirectory()) sources.set(path.join(dest, path.relative(src, from)), from)
      return true
    }
  })
}

function walk (dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function injectVersion (files, version) {
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const body = fs.readFileSync(file, 'utf8')
    if (!body.includes('{{MDK_VERSION}}')) continue
    fs.writeFileSync(file, body.replaceAll('{{MDK_VERSION}}', version))
  }
}

// Inline `](target)` links and `[slug]: target` definitions; fenced code is left alone.
const LINK_RE = /(\]\(\s*<?|^\s*\[[^\]]+\]:\s*<?)([^)\s>#]+)(#[^)\s>]*)?/gm

function isExternal (target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/')
}

/**
 * Rewrite every relative link in `body` (a file assembled at `distFile` from
 * `srcFile`) whose target does not ship in dist/skills to a GitHub URL at `ref`.
 * Exported for tests.
 */
export function rewriteRepoLinks (body, { distFile, srcFile, ref, distRoot = DIST, repoRoot = REPO_ROOT }) {
  let fenced = false
  return body.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    if (fenced) return line
    return line.replace(LINK_RE, (match, lead, target, hash = '') => {
      if (isExternal(target)) return match
      const inDist = path.resolve(path.dirname(distFile), target)
      if (inDist.startsWith(distRoot + path.sep) && fs.existsSync(inDist)) return match
      const inRepo = path.resolve(path.dirname(srcFile), target)
      const rel = path.relative(repoRoot, inRepo)
      if (rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(inRepo)) return match
      const kind = fs.statSync(inRepo).isDirectory() ? 'tree' : 'blob'
      return `${lead}${REPO_URL}/${kind}/${ref}/${rel.split(path.sep).join('/')}${hash}`
    })
  }).join('\n')
}

function rewriteLinks (files, sources, ref) {
  for (const file of files) {
    if (!file.endsWith('.md') || !sources.has(file)) continue
    const body = fs.readFileSync(file, 'utf8')
    const next = rewriteRepoLinks(body, { distFile: file, srcFile: sources.get(file), ref })
    if (next !== body) fs.writeFileSync(file, next)
  }
}

function check (files) {
  for (const rel of REQUIRED) {
    if (!fs.existsSync(path.join(DIST, rel))) throw new Error(`required artifact missing after assembly: ${rel}`)
  }
  for (const file of files) {
    if (path.basename(file) !== 'SKILL.md') continue
    const lines = fs.readFileSync(file, 'utf8').split('\n').length
    if (lines > SKILL_MD_MAX_LINES) {
      throw new Error(`${path.relative(DIST, file)} is ${lines} lines (budget ${SKILL_MD_MAX_LINES}) — move content to references/`)
    }
  }
}

/** True when the source map and repo root are available to assemble from. */
export function canAssemble () {
  return (
    fs.existsSync(path.join(SRC_DIR, 'sources.map.json')) &&
    fs.existsSync(path.join(REPO_ROOT, 'package.json'))
  )
}

/** True when `dist/skills/` already holds at least one assembled skill. */
export function isAssembled () {
  try {
    return fs.existsSync(DIST) && fs.readdirSync(DIST).length > 0
  } catch {
    return false
  }
}

/**
 * Assemble the skill suite from source artifacts into `dist/skills/`.
 * Only usable inside the monorepo (or the published package's own tree).
 * Returns the number of files assembled and the MDK version stamped in.
 */
export function assemble () {
  const map = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'sources.map.json'), 'utf8'))
  const mdkVersion = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version

  fs.rmSync(DIST, { recursive: true, force: true })
  fs.mkdirSync(DIST, { recursive: true })

  const sources = new Map()
  for (const entry of map.entries) copyEntry(entry, sources)

  const files = walk(DIST)
  injectVersion(files, mdkVersion)
  rewriteLinks(files, sources, `v${mdkVersion}`)
  check(files)

  return { files: files.length, version: mdkVersion }
}

function isSuiteSkill (dir) {
  let body
  try {
    body = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')
  } catch {
    return false
  }
  const fm = body.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return Boolean(fm && SUITE_MARKER.test(fm[1]))
}

function lstatOrNull (p) {
  try {
    return fs.lstatSync(p)
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

// True when `p` is `root` itself or a path below it. Both must be real paths.
function isInside (root, p) {
  const rel = path.relative(root, p)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

// Create <root>/<segments...> one level at a time. A segment that is a symlink
// is followed only when it resolves to a directory inside the project, as in
// the MDK monorepo, where `.claude/skills` and `.cursor/skills` link to the one
// real `skills/`. A planted `.claude -> /elsewhere`, or a dangling link, still
// throws, so the install (and its deletes) cannot be redirected outside the
// project.
function ensureRealDir (root, segments) {
  let dir = root
  for (const seg of segments) {
    dir = path.join(dir, seg)
    const st = lstatOrNull(dir)
    if (!st) {
      fs.mkdirSync(dir)
    } else if (st.isSymbolicLink()) {
      let real
      try {
        real = fs.realpathSync(dir)
      } catch {
        throw new Error(`refusing to install through dangling symlink ${dir}`)
      }
      if (!isInside(root, real)) throw new Error(`refusing to install through symlink ${dir}: it leaves the project`)
      if (!fs.statSync(real).isDirectory()) throw new Error(`${dir} links to ${real}, which is not a directory`)
      dir = real
    } else if (!st.isDirectory()) {
      throw new Error(`${dir} exists and is not a directory`)
    }
  }
  return dir
}

/**
 * Remove MDK-shipped skill dirs in `targetDir` that the current suite no longer
 * ships (renamed or dropped between MDK versions). Installs are copies, so
 * without this a rerun would leave the stale dir behind and the agent would
 * keep loading it. Dirs without the suite marker, and symlinks, are left alone.
 */
function sweepStale (targetDir, shipped) {
  const removed = []
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || shipped.has(entry.name)) continue
    const dir = path.join(targetDir, entry.name)
    if (!isSuiteSkill(dir)) continue
    fs.rmSync(dir, { recursive: true, force: true })
    removed.push(entry.name)
  }
  return removed
}

/**
 * Install the assembled skills into a project's client skills directories.
 * Stale MDK-shipped skills (present in the target but absent from the current
 * suite) are removed; user-authored skills are never touched.
 *
 * @param {object} [options]
 * @param {'cursor'|'claude'|'all'} [options.client='all']
 * @param {string} [options.target=process.cwd()] Project root to install into.
 * @param {boolean} [options.assembleIfMissing=true] Assemble first if `dist/skills/` is empty.
 * @param {(msg: string) => void} [options.onWarn=console.warn] Called for each skill dir left untouched.
 * @returns {{ skills: string[], installed: Array<{ client: string, dir: string, removed: string[] }>, skipped: Array<{ client: string, skill: string, dir: string, reason: string }> }}
 *
 * Throws if `.cursor`/`.claude` or `skills` under the target is a symlink that
 * leaves the project, dangles, or does not point at a directory; a symlink to a
 * directory inside the project is followed. An
 * existing `<skills-dir>/<name>` is replaced only when its SKILL.md carries the
 * suite marker (`metadata.suite: mdk-developer-skill`); a symlink or a foreign
 * skill with the same name is skipped with a warning.
 */
export function installSkills ({ client = 'all', target = process.cwd(), assembleIfMissing = true, onWarn = console.warn } = {}) {
  const clients = client === 'all' ? Object.keys(CLIENT_DIRS) : [client]
  for (const c of clients) {
    if (!CLIENT_DIRS[c]) throw new Error(`unknown client '${client}' — use cursor | claude | all`)
  }

  if (!isAssembled()) {
    if (assembleIfMissing && canAssemble()) assemble()
    else throw new Error(`no assembled skills found at ${DIST} — run \`npm run assemble\` in @tetherto/mdk-skill`)
  }

  const skills = fs.readdirSync(DIST, { withFileTypes: true }).filter((e) => e.isDirectory())
  if (!skills.length) throw new Error(`no skills found in ${DIST}`)

  fs.mkdirSync(path.resolve(target), { recursive: true })
  const projectRoot = fs.realpathSync(path.resolve(target))
  const shipped = new Set(skills.map((s) => s.name))
  const installed = []
  const skipped = []
  for (const c of clients) {
    const targetDir = ensureRealDir(projectRoot, CLIENT_DIRS[c])
    const removed = sweepStale(targetDir, shipped)
    for (const skill of skills) {
      const dest = path.join(targetDir, skill.name)
      const st = lstatOrNull(dest)
      let reason = null
      if (st?.isSymbolicLink()) reason = 'is a symlink'
      else if (st && !st.isDirectory()) reason = 'is not a directory'
      else if (st && !isSuiteSkill(dest)) reason = 'is not an MDK suite skill (no metadata.suite: mdk-developer-skill)'
      if (reason) {
        skipped.push({ client: c, skill: skill.name, dir: dest, reason })
        onWarn(`mdk-skill: skipped ${dest}: ${reason}; remove or rename it to install ${skill.name}`)
        continue
      }
      if (st) fs.rmSync(dest, { recursive: true, force: true })
      fs.cpSync(path.join(DIST, skill.name), dest, { recursive: true })
    }
    installed.push({ client: c, dir: targetDir, removed })
  }

  return { skills: skills.map((s) => s.name), installed, skipped }
}
