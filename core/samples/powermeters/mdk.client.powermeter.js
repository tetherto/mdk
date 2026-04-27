'use strict'

const {
  startApi,
  initType,
  ABBTypes
} = require('../../index')
const srv = require('../../packages/powermeters/abb/mock/server')
const { setTimeout: sleep } = require('timers/promises')

const host = '127.0.0.1'
const port = 5020
const unitId = 0
let mock

async function run () {
  mock = srv.createServer({
    host,
    port,
    type: 'B23'
  })
  await sleep(500)

  const apiPort = 3000
  await startApi(apiPort)

  const b23 = await initType(ABBTypes.ABB_B23, 'rack-1')
  console.log('ABB Powermeter Type initialized')

  await b23.registerThing({
    info: {
      serialNum: 'B23-1'
    },
    opts: {
      address: host,
      port,
      unitId
    }
  })
}

run().catch((err) => {
  console.error(err)
  if (mock) {
    mock.stop()
  }
  process.exit(1)
})
