'use strict'

const {
  startApi,
  initType,
  ASTypes
} = require('../../index')
const mock = require('../utils/mock')
const srv = require('../../packages/containers/antspace/mock/server')
const { setTimeout: sleep } = require('timers/promises')

const CONTAINER_ID = 'hk-1'
const RACK = 'shelf-1'
const host = '127.0.0.1'
const port = 8000

const startClient = async () => {
  // start API server (optional)
  await startApi()

  await mock.run(srv, host, port, CONTAINER_ID)
  await sleep(500)

  const asHK3 = await initType(ASTypes.AS_HK3, RACK)
  console.log('D40 M56 Container Type initialized')

  await asHK3.registerThing({
    info: {
      container: CONTAINER_ID,
      serialNum: 'AS001'
    },
    opts: {
      address: host,
      port
    }
  })
}

startClient().catch((err) => {
  console.error(err)
  process.exit(1)
})
