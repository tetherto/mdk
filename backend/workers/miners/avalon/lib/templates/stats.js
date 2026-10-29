'use strict'

const { templates } = require('@tetherto/mdk-core')

const { minerConf, specs: baseSpecs } = templates.stats

module.exports = {
  conf: minerConf,
  specs: {
    ...baseSpecs,
    miner: baseSpecs.miner_default
  }
}
