'use strict'

const { routeAccess } = require('@tetherto/mdk-rbac')
const { normalizeRoute } = require('./plugin-loader')

// Turns declarations the runtime registers from into an OpenAPI 3.1 document
// and a Markdown reference. Nothing is invented: a fact the declaration does
// not state is left out of the document (OpenAPI 3.1 allows an operation
// without responses) or marked NOT_DECLARED, and recorded as a gap so the
// reference can list what is missing. The one exception is a path parameter
// the path template names but no parameter declares: OpenAPI requires it, so it
// is emitted as a string — the form every URL segment arrives in — and marked
// NOT_DECLARED.
//
// The responses every app route shares are not declared here: the Gateway
// declares them, and its addSharedResponses adds them to a document. The
// reference lists any component response that carries an x-mdk-stage.

const NOT_DECLARED = 'Not declared'

// Under spec.rbac every app route needs a bearer token. OpenAPI 3.1 lets a
// non-OAuth security requirement list role names, so each operation names its
// RBAC requirement there, in standard form, as well as in x-mdk-access.
const APP_SECURITY_SCHEMES = {
  bearer: {
    type: 'http',
    scheme: 'bearer',
    description: 'An access token from the Gateway\'s `/auth/login`, `/auth/token` or `/auth/refresh`. Each operation\'s role name is its `spec.rbac` requirement: the verb and resource a rule must grant the caller.'
  }
}
const METHODS = ['get', 'put', 'post', 'delete', 'patch']

const toOpenApiPath = (p) => p.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
const templateParams = (p) => [...p.matchAll(/\{([^{}]+)\}/g)].map(m => m[1])
const nonEmpty = (s) => typeof s === 'string' && s.trim() !== ''

// Parameters from a Fastify route schema (params, querystring, headers), as the runtime validates them.
function _parametersFromFastifySchema (schema) {
  const out = []
  for (const [key, where] of [['params', 'path'], ['querystring', 'query'], ['headers', 'header']]) {
    const group = schema?.[key]
    if (!group || typeof group !== 'object') continue
    const required = new Set(Array.isArray(group.required) ? group.required : [])
    for (const [name, s] of Object.entries(group.properties || {})) {
      out.push({ in: where, name, required: where === 'path' || required.has(name), schema: s })
    }
  }
  return out
}

// A Fastify body schema as an OpenAPI requestBody. Fastify validates an absent
// body against the schema too, so a body is required unless the schema admits
// null: the loader writes an optional body as anyOf [schema, { type: 'null' }].
function _bodyFromFastifySchema (schema) {
  const body = schema?.body
  if (!body || typeof body !== 'object') return undefined
  const branches = Array.isArray(body.anyOf) ? body.anyOf : null
  const nullBranch = branches && branches.length === 2 ? branches.findIndex(b => b && b.type === 'null' && Object.keys(b).length === 1) : -1
  if (nullBranch >= 0) return { required: false, content: { 'application/json': { schema: branches[1 - nullBranch] } } }
  return { required: true, content: { 'application/json': { schema: body } } }
}

function _fillPathParams (path, parameters, gap) {
  const declared = new Set(parameters.filter(p => p.in === 'path').map(p => p.name))
  const missing = templateParams(path).filter(n => !declared.has(n))
  if (missing.length) gap('parameters', `path parameter${missing.length > 1 ? 's' : ''} ${missing.map(n => `\`${n}\``).join(', ')} not declared`)
  return [...parameters, ...missing.map(name => ({ in: 'path', name, required: true, schema: { type: 'string' }, description: NOT_DECLARED }))]
}

function _addOperation (paths, path, method, op) {
  if (!paths[path]) paths[path] = {}
  paths[path][method] = op
}

/**
 * An app's route table as a standalone OpenAPI 3.1 document.
 *
 * routeTableToOpenApi(table, { appName, mount?, app? }) -> { document, gaps }
 *
 * appName is the app's spec.apps name, which the RBAC resource is built from.
 * mount is where the Gateway serves the app (default /apps/<appName>); it
 * becomes the document's server, so paths stay as the table declares them.
 * app is the parsed mdk-app.yaml; its displayName, version and description
 * title the document, falling back to the route table's name, version and description.
 * Each gap is { operation, field, detail }. Assumes a table validateManifest accepts.
 */
function routeTableToOpenApi (table, opts = {}) {
  const { appName } = opts
  if (!nonEmpty(appName)) throw new Error('ERR_ROUTE_REFERENCE_APP_NAME: appName (the spec.apps name) is required: Access is resolved from it')
  const mount = opts.mount ?? `/apps/${appName}`
  const paths = {}
  const gaps = []

  for (const route of table.routes) {
    const gap = (field, detail) => gaps.push({ operation: route.id, field, detail })
    const n = normalizeRoute(route)
    const path = toOpenApiPath(n.path)
    const op = { operationId: route.id }

    if (nonEmpty(route.description)) op.description = route.description
    else gap('description', 'no description')

    const declared = Array.isArray(route.http?.parameters) ? route.http.parameters : _parametersFromFastifySchema(route.schema)
    const parameters = _fillPathParams(path, declared, gap)
    if (parameters.length) op.parameters = parameters

    const requestBody = route.http?.requestBody ?? _bodyFromFastifySchema(route.schema)
    if (requestBody) op.requestBody = requestBody

    const access = routeAccess(appName, n)
    op.security = [{ bearer: [`${access.verb} ${access.resource}`] }]

    if (route.http?.responses && Object.keys(route.http.responses).length) op.responses = route.http.responses
    else gap('responses', 'no responses')

    op['x-mdk-access'] = access
    if (route.safety !== undefined) op['x-mdk-safety'] = route.safety
    if (Array.isArray(route.errors) && route.errors.length) op['x-mdk-errors'] = route.errors
    if (Array.isArray(route.constraints) && route.constraints.length) op['x-mdk-constraints'] = route.constraints
    if (route.stream === true) op['x-mdk-stream'] = true

    _addOperation(paths, path, n.method.toLowerCase(), op)
  }

  // The app's own manifest (mdk-app.yaml) names the app; the route table's name and description are the fallback.
  const app = opts.app || {}
  const info = { title: nonEmpty(app.displayName) ? app.displayName : table.name, version: nonEmpty(app.version) ? app.version : table.version }
  const description = nonEmpty(app.description) ? app.description : table.description
  if (nonEmpty(description)) info.description = description
  return { document: { openapi: '3.1.0', info, servers: [{ url: mount }], paths, components: { securitySchemes: structuredClone(APP_SECURITY_SCHEMES) } }, gaps }
}

/**
 * Fastify route objects ({ method, url, schema }) as an OpenAPI 3.1 document —
 * for routes registered in code, such as the Gateway's own. Reads schema.summary,
 * schema.description, schema.tags, schema.operationId, the request schemas, and
 * OpenAPI's own schema.responses, schema.security and schema.parameters (such as
 * a cookie), which Fastify ignores; never
 * schema.response, which drives Fastify's serializer rather than describing it.
 * `components` is copied into the document for the responses to refer to.
 *
 * fastifyRoutesToOpenApi(routes, { title, version, description?, server, components? }) -> { document, gaps }
 */
function fastifyRoutesToOpenApi (routes, opts = {}) {
  const paths = {}
  const gaps = []
  for (const route of routes) {
    const methods = (Array.isArray(route.method) ? route.method : [route.method]).map(m => String(m).toLowerCase()).filter(m => METHODS.includes(m))
    for (const method of methods) {
      const path = toOpenApiPath(route.url)
      const key = `${method.toUpperCase()} ${route.url}`
      const gap = (field, detail) => gaps.push({ operation: key, field, detail })
      const s = route.schema || {}
      const op = {}
      if (nonEmpty(s.operationId)) op.operationId = s.operationId
      if (nonEmpty(s.summary)) op.summary = s.summary
      if (nonEmpty(s.description)) op.description = s.description
      else gap('description', 'no description')
      if (Array.isArray(s.tags) && s.tags.length) op.tags = s.tags
      const declared = [..._parametersFromFastifySchema(s), ...(Array.isArray(s.parameters) ? structuredClone(s.parameters) : [])]
      const parameters = _fillPathParams(path, declared, gap)
      if (parameters.length) op.parameters = parameters
      const requestBody = _bodyFromFastifySchema(s)
      if (requestBody) op.requestBody = requestBody
      if (Array.isArray(s.security) && s.security.length) op.security = structuredClone(s.security)
      if (s.responses && typeof s.responses === 'object' && Object.keys(s.responses).length) op.responses = structuredClone(s.responses)
      else gap('responses', 'no responses')
      _addOperation(paths, path, method, op)
    }
  }
  const info = { title: opts.title, version: opts.version }
  if (nonEmpty(opts.description)) info.description = opts.description
  const document = { openapi: '3.1.0', info, servers: [{ url: opts.server ?? '/' }], paths }
  if (opts.components && Object.keys(opts.components).length) document.components = structuredClone(opts.components)
  return { document, gaps }
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
function _escapeCell (s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}

// A table cell: one line, pipes escaped, and no closing stop on a single sentence.
function _cell (s) {
  const text = _escapeCell(String(s).replace(/\s+/g, ' ').trim())
  const sentences = text.match(/[.!?](\s|$)/g) || []
  return sentences.length === 1 && text.endsWith('.') ? text.slice(0, -1) : text
}

// Prose wrapped at 140 characters, for the line length the docs style asks for.
function _wrap (text, width = 140) {
  const out = []
  let line = ''
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      out.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) out.push(line)
  return out.join('\n')
}
const NAME_SOURCES = { param: 'path parameter', query: 'query field', body: 'body field' }

function _access (op, fallback) {
  const a = op['x-mdk-access']
  if (!a) return fallback || NOT_DECLARED
  const instance = a.nameFrom ? `, instance from ${NAME_SOURCES[a.nameFrom.from] || a.nameFrom.from} \`${a.nameFrom.field}\`` : ''
  return `\`${a.verb}\` on \`${a.resource}\`${instance}`
}

// A security requirement as the Request column reads it: an HTTP bearer scheme
// as "Bearer token", any other scheme by its name.
function _securityParts (document, op) {
  const schemes = document?.components?.securitySchemes || {}
  const names = [...new Set((op.security || []).flatMap(req => Object.keys(req)))]
  return names.map(name => (schemes[name]?.type === 'http' && schemes[name]?.scheme === 'bearer' ? 'Bearer token' : `\`${name}\` (security)`))
}

function _request (op, document) {
  const parts = [..._securityParts(document, op), ...(op.parameters || []).map(p => `\`${p.name}\` (${p.in})`)]
  if (op.requestBody) parts.push(op.requestBody.required === true ? 'JSON body (required)' : 'JSON body')
  return parts.length ? parts.join(', ') : 'None declared'
}

function _purpose (op) {
  if (op.summary && op.description) return `**${String(op.summary).replace(/\.$/, '')}.** ${_escapeCell(String(op.description).replace(/\s+/g, ' ').trim())}`
  return _cell(op.description || op.summary || NOT_DECLARED)
}

const _responses = (op) => (op.responses ? Object.keys(op.responses).map(c => `\`${c}\``).join(', ') : NOT_DECLARED)

// A local `#/components/...` reference resolved against the document.
function _resolve (document, schema) {
  if (!schema || typeof schema.$ref !== 'string' || !schema.$ref.startsWith('#/')) return schema
  return schema.$ref.slice(2).split('/').reduce((node, key) => (node == null ? node : node[key]), document)
}

/**
 * Every declared application error code: [{ code, status, operations, when, fix, body, stage }].
 * A response's `x-mdk-errors` ([{ code, description, fix?, stage? }]) gives the
 * status, the response resolved first when it is a `$ref`; an operation's own
 * `x-mdk-errors` (bare codes, from a route table's `errors`) gives none. A
 * shared code carries its stage. Sorted by code, then status.
 */
function _declaredErrors (document) {
  const rows = new Map()
  const add = (code, status, operation, when, fix, body, stage) => {
    const key = `${code} ${status ?? ''}${stage ? ` ${stage}` : ''}`
    if (!rows.has(key)) rows.set(key, { code, status, operations: [], when: [], fix: [], body, stage })
    const row = rows.get(key)
    if (!row.operations.includes(operation)) row.operations.push(operation)
    if (when) row.when.push({ operation, when })
    row.fix.push({ operation, fix })
  }
  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of METHODS) {
      const op = item[method]
      if (!op) continue
      const operation = `${method.toUpperCase()} ${path}`
      const withStatus = new Set()
      for (const [status, declared] of Object.entries(op.responses || {})) {
        const response = _resolve(document, declared) || {}
        const body = _resolve(document, response.content?.['application/json']?.schema)
        for (const e of response['x-mdk-errors'] || []) {
          add(e.code, status, operation, e.description, e.fix, body, e.stage)
          withStatus.add(e.code)
        }
      }
      // A route table's bare codes; one its responses already give a status is not repeated.
      for (const code of op['x-mdk-errors'] || []) if (typeof code === 'string' && !withStatus.has(code)) add(code, undefined, operation)
    }
  }
  return [...rows.values()].sort((a, b) => a.code.localeCompare(b.code) || String(a.status).localeCompare(String(b.status)))
}

// One value for every operation reads as is; differing values name their
// operation, and an operation without one reads "Not declared".
function _perOperation (entries, key) {
  const values = [...new Set(entries.map(e => e[key]))]
  if (!values.some(Boolean)) return NOT_DECLARED
  if (values.length === 1) return _cell(values[0])
  return entries.map(e => `\`${e.operation}\`: ${e[key] ? _cell(e[key]) : NOT_DECLARED}`).join('; ')
}

// The shared responses in components (each carries an x-mdk-stage), one row per code
// and per rule, in the document's order, which is request order.
function _sharedRows (document) {
  const rows = []
  for (const response of Object.values(document.components?.responses || {})) {
    const stage = response['x-mdk-stage']
    if (!stage) continue
    const status = response['x-mdk-status'] === undefined ? 'Varies' : `\`${response['x-mdk-status']}\``
    const fix = (f) => (f ? _cell(f) : NOT_DECLARED)
    if (response['x-mdk-errors']) {
      for (const e of response['x-mdk-errors']) rows.push(`| ${stage} | \`${e.code}\` | ${status} | ${_cell(e.description)} | ${fix(e.fix)} |`)
    } else {
      rows.push(`| ${stage} | Rule | ${status} | ${_cell(response.description)} | ${fix(response['x-mdk-fix'])} |`)
    }
  }
  return rows
}

const OWN_ERRORS_INTRO = 'The application error codes the operations declare, the HTTP status each arrives with, when it fires and what the caller does about it. "Not declared" marks what the declaration does not state.'
const SHARED_ERRORS_INTRO = 'What the Gateway and the app runtime answer on every app route, in the order a request meets each stage on a Gateway with an RBAC authority. Each code is listed once, not with each operation that can answer it. A Rule row covers codes no single page can list.'

function _errorsSection (document) {
  const all = _declaredErrors(document)
  const rows = all.filter(r => !r.stage)
  const shared = _sharedRows(document)
  if (!rows.length && !shared.length) return []
  const lines = ['', '## Errors', '']
  if (!shared.length) lines.push(_wrap(OWN_ERRORS_INTRO), '')
  const sharedBody = Object.values(document.components?.responses || {}).find(r => r['x-mdk-stage'])?.content?.['application/json']?.schema
  const body = all.find(r => r.body?.properties)?.body || _resolve(document, sharedBody)
  if (body?.properties) {
    const described = Object.entries(body.properties).filter(([, v]) => v.description)
    lines.push(_wrap(`An error response's body is \`{ ${Object.keys(body.properties).join(', ')} }\`${described.length ? ':' : '.'}`), '')
    if (described.length) lines.push(...described.map(([k, v]) => _wrap(`- \`${k}\`: ${_cell(v.description)}`).replace(/\n/g, '\n  ')), '')
  }
  if (shared.length) {
    lines.push('### Errors on every app route', '', _wrap(SHARED_ERRORS_INTRO), '')
    lines.push('| Stage | Code | Status | Fires when | Fix |', '| ----- | ---- | ------ | ---------- | --- |', ...shared)
    if (rows.length) lines.push('', '### Errors the operations declare', '', _wrap(OWN_ERRORS_INTRO), '')
  }
  if (rows.length) lines.push('| Code | Status | Operations | Fires when | Fix |', '| ---- | ------ | ---------- | ---------- | --- |')
  for (const r of rows) {
    lines.push(`| \`${r.code}\` | ${r.status ? `\`${r.status}\`` : NOT_DECLARED} | ${r.operations.map(o => `\`${o}\``).join(', ')} | ${_perOperation(r.when, 'when')} | ${_perOperation(r.fix, 'fix')} |`)
  }
  return lines
}

/**
 * The Markdown reference for a document from routeTableToOpenApi or
 * fastifyRoutesToOpenApi. Deterministic: the same input renders the same bytes.
 *
 * renderReference(document, gaps, { generatedBy, source, openapiFile, intro?, accessFallback? }) -> string
 *
 * accessFallback is the Access cell for an operation with no x-mdk-access (default "Not declared").
 */
function renderReference (document, gaps, opts = {}) {
  const { info, servers, paths } = document
  const lines = [
    `<!-- GENERATED FILE — DO NOT EDIT. Generated by ${opts.generatedBy} from ${opts.source}. Change the declaration, then regenerate. -->`,
    '',
    `# ${info.title} HTTP API`,
    '',
    '## Overview',
    ''
  ]
  if (info.description) lines.push(_wrap(info.description), '')
  if (opts.intro) lines.push(_wrap(opts.intro), '')
  lines.push(
    _wrap(`Every path is relative to \`${servers[0].url}\`, where the Gateway serves these routes. The OpenAPI 3.1 document is [\`${opts.openapiFile}\`](${opts.openapiFile}).`),
    '',
    _wrap('Purpose is the operation\'s declared description. Access is the `spec.rbac` requirement the Gateway checks, a verb on a resource; it does not mean any particular caller is allowed. "Not declared" marks something the declaration does not state.'),
    '',
    '## Operations',
    '',
    '| Method | Path | Purpose | Access | Request | Responses |',
    '| ------ | ---- | ------- | ------ | ------- | --------- |'
  )
  for (const [path, item] of Object.entries(paths)) {
    for (const method of METHODS) {
      const op = item[method]
      if (!op) continue
      lines.push(`| \`${method.toUpperCase()}\` | \`${path}\` | ${_purpose(op)} | ${_access(op, opts.accessFallback)} | ${_request(op, document)} | ${_responses(op)} |`)
    }
  }
  lines.push(..._errorsSection(document))
  if (gaps.length) {
    lines.push('', '## Declaration gaps', '', 'What the declarations do not state yet. Fix these in the source declaration, not on this page.', '')
    for (const g of gaps) lines.push(`- \`${g.operation}\`: ${g.detail}`)
  }
  lines.push('')
  return lines.join('\n')
}

const ANNOTATION_ONLY = new Set(['$schema'])

function _fieldType (node) {
  const type = node.type || 'any'
  return Array.isArray(node.enum) ? `${type}: ${node.enum.map(v => `\`${v}\``).join(', ')}` : type
}

// Walks properties, array items (`[]`) and additionalProperties (`.<key>`) in
// schema order, carrying the strict tier down from an x-mdk-strict ancestor.
function _fields (node, at, strict, rows, placeholder) {
  const required = new Set(node.required || [])
  for (const [key, child] of Object.entries(node.properties || {})) {
    if (ANNOTATION_ONLY.has(key)) continue
    _field(child, at ? `${at}.${key}` : key, strict || child['x-mdk-strict'] === true, required.has(key), rows)
  }
  if (node.additionalProperties && typeof node.additionalProperties === 'object') {
    _field(node.additionalProperties, `${at}.<${placeholder || 'key'}>`, strict, false, rows)
  }
}

function _field (node, path, strict, required, rows) {
  rows.push({ path, type: _fieldType(node), required, strict, description: node.description || '' })
  if (node.type === 'array' && node.items) {
    if (node.items.properties || node.items.additionalProperties) _fields(node.items, `${path}[]`, strict, rows)
  } else if (node.type === 'object') {
    const leaf = path.split('.').pop()
    _fields(node, path, strict, rows, leaf === 'responses' ? 'status' : leaf === 'content' ? 'media type' : 'key')
  }
}

/**
 * The route-table schema as a Markdown field reference: one row per field, its
 * type, whether it is required, and when it is checked — always (the base tier,
 * what the loader rejects) or only for a table that declares routeTableVersion.
 *
 * renderRouteTableFields(schema, { generatedBy, source }) -> string
 */
function renderRouteTableFields (schema, opts = {}) {
  const rows = []
  _fields(schema, '', false, rows)
  const lines = [
    `<!-- GENERATED FILE — DO NOT EDIT. Generated by ${opts.generatedBy} from ${opts.source}. Change the schema, then regenerate. -->`,
    '',
    `# ${schema.title} fields`,
    '',
    '## Overview',
    '',
    _wrap(schema.description),
    '',
    _wrap('A field checked "Always" fails validation when malformed in any table. A field checked "With `routeTableVersion`" is reported as a warning in a table without that stamp, and fails one that declares it.'),
    '',
    '## Fields',
    '',
    '| Field | Type | Required | Checked | Description |',
    '| ----- | ---- | -------- | ------- | ----------- |'
  ]
  for (const r of rows) {
    lines.push(`| \`${r.path}\` | ${r.type} | ${r.required ? 'Yes' : 'No'} | ${r.strict ? 'With `routeTableVersion`' : 'Always'} | ${r.description ? _cell(r.description) : 'None'} |`)
  }
  lines.push('')
  return lines.join('\n')
}

module.exports = { routeTableToOpenApi, fastifyRoutesToOpenApi, renderReference, renderRouteTableFields, toOpenApiPath, NOT_DECLARED }
