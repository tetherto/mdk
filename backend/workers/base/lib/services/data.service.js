'use strict'

const { v4: uuidv4 } = require('uuid')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')

class DataService {
  constructor ({
    thingsDb,
    getThings,
    getMem,
    getThingType,
    getThingTags,
    setupThing,
    registerThingHook0,
    updateThingHook0,
    reconnectThing,
    validateUpdateThing = () => {}
  }) {
    this.thingsDb = thingsDb
    this.getThings = getThings
    this.getMem = getMem
    this.getThingType = getThingType
    this.getThingTags = getThingTags
    this.setupThing = setupThing
    this.registerThingHook0 = registerThingHook0
    this.updateThingHook0 = updateThingHook0
    this.reconnectThing = reconnectThing
    this.validateUpdateThing = validateUpdateThing
  }

  _prepThingTags (thg, aux, thgPrev) {
    const parts = this.getThingType().split('-')
    parts.push('_')

    let tags = []

    for (let i = 1; i < parts.length; i++) {
      tags.push(`t-${parts.slice(0, -i).join('-')}`)
    }

    tags = tags.concat(this.getThingTags())

    if (aux) {
      if (!Array.isArray(aux)) {
        throw new Error('ERR_THING_TAGS_INVALID')
      }
      tags = tags.concat(aux)
    }

    if (Array.isArray(thgPrev?.tags)) {
      tags = tags.concat(thgPrev.tags)
    }

    tags.push(`id-${thg.id}`)
    tags.push(`code-${thg.code}`)

    tags = tags.filter(val => !val.includes('pos-') && !val.includes('container-'))
    if (thg.info?.pos) tags.push(`pos-${thg.info.pos}`)
    if (thg.info?.container) tags.push(`container-${thg.info.container}`)

    return gLibUtilBase.getArrayUniq(tags)
  }

  validateRegisterThing (data) {
    const things = this.getThings()
    if (data.id && things[data.id]) {
      throw new Error('ERR_THING_WITH_ID_ALREADY_EXISTS')
    }
    if (data.code && !(/-\d+$/.test(data.code))) {
      throw new Error('ERR_THING_CODE_INVALID')
    }
    if (data.code && Object.values(things).some(thg => thg.code === data.code)) {
      throw new Error('ERR_THING_WITH_CODE_ALREADY_EXISTS')
    }
  }

  generateId () {
    return uuidv4()
  }

  _getMaxThingCode () {
    const things = Object.values(this.getThings()).filter(thg => thg.code)
    return things.reduce((acc, cur) => {
      const code = parseInt(cur.code.split('-').pop(), 10) || 0
      return Math.max(acc, code)
    }, 0)
  }

  _generateThingCode (_, seed) {
    const prefix = this.getThingType().replace(/^[^-]+-/, '').toUpperCase()
    const last = this._getMaxThingCode()
    const nextCode = (seed ?? (last + 1)).toString().padStart(4, '0')
    return `${prefix}-${nextCode}`
  }

  async assignCodesToThings () {
    const things = Object.values(this.getThings()).filter(thg => !thg.code)
    const mem = this.getMem()

    if (things.length === 0) {
      mem.nextAvailableCode = this._generateThingCode()
      return
    }

    const last = this._getMaxThingCode()

    for (let i = 0; i < things.length; i++) {
      const thg = things[i]
      thg.code = this._generateThingCode(thg, last + i + 1)
      thg.tags.push(`code-${thg.code}`)
      await this._saveThingDataToDb(thg)
      this._saveThingDataToMem(thg)
      mem.nextAvailableCode = this._generateThingCode(thg, last + i + 2)
    }
  }

  async _storeThingDb (thg) {
    await this.thingsDb.put(thg.id, Buffer.from(JSON.stringify(thg)))
  }

  _saveThingDataToMem (thg) {
    const thgMem = this.getThings()[thg.id]
    if (!thgMem) return
    if (thg.opts) thgMem.opts = thg.opts
    if (thg.info) thgMem.info = thg.info
    if (thg.tags) thgMem.tags = thg.tags
    if (thg.code) thgMem.code = thg.code
    if (thg.comments) thgMem.comments = thg.comments
  }

  async _saveThingDataToDb (thg) {
    let thgDb = await this.thingsDb.get(thg.id)
    thgDb = JSON.parse(thgDb.value.toString())

    if (thg.opts) thgDb.opts = thg.opts
    if (thg.info) thgDb.info = thg.info
    if (thg.tags) thgDb.tags = thg.tags
    if (thg.code) thgDb.code = thg.code

    await this._storeThingDb(thgDb)
  }

  async _registerAndStoreThing (data) {
    const mem = this.getMem()
    data.id = data.id ?? this.generateId()
    const thgId = data.id
    const code = data.code ?? this._generateThingCode(data)
    const tags = this._prepThingTags({ ...data, code }, data.tags)

    const thg = {
      id: thgId,
      opts: data.opts,
      info: data.info,
      code,
      tags,
      comments: data.comments
    }

    await this.registerThingHook0(thg)

    await this._storeThingDb(thg)

    mem.nextAvailableCode = this._generateThingCode(thg)

    return thg
  }

  async registerThing (req) {
    this.validateRegisterThing(req)

    let info = {}
    if (req.info) {
      info = req.info
    }
    const comments = []

    const user = req.user
    const comment = req.comment
    if (comment && user) {
      comments.push({
        ts: Date.now(),
        comment,
        user
      })
    }

    const createdAt = Date.now()
    info = { ...info, createdAt, updatedAt: createdAt }
    const thg = await this._registerAndStoreThing({
      id: req.id,
      opts: req.opts,
      info,
      tags: req.tags,
      code: req.code,
      comments
    })
    await this.setupThing(thg)

    return 1
  }

  _validateThingExists (id) {
    if (!id || !this.getThings()[id]) {
      throw new Error('ERR_THING_NOTFOUND')
    }
  }

  checkThingExists (req) {
    if (!req?.thingId || !this.getThings()[req.thingId]) {
      throw new Error('ERR_THING_NOTFOUND')
    }
  }

  async updateThing (req) {
    this._validateThingExists(req.id)
    this.validateUpdateThing(req)

    let thg = await this.thingsDb.get(req.id)
    thg = JSON.parse(thg.value.toString())
    const thgPrev = { opts: { ...thg.opts }, info: { ...thg.info }, tags: [...thg.tags] }

    if (!thg.code) {
      thg.code = this._generateThingCode(thg)
    }

    if (req.opts) {
      thg.opts = req.forceOverwrite ? req.opts : { ...thg.opts, ...req.opts }
    }

    if (!Array.isArray(thg.comments)) {
      thg.comments = []
    }

    const user = req.user
    const comment = req.comment
    if (comment && user) {
      thg.comments.push({
        ts: Date.now(),
        comment,
        user
      })
    }

    if (req.info) {
      const lastActionId = req.actionId
      thg.info = req.forceOverwrite
        ? req.info
        : {
            ...thg.info,
            ...req.info,
            ...(lastActionId ? { lastActionId } : {})
          }
    }

    thg.tags = this._prepThingTags(thg, req.tags, thgPrev)
    const updatedAt = Date.now()
    thg.info = { ...thg.info, updatedAt }

    await this.updateThingHook0(thg, thgPrev)

    await this._storeThingDb(thg)

    this._saveThingDataToMem(thg)

    const mem = this.getMem()
    mem.nextAvailableCode = this._generateThingCode(thg)

    await this.reconnectThing(thg)

    return 1
  }

  async loadThing (req) {
    const raw = await this.thingsDb.get(req.thingId)
    return JSON.parse(raw.value.toString())
  }

  async saveThing (thg) {
    await this._storeThingDb(thg)
    this._saveThingDataToMem(thg)
  }

  async saveThingData (thg) {
    await this._saveThingDataToDb(thg)
    this._saveThingDataToMem(thg)
  }
}

module.exports = DataService
