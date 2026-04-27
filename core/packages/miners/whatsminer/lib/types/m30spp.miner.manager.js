'use strict'

const WhatsminerManager = require('../whatsminer.manager')

class WhatsminerManagerM30spp extends WhatsminerManager {
  getThingType () {
    return super.getThingType() + '-m30spp'
  }
}

module.exports = WhatsminerManagerM30spp
