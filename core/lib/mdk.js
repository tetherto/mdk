'use strict'

const worker = require('@bitfinex/bfx-svc-boot-js/lib/worker')
const OrkBase = require('../packages/mdk/ork/workers/aggr.proc.ork.wrk')
const { WRK_TYPES, ORK_CLUSTER, MDK_ROOT, MDK_STORE } = require('./utils/constants')
const { createFacs } = require('./utils')
const path = require('path')
const initialize = require('./utils/initialize')

const coreRoot = path.join(__dirname, '..')
const baseDir = path.join(coreRoot, MDK_ROOT)
const storeDir = path.join(baseDir, MDK_STORE)
let ork

const startApi = async (port = 3000) => {
  // initialize Ork
  ork = new OrkBase({}, {
    cluster: ORK_CLUSTER,
    root: baseDir,
    wtype: WRK_TYPES.ORK,
    isRpcMode: false
  })
  const facs = await createFacs(storeDir)
  ork.setFacs(facs)

  // start app-node
  worker({
    wtype: WRK_TYPES.APP_NODE,
    serviceRoot: baseDir,
    port,
    isRpcMode: false,
    ork
  })
}

const registerRack = async (rack, lib) => {
  if (!ork) return
  return ork.registerRack({
    id: `${lib.getThingType()}-${rack}`,
    type: lib.getThingType(),
    libInstance: lib
  })
}

const initType = async (TypeClass, rack) => {
  const typeBaseDir = path.join(baseDir, 'types', TypeClass.name)
  const ctx = { rack, storeDir: path.join(typeBaseDir, MDK_STORE), root: typeBaseDir }
  const instance = new TypeClass({}, ctx)
  await instance.init()
  instance.active = 1
  await registerRack(rack, instance)
  return instance
}

module.exports = {
  initType,
  startApi,
  initialize
}
