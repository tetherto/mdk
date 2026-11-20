'use strict'

const fs = require('fs')
const path = require('path')
const { validateSubset } = require('@tetherto/mdk-worker/lib/schema-subset')

const SCHEMA_PATH = path.join(__dirname, '..', 'mdk-plugin.schema.json')

let _schema = null

function _loadSchema () {
  if (!_schema) _schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  return _schema
}

/**
 * Validate a parsed route table against mdk-plugin.schema.json, schema only.
 * The rules the schema cannot express — non-empty values, method and path each
 * read from `http` or the route top level, unique ids and method/path pairs, a
 * leading slash, the RBAC verb vocabulary — stay with the loader's
 * validateManifest; run both for a complete check.
 *
 * validateRouteTable(table, { strict = false }) -> { ok, errors, warnings }
 *
 * Version gating, as for Worker contracts: a table that declares
 * `routeTableVersion` is held to the strict tier (the OpenAPI-shaped form) as
 * errors. A legacy table gets strict-tier findings as warnings, so no table the
 * loader accepts fails here. strict: true forces them to errors regardless.
 * ok means no errors; warnings never fail a table.
 */
function validateRouteTable (table, opts = {}) {
  const out = validateSubset(_loadSchema(), table, { codePrefix: 'ERR_PLUGIN_MANIFEST' })
  const declared = table !== null && typeof table === 'object' && !Array.isArray(table) && typeof table.routeTableVersion === 'string'
  const strictAsErrors = opts.strict === true || declared
  const errors = strictAsErrors ? out.base.concat(out.strict) : out.base
  const warnings = strictAsErrors ? [] : out.strict
  return { ok: errors.length === 0, errors, warnings }
}

module.exports = { validateRouteTable, SCHEMA_PATH }
