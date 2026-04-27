'use strict'

const WMTypes = require('./packages/miners/whatsminer')
const AMTypes = require('./packages/miners/antminer')
const AVTypes = require('./packages/miners/avalon')
const MBTTypes = require('./packages/containers/microbt')
const BDTypes = require('./packages/containers/bitdeer')
const ASTypes = require('./packages/containers/antspace')
const ABBTypes = require('./packages/powermeters/abb')
const SatecTypes = require('./packages/powermeters/satec')
const SchneiderTypes = require('./packages/powermeters/schneider')
const SencaTypes = require('./packages/sensors/seneca')
const core = require('./lib/mdk')

core.initialize()

module.exports = {
  startApi: core.startApi,
  initType: core.initType,
  WMTypes,
  AMTypes,
  AVTypes,
  ASTypes,
  BDTypes,
  MBTTypes,
  ABBTypes,
  SatecTypes,
  SchneiderTypes,
  SencaTypes
}
