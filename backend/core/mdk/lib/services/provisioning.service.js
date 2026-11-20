'use strict'

const debug = require('debug')('mdk:provisioning')
const { v4: uuidv4 } = require('uuid')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')
const utilsStore = require('@tetherto/hp-svc-facs-store/utils')
const { applyFilters, getJsonChanges, redactSecrets, stripRedacted, isSecretKey } = require('../utils')
const { validateAddress, validatePort } = require('../address-policy')

// Drops every secret-named key (deep) — used when a device is repointed to a
// new address so the stored credentials are not sent to the new host.
function omitSecrets (value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(omitSecrets)
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (isSecretKey(k)) continue
    out[k] = omitSecrets(v)
  }
  return out
}

// info.container / info.pos become stats group keys (groupBy('info.container'))
// and `container-*` / `pos-*` tags, so they are kept to short labels. The
// prototype-reaching names are refused even though the stats ops skip them.
const INFO_LABEL_MAX_LENGTH = 64
const INFO_LABEL_RE = /^[A-Za-z0-9][A-Za-z0-9 _.:#-]*$/
const INFO_LABEL_FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])

function validateInfoLabel (value, code) {
  if (value === undefined || value === null || value === '') return
  if (
    typeof value !== 'string' ||
    value.length > INFO_LABEL_MAX_LENGTH ||
    !INFO_LABEL_RE.test(value) ||
    INFO_LABEL_FORBIDDEN.has(value)
  ) {
    throw new Error(code)
  }
}

// Caller-supplied tags become stats group keys and each gets its own time-log
// store per stats interval, so they get the same label rules and a count cap.
const MAX_AUX_TAGS = 32

function validateAuxTags (tags) {
  if (!Array.isArray(tags) || tags.length > MAX_AUX_TAGS) {
    throw new Error('ERR_THING_TAGS_INVALID')
  }
  for (const tag of tags) {
    if (typeof tag !== 'string' || tag === '') throw new Error('ERR_THING_TAGS_INVALID')
    validateInfoLabel(tag, 'ERR_THING_TAGS_INVALID')
  }
}

function validateInfo (info) {
  if (info === undefined || info === null) return
  if (typeof info !== 'object' || Array.isArray(info)) {
    throw new Error('ERR_THING_INFO_INVALID')
  }
  validateInfoLabel(info.container, 'ERR_THING_INFO_CONTAINER_INVALID')
  validateInfoLabel(info.pos, 'ERR_THING_INFO_POS_INVALID')
}

/**
 * Persisted device configs for a runtime-hosted worker. Replaces the
 * registerThing/updateThing/forgetThings provisioning path of the manager
 * stack: writes go to the injected bee; the boot script builds the runtime's
 * fixed `devices` array from buildRuntimeDevices(). Changing the device set
 * is a persisted-config change + process restart — this service never touches
 * live connections.
 *
 * Record shape (kept compatible with the legacy thing record so comments,
 * tailLog transforms and stats tags keep working):
 *   { id, type, opts, info, code, tags, comments }
 *
 * Caller-facing reads (getThingConf, getDeviceMeta, listDevices) return
 * redacted copies: secret fields (password, apiKey, token, pools[].pass, ...)
 * read as '[REDACTED]', and list filters run over that redacted projection.
 * Remote writes validate opts.address/opts.port (see lib/address-policy.js);
 * conf.allowedAddressCidrs is the operator allowlist that replaces the
 * default loopback/link-local/metadata blocklist. Changing a device's address
 * drops its stored credentials unless the update supplies new ones.
 */
class DeviceProvisioningService {
  constructor ({ db, logs = null, deviceType, deviceTags = [], conf = {}, lookup = null }) {
    if (!db) throw new Error('ERR_PROVISIONING_DB_REQUIRED')
    if (!deviceType || typeof deviceType !== 'string') throw new Error('ERR_PROVISIONING_DEVICE_TYPE_REQUIRED')
    this.db = db
    this.logs = logs
    this.deviceType = deviceType
    this.deviceTags = deviceTags
    this.conf = conf
    this._lookup = lookup
    this._devices = {}
    this._initialized = false
  }

  async init () {
    if (this._initialized) return
    const stream = this.db.createReadStream()
    for await (const data of stream) {
      const entry = JSON.parse(data.value.toString())
      this._devices[entry.id] = entry
    }
    this._initialized = true
    debug('loaded %d device records (type %s)', Object.keys(this._devices).length, this.deviceType)
  }

  generateId () {
    return uuidv4()
  }

  getDevice (id) {
    return this._devices[id]
  }

  listDeviceIds () {
    return Object.keys(this._devices)
  }

  _redactedDevices () {
    return Object.values(this._devices).map((dev) => redactSecrets(dev))
  }

  listDevices (req = {}) {
    return applyFilters(this._redactedDevices(), req, true)
  }

  getDeviceMeta (id) {
    const dev = this._devices[id]
    if (!dev) return null
    return redactSecrets(gLibUtilBase.pick(dev, ['id', 'tags', 'info', 'opts', 'type', 'code']))
  }

  buildRuntimeDevices () {
    return Object.values(this._devices).map((dev) => ({
      deviceId: dev.id,
      config: { ...dev.opts, type: dev.type },
      info: { ...dev.info }
    }))
  }

  getThingConf (query = {}) {
    if (query.requestType === 'poolConfig') return redactSecrets(this.conf.pools)
    const dev = query.thingId ? this._devices[query.thingId] : null
    return dev ? redactSecrets(gLibUtilBase.pick(dev, ['id', 'type', 'opts', 'info', 'code', 'tags', 'comments'])) : null
  }

  // Remote-write validation of the dialable part of opts. Throws
  // ERR_THING_ADDRESS_* / ERR_THING_PORT_INVALID.
  async _validateOptsTarget (opts) {
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
      throw new Error('ERR_THING_VALIDATE_OPTS_INVALID')
    }
    if (opts.address !== undefined) {
      await validateAddress(opts.address, {
        allowedCidrs: this.conf.allowedAddressCidrs,
        ...(this._lookup ? { lookup: this._lookup } : {})
      })
    }
    if (opts.port !== undefined) opts.port = validatePort(opts.port)
  }

  _prepDeviceTags (dev, aux, devPrev) {
    const parts = this.deviceType.split('-')
    parts.push('_')

    let tags = []

    for (let i = 1; i < parts.length; i++) {
      tags.push(`t-${parts.slice(0, -i).join('-')}`)
    }

    tags = tags.concat(this.deviceTags)

    if (aux) {
      validateAuxTags(aux)
      tags = tags.concat(aux)
    }

    if (Array.isArray(devPrev?.tags)) {
      tags = tags.concat(devPrev.tags)
    }

    tags.push(`id-${dev.id}`)
    tags.push(`code-${dev.code}`)

    tags = tags.filter(val => !val.includes('pos-') && !val.includes('container-'))
    if (dev.info?.pos) tags.push(`pos-${dev.info.pos}`)
    if (dev.info?.container) tags.push(`container-${dev.info.container}`)

    return gLibUtilBase.getArrayUniq(tags)
  }

  _getMaxDeviceCode () {
    const devices = Object.values(this._devices).filter(dev => dev.code)
    return devices.reduce((acc, cur) => {
      const code = parseInt(cur.code.split('-').pop(), 10) || 0
      return Math.max(acc, code)
    }, 0)
  }

  _generateDeviceCode (seed) {
    const prefix = this.deviceType.replace(/^[^-]+-/, '').toUpperCase()
    const last = this._getMaxDeviceCode()
    const nextCode = (seed ?? (last + 1)).toString().padStart(4, '0')
    return `${prefix}-${nextCode}`
  }

  validateRegisterThing (data) {
    if (data.id && this._devices[data.id]) {
      throw new Error('ERR_THING_WITH_ID_ALREADY_EXISTS')
    }
    if (data.code && !(/-\d+$/.test(data.code))) {
      throw new Error('ERR_THING_CODE_INVALID')
    }
    if (data.code && Object.values(this._devices).some(dev => dev.code === data.code)) {
      throw new Error('ERR_THING_WITH_CODE_ALREADY_EXISTS')
    }
    if (!data.opts) {
      throw new Error('ERR_THING_VALIDATE_OPTS_INVALID')
    }
    validateInfo(data.info)
    this._validateDeviceDataChange(data)
  }

  _validateDeviceDataChange (data) {
    for (const k in this._devices) {
      const t = this._devices[k]
      if (t.id === data.id) continue
      if (t.info?.serialNum && t.info.serialNum === data.info?.serialNum) {
        throw new Error('ERR_THING_SERIALNUM_EXISTS')
      }
      if (t.info?.macAddress && t.info.macAddress.toLowerCase() === data.info?.macAddress?.toLowerCase()) {
        throw new Error('ERR_THING_MACADDRESS_EXISTS')
      }
      if (t.info?.pos && t.info.pos === data.info?.pos && t.info?.container && t.info.container === data.info?.container) {
        throw new Error('ERR_THING_POS_EXISTS')
      }
      if (!this.conf.allowDuplicateIPs && t.opts?.address && t.opts.address === data.opts?.address) {
        throw new Error('ERR_THING_IP_ADDRESS_EXISTS')
      }
    }
  }

  async _storeDeviceDb (dev) {
    await this.db.put(dev.id, Buffer.from(JSON.stringify(dev)))
  }

  /**
   * @param {object} req       registerThing payload ({ id?, code?, opts, info, tags, ... })
   * @param {object} [options]
   * @param {boolean} [options.trusted] skip the address policy — for
   *   operator-supplied seed configs only, never for remote callers.
   */
  async registerThing (req, { trusted = false } = {}) {
    this.validateRegisterThing(req)
    req = { ...req, opts: stripRedacted(req.opts) }
    if (!trusted) await this._validateOptsTarget(req.opts)

    let info = req.info || {}
    const comments = []

    if (req.comment && req.user) {
      comments.push({
        ts: Date.now(),
        comment: req.comment,
        user: req.user
      })
    }

    const createdAt = Date.now()
    info = { ...info, createdAt, updatedAt: createdAt }

    const id = req.id ?? this.generateId()
    const code = req.code ?? this._generateDeviceCode()
    const dev = {
      id,
      type: this.deviceType,
      opts: req.opts,
      info,
      code,
      tags: this._prepDeviceTags({ ...req, id, code, info }, req.tags),
      comments
    }

    await this._storeDeviceDb(dev)
    this._devices[id] = dev

    debug('registered device %s (%s)', id, code)
    return 1
  }

  checkThingExists (req) {
    if (!req?.thingId || !this._devices[req.thingId]) {
      throw new Error('ERR_THING_NOTFOUND')
    }
  }

  async updateThing (req) {
    if (!req.id || !this._devices[req.id]) {
      throw new Error('ERR_THING_NOTFOUND')
    }
    validateInfo(req.info)
    this._validateDeviceDataChange(req)

    let dev = await this.db.get(req.id)
    dev = JSON.parse(dev.value.toString())
    const devPrev = { opts: { ...dev.opts }, info: { ...dev.info }, tags: [...(dev.tags || [])] }

    if (!dev.code) {
      dev.code = this._generateDeviceCode()
    }

    if (req.opts) {
      const reqOpts = stripRedacted(req.opts)
      await this._validateOptsTarget(reqOpts)
      // Repointing a device must not carry its stored credentials to the new
      // host: keep them only when the address is unchanged or the update
      // supplies its own.
      const prevOpts = reqOpts.address !== undefined && reqOpts.address !== dev.opts?.address
        ? omitSecrets(dev.opts || {})
        : dev.opts
      dev.opts = req.forceOverwrite ? reqOpts : { ...prevOpts, ...reqOpts }
    }

    if (!Array.isArray(dev.comments)) {
      dev.comments = []
    }

    if (req.comment && req.user) {
      dev.comments.push({
        ts: Date.now(),
        comment: req.comment,
        user: req.user
      })
    }

    if (req.info) {
      const lastActionId = req.actionId
      dev.info = req.forceOverwrite
        ? req.info
        : {
            ...dev.info,
            ...req.info,
            ...(lastActionId ? { lastActionId } : {})
          }
    }

    dev.tags = this._prepDeviceTags(dev, req.tags, devPrev)
    dev.info = { ...dev.info, updatedAt: Date.now() }

    await this._storeInfoChanges(devPrev, dev)

    await this._storeDeviceDb(dev)
    this._devices[dev.id] = dev

    return 1
  }

  async _storeInfoChanges (devPrev, dev) {
    if (!this.logs) return
    const log = await this.logs.getBeeTimeLog('thing-history-log', 0, true)
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
          changes: getJsonChanges(devPrev.info, dev.info),
          id: dev.id
        }
      ]
      await log.put(
        utilsStore.convIntToBin(now),
        Buffer.from(JSON.stringify(updatedInfoHistory))
      )
    } catch (e) {
      debug('ERR_THING_SAVE_INFO_HISTORY %s', e.message)
    }
    await this.logs.releaseBeeTimeLog(log)
  }

  async forgetThings (req = {}) {
    if (!req.query) {
      req.query = { id: { $in: [] } }
    }

    if (req.all) {
      req.query = { id: { $exists: true } }
    }

    const ids = applyFilters(Object.values(this._devices), req)

    for (const id of ids) {
      await this.db.del(id)
      delete this._devices[id]
      debug('forgot device %s', id)
    }

    return ids.length
  }

  async loadThing (req) {
    const raw = await this.db.get(req.thingId)
    return JSON.parse(raw.value.toString())
  }

  async saveThing (dev) {
    await this._storeDeviceDb(dev)
    this._devices[dev.id] = dev
  }
}

module.exports = DeviceProvisioningService
