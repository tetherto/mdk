'use strict'

// Parallel mock-device runner.
//
// Boots one or more existing worker mocks
// (backend/workers/<category>/<device>/mock/server.js) at once, each in its own
// process. Entries are COMMA-DELIMITED; the first token of an entry is the device
// TYPE (case-insensitive, e.g. m56s / M4M20) — or, for a type-less device,
// its name (e.g. ocean, f2pool). Any further tokens set that mock's flags WITHOUT
// dashes, so npm forwards them as-is (no `--` needed):
//   - a bare number is the port      (14028          ->  --port 14028)
//   - key=value sets any flag        (host=0.0.0.0   ->  --host 0.0.0.0)
//
// Usage (from the repo root):
//   npm run mock m56s, ocean
//   npm run mock M4M20 4009 host=0.0.0.0 mockControlPort=5009, M1M20 4008
//
// Run with no arguments to list every device and its types. For raw mock CLI
// flags, run a worker's mock/server.js directly.

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const WORKERS = path.resolve(__dirname, '..')

const safeReaddir = (p) => { try { return fs.readdirSync(p) } catch (_) { return [] } }
const isDir = (p) => { try { return fs.statSync(p).isDirectory() } catch (_) { return false } }

// A mock's valid types come from its `<NAME>_TYPES = [ ... ]` list (empty if none).
function parseTypes (serverPath) {
  try {
    // Matches both the legacy `const <NAME>_TYPES = [...]` and the new `static TYPES = [...]`.
    const m = fs.readFileSync(serverPath, 'utf8').match(/[A-Z_]*TYPES\s*=\s*\[([^\]]*)\]/)
    if (!m) return []
    return m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  } catch (_) { return [] }
}

// Index every worker mock by its (lowercased) type and by device name.
function buildIndex () {
  const byType = {}
  const byName = {}
  for (const category of safeReaddir(WORKERS)) {
    const catDir = path.join(WORKERS, category)
    if (!isDir(catDir)) continue
    for (const name of safeReaddir(catDir)) {
      const server = path.join(catDir, name, 'mock', 'server.js')
      if (!fs.existsSync(server)) continue
      const types = parseTypes(server)
      byName[name.toLowerCase()] = { server, types, name }
      for (const t of types) byType[t.toLowerCase()] = { server, type: t, name }
    }
  }
  return { byType, byName }
}

// Resolve an entry's first token (case-insensitively) to a mock server + the
// canonical --type to pass (or null for a type-less device).
function resolveToken (token, index) {
  const hit = index.byType[token.toLowerCase()]
  if (hit) return { server: hit.server, type: hit.type }
  const dev = index.byName[token.toLowerCase()]
  if (dev) {
    if (dev.types.length) throw new Error(`'${token}' is a multi-type device — pass a type: ${dev.types.join(', ')}`)
    return { server: dev.server, type: null }
  }
  throw new Error(`'${token}' is not a known type or device`)
}

// Translate a dash-free token into mock CLI args (so npm needs no `--`).
function toFlags (token) {
  if (/^\d+$/.test(token)) return ['--port', token]
  const kv = token.match(/^([A-Za-z][\w-]*)=(.*)$/)
  if (kv) return [`--${kv[1]}`, kv[2]]
  return [token]
}

function listing (index) {
  return Object.values(index.byName)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(d => `  ${d.name.padEnd(12)} ${d.types.length ? d.types.join(', ') : '(no type — run by name)'}`)
    .join('\n')
}

function main () {
  const index = buildIndex()
  const spec = process.argv.slice(2).join(' ').trim()
  if (!spec) {
    console.error('Usage: npm run mock <type|device> [port] [key=value ...] [, ...]')
    console.error('Types are case-insensitive; flags are dash-free (a bare number is the port).\n')
    console.error('Devices (types):\n' + listing(index))
    process.exit(1)
  }

  const children = []
  for (const entry of spec.split(',').map(s => s.trim()).filter(Boolean)) {
    const [token, ...rest] = entry.split(/\s+/)
    let target
    try {
      target = resolveToken(token, index)
    } catch (err) {
      console.error(`  ✗ ${entry}  —  ${err.message}`)
      continue
    }
    const flags = rest.flatMap(toFlags)
    const args = [target.server, ...(target.type ? ['--type', target.type] : []), ...flags]
    // cwd = the worker package dir so mocks that read cwd-relative paths (e.g.
    // bitdeer's ./mock/d40/data) resolve the same as a per-package `npm run mock`.
    children.push(spawn(process.execPath, args, { stdio: 'inherit', cwd: path.dirname(path.dirname(target.server)) }))
    console.log(`  ✓ ${entry}  ->  ${path.relative(WORKERS, target.server)}${target.type ? ' --type ' + target.type : ''}${flags.length ? ' ' + flags.join(' ') : ''}`)
  }

  if (!children.length) { console.error('\nNo mock devices started.'); process.exit(1) }

  console.log(`\n${children.length} mock device(s) running. Press Ctrl+C to stop.`)
  const stopAll = () => { for (const c of children) { try { c.kill('SIGTERM') } catch (_) {} } process.exit(0) }
  process.on('SIGINT', stopAll)
  process.on('SIGTERM', stopAll)
}

main()
