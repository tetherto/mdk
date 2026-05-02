'use strict'

const MDK_ROOT = 'tmp'
const MDK_STORE = 'store'
const ORK_CLUSTER = 'cluster-0'
const WRK_TYPES = {
  ORK: 'wrk-ork-proc-aggr',
  APP_NODE: 'wrk-node-http'
}
const LIB_TYPES = {
  ORK: 'mdk/ork',
  APP_NODE: 'mdk/app-node',
  ANTMINER: 'miner-antminer',
  AVALON: 'miner-avalon',
  WHATSMINER: 'miner-whatsminer',
  BITDEER: 'container-bitdeer',
  MICROBT: 'container-microbt',
  ANTSPACE: 'container-antspace',
  ABB: 'powermeter-abb',
  SATEC: 'powermeter-satec',
  SCHNEIDER: 'powermeter-schneider',
  SENECA: 'sensor-seneca',
  OCEAN_POOL: 'minerpool-ocean',
  F2_POOL: 'minerpool-f2pool'
}

module.exports = {
  WRK_TYPES,
  MDK_ROOT,
  MDK_STORE,
  ORK_CLUSTER,
  LIB_TYPES
}
