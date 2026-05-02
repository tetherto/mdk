'use strict'

const {
  startApi,
  initType,
  SencaTypes
} = require('../../index')
const srv = require('../../packages/sensors/seneca/mock/server')
const { setTimeout: sleep } = require('timers/promises')

const host = '127.0.0.1'
const port = 5030
const unitId = 0
const register = 3
let mock

async function run () {
  mock = srv.createServer({
    host,
    port,
    type: 'seneca'
  })
  await sleep(500)

  const apiPort = 3000
  await startApi(apiPort)

  const seneca = await initType(SencaTypes.SENECA, 'rack-1')
  console.log('Seneca temperature sensor type initialized')

  await seneca.registerThing({
    info: {
      serialNum: 'SEN-001'
    },
    opts: {
      address: host,
      port,
      unitId,
      register
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
