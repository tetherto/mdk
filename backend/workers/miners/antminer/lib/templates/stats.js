'use strict'

const { templates } = require('../../../../../core/mdk')

const { minerConf, specs: baseSpecs } = templates.stats

module.exports = {
  conf: minerConf,
  specs: {
    ...baseSpecs,
    miner: baseSpecs.miner_default
  }
}
