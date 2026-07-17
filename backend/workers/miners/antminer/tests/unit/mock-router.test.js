'use strict'

const test = require('brittle')
const baseRouter = require('../../mock/routers/base')
const createState = require('../../mock/initial_states/default')
const { md5, getMinerType } = require('../../mock/lib')

function loadRoutes () {
  const routes = {}
  const fastify = {
    get: (path, handler) => { routes[`GET ${path}`] = handler },
    post: (path, handler) => { routes[`POST ${path}`] = handler }
  }
  baseRouter(fastify)
  return routes
}

function call (handler, req) {
  let sent
  handler(req, { send: (data) => { sent = data } })
  return sent
}

function newReq (overrides = {}) {
  const ctx = { type: 'S21', host: '127.0.0.1', password: 'root', error: false, ...overrides.ctx }
  const { state } = createState(ctx)
  return { ctx, state, body: overrides.body, json: overrides.json }
}

test('get_system_info reports miner type and network fields', (t) => {
  const routes = loadRoutes()
  const req = newReq()
  const out = call(routes['GET /cgi-bin/get_system_info.cgi'], req)
  t.is(out.minertype, 'Antminer S21')
  t.is(out.macaddr, req.state.network.macaddr)
  t.is(out.ipaddress, '127.0.0.1')
})

test('stats and summary return empty arrays in sleep mode', (t) => {
  const routes = loadRoutes()
  const req = newReq()
  req.state.conf['bitmain-work-mode'] = '1'
  t.alike(call(routes['GET /cgi-bin/stats.cgi'], req).STATS, [])
  t.alike(call(routes['GET /cgi-bin/summary.cgi'], req).SUMMARY, [])
})

test('blink toggles led state and reports failures', (t) => {
  const routes = loadRoutes()
  const req = newReq({ body: { blink: 1 } })
  t.alike(call(routes['POST /cgi-bin/blink.cgi'], req), { code: 'B000' })
  t.is(req.state.led, true)

  const broken = { state: null, body: { blink: 1 } }
  t.alike(call(routes['POST /cgi-bin/blink.cgi'], broken), { code: 'B001' })
})

test('set_miner_conf applies pools, fan pwm and work mode', (t) => {
  const routes = loadRoutes()
  const req = newReq({
    body: {
      pools: [
        { url: 'stratum+tcp://p1:3333', user: 'w1', pass: 'x' },
        { url: 'stratum+tcp://p2:3333', user: 'w2', pass: 'x' },
        { url: 'stratum+tcp://p3:3333', user: 'w3', pass: 'x' }
      ],
      'bitmain-fan-pwm': 90,
      'miner-mode': 1
    }
  })
  const out = call(routes['POST /cgi-bin/set_miner_conf.cgi'], req)
  t.is(out, undefined)
  t.is(req.state.pools[0].url, 'stratum+tcp://p1:3333')
  t.is(req.state.pools[2].user, 'w3')
  t.is(req.state.conf['bitmain-fan-pwm'], '90')
  t.is(req.state.conf['bitmain-work-mode'], '1')
})

test('set_miner_conf rejects invalid pool payloads', (t) => {
  const routes = loadRoutes()
  const req = newReq({ body: {} })
  const out = call(routes['POST /cgi-bin/set_miner_conf.cgi'], req)
  t.alike(out, { stats: 'error', code: 'M001', msg: 'Invalid pool!' })
})

test('set_network_conf switches to DHCP for ipPro 1', (t) => {
  const routes = loadRoutes()
  const req = newReq({ body: { ipPro: 1 } })
  const out = call(routes['POST /cgi-bin/set_network_conf.cgi'], req)
  t.is(out.code, 'N000')
  t.is(req.state.network.nettype, 'DHCP')
  t.is(req.state.network.conf_ipaddress, '')
})

test('set_network_conf applies static config for ipPro 2', (t) => {
  const routes = loadRoutes()
  const req = newReq({
    body: {
      ipPro: 2,
      ipHost: 'am1',
      ipAddress: '10.0.0.2',
      ipSub: '255.255.255.0',
      ipGateway: '10.0.0.1',
      ipDns: '1.1.1.1'
    }
  })
  const out = call(routes['POST /cgi-bin/set_network_conf.cgi'], req)
  t.is(out.code, 'N000')
  t.is(req.state.network.nettype, 'Static')
  t.is(req.state.network.conf_gateway, '10.0.0.1')
})

test('set_network_conf rejects unknown ipPro values', (t) => {
  const routes = loadRoutes()
  const req = newReq({ body: { ipPro: 9 } })
  const out = call(routes['POST /cgi-bin/set_network_conf.cgi'], req)
  t.alike(out, { stats: 'error', code: 'N001', msg: 'Invalid network!' })
})

test('passwd updates ctx password on matching confirmation', (t) => {
  const routes = loadRoutes()
  const req = newReq({ json: { curPwd: 'root', newPwd: 'next', confirmPwd: 'next' } })
  const out = call(routes['POST /cgi-bin/passwd.cgi'], req)
  t.is(out.code, 'P000')
  t.is(req.ctx.password, 'next')
})

test('passwd rejects mismatched confirmation and wrong current password', (t) => {
  const routes = loadRoutes()
  const mismatch = newReq({ json: { curPwd: 'root', newPwd: 'a', confirmPwd: 'b' } })
  t.is(call(routes['POST /cgi-bin/passwd.cgi'], mismatch).code, 'P002')
  const wrong = newReq({ json: { curPwd: 'nope', newPwd: 'a', confirmPwd: 'a' } })
  t.is(call(routes['POST /cgi-bin/passwd.cgi'], wrong).code, 'P001')
})

test('reboot responds with current led state', (t) => {
  const routes = loadRoutes()
  const req = newReq()
  req.state.led = true
  t.alike(call(routes['GET /cgi-bin/reboot.cgi'], req), { blink: true })
})

test('warning reflects ctx error flag', (t) => {
  const routes = loadRoutes()
  const errored = newReq({ ctx: { error: true } })
  t.is(call(routes['GET /warning'], errored).error_message, 'P:2')
  const clean = newReq()
  t.is(call(routes['GET /warning'], clean).error_message, 'None')
})

test('md5 hashes input to hex digest', (t) => {
  t.is(md5('abc'), '900150983cd24fb0d6963f7d28e17f72')
})

test('getMinerType maps known and unknown types', (t) => {
  t.is(getMinerType('S19xp_h'), 'Antminer S19 XP Hyd.')
  t.is(getMinerType('unknown'), undefined)
})
