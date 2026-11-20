#!/usr/bin/env node
// Security scan for a third-party (vendor) MDK App — a package with
// mdk-app.yaml + mdk-plugin.json (at the root or under plugin/) + controllers,
// optionally a UI, that a site adds with `mdk add app` or as a dependency
// (e.g. @tetherto/mdk-app-demo in examples/mvp-site).
//
//   node scan-app.mjs <app-dir> [--consumer <site-dir>] [--json] [--out <file>]
//
//   <app-dir>      a checkout of the app repo, or the installed copy under a
//                  site's node_modules/<name>
//   --consumer     the site directory whose package.json depends on the app:
//                  pin, lockfile, site overrides
//
// Checks (findings carry a severity; "leads" are grep hits to triage by hand):
//
//   manifest    install/prepare scripts, dependency sources and ranges, files
//               allowlist, overrides that never reach the site, metadata
//   routes      per route in mdk-plugin.json: handler inside the plugin and
//               present; the Kernel client methods its handler can reach
//               (following local requires); auth, safety, verb and
//               resourceName against what the code does; request inputs the
//               code reads but the manifest declares no schema for; unbounded
//               declared params; per-request fan-out with no cache
//   permissions mdk-app.yaml wildcards and admin resources; when the sibling
//               mdk-app-rbac skill is installed, derive-permissions --check
//               --strict (permissions the code needs vs. what is declared,
//               direct-to-Worker calls that bypass spec.rbac)
//   code        undeclared imports, external hosts (fleet-data egress),
//               listeners, process control, global mutation, obfuscation,
//               secrets, plus SAST leads; UI sources get the browser leads
//               (HTML sinks, URL sinks, token storage, CDN scripts)
//   consumer    (--consumer) pin is a commit SHA or exact version, lockfile
//               agrees, README does not tell sites to install a branch
//
// Zero-dependency, read-only, never runs the app's code or install scripts
// (derive-permissions only reads the app's files). Exit 0 unless the scan
// itself fails (2 = bad arguments). Markdown (default) or JSON (--json).
// --out creates a new file and refuses an existing path or symlink.

import fs from 'node:fs'
import path from 'node:path'
import { builtinModules } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const opt = { dir: null, consumer: null, json: false, out: null }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--consumer') opt.consumer = path.resolve(args[++i] || '')
  else if (a === '--json') opt.json = true
  else if (a === '--out') opt.out = args[++i]
  else if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 38).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
    process.exit(0)
  } else if (a.startsWith('--')) {
    console.error(`ERR_ARG: unknown argument ${a}`)
    process.exit(2)
  } else if (!opt.dir) opt.dir = path.resolve(a)
  else {
    console.error(`ERR_ARG: unexpected argument ${a}`)
    process.exit(2)
  }
}
if (!opt.dir) {
  console.error('ERR_ARG: usage: scan-app.mjs <app-dir> [--consumer <site-dir>] [--json] [--out <file>]')
  process.exit(2)
}
if (!fs.existsSync(path.join(opt.dir, 'package.json'))) {
  console.error(`ERR_ARG: no package.json in ${opt.dir}`)
  process.exit(2)
}
if (opt.consumer && !fs.existsSync(path.join(opt.consumer, 'package.json'))) {
  console.error(`ERR_ARG: no package.json in --consumer ${opt.consumer}`)
  process.exit(2)
}
if (opt.out) {
  let exists = false
  try { fs.lstatSync(opt.out); exists = true } catch {}
  if (exists) {
    console.error(`ERR_ARG: --out ${opt.out} already exists (or is a symlink); choose a new path, e.g. "$(mktemp -d)/app-scan.md"`)
    process.exit(2)
  }
}

const BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)])
const CODE_EXT = /\.(c|m)?jsx?$|\.tsx?$/
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', '.nyc_output'])
// Resolved by the app runtime's loader for every plugin (overridden per plugin).
const HOST_PROVIDED = /^@tetherto\/mdk-(gateway|app-runtime)(\/|$)/
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|::1|example\.(com|org|net)|[\w.-]+\.example|[\w.-]+\.test|[\w.-]+\.invalid)$/i
const DOC_HOSTS = /^(github\.com|www\.github\.com|raw\.githubusercontent\.com|json-schema\.org|www\.w3\.org|www\.apache\.org|opensource\.org|spdx\.org|docs\.[\w.-]+|npmjs\.com|www\.npmjs\.com|nodejs\.org|reactjs\.org|react\.dev)$/i

// Kernel client methods (mirrors mdk-app-rbac/scripts/derive-permissions.mjs METHODS/HELPERS).
const WRITE_METHODS = new Set(['sendCommand', 'terminateWorker', 'pushAction', 'pushActionsBatch', 'voteAction', 'cancelActionsBatch', 'applyRbac', 'upsertUser', 'deleteUser', 'upsertServiceAccount', 'deleteServiceAccount', 'rotateSigningKey', 'sendWorkerCommand'])
const ADMIN_METHODS = new Set(['terminateWorker', 'getRbac', 'applyRbac', 'listUsers', 'upsertUser', 'deleteUser', 'listServiceAccounts', 'upsertServiceAccount', 'deleteServiceAccount', 'rotateSigningKey'])
const DIRECT_METHODS = new Set(['sendWorkerCommand', 'pullWorkerTelemetry'])
const READ_METHODS = ['listWorkers', 'getCapabilities', 'pullTelemetry', 'pullSnapshot', 'pullAggregate', 'pullWorkerQuery', 'pullState', 'getCommandStatus', 'getCommandLog', 'getAction', 'getActionsBatch', 'queryActions', 'getStatus', 'waitForWorkers', 'waitForDevice', 'getWorkerKey']
const ALL_METHODS = [...new Set([...WRITE_METHODS, ...ADMIN_METHODS, ...DIRECT_METHODS, ...READ_METHODS])]
const METHOD_RE = new RegExp(`\\.(${ALL_METHODS.join('|')})\\s*\\(`, 'g')

const findings = []
const leads = []
const notes = []
const add = (sev, check, msg, where) => findings.push({ sev, check, msg, where: where || null })
const rel = (abs) => path.relative(opt.dir, abs) || '.'

function readJson (file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (err) { return { __error: err.message } }
}
function readText (file) { try { return fs.readFileSync(file, 'utf8') } catch { return null } }
function isComment (line) { const t = line.trim(); return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') }

function walk (dir, base = dir, out = []) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isSymbolicLink()) { out.push({ rel: path.relative(base, p), symlink: true }); continue }
    if (e.isDirectory()) walk(p, base, out)
    else out.push({ rel: path.relative(base, p) })
  }
  return out
}

function packList (dir) {
  try {
    const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 })
    return JSON.parse(raw)[0].files.map((f) => f.path.split('/').join(path.sep))
  } catch {
    return null
  }
}

function role (r) {
  const p = r.split(path.sep).join('/')
  if (/(^|\/)(tests?|__tests__|spec|fixtures?|e2e|mocks?)\//.test(p) || /\.(test|spec|stories)\.[cm]?[jt]sx?$/.test(p)) return 'test'
  if (/(^|\/)(ui|ui-src|web|client|frontend|public)\//.test(p) || /\.(jsx|tsx|html|vue|svelte)$/.test(p)) return 'ui'
  if (/^(scripts|bin|tools|examples?)\//.test(p)) return 'script'
  return 'server'
}

// --- package.json ---------------------------------------------------------

const pkg = readJson(path.join(opt.dir, 'package.json'))
if (pkg.__error) {
  console.error(`ERR_ARG: package.json does not parse: ${pkg.__error}`)
  process.exit(2)
}
const deps = pkg.dependencies || {}
const peers = pkg.peerDependencies || {}

for (const s of ['preinstall', 'install', 'postinstall']) {
  if (pkg.scripts && pkg.scripts[s]) add('high', 'install-scripts', `"${s}": ${JSON.stringify(pkg.scripts[s])} runs on every site that installs the app`, 'package.json')
}
if (pkg.scripts && pkg.scripts.prepare) add('high', 'install-scripts', `"prepare": ${JSON.stringify(pkg.scripts.prepare)} runs on every git install of the app (\`mdk add app github:…\`)`, 'package.json')
if (pkg.scripts && pkg.scripts.prepack) add('medium', 'install-scripts', `"prepack": ${JSON.stringify(pkg.scripts.prepack)} runs when npm packs the git dependency during install`, 'package.json')
for (const [name, spec] of Object.entries({ ...deps, ...peers })) {
  const s = String(spec)
  if (/^(file|link|workspace):/.test(s)) add('high', 'dep-source', `dependency ${name}@${s} resolves to a path that does not exist on the site`, 'package.json')
  else if (/^(git(\+\w+)?:|github:|gitlab:|bitbucket:|https?:)/.test(s) || /^[\w-]+\/[\w.-]+(#.*)?$/.test(s)) {
    const sha = /#([0-9a-f]{40})$/.test(s)
    add(sha ? 'medium' : 'high', 'dep-source', `dependency ${name} installs from ${s}${sha ? '' : ' with no commit pin (mutable)'}; review that code too`, 'package.json')
  } else if (/^(\*|latest|x|)$/.test(s) || (/^>=?\s*\d/.test(s) && !/<\s*\d/.test(s))) add('high', 'dep-range', `dependency ${name}@"${s}" accepts any future release`, 'package.json')
  else if (deps[name] && (/^[~^]/.test(s) || /\s-\s|\|\|/.test(s))) add('low', 'dep-range', `dependency ${name}@${s} is a range; the app's lockfile does not apply on the site`, 'package.json')
}
if (pkg.overrides && Object.keys(pkg.overrides).length) add('low', 'package-overrides', `overrides (${Object.keys(pkg.overrides).join(', ')}) apply only inside the app repo; a site installing it does not get them — the advisory they patch is live on the site`, 'package.json')
if (pkg.bundleDependencies || pkg.bundledDependencies) add('high', 'bundled-deps', 'bundled dependencies ship third-party code inside the tarball, outside npm audit', 'package.json')
if (!pkg.files) add('medium', 'files-allowlist', 'no "files" allowlist: tests, CI config and anything not in .npmignore ship to the site', 'package.json')
if (!pkg.repository) add('low', 'repository', 'no "repository": the site cannot tie the installed code to a source repo', 'package.json')
if (!pkg.license) add('low', 'license', 'no "license"', 'package.json')

// --- what ships -----------------------------------------------------------

const all = walk(opt.dir)
for (const f of all.filter((f) => f.symlink)) add('high', 'symlink', 'symlink in the package; it can point outside the install dir', f.rel)
const packed = packList(opt.dir)
const shipped = packed ? new Set(packed) : null
if (!packed) notes.push('`npm pack --dry-run` failed or npm is unavailable: scanned every file in the directory instead of the install set.')
const files = all.filter((f) => !f.symlink && (!shipped || shipped.has(f.rel))).map((f) => ({ rel: f.rel, role: role(f.rel) }))
for (const f of files) {
  const p = f.rel.split(path.sep).join('/')
  if (/\.(node|so|dylib|dll|exe|wasm)$/i.test(p) || /(^|\/)binding\.gyp$/.test(p)) add('high', 'native-binary', 'native/binary artifact ships', f.rel)
  else if (/(^|\/)\.env(\.|$)|\.(pem|key|p12|pfx)$|(^|\/)id_(rsa|ed25519|ecdsa)|(^|\/)\.(npmrc|netrc)$/i.test(p)) add('high', 'tarball-contents', 'credential/key file ships', f.rel)
  else if (/\.(sqlite|db|log|har)$/i.test(p)) add('medium', 'tarball-contents', 'database / log / capture file ships (may hold real fleet data)', f.rel)
  else if (/\.map$/.test(p)) add('low', 'tarball-contents', 'source map ships (may embed absolute local paths and full sources)', f.rel)
}
const testFiles = files.filter((f) => f.role === 'test')
if (testFiles.length) add('low', 'tarball-contents', `${testFiles.length} test/mock file(s) ship (e.g. ${testFiles[0].rel})`, null)

// --- manifests ------------------------------------------------------------

const yamlPath = path.join(opt.dir, 'mdk-app.yaml')
const yamlText = readText(yamlPath)
const pluginDir = [opt.dir, path.join(opt.dir, 'plugin')].find((d) => fs.existsSync(path.join(d, 'mdk-plugin.json')))
const manifestPath = pluginDir ? path.join(pluginDir, 'mdk-plugin.json') : null
const manifest = manifestPath ? readJson(manifestPath) : null
const mRel = manifestPath ? rel(manifestPath) : 'mdk-plugin.json'
if (!yamlText) add('high', 'app-manifest', 'no mdk-app.yaml: not an MDK App, or the manifest ships elsewhere', null)
if (!manifest) add('high', 'plugin-manifest', 'no mdk-plugin.json at the root or under plugin/', null)
else if (manifest.__error) add('high', 'plugin-manifest', `mdk-plugin.json does not parse: ${manifest.__error}`, mRel)

// mdk-app.yaml permissions: line-level, the authoritative check is derive-permissions below.
const declared = { wildcard: false, admin: [], verbs: new Set() }
if (yamlText) {
  const block = yamlText.split(/^permissions\s*:/m)[1]
  const permText = block ? block.split(/^\S/m)[0] : ''
  if (!block) add('medium', 'permissions', 'mdk-app.yaml has no `permissions` key: `mdk add app` cannot derive the app\'s role, and an operator will hand-grant one', 'mdk-app.yaml')
  permText.split('\n').forEach((line, i) => {
    const where = `mdk-app.yaml:${yamlText.split('\n').findIndex((l) => l === line) + 1}`
    if (/['"]?\*['"]?/.test(line) && /resources|verbs|resourceNames|-/.test(line) && !/resourceNames/.test(line)) { declared.wildcard = true; add('high', 'permissions', `wildcard in permissions: ${line.trim()} — the app's service account gets every current and future resource/verb`, where) }
    const r = line.match(/resources\s*:\s*\[([^\]]*)\]/)
    if (r) for (const res of r[1].split(',').map((x) => x.trim().replace(/['"]/g, ''))) if (/^(policy|identities)$/.test(res)) { declared.admin.push(res); add('high', 'permissions', `administrative resource "${res}" granted: the app can rewrite RBAC or identities — only an admin app should`, where) }
    const v = line.match(/verbs\s*:\s*\[([^\]]*)\]/)
    if (v) for (const verb of v[1].split(',').map((x) => x.trim().replace(/['"]/g, ''))) declared.verbs.add(verb)
  })
  if (/\ballowAll\b|\bskipAuth\b/i.test(yamlText)) add('high', 'app-manifest', 'mdk-app.yaml carries an auth bypass flag', 'mdk-app.yaml')
}

// --- module graph (local requires from each handler) -----------------------

const RESOLVE_EXT = ['', '.js', '.cjs', '.mjs', '.ts', '/index.js', '/index.cjs', '/index.mjs', '/index.ts']
const importRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s+['"]([^'"]+)['"]/gm
const srcCache = new Map()
function source (abs) { if (!srcCache.has(abs)) srcCache.set(abs, readText(abs)); return srcCache.get(abs) }
function resolveLocal (fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec)
  for (const ext of RESOLVE_EXT) {
    const p = base + ext
    try { if (fs.statSync(p).isFile()) return p } catch {}
  }
  return null
}
function reach (entry) {
  const seen = new Set()
  const stack = [entry]
  while (stack.length) {
    const f = stack.pop()
    if (!f || seen.has(f)) continue
    const rp = path.relative(opt.dir, f)
    if (rp.startsWith('..')) continue
    seen.add(f)
    const text = source(f)
    if (!text) continue
    importRe.lastIndex = 0
    let m
    while ((m = importRe.exec(text))) {
      const spec = m[1] || m[2] || m[3] || m[4]
      if (spec && spec.startsWith('.')) stack.push(resolveLocal(f, spec))
    }
  }
  return [...seen]
}
function methodsIn (fileList) {
  const out = new Map()
  for (const f of fileList) {
    const text = source(f)
    if (!text) continue
    text.split('\n').forEach((line, i) => {
      if (isComment(line)) return
      METHOD_RE.lastIndex = 0
      let m
      while ((m = METHOD_RE.exec(line))) if (!out.has(m[1])) out.set(m[1], `${rel(f)}:${i + 1}`)
    })
  }
  return out
}
function inputsIn (fileList) {
  const out = new Map()
  const re = /\b(?:req|request)\s*(?:\.|\?\.)\s*(query|body|params)\s*(?:(?:\.|\?\.)\s*(\w+)|\[\s*['"](\w+)['"]\s*\])?/g
  for (const f of fileList) {
    const text = source(f)
    if (!text) continue
    text.split('\n').forEach((line, i) => {
      if (isComment(line)) return
      re.lastIndex = 0
      let m
      while ((m = re.exec(line))) {
        const key = `${m[1]}.${m[2] || m[3] || '*'}`
        if (!out.has(key)) out.set(key, `${rel(f)}:${i + 1}`)
      }
    })
  }
  // `req.query && req.query.limit` is a guard, not a whole-object read.
  for (const src of ['query', 'body', 'params']) {
    if (out.has(`${src}.*`) && [...out.keys()].some((k) => k.startsWith(src + '.') && k !== `${src}.*`)) out.delete(`${src}.*`)
  }
  return out
}

// --- routes ---------------------------------------------------------------

const routes = []
if (manifest && !manifest.__error) {
  if (!Array.isArray(manifest.routes) || !manifest.routes.length) add('high', 'plugin-manifest', '"routes" is missing or empty', mRel)
  for (const route of manifest.routes || []) {
    const id = route.id || '(no id)'
    const method = String(route.http?.method || route.method || '').toUpperCase()
    const rpath = route.http?.path || route.path || ''
    const where = `${mRel} (${id})`
    const r = { id, method, path: rpath, auth: route.auth === true, safety: route.safety || null, methods: {}, inputs: {} }
    routes.push(r)

    const [file] = String(route.handler || '').split('#')
    if (!file) { add('high', 'route-handler', 'route has no handler', where); continue }
    const root = path.resolve(pluginDir)
    const abs = path.resolve(root, file)
    const hr = path.relative(root, abs)
    if (path.isAbsolute(file) || !hr || hr === '..' || hr.startsWith('..' + path.sep)) { add('high', 'route-handler', `handler "${file}" resolves outside the plugin dir (the loader refuses it; the manifest is tampered or broken)`, where); continue }
    const handlerFile = resolveLocal(path.join(root, 'x'), './' + hr)
    if (!handlerFile) { add('high', 'route-handler', `handler "${file}" does not exist`, where); continue }
    if (shipped && !shipped.has(rel(handlerFile))) add('high', 'route-handler', `handler "${file}" is not in the install set ("files")`, where)

    const reached = reach(handlerFile)
    const methods = methodsIn(reached)
    const inputs = inputsIn(reached)
    r.methods = Object.fromEntries(methods)
    r.inputs = Object.fromEntries(inputs)
    const writes = [...methods.keys()].filter((m) => WRITE_METHODS.has(m))
    const admin = [...methods.keys()].filter((m) => ADMIN_METHODS.has(m))
    const direct = [...methods.keys()].filter((m) => DIRECT_METHODS.has(m))
    const mutating = writes.length > 0 || !['GET', 'HEAD', 'OPTIONS'].includes(method)

    if (route.auth !== true) {
      if (writes.length || admin.length) add('high', 'route-auth', `auth is not true on a route that calls ${[...writes, ...admin].join(', ')}: on a Gateway without an authority (authVerifier mode) anyone who reaches the Gateway can trigger it`, where)
      else if (mutating) add('high', 'route-auth', `auth is not true on a ${method} route: open on Gateways without an authority`, where)
      else add('medium', 'route-auth', `auth is not true: on a Gateway without an authority this read is open to anyone who reaches it${methods.size ? ` (returns data from ${[...methods.keys()].join(', ')})` : ''}`, where)
    }
    if (!route.safety) add('low', 'route-safety', 'no `safety` declared: agents and operators cannot tell a read from a device command', where)
    else if (/read/i.test(route.safety) && (writes.length || mutating)) add('high', 'route-safety', `declared "${route.safety}" but ${writes.length ? `calls ${writes.join(', ')}` : `is a ${method}`}: agents and approval flows trust this flag`, where)
    if (writes.length && ['GET', 'HEAD'].includes(method)) add('medium', 'route-method', `${method} route changes state (${writes.join(', ')}): link previews, prefetch and caches can fire it`, where)
    if (writes.length && Array.isArray(route.cache)) add('high', 'route-cache', `cached route changes state (${writes.join(', ')}): a cache hit replays or skips the command`, where)
    if (direct.length) add('high', 'route-direct', `calls ${direct.join(', ')}, which dials the Worker directly: spec.rbac does not evaluate it, so the app's role does not bound what it can do`, `${where} → ${methods.get(direct[0])}`)
    if (admin.length) add('medium', 'route-admin', `calls administrative ${admin.join(', ')}: confirm the app's purpose is administration and the README says so`, `${where} → ${methods.get(admin[0])}`)

    const namesDevice = (s) => /device|worker|serial|thing/i.test(s)
    if (writes.length && !route.resourceName && ([...inputs.keys()].some(namesDevice) || /[:{]\w*(device|worker)/i.test(rpath))) add('low', 'route-scope', 'device-commanding route has no `resourceName`: spec.rbac cannot scope callers to particular devices on this route', where)

    // Declared inputs vs. what the code reads.
    const declaredParams = new Map()
    for (const p of route.http?.parameters || route.parameters || []) declaredParams.set(`${p.in === 'path' ? 'params' : p.in}.${p.name}`, p)
    const bodySchema = route.http?.requestBody?.content?.['application/json']?.schema || route.schema?.body || null
    for (const [key, at] of inputs) {
      const [src, name] = key.split('.')
      if (src === 'body') {
        if (!bodySchema) add('medium', 'route-input', `handler reads req.body${name === '*' ? '' : '.' + name} but the route declares no request body schema: the Gateway forwards it unvalidated`, `${where} → ${at}`)
        else if (name !== '*' && bodySchema.properties && !bodySchema.properties[name]) add('medium', 'route-input', `handler reads req.body.${name}, which the body schema does not declare`, `${where} → ${at}`)
      } else if (name === '*') {
        if (![...declaredParams.keys()].some((k) => k.startsWith(src + '.'))) add('low', 'route-input', `handler reads req.${src} as a whole (dynamic keys) with no declared ${src} params`, `${where} → ${at}`)
      } else if (!declaredParams.has(key)) add('medium', 'route-input', `handler reads req.${src}.${name} but the manifest declares no schema for it: no Gateway validation, any type/length reaches the handler`, `${where} → ${at}`)
    }
    for (const [key, p] of declaredParams) {
      const s = p.schema || {}
      if (s.type === 'string' && !s.enum && s.maxLength === undefined && !s.pattern && !s.format) add('low', 'route-input', `string param ${key} has no enum, maxLength or pattern`, where)
      if ((s.type === 'integer' || s.type === 'number') && s.maximum === undefined) add('low', 'route-input', `number param ${key} has no maximum`, where)
      if (s.type === 'array' && s.maxItems === undefined) add('low', 'route-input', `array param ${key} has no maxItems`, where)
    }
    if (bodySchema && bodySchema.type === 'object' && bodySchema.additionalProperties !== false) add('low', 'route-input', 'request body schema allows additional properties', where)

    const fanOut = reached.some((f) => /Promise\.all(Settled)?\s*\(/.test(source(f) || '')) && methods.has('listWorkers')
    if (fanOut && !Array.isArray(route.cache)) add('low', 'route-dos', 'each request fans out over every Worker/device (listWorkers + Promise.all) with no `cache`: one caller can multiply Kernel and device load; read the fleet in one call with pullSnapshot/pullAggregate', where)
    if (route.stream === true) notes.push(`Route ${id} streams (stream: true): review that it ends on client disconnect and bounds what it buffers.`)
    if (methods.has('withActor') || reached.some((f) => /\bwithActor\b/.test(source(f) || ''))) notes.push(`Route ${id} acts with the operator's identity (withActor): the user's own role must allow the same access.`)
  }
}

// --- derive-permissions (sibling mdk-app-rbac skill) ----------------------

const derive = { ran: false }
const deriveScript = path.resolve(SCRIPT_DIR, '..', '..', 'mdk-app-rbac', 'scripts', 'derive-permissions.mjs')
if (yamlText && manifest && !manifest.__error) {
  if (!fs.existsSync(deriveScript)) notes.push('mdk-app-rbac skill not installed next to this one: run its derive-permissions.mjs --check --strict by hand to compare declared permissions with the code.')
  else {
    let out = null
    let status = 0
    try {
      out = execFileSync(process.execPath, [deriveScript, opt.dir, '--json', '--check', '--strict'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 })
    } catch (err) {
      status = err.status
      out = err.stdout
      if (status === 2) notes.push(`derive-permissions --check could not run: ${String(err.stderr || '').trim().split('\n')[0]} (an app checked out alone needs \`npm install --no-save yaml\`).`)
    }
    if (out && status !== 2) {
      try {
        const d = JSON.parse(out)
        derive.ran = true
        derive.rules = d.rules
        derive.missing = d.check?.missing || []
        derive.unused = d.check?.unused || []
        derive.directWorkerCalls = d.directWorkerCalls || []
        for (const m of derive.missing) add('medium', 'permissions', `code needs ${JSON.stringify(m)} but mdk-app.yaml does not grant it (the route 403s; an operator may "fix" it with a broad grant)`, 'mdk-app.yaml')
        for (const u of derive.unused) add('medium', 'permissions', `mdk-app.yaml grants ${JSON.stringify(u)}, which no call in the code needs: excess privilege for the app's service account`, 'mdk-app.yaml')
        for (const c of derive.directWorkerCalls) add('high', 'permissions', `direct-to-Worker call outside spec.rbac: ${JSON.stringify(c)}`, 'mdk-app.yaml')
      } catch {
        notes.push('derive-permissions output did not parse; run it by hand.')
      }
    }
  }
}

// --- code -----------------------------------------------------------------

const SERVER_RULES = [
  ['high', 'command-exec', /\bchild_process\b|\b(execSync|execFileSync|spawnSync|execFile|spawn|fork)\s*\(|(^|[^.\w])exec\s*\(/, 'process execution'],
  ['high', 'command-exec', /\beval\s*\(|new\s+Function\s*\(|\bvm\.(runIn\w+|Script|compileFunction)\b/, 'dynamic code evaluation'],
  ['medium', 'dynamic-require', /\brequire\s*\(\s*[^'"`)\s]|\bimport\s*\(\s*[^'"`)\s]/, 'require/import of a computed path'],
  ['medium', 'listener', /\.createServer\s*\(|\.listen\s*\(\s*[\w{]|dgram\.createSocket|new\s+WebSocketServer/, 'plugin opens its own listener (outside the Gateway\'s auth, Host check and rate limit)'],
  ['medium', 'process-control', /\bprocess\.(exit|abort|kill)\s*\(|process\.on\s*\(\s*['"](uncaughtException|unhandledRejection|SIGINT|SIGTERM)/, 'process exit / global handler inside the app runtime'],
  ['medium', 'global-mutation', /\b(Object|Array|String|Function|Promise|Buffer)\.prototype\.\w+\s*=|\bglobal(This)?\.\w+\s*=|require\s*\(\s*['"](node:)?(https?|net|tls|dns)['"]\s*\)\.\w+\s*=/, 'mutates a global, a prototype or a core module'],
  ['high', 'tls', /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|checkServerIdentity\s*:\s*\(\s*\)\s*=>/, 'TLS verification disabled'],
  ['medium', 'obfuscation', /['"`][A-Za-z0-9+/]{200,}={0,2}['"`]|(\\x[0-9a-f]{2}){20,}|String\.fromCharCode\s*\((\s*\d+\s*,){10,}/i, 'long encoded literal (obfuscation / embedded payload)'],
  ['medium', 'kernel-client', /\b(new\s+\w*(MdkClient|Client)\s*\(|createClient\s*\(|require\s*\(\s*['"]@tetherto\/mdk-client['"]\s*\)\s*\.\s*(create|connect))/, 'plugin builds its own Kernel client instead of the runtime\'s (config.mdkClient): it would not run as app:<name>, so spec.rbac for the app does not bound it']
]
const SERVER_LEADS = [
  ['fs', /\bfs(\.promises)?\.(rm|rmSync|unlink|rename|chmod|writeFile|writeFileSync|appendFile|createWriteStream|mkdir|readFile|readFileSync|createReadStream)\s*\(/, 'filesystem access — is the path ever derived from a request?'],
  ['env', /\bprocess\.env\b/, 'reads env'],
  ['network', /\b(fetch|https?\.(get|request)|axios(\.\w+)?|got|undici\.\w+|net\.connect|net\.createConnection)\s*\(/, 'outbound request — where does fleet data go, is the URL request-controlled (SSRF)?'],
  ['error-leak', /\bthrow\s+err\b|\b(stack|cause)\s*:\s*err|err(or)?\.stack|message\s*:\s*err(or)?\.message/, 'raw error reaches the response — Kernel/worker internals, device addresses?'],
  ['error-leak', /statusCode\s*:\s*(req|params|body|query)/, 'status code from input'],
  ['input', /JSON\.parse\s*\(/, 'JSON.parse — try/catch and size cap?'],
  ['input', /\bnew\s+RegExp\s*\(\s*(?!['"`/])/, 'RegExp from dynamic input (ReDoS)'],
  ['input', /\bparseInt\s*\([^,)]*\)|Number\s*\(\s*req\b/, 'numeric parse of request input (NaN, negatives, huge values)'],
  ['proto-pollution', /__proto__|constructor\s*\.\s*prototype|\w+\[\s*(key|k|prop|name|field|id|deviceId)\s*\]\s*=|Object\.assign\s*\(\s*\w+\s*,\s*(req|body|query|params|payload|data)\b/, 'object keyed by request or device data'],
  ['secret-leak', /(console\.(log|info|warn|error|debug)|\blog(ger)?(\.\w+)?|\bdebug)\s*\([^)]*\b(token|secret|password|authorization|cookie|identity|actor|req\.headers|req\b)/i, 'log call with a request, identity or secret'],
  ['crypto', /Math\.random\s*\(|createHash\s*\(\s*['"](md5|sha1)['"]/, 'weak randomness / hash']
]
const UI_LEADS = [
  ['xss', /dangerouslySetInnerHTML|\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(|rehype-raw|allowDangerousHtml/, 'HTML sink — device/pool/worker names are attacker-controlled'],
  ['url', /window\.open\s*\(|location\.(href|assign|replace)\b\s*[=(]|\bwindow\.location\s*=|href\s*=\s*\{(?!['"`])/, 'navigation / href from data (javascript: URLs)'],
  ['url', /target\s*=\s*['"{]?_blank(?![^>]*noopener)/, 'target=_blank without rel=noopener'],
  ['browser-storage', /\b(localStorage|sessionStorage)\.(setItem|getItem)\s*\(|document\.cookie/, 'browser storage — tokens or fleet data persisted?'],
  ['token', /authToken|Authorization['"]?\s*:|Bearer\s/, 'app UI handles the session token itself (should come from the shell)'],
  ['postmessage', /addEventListener\s*\(\s*['"]message['"]|\.postMessage\s*\(/, 'postMessage — origin checked?'],
  ['dynamic-code', /\beval\s*\(|new\s+Function\s*\(/, 'eval in UI (forces CSP unsafe-eval)']
]
const SECRET_RULES = [
  ['high', /-----BEGIN (RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/, 'private key block'],
  ['high', /AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|npm_[A-Za-z0-9]{36}|xox[abprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35}/, 'cloud / registry / API token'],
  ['medium', /\b(?:api[_-]?key|apikey|secret|token|passw(?:or)?d|auth)\b["']?\s*[:=]\s*["'][^"'\s$]{12,}["']/i, 'hard-coded credential literal'],
  ['low', /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/, 'private IP address']
]

const undeclared = new Map()
const hosts = new Map()
const hostRe = /\b(?:https?|wss?):\/\/([a-z0-9.-]+\.[a-z]{2,}|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?/gi
for (const f of files) {
  const isHtml = /\.html?$/.test(f.rel)
  if (!CODE_EXT.test(f.rel) && !isHtml) continue
  const text = readText(path.join(opt.dir, f.rel))
  if (text == null) continue
  const ls = text.split('\n')
  if (isHtml) {
    ls.forEach((line, i) => {
      const m = line.match(/<(script|link)\b[^>]*(src|href)\s*=\s*["'](https?:)?\/\/([^/"']+)/i)
      if (m) add(/integrity=/.test(line) ? 'low' : 'medium', 'ui-cdn', `${m[1]} loaded from ${m[4]}${/integrity=/.test(line) ? '' : ' without SRI'}: third-party code in the operator's session`, `${f.rel}:${i + 1}`)
    })
    continue
  }
  if (f.role === 'server' || f.role === 'script') {
    importRe.lastIndex = 0
    let m
    while ((m = importRe.exec(text))) {
      const spec = m[1] || m[2] || m[3] || m[4]
      if (!spec || spec.startsWith('.') || spec.startsWith('/') || BUILTINS.has(spec) || BUILTINS.has(spec.split('/')[0]) || HOST_PROVIDED.test(spec)) continue
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
      if (deps[name] || peers[name] || (f.role === 'script' && (pkg.devDependencies || {})[name])) continue
      if (!undeclared.has(name)) undeclared.set(name, `${f.rel}:${ls.findIndex((l) => l.includes(spec)) + 1}`)
    }
  }
  ls.forEach((line, i) => {
    const where = `${f.rel}:${i + 1}`
    for (const [sev, re, label] of SECRET_RULES) if (re.test(line)) add(f.role === 'test' ? 'low' : sev, 'secrets', `${label}: ${line.trim().slice(0, 140)}`, where)
    if (isComment(line) || f.role === 'test') return
    if (line.length > 1000) add('medium', 'obfuscation', `line of ${line.length} chars (minified/generated code cannot be reviewed; ask for the source)`, where)
    if (f.role === 'server' || f.role === 'script') {
      for (const [sev, check, re, label] of SERVER_RULES) if (re.test(line)) add(f.role === 'script' && sev === 'high' ? 'medium' : sev, check, `${label}: ${line.trim().slice(0, 140)}`, where)
      for (const [cls, re, label] of SERVER_LEADS) if (re.test(line)) leads.push({ cls, label, where, text: line.trim().slice(0, 160) })
    } else if (f.role === 'ui') {
      for (const [cls, re, label] of UI_LEADS) if (re.test(line)) leads.push({ cls, label, where, text: line.trim().slice(0, 160) })
    }
    hostRe.lastIndex = 0
    let h
    while ((h = hostRe.exec(line))) {
      const host = h[1].toLowerCase()
      if (!LOCAL_HOST.test(host) && !DOC_HOSTS.test(host) && !hosts.has(host)) hosts.set(host, where)
    }
  })
}
for (const [name, where] of undeclared) add('medium', 'undeclared-dep', `imports "${name}" but does not declare it in dependencies or peerDependencies`, where)
for (const [host, where] of hosts) add('medium', 'external-host', `code names external host ${host}: fleet telemetry leaving the site? third-party code loaded into the operator's session?`, where)

// --- consumer pin ---------------------------------------------------------

const consumer = {}
const readme = readText(path.join(opt.dir, 'README.md')) || ''
readme.split('\n').forEach((line, i) => {
  if (/mdk\s+add\s+app\s+\S+#(main|master|develop|dev|HEAD)\b|npm\s+(i|install)\s+\S*(github:|git\+)\S+#(main|master|develop|HEAD)\b/.test(line)) add('low', 'docs-pin', `README tells sites to install a moving branch: ${line.trim().slice(0, 120)} — document a commit or release instead`, `README.md:${i + 1}`)
})
if (opt.consumer) {
  const site = readJson(path.join(opt.consumer, 'package.json'))
  const name = pkg.name
  const spec = site.dependencies?.[name] ?? site.optionalDependencies?.[name] ?? site.devDependencies?.[name]
  consumer.site = opt.consumer
  consumer.spec = spec || null
  const cWhere = 'package.json (site)'
  const mdkYaml = readText(path.join(opt.consumer, 'mdk.yaml'))
  if (!spec && !(mdkYaml && mdkYaml.includes(name))) add('medium', 'consumer-pin', `${opt.consumer} does not depend on ${name}: check you scanned the right app`, cWhere)
  if (spec) {
    const s = String(spec)
    const ref = s.includes('#') ? s.slice(s.indexOf('#') + 1) : ''
    const gitLike = /^(git(\+\w+)?:|github:|gitlab:|bitbucket:)/.test(s) || /^[\w-]+\/[\w.-]+(#.*)?$/.test(s)
    if (/^(git:|git\+http:|http:)/.test(s)) add('high', 'consumer-pin', `${name} installs over an unauthenticated transport`, cWhere)
    if (gitLike) {
      if (!ref) add('high', 'consumer-pin', `${name} is a git dependency with no ref: every install takes the default branch head`, cWhere)
      else if (!/^[0-9a-f]{40}$/.test(ref)) add('high', 'consumer-pin', `${name} pins "#${ref}" (branch, tag or range): the vendor can change the code under the same spec; pin a full commit SHA`, cWhere)
    } else if (/^(file|link):/.test(s)) notes.push(`Site installs ${name} from ${s}: review that local copy — it is what runs.`)
    else if (/^[~^*]|^(latest|x)$|^>=/.test(s)) add('medium', 'consumer-pin', `${name}@${s} is a range: a new release installs without review`, cWhere)
    const lock = readJson(path.join(opt.consumer, 'package-lock.json'))
    if (!lock.__error && lock.packages) {
      const entry = lock.packages[`node_modules/${name}`]
      if (!entry) add('medium', 'consumer-lock', `${name} is missing from the site's package-lock.json`, 'package-lock.json')
      else {
        consumer.resolved = entry.resolved || (entry.link ? 'link' : null)
        const lockSha = (entry.resolved || '').match(/#([0-9a-f]{40})$/)?.[1]
        if (gitLike && /^[0-9a-f]{40}$/.test(ref) && lockSha && lockSha !== ref) add('high', 'consumer-lock', `lockfile resolves ${name} to ${lockSha}, package.json pins ${ref}`, 'package-lock.json')
        if (entry.hasInstallScript) add('high', 'install-scripts', `lockfile marks ${name} hasInstallScript: true`, 'package-lock.json')
      }
    } else notes.push(`No readable package-lock.json in ${opt.consumer}: the site resolves the app and its tree fresh on every install.`)
    let head = null
    try { if (fs.existsSync(path.join(opt.dir, '.git'))) head = execFileSync('git', ['-C', opt.dir, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch {}
    if (head) {
      consumer.scannedCommit = head
      const pinned = /^[0-9a-f]{40}$/.test(ref) ? ref : null
      if (pinned && pinned !== head) add('high', 'consumer-pin', `you scanned commit ${head.slice(0, 12)} but the site installs ${pinned.slice(0, 12)}: check out the pinned commit and rescan`, cWhere)
    }
    for (const k of Object.keys(site.overrides || {})) if (deps[k]) notes.push(`Site overrides "${k}", which ${name} depends on: review the replacement as part of the app.`)
  }
}

// --- report ---------------------------------------------------------------

const ORDER = { high: 0, medium: 1, low: 2 }
findings.sort((a, b) => ORDER[a.sev] - ORDER[b.sev] || a.check.localeCompare(b.check))
const count = (s) => findings.filter((f) => f.sev === s).length
const result = {
  app: { name: pkg.name, version: pkg.version, dir: opt.dir, private: pkg.private === true, repository: pkg.repository || null },
  pluginDir: pluginDir ? rel(pluginDir) : null,
  installSet: packed ? 'npm pack --dry-run' : 'directory walk',
  files: files.length,
  routes,
  permissions: { wildcard: declared.wildcard, admin: declared.admin, verbs: [...declared.verbs], derive },
  dependencies: deps,
  consumer: opt.consumer ? consumer : null,
  summary: { high: count('high'), medium: count('medium'), low: count('low'), leads: leads.length },
  findings,
  leads,
  notes
}

// Escaping for one table cell: the backslash first, then the pipe GFM would
// otherwise read as the column delimiter. The order matters, and so does
// escaping both: a lone backslash in front of a pipe would pair off against
// the escape added here and hand the delimiter back, breaking the row.
//
// This doubles backslashes inside code spans too, where Markdown prints the
// text as written, so a description carrying `\d+` is shown with two. That is
// accepted rather than fixed: escaping per code span is the natural reading,
// but it leaves the pipe escape inside a span unprotected, which is the defect
// this is here to prevent. No generated page carries a backslash today.
function escapeCell (s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}

function toMarkdown (r) {
  const out = []
  out.push(`# App security scan: ${r.app.name}@${r.app.version}`, '')
  out.push(`- Dir: \`${r.app.dir}\` (plugin: \`${r.pluginDir}\`)`)
  out.push(`- Install set: ${r.installSet} (${r.files} files)`)
  out.push(`- Dependencies: ${Object.keys(r.dependencies).length ? Object.entries(r.dependencies).map(([k, v]) => `\`${k}@${v}\``).join(', ') : 'none'}`)
  out.push(`- Permissions: ${r.permissions.derive.ran ? `derive-permissions ran — ${r.permissions.derive.missing.length} missing, ${r.permissions.derive.unused.length} unused` : 'derive-permissions not run'}`)
  if (r.consumer) out.push(`- Site pin: \`${r.consumer.spec}\`${r.consumer.resolved ? ` → lock \`${r.consumer.resolved}\`` : ''}`)
  out.push(`- Findings: **${r.summary.high} high**, ${r.summary.medium} medium, ${r.summary.low} low · ${r.summary.leads} SAST leads`, '')
  if (r.routes.length) {
    out.push('## Routes', '', '| Route | Method + path | auth | safety | Kernel calls reached | Request inputs read |', '| --- | --- | --- | --- | --- | --- |')
    for (const rt of r.routes) out.push(`| \`${rt.id}\` | \`${rt.method} ${rt.path}\` | ${rt.auth ? 'true' : '**false**'} | ${rt.safety || '—'} | ${Object.keys(rt.methods).map((m) => `\`${m}\``).join(', ') || '—'} | ${Object.keys(rt.inputs).map((m) => `\`${m}\``).join(', ') || '—'} |`)
    out.push('')
  }
  out.push('## Findings', '')
  if (!r.findings.length) out.push('None.', '')
  else {
    out.push('| Severity | Check | Where | Detail |', '| --- | --- | --- | --- |')
    for (const f of r.findings) out.push(`| ${f.sev} | \`${f.check}\` | ${f.where ? `\`${f.where}\`` : ''} | ${escapeCell(f.msg)} |`)
    out.push('')
  }
  if (r.notes.length) { out.push('## Notes', ''); for (const n of r.notes) out.push(`- ${n}`); out.push('') }
  if (r.leads.length) {
    out.push('<details><summary>SAST leads (triage by reading the code — not findings)</summary>', '')
    const groups = {}
    for (const l of r.leads) (groups[`${l.cls}\t${l.label}`] ||= []).push(l)
    for (const ls of Object.values(groups)) {
      out.push(`**${ls[0].cls}** — ${ls[0].label}`, '')
      for (const l of ls.slice(0, 40)) out.push(`- \`${l.where}\`: \`${l.text.replace(/`/g, "'")}\``)
      if (ls.length > 40) out.push(`- … ${ls.length - 40} more`)
      out.push('')
    }
    out.push('</details>', '')
  }
  return out.join('\n')
}

const body = opt.json ? JSON.stringify(result, null, 2) + '\n' : toMarkdown(result)
if (opt.out) {
  fs.writeFileSync(opt.out, body, { flag: 'wx' })
  console.log(`wrote ${opt.out}: ${result.summary.high} high, ${result.summary.medium} medium, ${result.summary.low} low, ${result.summary.leads} leads`)
} else process.stdout.write(body)
