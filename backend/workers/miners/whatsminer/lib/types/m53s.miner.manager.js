'use strict'

const WhatsminerManager = require('../whatsminer.manager')

class WhatsminerManagerM53s extends WhatsminerManager {
  getThingType () {
    return super.getThingType() + '-m53s'
  }
}

module.exports = WhatsminerManagerM53s
