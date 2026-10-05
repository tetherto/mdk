'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')

// Guards against MCP coupling being reintroduced into the Gateway: MCP tool
// generation now lives entirely in the standalone @tetherto/mdk-mcp package.

test('package.json has no @tetherto/mdk-mcp dependency', (t) => {
  const pkg = require('../../../package.json')
  t.absent(pkg.dependencies['@tetherto/mdk-mcp'], 'no @tetherto/mdk-mcp dependency')
})

// Recursively lists every .js file under `dir` — how the whole worker code
// tree (not just its entry point) gets checked below.
function _listJsFiles (dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return _listJsFiles(entryPath)
    return entry.name.endsWith('.js') ? [entryPath] : []
  })
}

// Matches an actual import of the mcp package/dir, not any mention of the word
// "mcp" — a doc comment explaining why the Gateway has none of these should
// stay free to say so. `require('...mcp...')` also catches deep imports like
// `@tetherto/mdk-mcp/plugin`.
const MCP_IMPORT_RE = /require\(['"][^'"]*mcp[^'"]*['"]\)/i

test('workers/ has no mcp-related code', (t) => {
  const workersDir = path.join(__dirname, '../../../workers')
  const files = _listJsFiles(workersDir)
  t.ok(files.length > 0, 'sanity: found worker files to check')

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    t.absent(MCP_IMPORT_RE.test(source), `no mcp import in ${path.relative(workersDir, file)}`)
  }
})
