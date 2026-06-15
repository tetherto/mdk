'use strict'

const WhatsminerManager = require('../whatsminer.manager')

class WhatsminerManagerM30sp extends WhatsminerManager {
  getThingType () {
    return super.getThingType() + '-m30sp'
  }
}

module.exports = WhatsminerManagerM30sp
