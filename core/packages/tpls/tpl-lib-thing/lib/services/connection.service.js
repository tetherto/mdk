'use strict'

const utilsStore = require('hp-svc-facs-store/utils')
const { getJsonChanges } = require('../utils')

class ConnectionService {
  constructor ({
    thingsDb,
    getThings,
    getBeeTimeLog,
    releaseBeeTimeLog,
    filterThings,
    assignCodesToThings,
    connectThing = async () => {},
    disconnectThing = async (thg) => {
      if (typeof thg.ctrl?.close === 'function') {
        thg.ctrl.close()
      }
    },
    releaseIpThing = async () => {},
    registerThingHook0 = async () => {},
    updateThingHook0 = null,
    forgetThingHook0 = async () => {},
    setupThingHook0 = async () => {},
    setupThingHook1 = async () => {},
    getThingType,
    debug,
    debugError
  }) {
    this.thingsDb = thingsDb
    this.getThings = getThings
    this.getBeeTimeLog = getBeeTimeLog
    this.releaseBeeTimeLog = releaseBeeTimeLog
    this.filterThings = filterThings
    this.assignCodesToThings = assignCodesToThings
    this.connectThing = connectThing
    this.disconnectThing = disconnectThing
    this.releaseIpThing = releaseIpThing
    this.registerThingHook0 = registerThingHook0
    this._updateThingHook0Impl = updateThingHook0
    this.forgetThingHook0 = forgetThingHook0
    this.setupThingHook0 = setupThingHook0
    this.setupThingHook1 = setupThingHook1
    this.getThingType = getThingType
    this.debug = debug
    this.debugError = debugError
  }

  async _getInfoHistoryLog () {
    return await this.getBeeTimeLog('thing-history-log', 0, true)
  }

  async _storeInfoChangesToDb (thgPrev, thg) {
    const log = await this._getInfoHistoryLog()
    try {
      const now = Date.now()
      const existingEntry = await log.get(utilsStore.convIntToBin(now))
      const existingInfoHistory =
        existingEntry?.value
          ? JSON.parse(existingEntry.value.toString())
          : []
      const updatedInfoHistory = [
        ...existingInfoHistory,
        {
          ts: now,
          changes: getJsonChanges(thgPrev.info, thg.info),
          id: thg.id
        }
      ]
      await log.put(
        utilsStore.convIntToBin(now),
        Buffer.from(JSON.stringify(updatedInfoHistory))
      )
    } catch (e) {
      this.debugError('ERR_THING_SAVE_INFO_HISTORY', e)
    }
    await this.releaseBeeTimeLog(log)
  }

  async updateThingHook0 (thg, thgPrev) {
    if (this._updateThingHook0Impl) {
      return this._updateThingHook0Impl(thg, thgPrev)
    }
    if (!thg || !thgPrev) return
    try {
      await this._storeInfoChangesToDb(thgPrev, thg)
    } catch (error) {
      this.debugError('ERR_UPDATE_THING_STORE_INFO_CHANGES_TO_DB_FAILED')
    }
  }

  async setupThing (base) {
    const things = this.getThings()
    const thgId = base.id

    if (things[thgId]) {
      return 0
    }

    const thg = {
      id: thgId,
      type: this.getThingType(),
      code: base.code,
      tags: base.tags,
      opts: base.opts,
      info: base.info,
      comments: base.comments,
      last: {},
      ctrl: null
    }

    await this.setupThingHook0(thg)

    if (!thg.ctrl) {
      await this.connectThing(thg)
    }

    const log = await this.getBeeTimeLog(`thing-5m-${thgId}`, 0, true)

    try {
      let last = await log.peek({ reverse: true, limit: 1 })
      if (last) {
        last = JSON.parse(last.value.toString())
        thg.last = last
        await this.setupThingHook1(thg)
      }
    } catch (e) {
      this.debugError(null, e)
    }

    await this.releaseBeeTimeLog(log)

    things[thgId] = thg

    return 1
  }

  async setupThings () {
    const things = this.getThings()
    const valid = {}

    const streamThings = this.thingsDb.createReadStream()

    for await (const data of streamThings) {
      const entry = JSON.parse(data.value.toString())
      try {
        valid[entry.id] = true
        await this.setupThing(entry)
      } catch (e) {
        this.debugError(`ERR_SETUP_THING ${entry.id}`, e)
      }
    }

    const thgIds = Object.keys(things)

    for (const thgId of thgIds) {
      if (valid[thgId]) {
        continue
      }

      await this._forgetThing(thgId)
    }

    try {
      await this.assignCodesToThings()
    } catch (e) {
      this.debugError('ERR_ASSIGN_CODES_THINGS', e)
    }

    this.debug('things setup finished')

    return 1
  }

  async _forgetThing (thgId) {
    const things = this.getThings()
    const thg = things[thgId]

    if (thg?.ctrl) {
      try {
        await thg.ctrl.close()
      } catch (e) { }
    }

    try {
      await this.releaseIpThing(thg)
    } catch (e) { }
    try {
      await this.disconnectThing(thg)
    } catch (e) { }
    try {
      await this.forgetThingHook0(thg)
    } catch (e) { }

    await this.thingsDb.del(thgId)
    delete things[thgId]

    return 1
  }

  async forgetThings (req) {
    if (!req.query) {
      req.query = { id: { $in: [] } }
    }

    if (req.all) {
      req.query = { id: { $exists: true } }
    }

    const thgIds = this.filterThings(req)
    const things = this.getThings()

    for (const thgId of thgIds) {
      if (!things[thgId]) {
        if (Object.keys(things).includes(thgId)) {
          delete things[thgId]
        }
        continue
      }

      await this._forgetThing(thgId)
    }

    return 1
  }

  async reconnectThing (thg) {
    if (thg.ctrl) {
      await this.disconnectThing(thg)
    }
    await this.connectThing(thg)
  }
}

module.exports = ConnectionService
