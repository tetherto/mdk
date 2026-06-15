'use strict'
const { GLOBAL_DATA_TYPES } = require('../../constants')
const { parseJsonQueryParam } = require('../../utils')

async function getGlobalData (ctx, req) {
  const type = req.query.type
  const groupBy = req.query.groupBy

  const range = {}
  const opts = {}
  if (req.query.gt) range.gt = req.query.gt
  if (req.query.gte) range.gte = req.query.gte
  if (req.query.lt) range.lt = req.query.lt
  if (req.query.lte) range.lte = req.query.lte
  if (req.query.limit) opts.limit = req.query.limit

  if (req.query.query) {
    req.query.query = parseJsonQueryParam(req.query.query, 'ERR_QUERY_INVALID_JSON')
  }
  if (req.query.sort) {
    req.query.sort = parseJsonQueryParam(req.query.sort, 'ERR_SORT_INVALID_JSON')
  }

  if (req.query.fields) {
    req.query.fields = parseJsonQueryParam(req.query.fields, 'ERR_FIELDS_INVALID_JSON')
  }

  return await ctx.globalDataLib.getGlobalData({
    type,
    range,
    opts,
    query: req.query.query,
    fields: req.query.fields,
    sort: req.query.sort,
    offset: req.query.offset,
    limit: req.query.limit,
    groupBy,
    model: req.query.model
  })
}

async function setGlobalData (ctx, req) {
  const data = req.body.data
  const type = req.query.type
  return await ctx.globalDataLib.setGlobalData(data, type)
}

async function getFeatureConfig (ctx) {
  return ctx.conf.featureConfig
}

async function getFeatures (ctx) {
  return await ctx.globalDataLib.getGlobalData({ type: GLOBAL_DATA_TYPES.FEATURES })
}

async function setFeatures (ctx, req) {
  const data = req.body.data
  return await ctx.globalDataLib.setGlobalData(data, GLOBAL_DATA_TYPES.FEATURES)
}

async function getGlobalConfig (ctx, req, rep) {
  if (req.query.fields) {
    req.query.fields = parseJsonQueryParam(req.query.fields, 'ERR_FIELDS_INVALID_JSON')
  }

  return await ctx.dataProxy.requestDataMap('getGlobalConfig', req.query)
}

async function setGlobalConfig (ctx, req, rep) {
  return await ctx.dataProxy.requestDataMap('setGlobalConfig', req.body.data)
}

module.exports = {
  getGlobalData,
  setGlobalData,
  getFeatureConfig,
  getFeatures,
  setFeatures,
  getGlobalConfig,
  setGlobalConfig
}
