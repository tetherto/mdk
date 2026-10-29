'use strict'

const test = require('brittle')
const p = require('../../lib/protocol')

test('encode/decode round-trips JSON', (t) => {
  t.alike(p.decode(p.encode({ a: 1, b: ['x'] })), { a: 1, b: ['x'] })
  t.alike(p.decode(new Uint8Array(p.encode({ ok: true }))), { ok: true })
})

test('buildRequest tolerates a missing request and identity', (t) => {
  const bare = p.buildRequest('r.id')
  t.is(bare.v, p.PROTOCOL_VERSION)
  t.is(bare.routeId, 'r.id')
  t.is(bare.identity, null)
  t.alike(Object.keys(bare.req).sort(), ['body', 'headers', 'params', 'query'])
  const full = p.buildRequest('r.id', { params: { a: 1 }, query: { q: 2 }, body: 'b', headers: { h: 'v' } }, { sub: 'u' })
  t.alike(full.req, { params: { a: 1 }, query: { q: 2 }, body: 'b', headers: { h: 'v' } })
  t.alike(full.identity, { sub: 'u' })
  t.is(p.buildRequest('r.id', {}, undefined).identity, null)
  t.is(bare.actor, null)
  t.is(p.buildRequest('r.id', {}, null, 'tok').actor, 'tok')
  t.is(p.buildRequest('r.id', {}, null, '').actor, null)
})

test('checkRequest accepts an access token as the actor, nothing else', (t) => {
  const ok = p.buildRequest('r.id', {}, null, 'tok')
  t.is(p.checkRequest(ok), null)
  t.is(p.checkRequest({ ...ok, actor: null }), null)
  for (const actor of [5, '', 'x'.repeat(8193), {}]) t.is(p.checkRequest({ ...ok, actor }).code, p.ERR.BAD_REQUEST)
})

test('okResponse / errorResponse shapes', (t) => {
  t.alike(p.okResponse(5), { v: p.PROTOCOL_VERSION, ok: true, result: 5 })
  t.alike(p.errorResponse(404, 'C', 'm'), { v: p.PROTOCOL_VERSION, ok: false, status: 404, code: 'C', message: 'm' })
})

test('toErrorResponse passes ERR_ messages through and hides everything else', (t) => {
  const safe = Object.assign(new Error('ERR_THING_BAD: detail'), { statusCode: 409 })
  t.alike(p.toErrorResponse(safe), p.errorResponse(409, 'ERR_THING_BAD', 'ERR_THING_BAD: detail'))

  const odd = new Error('ERR_lowercase_code')
  t.is(p.toErrorResponse(odd).code, p.ERR.REQUEST_FAILED, 'a message that is not a well-formed code falls back')
  t.is(p.toErrorResponse(odd).status, 400, 'an ERR_ error without a statusCode defaults to 400')

  const leak = Object.assign(new Error('/secret/path exploded'), { statusCode: 503 })
  const res = p.toErrorResponse(leak)
  t.is(res.message, 'Service Unavailable')
  t.is(res.code, p.ERR.REQUEST_FAILED)

  t.is(p.toErrorResponse(Object.assign(new Error('x'), { statusCode: 200 })).status, 500, 'non-error statuses are ignored')
  t.alike([p.toErrorResponse(new Error('db exploded')).status, p.toErrorResponse(new Error('db exploded')).message], [500, 'Internal Server Error'], 'an unexpected error is a 500')
  t.is(p.toErrorResponse(Object.assign(new Error('x'), { statusCode: 499 })).message, 'Bad Request', 'unknown status text falls back')
  t.is(p.toErrorResponse(null).status, 500)
  t.is(p.toErrorResponse({ message: 5 }).code, p.ERR.REQUEST_FAILED)
})

test('protocolError carries status, code and optional detail', (t) => {
  const withDetail = p.protocolError(418, 'ERR_X', 'why')
  t.is(withDetail.message, 'ERR_X: why')
  t.is(withDetail.statusCode, 418)
  t.is(withDetail.code, 'ERR_X')
  t.is(p.protocolError(400, 'ERR_X').message, 'ERR_X')
})

test('fromErrorResponse rebuilds an Error with defaults', (t) => {
  const e = p.fromErrorResponse({ message: 'm', status: 404, code: 'ERR_A' })
  t.alike([e.message, e.statusCode, e.code], ['m', 404, 'ERR_A'])
  const onlyCode = p.fromErrorResponse({ code: 'ERR_B' })
  t.alike([onlyCode.message, onlyCode.statusCode, onlyCode.code], ['ERR_B', 400, 'ERR_B'])
  const empty = p.fromErrorResponse({})
  t.alike([empty.message, empty.statusCode, empty.code], ['Bad Request', 400, p.ERR.REQUEST_FAILED])
})

test('checkRequest accepts a valid envelope and names each defect', (t) => {
  t.is(p.checkRequest({ v: p.PROTOCOL_VERSION, routeId: 'a' }), null)
  for (const bad of [null, undefined, 'x']) t.is(p.checkRequest(bad).code, p.ERR.BAD_REQUEST)
  t.is(p.checkRequest({ v: 999, routeId: 'a' }).code, p.ERR.PROTOCOL_VERSION)
  t.is(p.checkRequest({ v: p.PROTOCOL_VERSION }).code, p.ERR.BAD_REQUEST)
  t.is(p.checkRequest({ v: p.PROTOCOL_VERSION, routeId: '' }).code, p.ERR.BAD_REQUEST)
})

test('a Kernel refusal of the app is a 403', (t) => {
  const err = new Error('ERR_KERNEL_ACTION_FORBIDDEN: app:demo may not list workers')
  t.alike(p.toErrorResponse(err), p.errorResponse(403, 'ERR_KERNEL_ACTION_FORBIDDEN', 'ERR_KERNEL_ACTION_FORBIDDEN: app:demo may not list workers'))
  t.is(p.toErrorResponse(Object.assign(new Error('ERR_KERNEL_ACTION_FORBIDDEN: x'), { statusCode: 451 })).status, 451, 'an explicit status still wins')
})
