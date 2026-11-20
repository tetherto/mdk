#!/usr/bin/env node
// Generates the HTTP API references from the declarations the runtime registers
// from, so no route, method, path or parameter is typed by hand:
//
//   - the Gateway's own routes, from the route objects createAuthRoutes returns
//     (backend/core/gateway/workers/lib/auth-routes.js), called with a stub
//     authority so no handler runs;
//   - each app in docs/api-reference.config.json, from its route table;
//   - the route-table field reference, from app-runtime's mdk-plugin.schema.json.
//
// The Gateway and each app get openapi.json (OpenAPI 3.1) and http-api.md. The
// conversion and rendering are @tetherto/mdk-app-runtime's routeTableToOpenApi,
// fastifyRoutesToOpenApi and renderReference, which an app in its own
// repository calls the same way. The responses every app route shares are the
// Gateway's declaration (workers/lib/shared-responses.js), added here.
//
//   npm run generate:api-reference
//
// Registered in docs/scripts/regenerate-docs.mjs TARGETS, so docs-freshness.yml
// reports a stale page. Never hand-edit the outputs: change the declaration.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CONFIG_PATH = path.join(REPO_ROOT, 'docs/api-reference.config.json')
const SELF = 'docs/scripts/generate-api-reference.mjs'

const { routeTableToOpenApi, fastifyRoutesToOpenApi, renderReference, renderRouteTableFields } = require('../../backend/core/app-runtime/lib/route-table-openapi')
const { SCHEMA_PATH } = require('../../backend/core/app-runtime/lib/route-table-validator')
const { validateManifest } = require('../../backend/core/app-runtime/lib/plugin-loader')
const { resolvePluginDir, loadAppManifest, PLUGIN_FILE, MANIFEST_FILE } = require('../../backend/core/app-runtime/lib/manifest')
const { SHARED_RESPONSES, addSharedResponses } = require('../../backend/core/gateway/workers/lib/shared-responses')
const { createAuthRoutes, AUTH_COMPONENTS } = require('../../backend/core/gateway/workers/lib/auth-routes')

const OPENAPI_FILE = 'openapi.json'
const REFERENCE_FILE = 'http-api.md'
const FIELDS_FILE = 'route-table-fields.md'

// The shared stages a sign-in route meets: the Gateway's own hooks, and Fastify
// reading the body of a route that takes one. It carries no authorization hook
// and forwards nothing, so the rest of the shared set does not apply to it.
export const SIGN_IN_STAGES = new Set(['Host check', 'Rate limit', 'Body parsing'])

// In request order, with a serial comma, so the sentence follows the declaration.
const signInStages = () => {
  const stages = [...new Set(SHARED_RESPONSES.map(s => s.stage))].filter(s => SIGN_IN_STAGES.has(s))
  return stages.length < 3 ? stages.join(' and ') : `${stages.slice(0, -1).join(', ')}, and ${stages.at(-1)}`
}

const GATEWAY_INTRO = [
  'The routes the Gateway registers in its own code. It registers them only when it has an RBAC authority, a Kernel or a',
  'credential; they are how a caller gets the token that `spec.rbac` checks, so they are not checked against it themselves.',
  'Each app documents its own routes, and routes passed to `startGateway()` as `additionalRoutes` belong to whoever passes them.',
  `Of the stages in the errors every app route shares, the operations on this page meet only the ${signInStages()} stages.`,
  'Each operation lists the codes those stages answer beside its own.'
].join(' ')

export function readConfig (file = CONFIG_PATH) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

const rel = (p) => path.relative(REPO_ROOT, p) || '.'

export function buildGateway () {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'backend/core/gateway/package.json'), 'utf8'))
  // A stub authority: createAuthRoutes only closes over it, and no handler is called here.
  const routes = createAuthRoutes({})
  const { document, gaps } = fastifyRoutesToOpenApi(routes, { title: 'Gateway', version: pkg.version, server: '/', components: AUTH_COMPONENTS })
  // The whole shared set goes in components, so the page lists it; each
  // operation gets the entries that apply to it. Added here, not on the route
  // objects, so each route still declares exactly what its own handler answers.
  addSharedResponses(document, SHARED_RESPONSES.filter(s => SIGN_IN_STAGES.has(s.stage)))
  const markdown = renderReference(document, gaps, {
    generatedBy: SELF,
    source: 'backend/core/gateway/workers/lib/auth-routes.js (createAuthRoutes)',
    openapiFile: OPENAPI_FILE,
    intro: GATEWAY_INTRO,
    // http.node.wrk.js adds these routes with no authz hook: sign-in comes before any token.
    accessFallback: 'Not checked against `spec.rbac`'
  })
  return { document, gaps, markdown }
}

/** app: { name, dir, mount? } — dir is any app package directory, in this repository or not. */
export function buildApp (app) {
  const dir = path.resolve(REPO_ROOT, app.dir)
  const pluginDir = resolvePluginDir(dir)
  const file = path.join(pluginDir, PLUGIN_FILE)
  const table = JSON.parse(fs.readFileSync(file, 'utf8'))
  validateManifest(table, pluginDir)
  // The app manifest names the app; an app package always has one, but a bare route table still generates.
  const manifest = fs.existsSync(path.join(dir, MANIFEST_FILE)) ? loadAppManifest(dir).manifest : undefined
  const { document, gaps } = routeTableToOpenApi(table, { appName: app.name, mount: app.mount, app: manifest })
  // What the Gateway and the app runtime answer on every app route: the Gateway declares it, not the app.
  addSharedResponses(document)
  const markdown = renderReference(document, gaps, {
    generatedBy: SELF,
    source: file.startsWith(REPO_ROOT) ? rel(file) : PLUGIN_FILE,
    openapiFile: OPENAPI_FILE
  })
  return { document, gaps, markdown }
}

const json = (doc) => JSON.stringify(doc, null, 2) + '\n'

/** The repo-relative files generate() writes for a config. A target without `out` writes nothing. */
export function outputPaths (config = readConfig()) {
  const out = []
  if (config.routeTableSchema?.out) out.push(path.join(config.routeTableSchema.out, FIELDS_FILE))
  for (const t of [config.gateway, ...(config.apps || [])]) {
    if (t?.out) out.push(path.join(t.out, OPENAPI_FILE), path.join(t.out, REFERENCE_FILE))
  }
  return out
}

/** -> { '<repo-relative path>': '<content>' } for every configured output. */
export function generate (config = readConfig()) {
  const out = {}
  const put = (dir, built) => {
    out[path.join(dir, OPENAPI_FILE)] = json(built.document)
    out[path.join(dir, REFERENCE_FILE)] = built.markdown
  }
  if (config.routeTableSchema?.out) {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
    out[path.join(config.routeTableSchema.out, FIELDS_FILE)] = renderRouteTableFields(schema, { generatedBy: SELF, source: rel(SCHEMA_PATH) })
  }
  if (config.gateway?.out) put(config.gateway.out, buildGateway())
  for (const app of config.apps || []) if (app.out) put(app.out, buildApp(app))
  return out
}

function main () {
  for (const [file, content] of Object.entries(generate())) {
    const abs = path.join(REPO_ROOT, file)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content)
    console.log(`wrote ${file}`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
