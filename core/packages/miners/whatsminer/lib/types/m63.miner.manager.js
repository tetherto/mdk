'use strict'

const WhatsminerManager = require('../whatsminer.manager')
const async = require('async')

class WhatsminerManagerM63 extends WhatsminerManager {
  getThingType () {
    return super.getThingType() + '-m63'
  }

  getSpecTags () {
    return super.getSpecTags().concat([this.getThingType()])
  }

  _start (cb) {
    async.series([
      (next) => { super._start(next) },
      (next) => {
        this._addWhitelistedActions([
          ['setUpfreqSpeed', 2]
        ])

        next()
      }
    ], cb)
  }
}

module.exports = WhatsminerManagerM63
