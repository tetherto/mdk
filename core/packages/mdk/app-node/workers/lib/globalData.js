'use strict'

const utilsStore = require('@tetherto/hp-svc-facs-store/utils')
const mingo = require('mingo')
const { GLOBAL_DATA_TYPES, USER_SETTINGS_TYPE } = require('./constants')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')
const { isValidJsonObject } = require('./utils')

class GlobalDataLib {
  constructor (globalDataBee, site) {
    this._globalDataBee = globalDataBee
    this.site = site
  }

  convertRangeToBin (range) {
    if (range) {
      if (range.gt) range.gt = utilsStore.convIntToBin(range.gt)
      if (range.gte) range.gte = utilsStore.convIntToBin(range.gte)
      if (range.lt) range.lt = utilsStore.convIntToBin(range.lt)
      if (range.lte) range.lte = utilsStore.convIntToBin(range.lte)
    }
    return range
  }

  async queryGlobalData (db, range = undefined, opts = undefined) {
    const data = []
    const stream = db.createReadStream(range, opts)
    for await (const entry of stream) {
      data.push(JSON.parse(entry.value.toString()))
    }
    return data
  }

  filterData (data, req) {
    const { queryJSON, fields, sort, offset, limit } = req
    const query = new mingo.Query(queryJSON || {})
    let cursor = query.find(data, fields || {})
    if (!gLibUtilBase.isNil(sort)) cursor = cursor.sort(sort)
    if (!gLibUtilBase.isNil(offset)) cursor = cursor.skip(offset)
    if (!gLibUtilBase.isNil(limit)) cursor = cursor.limit(limit)

    return cursor.all()
  }

  async getGloabalDbDataForType (type) {
    const res = await this._globalDataBee.sub(type).get(type)
    return res?.value ? JSON.parse(res.value) : {}
  }

  async getGlobalData (req) {
    const { type, range, opts, query, fields, sort, offset, limit, groupBy, model } = req

    if (!Object.values(GLOBAL_DATA_TYPES).includes(type)) {
      throw new Error('ERR_INVALID_TYPE')
    }

    if (type === GLOBAL_DATA_TYPES.FEATURES) {
      return await this.getGloabalDbDataForType(type)
    }

    if (type === GLOBAL_DATA_TYPES.CONTAINER_SETTINGS) {
      const settingsMap = await this.getGloabalDbDataForType(type)
      if (settingsMap && typeof settingsMap === 'object') {
        let results = Object.values(settingsMap).filter(
          item => item && typeof item === 'object' && item.model && item.site === this.site
        )

        if (model) {
          results = results.filter(item => item.model === model)
        }

        return results
      }
      return []
    }

    const data = await this.queryGlobalData(
      this._globalDataBee.sub(type),
      this.convertRangeToBin(range),
      opts
    )

    const res = this.filterData(data, {
      queryJSON: query,
      fields,
      sort,
      offset,
      limit
    })

    if (groupBy) {
      return gLibUtilBase.groupBy(res, data => data[groupBy])
    }

    return res
  }

  async setProductionCostsData (data) {
    if (!Number.isInteger(data.year) || data.year < 0) {
      throw new Error('ERR_INVALID_YEAR')
    }
    if (!Number.isInteger(data.month) || data.month < 1 || data.month > 12) {
      throw new Error('ERR_INVALID_MONTH')
    }
    const id = data.year * 100 + data.month
    const productionData = {
      site: this.site,
      year: data.year,
      month: data.month,
      energyCost: data.energyCost,
      operationalCost: data.operationalCost
    }
    await this._globalDataBee
      .sub(GLOBAL_DATA_TYPES.PRODUCTION_COSTS)
      .put(utilsStore.convIntToBin(id), JSON.stringify(productionData))

    return true
  }

  async saveGlobalDataForType (data, type) {
    if (!isValidJsonObject(data)) throw new Error('ERR_INVALID_JSON')
    await this._globalDataBee.sub(type).put(type, JSON.stringify(data))
    return true
  }

  async setContainerSettingsData (data) {
    if (!isValidJsonObject(data)) throw new Error('ERR_INVALID_JSON')

    const existingSettings = await this.getGloabalDbDataForType(GLOBAL_DATA_TYPES.CONTAINER_SETTINGS)
    const settingsMap = {}

    if (isValidJsonObject(existingSettings)) {
      for (const [, value] of Object.entries(existingSettings)) {
        if (value && typeof value === 'object' && value.model && value.site) {
          const correctKey = `${value.model}_${value.site}`
          settingsMap[correctKey] = value
        }
      }
    }

    const key = `${data.model}_${this.site}`
    settingsMap[key] = data

    await this._globalDataBee
      .sub(GLOBAL_DATA_TYPES.CONTAINER_SETTINGS)
      .put(GLOBAL_DATA_TYPES.CONTAINER_SETTINGS, JSON.stringify(settingsMap))

    return true
  }

  async setGlobalData (data, type) {
    if (!Object.values(GLOBAL_DATA_TYPES).includes(type)) {
      throw new Error('ERR_INVALID_TYPE')
    }

    if (type === GLOBAL_DATA_TYPES.PRODUCTION_COSTS) {
      return this.setProductionCostsData(data)
    }

    if (type === GLOBAL_DATA_TYPES.CONTAINER_SETTINGS) {
      return this.setContainerSettingsData(data)
    }

    return this.saveGlobalDataForType(data, type)
  }

  async getUserSettings (userId) {
    const res = await this._globalDataBee.sub(USER_SETTINGS_TYPE).get(userId)
    return res?.value ? JSON.parse(res.value) : {}
  }

  async setUserSettings (userId, data) {
    await this._globalDataBee.sub(USER_SETTINGS_TYPE).put(userId, JSON.stringify(data))
    return true
  }
}

module.exports = GlobalDataLib
