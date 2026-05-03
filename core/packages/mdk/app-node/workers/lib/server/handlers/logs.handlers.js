'use strict'

const { parseJsonQueryParam } = require('../../utils')

async function tailLogRoute (ctx, req, rep) {
  if (req.query.fields) {
    req.query.fields = parseJsonQueryParam(req.query.fields, 'ERR_FIELDS_INVALID_JSON')
  }

  if (req.query.aggrFields) {
    req.query.aggrFields = parseJsonQueryParam(req.query.aggrFields, 'ERR_AGGRFIELDS_INVALID_JSON')
  }

  if (req.query.aggrTimes) {
    req.query.aggrTimes = parseJsonQueryParam(req.query.aggrTimes, 'ERR_AGGRTIMES_INVALID_JSON')

    if (!Array.isArray(req.query.aggrTimes)) {
      throw new Error('ERR_AGGRTIMES_INVALID_ARRAY')
    }
  }

  return await ctx.dataProxy.requestDataMap('tailLog', req.query)
}

async function tailLogMultiRoute (ctx, req, rep) {
  if (req.query.keys) {
    req.query.keys = parseJsonQueryParam(req.query.keys, 'ERR_KEYS_INVALID_JSON')

    if (!Array.isArray(req.query.keys)) {
      throw new Error('ERR_KEYS_INVALID_ARRAY')
    }
  }

  if (req.query.fields) {
    req.query.fields = parseJsonQueryParam(req.query.fields, 'ERR_FIELDS_INVALID_JSON')
  }

  if (req.query.aggrFields) {
    req.query.aggrFields = parseJsonQueryParam(req.query.aggrFields, 'ERR_AGGRFIELDS_INVALID_JSON')
  }

  if (req.query.aggrTimes) {
    req.query.aggrTimes = parseJsonQueryParam(req.query.aggrTimes, 'ERR_AGGRTIMES_INVALID_JSON')

    if (!Array.isArray(req.query.aggrTimes)) {
      throw new Error('ERR_AGGRTIMES_INVALID_ARRAY')
    }
  }

  return await ctx.dataProxy.requestDataMap('tailLogMulti', req.query)
}

async function tailLogRangeAggrRoute (ctx, req, rep) {
  return await ctx.dataProxy.requestData('tailLogCustomRangeAggr', req.query)
}

async function getHistoryLogRoute (ctx, req) {
  if (req.query.fields) {
    req.query.fields = parseJsonQueryParam(req.query.fields, 'ERR_FIELDS_INVALID_JSON')
  }
  if (req.query.query) {
    req.query.query = parseJsonQueryParam(req.query.query, 'ERR_QUERY_INVALID_JSON')
  }

  return await ctx.dataProxy.requestDataMap('getHistoricalLogs', req.query)
}

module.exports = {
  tailLogRoute,
  tailLogMultiRoute,
  tailLogRangeAggrRoute,
  getHistoryLogRoute
}
