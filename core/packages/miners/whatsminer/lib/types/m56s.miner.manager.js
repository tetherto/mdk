'use strict'

const WhatsminerManager = require('../whatsminer.manager')

class WhatsminerManagerM56s extends WhatsminerManager {
  getThingType () {
    return super.getThingType() + '-m56s'
  }
}

module.exports = WhatsminerManagerM56s
