'use strict'

const MDK_ROOT = 'tmp'
const MDK_STORE = 'store'
const KERNEL_CLUSTER = 'cluster-0'
const WRK_TYPES = {
  Kernel: 'wrk-kernel',
  GATEWAY: 'wrk-node-http'
}
const LIB_TYPES = {
  Kernel: 'core/kernel',
  GATEWAY: 'core/gateway',
  ANTMINER: 'workers/miners/antminer',
  AVALON: 'workers/miners/avalon',
  WHATSMINER: 'workers/miners/whatsminer',
  BITDEER: 'workers/containers/bitdeer',
  ANTSPACE: 'workers/containers/antspace',
  ABB: 'workers/power-meter/abb',
  SATEC: 'workers/power-meter/satec',
  SCHNEIDER: 'workers/power-meter/schneider',
  SENECA: 'workers/temperature',
  OCEAN_POOL: 'workers/minerpools/ocean',
  F2_POOL: 'workers/minerpools/f2pool'
}

module.exports = {
  WRK_TYPES,
  MDK_ROOT,
  MDK_STORE,
  KERNEL_CLUSTER,
  LIB_TYPES
}
