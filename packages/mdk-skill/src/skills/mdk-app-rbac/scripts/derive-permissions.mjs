#!/usr/bin/env node
// Derives an MDK App's `permissions` (mdk-app.yaml) from the Kernel calls its
// plugin code makes, and checks or writes the manifest against them.
//
//   node derive-permissions.mjs [app-dir] [--json] [--check] [--write]
//
// It scans the plugin's JavaScript/TypeScript for calls of the Kernel client
// methods below (`mdkClient.listWorkers(...)`, `req.mdk.sendCommand(...)`,
// ...), maps each to the Kernel action it sends and the resource + verb
// spec.rbac evaluates it as, and merges them into the smallest rule set that
// allows every call. Scoping by resourceNames (family/brand/worker/device) is
// the author's decision and is left out: the rules name every instance.
//
// Exit codes: 0 derived (or --check passed, or --write done), 1 --check found
// calls the manifest does not allow (with --strict, also access no call needs),
// 2 bad input (no plugin, no manifest, a malformed rule, no YAML parser).
// --check with --write reports the manifest as it was.
//
// Calls are found by name on any receiver (`x.sendCommand(`), so a method the
// code destructures off the client (`const { sendCommand } = client`) is not
// seen, and an unrelated object's `getStatus()` is: the evidence lists every
// site, for the author to read.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Client method -> the Kernel action it sends -> what spec.rbac evaluates it as.
// Mirrors KERNEL_ACTIONS in @tetherto/mdk-rbac (backend/core/rbac/lib/vocabulary.js)
// and the methods of @tetherto/mdk-client; the suite's tests hold the two together.
export const METHODS = Object.freeze({
  listWorkers: { action: 'worker.list', resource: 'workers', verb: 'list', name: null },
  terminateWorker: { action: 'worker.terminate', resource: 'workers', verb: 'delete', name: 'worker' },
  getCapabilities: { action: 'device.capabilities', resource: 'devices', verb: 'read', name: 'device' },
  pullTelemetry: { action: 'telemetry.pull', resource: 'devices', verb: 'read', name: 'device' },
  pullState: { action: 'state.pull', resource: 'devices', verb: 'read', name: 'device' },
  getCommandStatus: { action: 'command.status', resource: 'devices', verb: 'read', name: 'command' },
  sendCommand: { action: 'command.request', resource: 'devices', verb: 'write', name: 'device' },
  getCommandLog: { action: 'command.log', resource: 'commands', verb: 'read', name: null },
  getAction: { action: 'action.get', resource: 'actions', verb: 'read', name: null },
  getActionsBatch: { action: 'action.get-batch', resource: 'actions', verb: 'read', name: null },
  queryActions: { action: 'action.query', resource: 'actions', verb: 'read', name: null },
  pushAction: { action: 'action.push', resource: 'actions', verb: 'write', name: null },
  pushActionsBatch: { action: 'action.push-batch', resource: 'actions', verb: 'write', name: null },
  voteAction: { action: 'action.vote', resource: 'actions', verb: 'vote', name: null },
  cancelActionsBatch: { action: 'action.cancel-batch', resource: 'actions', verb: 'write', name: null },
  getRbac: { action: 'rbac.get', resource: 'policy', verb: 'read', name: null },
  applyRbac: { action: 'rbac.apply', resource: 'policy', verb: 'write', name: null },
  listUsers: { action: 'identity.user.list', resource: 'identities', verb: 'read', name: null },
  upsertUser: { action: 'identity.user.upsert', resource: 'identities', verb: 'write', name: null },
  deleteUser: { action: 'identity.user.delete', resource: 'identities', verb: 'write', name: null },
  listServiceAccounts: { action: 'identity.sa.list', resource: 'identities', verb: 'read', name: null },
  upsertServiceAccount: { action: 'identity.sa.upsert', resource: 'identities', verb: 'write', name: null },
  deleteServiceAccount: { action: 'identity.sa.delete', resource: 'identities', verb: 'write', name: null },
  rotateSigningKey: { action: 'identity.keys.rotate', resource: 'identities', verb: 'write', name: null }
})

// Client helpers that reach the Kernel through listWorkers (worker.list) before
// doing their own thing; the direct-to-worker ones then dial the worker, which
// the Kernel does not evaluate.
export const HELPERS = Object.freeze({
  getStatus: { via: 'listWorkers', direct: false },
  waitForWorkers: { via: 'listWorkers', direct: false },
  waitForDevice: { via: 'listWorkers', direct: false },
  getWorkerKey: { via: 'listWorkers', direct: false },
  sendWorkerCommand: { via: 'listWorkers', direct: true },
  pullWorkerTelemetry: { via: 'listWorkers', direct: true }
})

// The verbs each Kernel resource takes (KERNEL_RESOURCES in @tetherto/mdk-rbac); a `*` expands over these.
export const RESOURCE_VERBS = Object.freeze({
  devices: ['read', 'write'],
  workers: ['list', 'read', 'delete'],
  commands: ['read'],
  actions: ['read', 'write', 'vote', 'delegate'],
  policy: ['read', 'write'],
  identities: ['read', 'write']
})
const VERB_ORDER = ['list', 'read', 'write', 'delete', 'vote', 'delegate']
const RESOURCE_ORDER = Object.keys(RESOURCE_VERBS)
const SOURCE_EXT = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.cts'])
const SKIP_DIRS = new Set(['node_modules', 'ui', 'ui-src', 'dist', 'test', 'tests', '__tests__', '.git'])

function usage (msg) {
  if (msg) console.error(`derive-permissions: ${msg}`)
  console.error('usage: node derive-permissions.mjs [app-dir] [--json] [--check] [--write]')
  process.exit(2)
}

/** The directory holding the route table, as the app runtime finds it: plugin/ first, then the package root. */
export function pluginDir (appDir) {
  for (const candidate of [path.join(appDir, 'plugin'), appDir]) {
    if (fs.existsSync(path.join(candidate, 'mdk-plugin.json'))) return candidate
  }
  return null
}

function * sourceFiles (dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield * sourceFiles(path.join(dir, entry.name))
    } else if (SOURCE_EXT.has(path.extname(entry.name)) && !/\.(test|spec)\.[cm]?[jt]s$/.test(entry.name)) {
      yield path.join(dir, entry.name)
    }
  }
}

const CALL = new RegExp(`\\.(${[...Object.keys(METHODS), ...Object.keys(HELPERS), 'withActor'].join('|')})\\s*\\(`, 'g')

/**
 * The source without its comments, line structure kept so positions survive:
 * block comments become blank lines, and a `//` not preceded by `:` (a URL in a
 * string) drops the rest of its line.
 */
export function stripComments (source) {
  const noBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
  return noBlocks.split('\n').map((line) => line.replace(/(^|[^:\\])\/\/.*$/, '$1'))
}

/** The spec a method is evaluated as, through its helper when it is one. */
function specOf (method) {
  return METHODS[method] || (HELPERS[method] ? METHODS[HELPERS[method].via] : null)
}

/** Every Kernel client call in the plugin's sources, with where it is, and the plugin root. */
export function scan (appDir) {
  const root = pluginDir(appDir)
  if (!root) return null
  const calls = []
  for (const file of sourceFiles(root)) {
    stripComments(fs.readFileSync(file, 'utf8')).forEach((code, i) => {
      for (const m of code.matchAll(CALL)) {
        calls.push({ method: m[1], file: path.relative(appDir, file), line: i + 1 })
      }
    })
  }
  return { root, calls }
}

/** The smallest rules allowing every call: one per resource, verbs merged. */
export function derive (calls) {
  const byResource = new Map()
  const actor = calls.some((c) => c.method === 'withActor')
  const direct = []
  for (const call of calls) {
    let method = call.method
    if (method === 'withActor') continue
    if (HELPERS[method]) {
      if (HELPERS[method].direct) direct.push(call)
      method = HELPERS[method].via
    }
    const { resource, verb } = METHODS[method]
    if (!byResource.has(resource)) byResource.set(resource, new Set())
    byResource.get(resource).add(verb)
  }
  const rules = [...byResource.entries()]
    .sort((a, b) => RESOURCE_ORDER.indexOf(a[0]) - RESOURCE_ORDER.indexOf(b[0]))
    .map(([resource, verbs]) => ({
      resources: [resource],
      verbs: [...verbs].sort((a, b) => VERB_ORDER.indexOf(a) - VERB_ORDER.indexOf(b))
    }))
  return { rules, actor, direct }
}

/** The index of the first rule that is not `{ resources: string[], verbs: string[] }`, or -1. */
export function malformedRule (rules) {
  const strings = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string')
  return rules.findIndex((r) => !r || typeof r !== 'object' || !strings(r.resources) || !strings(r.verbs))
}

/** Every resource:verb pair a rule set allows, a `*` expanded over the verbs each resource takes. */
function allowed (rules) {
  const pairs = new Set()
  for (const rule of rules) {
    const resources = rule.resources.includes('*') ? RESOURCE_ORDER : rule.resources
    for (const resource of resources) {
      const verbs = rule.verbs.includes('*') ? RESOURCE_VERBS[resource] || [] : rule.verbs
      for (const verb of verbs) pairs.add(`${resource}:${verb}`)
    }
  }
  return pairs
}

/** Derived pairs the manifest does not allow (refused at runtime), and allowed pairs no call needs. */
export function compare (derived, declared) {
  const need = allowed(derived)
  const have = allowed(declared)
  return {
    missing: [...need].filter((p) => !have.has(p)),
    unused: [...have].filter((p) => !need.has(p))
  }
}

function toYaml (rules) {
  if (!rules.length) return 'permissions: []\n'
  return `permissions:\n${rules.map((r) => `  - resources: [${r.resources.join(', ')}]\n    verbs: [${r.verbs.join(', ')}]`).join('\n')}\n`
}

/**
 * The `yaml` package: from the app's dependencies, the project the command runs
 * in (an MDK project has it), or next to this script; null when none has it.
 */
function yamlLib (appDir) {
  for (const from of [path.join(appDir, 'package.json'), path.join(process.cwd(), 'package.json'), import.meta.url]) {
    try {
      return createRequire(from)('yaml')
    } catch {}
  }
  return null
}

function main (argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')))
  const positional = argv.filter((a) => !a.startsWith('--'))
  for (const f of flags) if (!['--json', '--check', '--write', '--strict'].includes(f)) usage(`unknown flag ${f}`)
  if (positional.length > 1) usage('one app directory at most')
  const appDir = path.resolve(positional[0] || '.')
  if (!fs.existsSync(path.join(appDir, 'mdk-app.yaml'))) usage(`no mdk-app.yaml in ${appDir}`)

  const scanned = scan(appDir)
  if (!scanned) usage(`no mdk-plugin.json in ${appDir}/plugin or ${appDir}`)
  const { root, calls } = scanned
  const { rules, actor, direct } = derive(calls)

  const methods = new Map()
  for (const c of calls) {
    if (!methods.has(c.method)) methods.set(c.method, [])
    methods.get(c.method).push(`${c.file}:${c.line}`)
  }
  const evidence = [...methods.entries()].map(([method, at]) => {
    const spec = specOf(method)
    return { method, ...(spec ? { action: spec.action, resource: spec.resource, verb: spec.verb } : {}), at }
  })

  // --check reads the manifest as it is; with --write too, that is the manifest before the write.
  let declared = null
  let yaml = null
  if (flags.has('--check') || flags.has('--write')) {
    yaml = yamlLib(appDir)
    if (!yaml) usage('--check and --write need the `yaml` package: run from the MDK project, or `npm install --no-save yaml` in the app')
  }
  if (flags.has('--check')) {
    const doc = yaml.parse(fs.readFileSync(path.join(appDir, 'mdk-app.yaml'), 'utf8')) || {}
    declared = Array.isArray(doc.permissions) ? doc.permissions : []
    const bad = malformedRule(declared)
    if (bad !== -1) usage(`mdk-app.yaml: permissions[${bad}] must be { resources: string[], verbs: string[] }`)
  }
  const diff = declared ? compare(rules, declared) : null

  if (flags.has('--write')) {
    const file = path.join(appDir, 'mdk-app.yaml')
    const doc = yaml.parseDocument(fs.readFileSync(file, 'utf8'))
    doc.set('permissions', rules)
    fs.writeFileSync(file, doc.toString(), 'utf8')
  }

  if (flags.has('--json')) {
    console.log(JSON.stringify({ appDir, rules, actor, directWorkerCalls: direct, evidence, ...(diff ? { check: diff } : {}), written: flags.has('--write') }, null, 2))
  } else {
    console.log(`Kernel calls in ${path.relative(process.cwd(), root) || '.'}:`)
    if (!evidence.length) console.log('  (none: the plugin makes no Kernel call)')
    for (const e of evidence) {
      const what = e.resource ? `${e.resource}:${e.verb} (${e.action})` : 'acts as the operator'
      console.log(`  ${e.method.padEnd(22)} ${what.padEnd(40)} ${e.at.join(', ')}`)
    }
    console.log('\nmdk-app.yaml needs at least:\n')
    console.log(toYaml(rules).replace(/^/gm, '  '))
    if (rules.some((r) => r.resources[0] === 'devices')) {
      console.log('  Scope device rules with resourceNames ["family/brand/worker/device"] patterns, e.g. ["miner/*"].')
    }
    if (actor) console.log('  withActor: routes act as the operator too, so the user\'s own role must allow the same resource and verb.')
    if (direct.length) console.log(`  ${direct.map((d) => d.method).join(', ')}: dials the worker directly; the worker's own allow-list decides, not spec.rbac.`)
    if (diff) {
      if (diff.missing.length) console.log(`\n  --check: the manifest does not allow ${diff.missing.join(', ')}; those calls are refused.`)
      if (diff.unused.length) console.log(`\n  --check: the manifest allows ${diff.unused.join(', ')}, which no call needs${flags.has('--strict') ? '' : ' (--strict fails on this)'}.`)
      if (!diff.missing.length && !diff.unused.length) console.log('\n  --check: the manifest matches the code.')
    }
    if (flags.has('--write')) console.log('\n  wrote permissions into mdk-app.yaml; then run `mdk rbac init` (or `mdk add app ... --accept-permissions`) and `mdk validate app <name>`.')
  }
  const failed = diff && (diff.missing.length || (flags.has('--strict') && diff.unused.length))
  process.exit(failed ? 1 : 0)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
