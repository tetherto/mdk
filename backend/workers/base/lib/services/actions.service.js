'use strict'

const async = require('async')

class ActionsService {
  constructor ({
    getThings,
    filterThings,
    invokeHandler,
    thingConf,
    debugThingError
  }) {
    this.getThings = getThings
    this.filterThings = filterThings
    this.invokeHandler = invokeHandler
    this.thingConf = thingConf
    this.debugThingError = debugThingError
  }

  async applyThings (req) {
    const method = req.method

    if (!method) {
      throw new Error('ERR_METHOD_INVALID')
    }

    const thgIds = this.filterThings(req)
    const things = this.getThings()
    const concurrency = this.thingConf.thingQueryConcurrency

    const res = await async.mapLimit(
      things,
      concurrency,
      async (thg, thgId) => {
        if (!thgIds.includes(thg.id)) {
          return 0
        }

        let done = 0

        try {
          await this.invokeHandler(req, thg)
          done = 1
        } catch (e) {
          this.debugThingError(thg, e)
        }

        return done
      }
    )

    return res.reduce((acc, e) => acc + e, 0)
  }

  async queryThing (req) {
    const things = this.getThings()
    const thg = things[req.id]

    if (!thg) {
      throw new Error('ERR_THING_NOTFOUND')
    }

    if (!thg.ctrl) {
      throw new Error('ERR_THING_NOT_INITIALIZED')
    }

    if (!thg.ctrl[req.method]) {
      throw new Error('ERR_THING_METHOD_NOTFOUND')
    }

    const res = await thg.ctrl[req.method](...req.params)
    return res
  }
}

module.exports = ActionsService
