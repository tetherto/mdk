'use strict'

// Generates the default-plugin route tables in backend/core/plugins/README.md.
//
// Source of truth: each default plugin's mdk-plugin.json (backend/core/plugins/*/mdk-plugin.json).
// Per route, the table is derived from http.method, http.path, auth, and description — so the
// published route list cannot drift from the manifests.
//
// Only the default plugins shipped in this directory are generated. Plugins mounted at runtime
// via startAppNode({ extraPluginDirs }) live outside the repo and document their own routes.
//
// Output (regenerate with `npm run generate:plugin-reference` from backend/core/plugins): the region between
//   <!-- BEGIN GENERATED: default-plugins ... --> and <!-- END GENERATED: default-plugins -->
// in backend/core/plugins/README.md. The surrounding prose is hand-maintained.
//
// Usage: node docs/scripts/generate-plugin-reference.js

const fs = require('fs')
const path = require('path')

const PLUGINS_ROOT = path.resolve(__dirname, '../../backend/core/plugins')
const README = path.join(PLUGINS_ROOT, 'README.md')
const BEGIN = '<!-- BEGIN GENERATED: default-plugins'
const END = '<!-- END GENERATED: default-plugins -->'

// Find every immediate subdirectory of PLUGINS_ROOT that ships an mdk-plugin.json.
function findPlugins () {
  const out = []
  for (const entry of fs.readdirSync(PLUGINS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const manifestPath = path.join(PLUGINS_ROOT, entry.name, 'mdk-plugin.json')
    if (fs.existsSync(manifestPath)) out.push({ dir: entry.name, manifestPath })
  }
  return out.sort((a, b) => a.dir.localeCompare(b.dir))
}

function cell (value) {
  return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}

function pluginSection (plugin) {
  const manifest = JSON.parse(fs.readFileSync(plugin.manifestPath, 'utf8'))
  const routes = Array.isArray(manifest.routes) ? manifest.routes : []

  let out = `### \`${plugin.dir}\`\n\n`
  out += '| Method | Path | Auth | Description |\n'
  out += '| --- | --- | --- | --- |\n'
  for (const route of routes) {
    const method = (route.http && route.http.method) || route.method || ''
    const routePath = (route.http && route.http.path) || route.path || ''
    const auth = route.auth ? 'Required' : 'Optional'
    out += `| \`${cell(method)}\` | \`${cell(routePath)}\` | ${auth} | ${cell(route.description)} |\n`
  }
  return out
}

function main () {
  const readme = fs.readFileSync(README, 'utf8')
  const beginIdx = readme.indexOf(BEGIN)
  const endIdx = readme.indexOf(END)
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    console.error(`[generate-plugin-reference] missing generated markers in ${path.relative(PLUGINS_ROOT, README)}`)
    process.exit(1)
  }

  const beginLineEnd = readme.indexOf('\n', beginIdx)
  const plugins = findPlugins()
  const sections = plugins.map(pluginSection).join('\n')

  const head = readme.slice(0, beginLineEnd + 1)
  const tail = readme.slice(endIdx)
  const next = `${head}\n${sections}\n${tail}`

  fs.writeFileSync(README, next)
  console.log(`[generate-plugin-reference] wrote ${plugins.length} default plugin table(s) to ${path.relative(PLUGINS_ROOT, README)}: ${plugins.map(p => p.dir).join(', ')}`)
}

main()
