// The route-table validator (backend/core/app-runtime/lib/route-table-validator.js)
// runs mdk-plugin.schema.json through the shared zero-dependency subset
// (backend/core/mdk-worker/lib/schema-subset.js). If the schema ever grows a
// keyword outside that subset, the subset would silently pass what ajv rejects —
// this suite pins the two to the same verdict on every in-repo route table and
// on synthetic non-conforming ones. ajv checks the full schema, so the subset
// side runs strict (version gating off).

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Ajv = require('ajv/dist/2020')
const { validateRouteTable, SCHEMA_PATH } = require('../backend/core/app-runtime/lib/route-table-validator')
const { PLUGIN_FILE } = require('../backend/core/app-runtime/lib/manifest')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SEARCH_ROOTS = ['backend', 'examples', 'packages']

function findRouteTables (dir = ROOT, acc = []) {
  const roots = dir === ROOT ? SEARCH_ROOTS.map(r => path.join(ROOT, r)) : [dir]
  for (const root of roots) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = path.join(root, entry.name)
      if (entry.isDirectory()) findRouteTables(full, acc)
      else if (entry.name === PLUGIN_FILE) acc.push(full)
    }
  }
  return acc
}

function ajvValidator () {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  return new Ajv({ allErrors: true, strict: false }).compile(schema)
}

// The current route-table schema generation, the routeTableVersion stamp a table opts in with.
const STAMP = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8')).properties.routeTableVersion.enum.at(-1)

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

test('strict subset validator agrees with ajv on every in-repo route table', () => {
  const ajv = ajvValidator()
  const tables = findRouteTables()
  assert.ok(tables.length > 0)
  for (const file of tables) {
    // Stamped before both calls, so the comparison exercises the body rules
    // rather than agreeing vacuously on the missing stamp.
    const t = { routeTableVersion: STAMP, ...read(file) }
    const subset = validateRouteTable(t, { strict: true }).ok
    assert.equal(subset, ajv(t), path.relative(ROOT, file))
  }
})

test('every in-repo route table passes in legacy (warn) mode', () => {
  for (const file of findRouteTables()) {
    const { ok, errors } = validateRouteTable(read(file))
    assert.ok(ok, `${path.relative(ROOT, file)}: ${errors.join('; ')}`)
  }
})

test('strict subset validator agrees with ajv on synthetic non-conforming route tables', () => {
  const ajv = ajvValidator()
  const base = () => ({
    routeTableVersion: STAMP,
    name: '@scope/app',
    version: '0.1.0',
    description: 'An app.',
    routes: [{
      id: 'a',
      handler: 'h.js',
      description: 'Reads a.',
      safety: 'read-only',
      http: {
        method: 'POST',
        path: '/a/{id}',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Done.', content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    }]
  })

  const clean = base()
  assert.ok(ajv(clean), 'base passes ajv')
  assert.ok(validateRouteTable(clean, { strict: true }).ok, 'base passes strict subset')

  const declaredErrors = base()
  declaredErrors.routes[0].http.responses['400'] = {
    description: 'Refused.',
    content: { 'application/json': { schema: { type: 'object' } } },
    'x-mdk-errors': [{ code: 'ERR_BAD_RANGE', description: 'start is not before end.' }]
  }
  assert.ok(ajv(declaredErrors), 'a response with x-mdk-errors passes ajv')
  assert.ok(validateRouteTable(declaredErrors, { strict: true }).ok, 'a response with x-mdk-errors passes strict subset')

  const withFix = base()
  withFix.routes[0].http.responses['400'] = {
    description: 'Refused.',
    'x-mdk-errors': [{ code: 'ERR_BAD_RANGE', description: 'start is not before end.', fix: 'Send a start before the end.' }]
  }
  assert.ok(ajv(withFix), 'an x-mdk-errors item with a fix passes ajv')
  assert.ok(validateRouteTable(withFix, { strict: true }).ok, 'an x-mdk-errors item with a fix passes strict subset')

  const cases = [
    ['missing name', (t) => { delete t.name }],
    ['routes not an array', (t) => { t.routes = {} }],
    ['route not an object', (t) => { t.routes = ['a'] }],
    ['route missing handler', (t) => { delete t.routes[0].handler }],
    ['auth not boolean', (t) => { t.routes[0].auth = 'yes' }],
    ['unknown stamp', (t) => { t.routeTableVersion = '9.9.9' }],
    ['safety outside enum', (t) => { t.routes[0].safety = 'maybe' }],
    ['lowercase http method', (t) => { t.routes[0].http.method = 'post' }],
    ['unexpected http key', (t) => { t.routes[0].http.operation = 'x' }],
    ['parameter in cookie', (t) => { t.routes[0].http.parameters[0].in = 'cookie' }],
    ['parameter missing name', (t) => { delete t.routes[0].http.parameters[0].name }],
    ['requestBody missing content', (t) => { delete t.routes[0].http.requestBody.content }],
    ['response missing description', (t) => { delete t.routes[0].http.responses['200'].description }],
    ['response media type not an object', (t) => { t.routes[0].http.responses['200'].content['application/json'] = 'x' }],
    ['errors not an array', (t) => { t.routes[0].errors = 'ERR_X' }],
    ['response error missing code', (t) => { t.routes[0].http.responses['200']['x-mdk-errors'] = [{ description: 'x' }] }],
    ['response error with an unexpected key', (t) => { t.routes[0].http.responses['200']['x-mdk-errors'] = [{ code: 'ERR_X', description: 'x', status: 400 }] }],
    ['cache with non-string item', (t) => { t.routes[0].cache = [1] }]
  ]

  for (const [label, mutate] of cases) {
    const t = base()
    mutate(t)
    const subset = validateRouteTable(t, { strict: true }).ok
    assert.equal(subset, ajv(t), label)
    assert.equal(subset, false, label + ' rejects')
  }
})
