'use strict'

const test = require('brittle')
const fastify = require('fastify')
const routes = require('../../routes')

async function makeApp (things) {
  const app = fastify()
  app.addHook('onRequest', (req, _, next) => {
    req.ctx = { things }
    next()
  })
  for (const [path, methods] of Object.entries(routes)) {
    for (const [method, handler] of Object.entries(methods)) {
      app[method](path, handler)
    }
  }
  await app.ready()
  return app
}

test('GET /things returns all things when q is empty object', async (t) => {
  const things = [
    { mockId: 'm1', state: { a: 1 } },
    { mockId: 'm2', state: { b: 2 } }
  ]
  const app = await makeApp(things)
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'GET',
    url: '/things?q=%7B%7D'
  })
  t.is(res.statusCode, 200)
  const body = JSON.parse(res.body)
  t.is(body.length, 2)
})

test('GET /things filters with mingo query', async (t) => {
  const things = [
    { mockId: 'm1', kind: 'a' },
    { mockId: 'm2', kind: 'b' }
  ]
  const app = await makeApp(things)
  t.teardown(() => app.close())

  const q = encodeURIComponent(JSON.stringify({ kind: 'b' }))
  const res = await app.inject({
    method: 'GET',
    url: `/things?q=${q}`
  })
  t.is(res.statusCode, 200)
  const body = JSON.parse(res.body)
  t.is(body.length, 1)
  t.is(body[0].mockId, 'm2')
})

test('POST /thing/:id merges state and calls start when not offline', async (t) => {
  let started = false
  let stopped = false
  const things = [{
    mockId: 'mx',
    state: { x: 0 },
    stop () { stopped = true },
    start () { started = true },
    reset () {
      return { x: -1 }
    }
  }]
  const app = await makeApp(things)
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/thing/mx',
    payload: { state: { x: 42 } }
  })
  t.is(res.statusCode, 200)
  t.ok(started)
  t.ok(!stopped)
  t.is(things[0].state.x, 42)
  t.is(JSON.parse(res.body).ok, true)
})

test('POST /thing/:id with offline calls stop', async (t) => {
  let stopped = false
  const things = [{
    mockId: 'off',
    state: {},
    stop () { stopped = true },
    start () {},
    reset () {
      return {}
    }
  }]
  const app = await makeApp(things)
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/thing/off',
    payload: { offline: true }
  })
  t.is(res.statusCode, 200)
  t.ok(stopped)
})

test('POST /thing/:id JSON string body is accepted', async (t) => {
  const things = [{
    mockId: 'raw',
    state: { n: 1 },
    stop () {},
    start () {},
    reset () {
      return {}
    }
  }]
  const app = await makeApp(things)
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/thing/raw',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ state: { n: 99 } })
  })
  t.is(res.statusCode, 200)
  t.is(things[0].state.n, 99)
})

test('POST /thing/:id 404 when id unknown', async (t) => {
  const app = await makeApp([])
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/thing/missing',
    payload: { state: {} }
  })
  t.is(res.statusCode, 404)
  t.is(JSON.parse(res.body).error, 'thing not found')
})

test('POST /thing/:id/reset replaces state from reset()', async (t) => {
  const things = [{
    mockId: 'r1',
    state: { x: 5 },
    stop () {},
    start () {},
    reset () {
      return { x: 0, fresh: true }
    }
  }]
  const app = await makeApp(things)
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/thing/r1/reset'
  })
  t.is(res.statusCode, 200)
  t.is(things[0].state.x, 0)
  t.is(things[0].state.fresh, true)
})

test('POST /thing/:id/reset finds device by id', async (t) => {
  const things = [{
    id: 'logical',
    mockId: 'm99',
    state: { a: 1 },
    stop () {},
    start () {},
    reset () {
      return { a: 2 }
    }
  }]
  const app = await makeApp(things)
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/thing/logical/reset'
  })
  t.is(res.statusCode, 200)
  t.is(things[0].state.a, 2)
})

test('POST /thing/:id/reset 404 when not found', async (t) => {
  const app = await makeApp([])
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/thing/nope/reset'
  })
  t.is(res.statusCode, 404)
})
