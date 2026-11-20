'use strict'

const test = require('brittle')
const fs = require('fs')
const index = require('../..')
const { validateRouteTable, SCHEMA_PATH } = require('../../lib/route-table-validator')
const { validateManifest } = require('../../lib/plugin-loader')
const { PLUGIN_FILE } = require('../../lib/manifest')
const { SUBSET_KEYWORDS, ANNOTATION_KEYWORDS } = require('@tetherto/mdk-worker/lib/schema-subset')

// The current route-table schema generation, the routeTableVersion stamp a table opts in with.
const STAMP = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8')).properties.routeTableVersion.enum.at(-1)

const table = (routes, over = {}) => ({ name: '@scope/app', version: '0.1.0', routes, ...over })

// Every route shape the loader accepts today. Each must validate against the
// schema with no errors, so adding the schema cannot narrow acceptance.
const ACCEPTED = {
  flat: table([{ id: 'a', method: 'GET', path: '/a', handler: 'h.js' }]),
  'a $schema that is not a string': { $schema: 1, ...table([{ id: 'a', method: 'GET', path: '/a', handler: 'h.js' }]) },
  'flat with every runtime field': table([{
    id: 'a',
    method: 'POST',
    path: '/a/:id',
    handler: 'h.js#run',
    auth: true,
    cache: ['query.k'],
    stream: false,
    verb: 'get',
    resourceName: { param: 'id' },
    permissions: ['site:read']
  }]),
  'lowercase method': table([{ id: 'a', method: 'get', path: '/a', handler: 'h.js' }]),
  nested: table([{
    id: 'a',
    handler: 'h.js',
    description: 'Reads a.',
    safety: 'read-only',
    errors: ['ERR_X'],
    constraints: ['Needs a Kernel.'],
    http: {
      method: 'GET',
      path: '/a/{id}',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'The a.', content: { 'application/json': { schema: { type: 'object' } } } } }
    }
  }]),
  'thin nested': table([{ id: 'a', handler: 'h.js', safety: 'read-only', http: { method: 'GET', path: '/a' } }]),
  'mixed: method nested, path flat': table([{ id: 'a', handler: 'h.js', path: '/a', http: { method: 'GET' } }]),
  'mixed: method flat, path nested': table([{ id: 'a', handler: 'h.js', method: 'GET', http: { path: '/a' } }]),
  'nested wins over flat': table([{ id: 'a', handler: 'h.js', method: 'PUT', path: '/x', http: { method: 'GET', path: '/a' } }]),
  'unknown keys pass through': table([{ id: 'a', handler: 'h.js', method: 'GET', path: '/a', future: 1 }], { setup: [], other: true }),
  'loose metadata the loader ignores': table([{ id: 'a', handler: 'h.js', method: 'GET', path: '/a', safety: 'maybe', errors: 'ERR_X', http: { method: 'GET', path: '/a', extra: 1 } }])
}

// Tables the loader rejects. The schema may reject them too, or leave them to
// the loader's imperative check — but it must never reject a table the loader accepts.
const REJECTED = {
  'not an object': [],
  'missing name': { version: '1', routes: [{ id: 'a', method: 'GET', path: '/a', handler: 'h.js' }] },
  'name not a string': table([{ id: 'a', method: 'GET', path: '/a', handler: 'h.js' }], { name: 7 }),
  'routes not an array': table({}),
  'routes empty': table([]),
  'route missing id': table([{ method: 'GET', path: '/a', handler: 'h.js' }]),
  'route missing handler': table([{ id: 'a', method: 'GET', path: '/a' }]),
  'route missing method': table([{ id: 'a', path: '/a', handler: 'h.js' }]),
  'route missing path': table([{ id: 'a', method: 'GET', handler: 'h.js' }]),
  'invalid method': table([{ id: 'a', method: 'TRACE', path: '/a', handler: 'h.js' }]),
  'path without leading slash': table([{ id: 'a', method: 'GET', path: 'a', handler: 'h.js' }]),
  'auth not boolean': table([{ id: 'a', method: 'GET', path: '/a', handler: 'h.js', auth: 'yes' }]),
  'verb outside vocabulary': table([{ id: 'a', method: 'GET', path: '/a', handler: 'h.js', verb: 'fly' }]),
  'verb not a string': table([{ id: 'a', method: 'GET', path: '/a', handler: 'h.js', verb: 3 }]),
  'resourceName not an object': table([{ id: 'a', method: 'GET', path: '/a', handler: 'h.js', resourceName: 'id' }]),
  'duplicate id': table([{ id: 'a', method: 'GET', path: '/a', handler: 'h.js' }, { id: 'a', method: 'GET', path: '/b', handler: 'h.js' }]),
  'duplicate method and path': table([{ id: 'a', method: 'GET', path: '/a/:id', handler: 'h.js' }, { id: 'b', http: { method: 'get', path: '/a/{id}' }, handler: 'h.js' }])
}

function loaderAccepts (t) {
  try {
    validateManifest(t, 'fixture')
    return true
  } catch {
    return false
  }
}

test('PLUGIN_FILE is the route-table filename, exported from the package', (t) => {
  t.is(PLUGIN_FILE, 'mdk-plugin.json')
  t.is(index.PLUGIN_FILE, PLUGIN_FILE)
  t.is(index.validateRouteTable, validateRouteTable)
})

test('every shape the loader accepts validates against the schema', (t) => {
  for (const [label, fixture] of Object.entries(ACCEPTED)) {
    t.ok(loaderAccepts(fixture), `loader accepts: ${label}`)
    const { ok, errors } = validateRouteTable(fixture)
    t.ok(ok, `schema accepts: ${label} ${errors.join('; ')}`)
  }
})

test('every table the schema rejects, the loader rejects', (t) => {
  for (const [label, fixture] of Object.entries({ ...ACCEPTED, ...REJECTED })) {
    if (!validateRouteTable(fixture).ok) t.absent(loaderAccepts(fixture), label)
  }
  for (const [label, fixture] of Object.entries(REJECTED)) {
    t.absent(loaderAccepts(fixture), `loader rejects: ${label}`)
  }
})

test('base-tier type rules the loader also enforces are errors', (t) => {
  for (const label of ['not an object', 'name not a string', 'routes not an array', 'route missing id', 'route missing handler', 'auth not boolean', 'verb not a string', 'resourceName not an object']) {
    t.absent(validateRouteTable(REJECTED[label]).ok, label)
  }
})

test('legacy table: OpenAPI-shape findings are warnings, not errors', (t) => {
  const { ok, errors, warnings } = validateRouteTable(ACCEPTED['loose metadata the loader ignores'])
  t.ok(ok)
  t.is(errors.length, 0)
  t.ok(warnings.some(w => w.includes('/routes/0/safety')), 'safety outside enum warns')
  t.ok(warnings.some(w => w.includes("unexpected property 'extra'")), 'unknown http key warns')
  t.absent(warnings.some(w => w.includes('routeTableVersion')), 'the stamp is opt-in: its absence is no finding')
  for (const w of warnings) t.ok(w.startsWith('ERR_PLUGIN_MANIFEST_'), w)
})

test('a table that declares routeTableVersion gets strict findings as errors', (t) => {
  const stamped = { routeTableVersion: STAMP, ...ACCEPTED['loose metadata the loader ignores'] }
  const { ok, errors, warnings } = validateRouteTable(stamped)
  t.absent(ok)
  t.is(warnings.length, 0)
  t.ok(errors.some(e => e.includes('/routes/0/safety')))
})

test('a clean stamped table passes; an unknown stamp fails', (t) => {
  const clean = { routeTableVersion: STAMP, ...ACCEPTED.nested }
  t.ok(validateRouteTable(clean).ok, validateRouteTable(clean).errors.join('; '))
  t.absent(validateRouteTable({ ...clean, routeTableVersion: '9.9.9' }).ok)
})

test('strict: true forces strict findings to errors on a legacy table', (t) => {
  t.absent(validateRouteTable(ACCEPTED['loose metadata the loader ignores'], { strict: true }).ok)
})

test('the schema uses only keywords the subset validator implements', (t) => {
  const allowed = new Set([...SUBSET_KEYWORDS, ...ANNOTATION_KEYWORDS])
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  const walk = (node, at) => {
    if (!node || typeof node !== 'object') return
    for (const [k, v] of Object.entries(node)) {
      if (k === 'properties') {
        for (const [name, sub] of Object.entries(v)) walk(sub, `${at}/properties/${name}`)
        continue
      }
      if (k === 'enum' || k === 'required' || k === 'examples' || k === 'default') continue
      t.ok(allowed.has(k), `${at}: keyword "${k}" is in the subset`)
      if (k === 'allOf') v.forEach((sub, i) => walk(sub, `${at}/allOf/${i}`))
      else if (typeof v === 'object') walk(v, `${at}/${k}`)
    }
  }
  walk(schema, '')
})
