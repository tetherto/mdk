'use strict'

const SPECS = {}

const CONF = {
  skipTagPrefixes: ['id-', 'code-']
}

SPECS.default = {
  ops: {
    alerts_cnt: {
      op: 'alerts_group_cnt',
      src: 'last.alerts'
    }
  }
}

module.exports = {
  conf: CONF,
  specs: SPECS
}
