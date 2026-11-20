#!/usr/bin/env node
// Security scan for a third-party (vendor) MDK device Worker Plugin — a package
// directory holding mdk-contract.json + src/ handlers, installed by a site as a
// git or npm dependency (e.g. whatsminer-mdk-worker in examples/mvp-site).
//
//   node scan-worker.mjs <worker-dir> [--consumer <site-dir>] [--json] [--out <file>]
//
//   <worker-dir>   a checkout of the vendor repo, or the installed copy under a
//                  site's node_modules/<name>. Prefer the installed copy: it is
//                  exactly what runs.
//   --consumer     the site (or app) directory whose package.json depends on the
//                  worker: checks how it is pinned, the lockfile entry, and site
//                  overrides that replace the worker's own dependencies.
//
// Checks (findings carry a severity; "leads" are grep hits to triage by hand):
//
//   manifest    install/prepare scripts (prepare runs on every git install),
//               dependency sources and ranges, files allowlist, overrides that
//               never reach the site, repository/license metadata, lockfile
//   tarball     what npm would install (npm pack --dry-run --ignore-scripts):
//               native binaries, tests/fixtures, .env/keys, mock servers
//   contract    mdk-contract.json parses, every handler is inside the package
//               and exists, unbounded number params, free-form string/object/
//               array params, state-changing commands without constraints
//   code        undeclared imports, hard-coded external hosts (phone-home),
//               listeners opened by runtime code, process.exit/global handlers,
//               prototype/global mutation, minified or encoded blobs, secrets
//               and default credentials, plus SAST leads per class in
//               ../references/worker-review.md
//   consumer    (--consumer) git ref is a full commit SHA (not a branch/tag),
//               https transport, lockfile resolves the same commit, the commit
//               you scanned is the commit the site installs, site overrides
//
// Zero-dependency, read-only, never runs the worker's code or install scripts.
// Exit 0 unless the scan itself fails (2 = bad arguments). Severity is in the
// report: Markdown (default) or JSON (--json). --out creates a new file and
// refuses an existing path or symlink.

import fs from 'node:fs'
import path from 'node:path'
import { builtinModules } from 'node:module'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const opt = { dir: null, consumer: null, json: false, out: null }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--consumer') opt.consumer = path.resolve(args[++i] || '')
  else if (a === '--json') opt.json = true
  else if (a === '--out') opt.out = args[++i]
  else if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 39).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
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
  console.error('ERR_ARG: usage: scan-worker.mjs <worker-dir> [--consumer <site-dir>] [--json] [--out <file>]')
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
    console.error(`ERR_ARG: --out ${opt.out} already exists (or is a symlink); choose a new path, e.g. "$(mktemp -d)/worker-scan.md"`)
    process.exit(2)
  }
}

const BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)])
const CODE_EXT = /\.(c|m)?jsx?$|\.tsx?$/
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', '.nyc_output'])
// Provided by the host's WorkerRuntimeV2 (the loader resolves it for the plugin).
const HOST_PROVIDED = /^@tetherto\/mdk-worker(\/|$)/
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|::1|example\.(com|org|net)|[\w.-]+\.example|[\w.-]+\.test|[\w.-]+\.invalid)$/i
// Hosts that show up in comments/docs/metadata, not in network calls.
const DOC_HOSTS = /^(github\.com|www\.github\.com|raw\.githubusercontent\.com|json-schema\.org|www\.apache\.org|opensource\.org|spdx\.org|docs\.[\w.-]+|npmjs\.com|www\.npmjs\.com|nodejs\.org)$/i
const COMMAND_RISK = /firmware|network|reboot|restart|reset|factory|pool|password|passwd|hostname|ssh|user|credential|delete|erase|upgrade|update|flash|shutdown|power|fan|freq|voltage|ip\b|dhcp|dns/i

const findings = []
const leads = []
const notes = []
const add = (sev, check, msg, where) => findings.push({ sev, check, msg, where: where || null })

function readJson (file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (err) { return { __error: err.message } }
}

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
    const parsed = JSON.parse(raw)
    return { files: parsed[0].files.map((f) => f.path), via: 'npm pack --dry-run' }
  } catch {
    return null
  }
}

function role (rel) {
  const p = rel.split(path.sep).join('/')
  if (/(^|\/)(tests?|__tests__|spec|fixtures?|e2e)\//.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p)) return 'test'
  if (/(^|\/)mocks?\//.test(p)) return 'mock'
  if (/^(scripts|bin|tools|examples?)\//.test(p)) return 'script'
  if (/^smoke\.config\.[cm]?js$/.test(p)) return 'script'
  return 'runtime'
}

function lines (text) { return text.split('\n') }
function isComment (line) { const t = line.trim(); return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') }

// --- package.json ---------------------------------------------------------

const pkg = readJson(path.join(opt.dir, 'package.json'))
if (pkg.__error) {
  console.error(`ERR_ARG: package.json does not parse: ${pkg.__error}`)
  process.exit(2)
}
const deps = pkg.dependencies || {}

for (const s of ['preinstall', 'install', 'postinstall']) {
  if (pkg.scripts && pkg.scripts[s]) add('high', 'install-scripts', `"${s}": ${JSON.stringify(pkg.scripts[s])} runs on every site that installs the worker`, 'package.json')
}
if (pkg.scripts && pkg.scripts.prepare) add('high', 'install-scripts', `"prepare": ${JSON.stringify(pkg.scripts.prepare)} runs on every git install of the worker (npm installs its devDependencies and runs prepare)`, 'package.json')
if (pkg.scripts && pkg.scripts.prepack) add('medium', 'install-scripts', `"prepack": ${JSON.stringify(pkg.scripts.prepack)} runs when npm packs the git dependency during install`, 'package.json')

for (const [name, spec] of Object.entries(deps)) {
  const s = String(spec)
  if (/^(file|link|workspace):/.test(s)) add('high', 'dep-source', `dependency ${name}@${s} resolves to a path that does not exist on the site`, 'package.json')
  else if (/^(git(\+\w+)?:|github:|gitlab:|bitbucket:|https?:)/.test(s) || /^[\w-]+\/[\w.-]+(#.*)?$/.test(s)) {
    const sha = /#([0-9a-f]{40})$/.test(s)
    add(sha ? 'medium' : 'high', 'dep-source', `dependency ${name} installs from ${s}${sha ? '' : ' with no commit pin (mutable)'}; review that code too`, 'package.json')
  } else if (/^(\*|latest|x|)$/.test(s) || (/^>=?\s*\d/.test(s) && !/<\s*\d/.test(s))) add('high', 'dep-range', `dependency ${name}@"${s}" accepts any future release`, 'package.json')
  else if (/^[~^]/.test(s) || /\s-\s|\|\||\bx\b/.test(s)) add('low', 'dep-range', `dependency ${name}@${s} is a range; the worker's lockfile does not apply on the site, so the site resolves it fresh`, 'package.json')
}
const depCount = Object.keys(deps).length
if (depCount > 15) add('low', 'dep-surface', `${depCount} runtime dependencies — each is code that runs with the device credentials`, 'package.json')
if (pkg.overrides && Object.keys(pkg.overrides).length) add('low', 'package-overrides', `overrides (${Object.keys(pkg.overrides).join(', ')}) apply only inside the worker repo; the site installing it does not get them`, 'package.json')
if (pkg.bundleDependencies || pkg.bundledDependencies) add('high', 'bundled-deps', 'bundled dependencies ship third-party code inside the tarball, outside npm audit', 'package.json')
if (!pkg.files) add('medium', 'files-allowlist', 'no "files" allowlist: tests, fixtures and anything not in .npmignore ship to the site', 'package.json')
if (!pkg.repository) add('low', 'repository', 'no "repository": the site cannot tie the installed code to a source repo', 'package.json')
if (!pkg.license) add('low', 'license', 'no "license"', 'package.json')
if (!fs.existsSync(path.join(opt.dir, 'package-lock.json')) && !fs.existsSync(path.join(opt.dir, 'npm-shrinkwrap.json'))) {
  notes.push('No package-lock.json in the worker dir (normal for an installed copy; for a vendor checkout, the vendor has no reproducible dependency tree).')
}
if (fs.existsSync(path.join(opt.dir, 'npm-shrinkwrap.json'))) add('medium', 'shrinkwrap', 'npm-shrinkwrap.json pins the whole subtree on the site and overrides the site\'s own resolution and overrides', 'npm-shrinkwrap.json')

// --- what ships -----------------------------------------------------------

const all = walk(opt.dir)
for (const f of all.filter((f) => f.symlink)) add('high', 'symlink', 'symlink in the package; it can point outside the install dir', f.rel)
const packed = packList(opt.dir)
const shipped = packed ? new Set(packed.files.map((f) => f.split('/').join(path.sep))) : null
if (!packed) notes.push('`npm pack --dry-run` failed or npm is unavailable: scanned every file in the directory instead of the install set.')
const files = all.filter((f) => !f.symlink && (!shipped || shipped.has(f.rel))).map((f) => ({ rel: f.rel, role: role(f.rel) }))

for (const f of files) {
  const p = f.rel.split(path.sep).join('/')
  if (/\.(node|so|dylib|dll|exe|wasm|bin)$/i.test(p) || /(^|\/)binding\.gyp$/.test(p)) add('high', 'native-binary', 'native/binary artifact ships: unreviewable, runs with the worker\'s privileges', f.rel)
  else if (/(^|\/)\.env(\.|$)|\.(pem|key|p12|pfx|crt)$|(^|\/)id_(rsa|ed25519|ecdsa)/i.test(p)) add('high', 'tarball-contents', 'credential/key file ships', f.rel)
  else if (/(^|\/)\.(npmrc|netrc)$/.test(p)) add('high', 'tarball-contents', 'registry credentials file ships', f.rel)
  else if (/\.(sqlite|db|log|har|pcap)$/i.test(p)) add('medium', 'tarball-contents', 'database / log / capture file ships (may hold real device data)', f.rel)
  else if (/\.(tgz|zip|tar|gz|7z|rar)$/i.test(p)) add('medium', 'tarball-contents', 'archive ships: contents are not reviewed by this scan', f.rel)
  else if (/\.(bin|img|fw|bmu|swu)$/i.test(p)) add('high', 'tarball-contents', 'firmware-like image ships', f.rel)
}
const testFiles = files.filter((f) => f.role === 'test')
if (testFiles.length) add('low', 'tarball-contents', `${testFiles.length} test/fixture file(s) ship (e.g. ${testFiles[0].rel})`, null)
const mockFiles = files.filter((f) => f.role === 'mock')
if (mockFiles.length) notes.push(`Mock device server(s) ship (${mockFiles.map((f) => f.rel).slice(0, 5).join(', ')}${mockFiles.length > 5 ? ', …' : ''}). Sites may start them (mvp-site does); they are reviewed with the mock rules below.`)

// --- contract -------------------------------------------------------------

const contractPath = ['mdk-contract.json', 'plugin/mdk-contract.json'].map((p) => path.join(opt.dir, p)).find((p) => fs.existsSync(p))
const contract = contractPath ? readJson(contractPath) : null
const contractRel = contractPath ? path.relative(opt.dir, contractPath) : 'mdk-contract.json'
const handlerFiles = new Set()

function checkHandler (kind, name, handler) {
  if (typeof handler !== 'string' || !handler) { add('medium', 'contract-handler', `${kind} "${name}" has no handler`, contractRel); return }
  const root = path.resolve(path.dirname(contractPath))
  const abs = path.resolve(root, handler)
  const rel = path.relative(root, abs)
  if (path.isAbsolute(handler) || rel === '' || rel === '..' || rel.startsWith('..' + path.sep)) {
    add('high', 'contract-handler', `${kind} "${name}" handler "${handler}" resolves outside the worker package`, contractRel)
    return
  }
  if (!fs.existsSync(abs)) add('medium', 'contract-handler', `${kind} "${name}" handler "${handler}" does not exist`, contractRel)
  else {
    handlerFiles.add(path.relative(opt.dir, abs))
    if (shipped && !shipped.has(path.relative(opt.dir, abs))) add('high', 'contract-handler', `${kind} "${name}" handler "${handler}" is not in the install set ("files")`, contractRel)
  }
}

const commands = []
if (!contract) add('high', 'contract', 'no mdk-contract.json: not a Worker Plugin, or it ships elsewhere', null)
else if (contract.__error) add('high', 'contract', `mdk-contract.json does not parse: ${contract.__error}`, contractRel)
else {
  const caps = contract.capabilities || {}
  if (!contract.contractVersion) add('low', 'contract-version', 'no contractVersion: the Kernel applies only legacy (warning-level) validation to params and units', contractRel)
  for (const t of caps.telemetry || []) {
    checkHandler('telemetry', t.name, t.handler)
    if (/pass(word)?|secret|token|key|credential|auth|config|conf$|snap|raw|dump|debug/i.test(t.name)) {
      add('medium', 'telemetry-exposure', `telemetry "${t.name}" may return credentials or raw device config to every caller with devices:read — read its handler`, contractRel)
    }
  }
  for (const c of caps.commands || []) {
    checkHandler('command', c.name, c.handler)
    const risky = COMMAND_RISK.test(c.name)
    commands.push({ name: c.name, handler: c.handler, risky, params: (c.params || []).map((p) => p.name) })
    if (risky && !(Array.isArray(c.constraints) && c.constraints.length)) add('low', 'command-docs', `state-changing command "${c.name}" documents no constraints (operators and agents cannot see its blast radius)`, contractRel)
    for (const p of c.params || []) {
      const where = `${contractRel} (${c.name}.${p.name})`
      if (p.type === 'number' || p.type === 'integer') {
        if (p.min === undefined || p.max === undefined) add('medium', 'command-param', `number param has no ${p.min === undefined ? 'min' : 'max'}: the Kernel cannot bound it before it reaches the device`, where)
      } else if (p.type === 'string' && !Array.isArray(p.enum)) {
        add(risky ? 'medium' : 'low', 'command-param', 'free-form string param (no enum): the handler alone must validate length and characters before it reaches the device protocol', where)
      } else if (p.type === 'object' || p.type === 'array') {
        add(risky ? 'medium' : 'low', 'command-param', `free-form ${p.type} param: the Kernel validates only its type; read the handler for every field it forwards (URLs, hosts, sizes, credentials)`, where)
      }
    }
  }
  if (caps.config && caps.config.schema) notes.push('The contract declares a config schema: config values arrive from the site, review where they flow.')
}

// --- code -----------------------------------------------------------------

const RUNTIME_RULES = [
  ['high', 'command-exec', /\bchild_process\b|\b(execSync|execFileSync|spawnSync|execFile|spawn|fork)\s*\(|(^|[^.\w])exec\s*\(/, 'process execution in runtime code'],
  ['high', 'command-exec', /\beval\s*\(|new\s+Function\s*\(|\bvm\.(runIn\w+|Script|compileFunction)\b/, 'dynamic code evaluation'],
  ['medium', 'dynamic-require', /\brequire\s*\(\s*[^'"`)\s]|\bimport\s*\(\s*[^'"`)\s]/, 'require/import of a computed path'],
  ['medium', 'listener', /\.createServer\s*\(|\.listen\s*\(\s*[\w{]|dgram\.createSocket|new\s+WebSocketServer/, 'runtime code opens a listener'],
  ['medium', 'process-control', /\bprocess\.(exit|abort|kill)\s*\(|process\.on\s*\(\s*['"](uncaughtException|unhandledRejection|SIGINT|SIGTERM)/, 'process exit / global handler: one device can take down every device on the worker'],
  ['medium', 'global-mutation', /\b(Object|Array|String|Function|Promise|Buffer)\.prototype\.\w+\s*=|\bglobal(This)?\.\w+\s*=|require\s*\(\s*['"](node:)?(https?|net|tls|dns)['"]\s*\)\.\w+\s*=/, 'mutates a global, a prototype or a core module'],
  ['high', 'tls', /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|checkServerIdentity\s*:\s*\(\s*\)\s*=>/, 'TLS verification disabled (confirm it is limited to the device link and documented)'],
  ['medium', 'obfuscation', /['"`][A-Za-z0-9+/]{200,}={0,2}['"`]|(\\x[0-9a-f]{2}){20,}|String\.fromCharCode\s*\((\s*\d+\s*,){10,}/i, 'long encoded literal (obfuscation / embedded payload)']
]
const LEAD_RULES = [
  ['fs', /\bfs(\.promises)?\.(rm|rmSync|rmdir|unlink|unlinkSync|rename|chmod|chown|symlink|writeFile|writeFileSync|appendFile|createWriteStream|mkdir|mkdirSync|cp|cpSync)\s*\(/, 'filesystem write/delete — where does the path come from?'],
  ['env', /\bprocess\.env\b/, 'reads env (undocumented behaviour switch? secret source?)'],
  ['network', /\b(net|tls)\.(connect|createConnection)\s*\(|new\s+net\.Socket\s*\(|\b(fetch|https?\.(get|request)|axios(\.\w+)?|got|undici\.\w+)\s*\(/, 'outbound connection — is the target only the device address from opts?'],
  ['network', /\bdns(\.promises)?\.(lookup|resolve\w*)\s*\(|\bdgram\.createSocket/, 'DNS / UDP use'],
  ['input', /\.on\s*\(\s*['"]data['"]|\+=\s*chunk|Buffer\.concat\s*\(/, 'response accumulation — is there a size cap and a timeout?'],
  ['input', /JSON\.parse\s*\(/, 'JSON.parse of device data — try/catch, size cap, __proto__ keys'],
  ['input', /\bnew\s+RegExp\s*\(\s*(?!['"`/])/, 'RegExp from dynamic input (ReDoS)'],
  ['proto-pollution', /__proto__|constructor\s*\.\s*prototype|\w+\[\s*(key|k|prop|name|field)\s*\]\s*=|Object\.assign\s*\(\s*\w+\s*,\s*(params|data|res|resp|response|msg|body|payload)\b/, 'object built from device or param keys'],
  ['crypto', /createHash\s*\(\s*['"](md5|sha1)['"]|\bmd5\b|aes-\d+-ecb|\becb\b|createCipher\s*\(|\bdes\b|\brc4\b/i, 'weak hash/cipher — protocol-mandated by the device firmware, or a choice?'],
  ['crypto', /Math\.random\s*\(/, 'Math.random — fine for jitter, not for nonces/salts/ids'],
  ['plain-http', /['"`]http:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/, 'plain-http URL'],
  ['secret-leak', /(console\.(log|info|warn|error|debug)|\blog(ger)?(\.\w+)?|\bdebug)\s*\([^)]*\b(password|passwd|pwd|token|secret|apiKey|api_key|privateKey|seed|credential|opts|options|config|conf)\b/i, 'log call with a secret-shaped or whole-config argument'],
  ['secret-leak', /\.\.\.\s*(opts|options|config|conf)\b/, 'spreads the whole device config (does a password ride along into results, errors or telemetry?)'],
  ['timers', /setInterval\s*\(|setTimeout\s*\([^,]+,\s*\d{6,}/, 'timer — cleared on close? interval bounded?'],
  ['validation', /\bparseInt\s*\([^,)]*\)|Number\s*\(\s*params/, 'numeric parse of a param without radix/range']
]
const SECRET_RULES = [
  ['high', /-----BEGIN (RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/, 'private key block'],
  ['high', /AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|npm_[A-Za-z0-9]{36}|xox[abprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35}/, 'cloud / registry / API token'],
  ['medium', /\b(?:api[_-]?key|apikey|secret|token|passw(?:or)?d|auth)\b["']?\s*[:=]\s*["'][^"'\s$]{12,}["']/i, 'hard-coded credential literal'],
  ['medium', /\b(passw(?:or)?d|pwd|pass)\b["']?\s*(:|=|\|\|)\s*["'](admin|root|password|123456|12345678|default|microbt|bitmain|antminer|whatsminer)["']/i, 'default device credential baked into code'],
  ['low', /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/, 'private IP address (a vendor lab/site address?)']
]
const MOCK_RULES = [
  ['medium', 'mock-bind', /['"]0\.0\.0\.0['"]|host\s*:\s*['"]::['"]|\.listen\s*\(\s*\d+\s*\)/, 'mock server binds all interfaces (sites start mocks; a LAN peer can reach it)']
]

const importRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s+['"]([^'"]+)['"]/gm
const undeclared = new Map()
const hosts = new Map()
const hostRe = /\b(?:https?|wss?|tcp|stratum\+tcp|stratum\+ssl|mqtts?):\/\/([a-z0-9.-]+\.[a-z]{2,}|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?/gi

for (const f of files) {
  if (!CODE_EXT.test(f.rel)) continue
  const abs = path.join(opt.dir, f.rel)
  let text
  try { text = fs.readFileSync(abs, 'utf8') } catch { continue }
  const ls = lines(text)
  const runtime = f.role === 'runtime'

  if (runtime || f.role === 'script') {
    importRe.lastIndex = 0
    let m
    while ((m = importRe.exec(text))) {
      const spec = m[1] || m[2] || m[3] || m[4]
      if (!spec || spec.startsWith('.') || spec.startsWith('/') || BUILTINS.has(spec) || BUILTINS.has(spec.split('/')[0])) continue
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
      if (deps[name] || (runtime ? false : (pkg.devDependencies || {})[name])) continue
      if (HOST_PROVIDED.test(spec)) continue
      if (!undeclared.has(name)) undeclared.set(name, `${f.rel}:${ls.findIndex((l) => l.includes(spec)) + 1}`)
    }
  }

  ls.forEach((line, i) => {
    const where = `${f.rel}:${i + 1}`
    for (const [sev, re, label] of SECRET_RULES) {
      if (re.test(line)) add(f.role === 'test' ? 'low' : sev, 'secrets', `${label}: ${line.trim().slice(0, 140)}`, where)
    }
    if (isComment(line)) return
    if (line.length > 1000 && runtime) add('medium', 'obfuscation', `line of ${line.length} chars (minified/generated code cannot be reviewed; ask for the source)`, where)
    if (runtime) {
      for (const [sev, check, re, label] of RUNTIME_RULES) if (re.test(line)) add(sev, check, `${label}: ${line.trim().slice(0, 140)}`, where)
      for (const [cls, re, label] of LEAD_RULES) if (re.test(line)) leads.push({ cls, label, where, text: line.trim().slice(0, 160), handler: handlerFiles.has(f.rel) })
      hostRe.lastIndex = 0
      let h
      while ((h = hostRe.exec(line))) {
        const host = h[1].toLowerCase()
        if (LOCAL_HOST.test(host) || DOC_HOSTS.test(host)) continue
        if (!hosts.has(host)) hosts.set(host, where)
      }
    } else if (f.role === 'mock') {
      for (const [sev, check, re, label] of MOCK_RULES) if (re.test(line)) add(sev, check, `${label}: ${line.trim().slice(0, 140)}`, where)
      if (/\b(child_process|eval\s*\(|new\s+Function)/.test(line)) add('medium', 'mock-exec', `mock server executes code: ${line.trim().slice(0, 140)}`, where)
    } else if (f.role === 'script') {
      if (/\b(child_process|eval\s*\(|new\s+Function)/.test(line)) leads.push({ cls: 'script-exec', label: 'shipped script executes code', where, text: line.trim().slice(0, 160) })
    }
  })
}
for (const [name, where] of undeclared) add('medium', 'undeclared-dep', `imports "${name}" but does not declare it in dependencies (resolves to whatever the site happens to have)`, where)
for (const [host, where] of hosts) add('medium', 'external-host', `runtime code names external host ${host}: phone-home / telemetry / update channel? A device worker should only talk to the device address it is given`, where)

// --- consumer pin ---------------------------------------------------------

const consumer = {}
if (opt.consumer) {
  const site = readJson(path.join(opt.consumer, 'package.json'))
  const name = pkg.name
  const spec = site.dependencies?.[name] ?? site.optionalDependencies?.[name] ?? site.devDependencies?.[name]
  consumer.site = opt.consumer
  consumer.spec = spec || null
  const cWhere = `${path.relative(process.cwd(), path.join(opt.consumer, 'package.json')) || 'package.json'}`
  if (!spec) add('medium', 'consumer-pin', `${opt.consumer}/package.json does not depend on ${name}: check you scanned the right worker`, cWhere)
  else {
    const s = String(spec)
    const ref = s.includes('#') ? s.slice(s.indexOf('#') + 1) : ''
    consumer.ref = ref || null
    const gitLike = /^(git(\+\w+)?:|github:|gitlab:|bitbucket:)/.test(s) || /^[\w-]+\/[\w.-]+(#.*)?$/.test(s)
    if (/^(git:|git\+http:|http:)/.test(s)) add('high', 'consumer-pin', `${name} installs over an unauthenticated transport (${s.split('#')[0]}): a network attacker can swap the code`, cWhere)
    if (gitLike) {
      if (!ref) add('high', 'consumer-pin', `${name} is a git dependency with no ref: every install takes the default branch head`, cWhere)
      else if (!/^[0-9a-f]{40}$/.test(ref)) add('high', 'consumer-pin', `${name} pins "#${ref}" (a branch, tag or semver range): the vendor can change the code under the same spec; pin a full 40-char commit SHA`, cWhere)
    } else if (/^(file|link):/.test(s)) notes.push(`Site installs ${name} from ${s}: review that local copy, it is what runs.`)
    else if (/^[~^*]|^(latest|x)$|^>=/.test(s)) add('medium', 'consumer-pin', `${name}@${s} is a range: a new vendor release installs without review`, cWhere)

    const lock = readJson(path.join(opt.consumer, 'package-lock.json'))
    const entry = !lock.__error && lock.packages ? lock.packages[`node_modules/${name}`] : null
    if (!lock.__error && lock.packages) {
      if (!entry) add('medium', 'consumer-lock', `${name} is missing from ${opt.consumer}/package-lock.json`, 'package-lock.json')
      else {
        consumer.resolved = entry.resolved || null
        const lockSha = (entry.resolved || '').match(/#([0-9a-f]{40})$/)?.[1]
        if (gitLike && /^[0-9a-f]{40}$/.test(ref) && lockSha && lockSha !== ref) add('high', 'consumer-lock', `lockfile resolves ${name} to ${lockSha}, package.json pins ${ref}`, 'package-lock.json')
        if (!gitLike && !entry.integrity) add('medium', 'consumer-lock', `lockfile entry for ${name} has no integrity hash`, 'package-lock.json')
        if (entry.hasInstallScript) add('high', 'install-scripts', `lockfile marks ${name} hasInstallScript: true`, 'package-lock.json')
        // Transitive deps of the worker that carry install scripts.
        for (const [k, v] of Object.entries(lock.packages)) {
          if (k.startsWith(`node_modules/${name}/node_modules/`) && v.hasInstallScript) add('high', 'install-scripts', `transitive ${k.replace(/^.*node_modules\//, '')} (via ${name}) has an install script`, 'package-lock.json')
        }
      }
    } else notes.push(`No readable package-lock.json in ${opt.consumer}: the site resolves the worker and its tree fresh on every install.`)

    let head = null
    try { head = execFileSync('git', ['-C', opt.dir, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch {}
    if (head && fs.existsSync(path.join(opt.dir, '.git'))) {
      consumer.scannedCommit = head
      const pinned = /^[0-9a-f]{40}$/.test(ref) ? ref : (consumer.resolved || '').match(/#([0-9a-f]{40})$/)?.[1]
      if (pinned && pinned !== head) add('high', 'consumer-pin', `you scanned commit ${head.slice(0, 12)} but the site installs ${pinned.slice(0, 12)}: check out the pinned commit (or scan node_modules/${name}) and rescan`, cWhere)
    }

    const ov = site.overrides || {}
    for (const k of Object.keys(ov)) {
      if (deps[k] || (typeof ov[k] === 'object' && k === name)) notes.push(`Site overrides "${k}" (${JSON.stringify(ov[k])}), which ${name} depends on: the worker runs against the replacement — review it as part of the worker.`)
    }
  }
}

// --- report ---------------------------------------------------------------

const ORDER = { high: 0, medium: 1, low: 2 }
findings.sort((a, b) => ORDER[a.sev] - ORDER[b.sev] || a.check.localeCompare(b.check))
const count = (s) => findings.filter((f) => f.sev === s).length
const result = {
  worker: { name: pkg.name, version: pkg.version, dir: opt.dir, author: pkg.author || null, repository: pkg.repository || null },
  installSet: packed ? packed.via : 'directory walk',
  files: files.length,
  handlers: handlerFiles.size,
  commands,
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
  out.push(`# Worker security scan: ${r.worker.name}@${r.worker.version}`, '')
  out.push(`- Dir: \`${r.worker.dir}\``)
  out.push(`- Install set: ${r.installSet} (${r.files} files, ${r.handlers} contract handlers)`)
  out.push(`- Dependencies: ${Object.keys(r.dependencies).length ? Object.entries(r.dependencies).map(([k, v]) => `\`${k}@${v}\``).join(', ') : 'none'}`)
  if (r.consumer) out.push(`- Site pin: \`${r.consumer.spec}\`${r.consumer.resolved ? ` → lock \`${r.consumer.resolved}\`` : ''}${r.consumer.scannedCommit ? ` · scanned commit \`${r.consumer.scannedCommit.slice(0, 12)}\`` : ''}`)
  out.push(`- Findings: **${r.summary.high} high**, ${r.summary.medium} medium, ${r.summary.low} low · ${r.summary.leads} SAST leads`, '')
  if (r.commands.length) {
    out.push('## Commands (manual review targets)', '', '| Command | Params | State-changing name |', '| --- | --- | --- |')
    for (const c of r.commands) out.push(`| \`${c.name}\` | ${c.params.map((p) => `\`${p}\``).join(', ') || '—'} | ${c.risky ? 'yes' : ''} |`)
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
    const byCls = {}
    for (const l of r.leads) (byCls[`${l.cls}\t${l.label}`] ||= []).push(l)
    for (const ls of Object.values(byCls)) {
      out.push(`**${ls[0].cls}** — ${ls[0].label}`, '')
      for (const l of ls.slice(0, 40)) out.push(`- \`${l.where}\`${l.handler ? ' (contract handler)' : ''}: \`${l.text.replace(/`/g, "'")}\``)
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
