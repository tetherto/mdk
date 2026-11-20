'use strict'

// The responses the Gateway and the app runtime answer on every app route, in
// the order a request meets them on a Gateway with an RBAC authority. A custom
// verifier, which takes the place of authentication and authorization on a
// Gateway with none, is listed where it runs: after the rate limit, before the
// body is read. Each entry is one stage at one status: a fixed set lists its
// codes as x-mdk-errors does ({ code, description, fix }), and a stage whose
// answer carries no fixed code states a rule instead; an open set's rule names
// the package documenting its codes. The reference generator
// adds them to every app's document (addSharedResponses), so an app's reference
// states them without the app declaring them.
//
// It lives here because the Gateway is what answers each of them over HTTP,
// the app runtime's forwarding codes included. Nothing at runtime reads the
// list. The hooks and the client that answer keep their own literals; this
// package's unit tests raise each code through the code that answers it and
// check the status here.

const SHARED_RESPONSES = _freeze([
  {
    name: 'HostNotAllowed',
    stage: 'Host check',
    status: 403,
    description: 'The Gateway does not serve the request\'s host.',
    errors: [{
      code: 'ERR_GATEWAY_HOST_NOT_ALLOWED',
      description: 'The request\'s `Host` header is missing, or names a host the Gateway does not serve. The Gateway serves loopback on its port, its own bind address, and each `allowedHosts` entry. With `trustProxy` set, `X-Forwarded-Host` is checked instead.',
      fix: 'Call the Gateway by a host it serves, or have the operator add the host to `allowedHosts`.'
    }]
  },
  {
    name: 'RateLimited',
    stage: 'Rate limit',
    status: 429,
    description: 'The caller has sent too many requests.',
    errors: [{
      code: 'ERR_RATE_LIMITED',
      description: 'The caller\'s address has sent more requests than the Gateway\'s `rateLimit` allows in its time window, `300` a minute by default.',
      fix: 'Wait for the time window to pass, then retry.'
    }]
  },
  {
    name: 'Unauthorized',
    stage: 'Authentication',
    status: 401,
    description: 'The Gateway could not authenticate the caller.',
    errors: [{
      code: 'ERR_AUTH_UNAUTHORIZED',
      description: 'The request carries no bearer token, or one that fails verification, such as an expired or revoked token.',
      fix: 'Sign in, and send the access token as `Authorization: Bearer <token>`.'
    }]
  },
  {
    name: 'VerifierRefused',
    stage: 'Custom verifier',
    status: '4XX',
    rule: 'On a Gateway with no RBAC authority, an `auth: true` route runs the operator\'s `authVerifier` after the rate limit and before the body is read, in place of authentication and authorization. The route answers the verifier\'s own `4xx` error when it throws one whose message starts with `ERR_`. Otherwise it answers `401` `ERR_AUTH_UNAUTHORIZED`: when none is configured, when the verifier refuses the caller, and when it throws anything else. The operator who supplies the verifier documents its codes, and the `@tetherto/mdk-gateway` README describes the hook.',
    fix: 'Send the credentials the operator\'s verifier expects.'
  },
  {
    name: 'MediaTypeUnsupported',
    stage: 'Body parsing',
    status: 415,
    rule: 'A request other than `GET` carries a body in a content type the Gateway has no parser for; it parses `application/json` and `text/plain`. The Gateway reads the body after the rate limit and the caller\'s authentication or custom verifier, and before authorization. The message is Fastify\'s `Unsupported Media Type`, not an `ERR_*` code.',
    fix: 'Send the body in the content type the operation declares.'
  },
  {
    name: 'BodyTooLarge',
    stage: 'Body parsing',
    status: 413,
    rule: 'A request other than `GET` carries a body larger than the Gateway\'s `bodyLimit`, `1048576` bytes by default. The Gateway reads the body after the rate limit and the caller\'s authentication or custom verifier, and before authorization. The message is Fastify\'s `Request body is too large`, not an `ERR_*` code.',
    fix: 'Send a smaller body, or have the operator raise `bodyLimit`.'
  },
  {
    name: 'BodyMalformed',
    stage: 'Body parsing',
    status: 400,
    rule: 'A request other than `GET` carries a body that does not parse as its content type, such as malformed JSON, or an empty body sent as `application/json`. The Gateway reads the body after the rate limit and the caller\'s authentication or custom verifier, and before authorization. The message is Fastify\'s parse error, not an `ERR_*` code.',
    fix: 'Send a body that parses as its `Content-Type`.'
  },
  {
    name: 'Forbidden',
    stage: 'Authorization',
    status: 403,
    description: 'The caller may not make this call.',
    errors: [{
      code: 'ERR_AUTH_FORBIDDEN',
      description: 'No `spec.rbac` rule grants the caller the route\'s verb on its resource, or the Gateway\'s copy of the policy is stale. The message names the caller, the verb, and the resource, and the Gateway\'s decision log names the reason.',
      fix: 'Ask an operator for a role that grants the call in `spec.rbac`.'
    }]
  },
  {
    name: 'RequestInvalid',
    stage: 'Body validation',
    status: 400,
    rule: 'The request\'s path parameters, query, or body fail the schema the app\'s route table declares for the route. The message is Fastify\'s validation error, not an `ERR_*` code.',
    fix: 'Send the parameters and body the operation declares.'
  },
  {
    name: 'AppRequestRefused',
    stage: 'Forwarding',
    status: 400,
    description: 'The app runtime refused the request the Gateway forwarded.',
    errors: [
      {
        code: 'ERR_APP_BAD_REQUEST',
        description: 'The app runtime refused the request envelope the Gateway sent: malformed, with no `routeId`, or with an `actor` that is not an access token.',
        fix: 'Run the Gateway and the app runtime from the same MDK release.'
      },
      {
        code: 'ERR_APP_ROUTE_IS_STREAM',
        description: 'The Gateway called a stream route as a unary one, such as when the Gateway and the app runtime loaded different route tables.',
        fix: 'Restart the Gateway and the app runtime on the same route table.'
      },
      {
        code: 'ERR_APP_ROUTE_NOT_STREAM',
        description: 'The Gateway called a unary route as a stream, such as when the Gateway and the app runtime loaded different route tables.',
        fix: 'Restart the Gateway and the app runtime on the same route table.'
      }
    ]
  },
  {
    name: 'AppRouteNotFound',
    stage: 'Forwarding',
    status: 404,
    description: 'The app runtime has no such route.',
    errors: [{
      code: 'ERR_APP_ROUTE_NOT_FOUND',
      description: 'The app runtime has no route with the id the Gateway forwarded, such as when the Gateway and the app runtime loaded different route tables.',
      fix: 'Restart the Gateway and the app runtime on the same route table.'
    }]
  },
  {
    name: 'AppRuntimeBadGateway',
    stage: 'Forwarding',
    status: 502,
    description: 'The Gateway could not reach the app runtime, or could not read its answer.',
    errors: [
      {
        code: 'ERR_APP_PROTOCOL_VERSION',
        description: 'The app runtime answered in a different protocol version from the Gateway\'s client.',
        fix: 'Run the Gateway and the app runtime from the same MDK release.'
      },
      {
        code: 'ERR_APP_RUNTIME_UNAVAILABLE',
        description: 'The app runtime is unreachable, does not allow the Gateway\'s key, or closed or garbled its reply.',
        fix: 'Check that the app runtime is running and allows the Gateway\'s key, then retry. A call that changes something may have run before its reply was lost, so check its result first.'
      }
    ]
  },
  {
    name: 'AppRuntimeNotStarted',
    stage: 'Forwarding',
    status: 503,
    description: 'The app runtime is not serving yet.',
    errors: [{
      code: 'ERR_APP_RUNTIME_UNAVAILABLE',
      description: 'The app runtime has not published its key file: it has not started yet, or it has stopped.',
      fix: 'Start the app runtime, or retry once it has started.'
    }]
  },
  {
    name: 'AppRuntimeTimeout',
    stage: 'Forwarding',
    status: 504,
    description: 'The app runtime did not answer in time.',
    errors: [{
      code: 'ERR_APP_RUNTIME_TIMEOUT',
      description: 'The app runtime sent no answer, or no stream head, within the Gateway\'s `appTimeoutMs`, `60000` by default. The Gateway stops waiting, but the route\'s controller is not stopped, so the call may still complete.',
      fix: 'Retry a call that only reads. For a call that changes something, check its result or the device\'s state before sending it again. If it repeats, check the route\'s controller, or raise `appTimeoutMs`.'
    }]
  },
  {
    name: 'ControllerError',
    stage: 'Controller',
    rule: 'An error the route\'s controller throws arrives with its `statusCode` when that is `400` or more, else `403` for `ERR_KERNEL_ACTION_FORBIDDEN` (the Kernel refused the call under `spec.rbac`), `400` for any other `ERR_*` error, and `500` for anything else. A message that does not start with `ERR_` arrives as the status text, such as `Internal Server Error`, and the app runtime logs the original. The app\'s route table declares the codes its controllers throw.',
    fix: 'Act on the code as the operation declares it.'
  },
  {
    name: 'KernelClientError',
    stage: 'Controller',
    rule: 'A controller that passes on an error from its Kernel client relays the client\'s `ERR_*` code, which arrives as `400` by the controller rule, or `403` for `ERR_KERNEL_ACTION_FORBIDDEN`. The `@tetherto/mdk-client` README documents the client\'s transport codes, and the `@tetherto/mdk-kernel` README the Kernel\'s refusals.',
    fix: 'Act on the code as the package that throws it documents.'
  }
])

// The body of every error the Gateway answers, as errorResponse in the
// Gateway's plugin-adapter.js builds it.
const GATEWAY_ERROR_SCHEMA = _freeze({
  type: 'object',
  description: 'The body of every error the Gateway answers.',
  required: ['statusCode', 'error', 'message'],
  properties: {
    statusCode: { type: 'integer', description: 'The HTTP status, repeated.' },
    error: { type: 'string', description: 'The HTTP status text, such as `Unauthorized`.' },
    message: { type: 'string', description: 'The `ERR_*` code, followed by a colon, a space, and a detail when there is one. For a body the Gateway cannot read, or a request that fails the route\'s schema, Fastify\'s message. Otherwise, the HTTP status text.' }
  }
})

const ERROR_BODY = { 'application/json': { schema: { $ref: '#/components/schemas/GatewayError' } } }

function _freeze (value) {
  if (value && typeof value === 'object') Object.values(value).forEach(_freeze)
  return Object.freeze(value)
}

// An entry's codes as x-mdk-errors items, each tagged with its stage so a
// reference can tell them from the app's own codes once merged.
const _items = (entry) => entry.errors.map(e => ({ ...e, stage: entry.stage }))

/**
 * components.responses for a document: one response per entry, in request
 * order. A fixed entry lists its codes in x-mdk-errors; a rule entry states
 * the rule as its description and its fix in x-mdk-fix. x-mdk-stage and
 * x-mdk-status carry the stage and the status (none for a rule that sets it).
 */
function sharedComponents (entries = SHARED_RESPONSES) {
  return Object.fromEntries(entries.map(s => {
    const response = { description: s.errors ? s.description : s.rule, content: structuredClone(ERROR_BODY), 'x-mdk-stage': s.stage }
    if (s.status !== undefined) response['x-mdk-status'] = s.status
    if (s.errors) response['x-mdk-errors'] = _items(s)
    else response['x-mdk-fix'] = s.fix
    return [s.name, response]
  }))
}

/**
 * An operation's responses with the fixed entries added; the input is not
 * changed. OpenAPI allows one response per status, so a status the operation
 * declares keeps its response and gains the shared codes it does not list,
 * and any other refers to the shared response. A status two entries share
 * (the Host check's and authorization's 403) is one response holding both.
 * A `$ref` the operation declares is left as is. Rules are not added: each
 * covers codes no single response can list.
 *
 * An explicit status takes precedence over a range (`4XX`) or `default`, so
 * adding one beside either would take that status away from the response the
 * operation declared for it. Where the operation declares a range or default
 * that answers for a shared status, that response gains the shared codes, each
 * with the status it arrives with, and no status is added.
 */
function withSharedResponses (responses, entries = SHARED_RESPONSES) {
  const out = structuredClone(responses || {})
  const byStatus = new Map()
  for (const s of entries.filter(e => e.errors)) {
    if (!byStatus.has(s.status)) byStatus.set(s.status, [])
    byStatus.get(s.status).push(s)
  }
  for (const [status, shared] of byStatus) {
    const key = [status, `${String(status)[0]}XX`, 'default'].find(k => out[k])
    const own = out[key]
    if (own?.$ref) continue
    if (!own && shared.length === 1) {
      out[status] = { $ref: `#/components/responses/${shared[0].name}` }
      continue
    }
    const target = own || { description: shared.map(s => s.description).join(' '), content: structuredClone(ERROR_BODY) }
    // The codes the operation itself lists: a code it words its own way is not repeated.
    const listed = new Set((responses?.[key]?.['x-mdk-errors'] || []).map(e => e.code))
    const broad = own && String(key) !== String(status)
    const items = shared.flatMap(s => _items(s).map(e => (broad ? { ...e, status: s.status } : e)))
    target['x-mdk-errors'] = [...(target['x-mdk-errors'] || []), ...items.filter(e => !listed.has(e.code))]
    if (!own) out[status] = target
  }
  return out
}

/**
 * Adds the shared responses to an OpenAPI document, in place: the whole set
 * and the error body in components, and `applies` on each operation that
 * declares a response. An operation with none is left for the reference to
 * report as a gap.
 */
function addSharedResponses (document, applies = SHARED_RESPONSES) {
  const components = document.components || (document.components = {})
  components.schemas = { ...components.schemas, GatewayError: structuredClone(GATEWAY_ERROR_SCHEMA) }
  components.responses = { ...components.responses, ...sharedComponents() }
  for (const item of Object.values(document.paths || {})) {
    for (const op of Object.values(item)) if (op?.responses) op.responses = withSharedResponses(op.responses, applies)
  }
  return document
}

module.exports = { SHARED_RESPONSES, GATEWAY_ERROR_SCHEMA, sharedComponents, withSharedResponses, addSharedResponses }
