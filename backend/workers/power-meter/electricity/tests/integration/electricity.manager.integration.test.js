'use strict'

const test = require('brittle')
const ElectricityManager = require('../../lib/electricity.manager.js')

function mockFacs () {
  const mk = () => ({
    start (cb) {
      cb()
    },
    stop (cb) {
      cb()
    },
    getBee: async () => ({
      ready: async () => {},
      sub: () => ({})
    })
  })
  return {
    store_s1: mk(),
    scheduler_0: mk(),
    http_0: mk()
  }
}

test('init wires store bee and settings; stop completes', async (t) => {
  const facs = mockFacs()
  let getBeeCalls = 0
  const origGetBee = facs.store_s1.getBee
  facs.store_s1.getBee = async (...args) => {
    getBeeCalls++
    return origGetBee(...args)
  }

  const m = new ElectricityManager(
    { wtype: 'w', baseUrl: 'http://test' },
    { rack: 'rack-1', facs }
  )

  await m.init('electricity')
  t.is(getBeeCalls, 1)
  t.ok(m.settings)

  await new Promise((resolve, reject) => {
    m.stop((err) => (err ? reject(err) : resolve()))
  })
  t.pass('stop completed')
})

test('init is idempotent', async (t) => {
  const facs = mockFacs()
  let getBeeCalls = 0
  const origGetBee = facs.store_s1.getBee
  facs.store_s1.getBee = async (...args) => {
    getBeeCalls++
    return origGetBee(...args)
  }

  const m = new ElectricityManager(
    { wtype: 'w', baseUrl: 'http://test' },
    { rack: 'rack-2', facs }
  )

  await m.init('electricity')
  await m.init('electricity')
  t.is(getBeeCalls, 1)
  await new Promise((resolve, reject) => {
    m.stop((err) => (err ? reject(err) : resolve()))
  })
})
