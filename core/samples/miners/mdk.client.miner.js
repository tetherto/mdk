'use strict'

const {
  startApi,
  initType,
  WMTypes
} = require('../../index')

const startClient = async () => {
  // start API server (optional)
  await startApi()

  // Initialize and register WM56S miner
  const wm56s = await initType(WMTypes.WM_M56S, 'rack-4')
  console.log('WM56 Miner Type initialized')
  await wm56s.registerThing({
    info: {
      container: 'bitdeer-1',
      serialNum: 'WM001'
    },
    opts: {
      address: '127.0.0.1',
      port: 4028,
      password: 'admin'
    }
  })
}

startClient().catch((err) => {
  console.error(err)
  process.exit(1)
})
