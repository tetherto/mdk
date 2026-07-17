'use strict'
const {
  AUTH_PERMISSIONS,
  AUTH_LEVELS,
  COMMENT_ACTION
} = require('../../constants')
const { parseJsonQueryParam } = require('../../utils')

async function listThingsRoute (ctx, req, rep) {
  if (req.query.query) {
    req.query.query = parseJsonQueryParam(req.query.query, 'ERR_QUERY_INVALID_JSON')
  }
  if (req.query.sort) {
    req.query.sort = parseJsonQueryParam(req.query.sort, 'ERR_SORT_INVALID_JSON')
  }

  if (req.query.fields) {
    req.query.fields = parseJsonQueryParam(req.query.fields, 'ERR_FIELDS_INVALID_JSON')
  }

  return await ctx.dataProxy.requestDataMap('listThings', req.query)
}

async function listRacksRoute (ctx, req, rep) {
  if (typeof req.query.type !== 'string') {
    throw new Error('ERR_TYPE_INVALID')
  }

  if (req.query.keys) {
    throw new Error('ERR_KEYS_NOT_ALLOWED')
  }

  return await ctx.dataProxy.requestDataMap('listRacks', req.query)
}

async function getThingSettings (ctx, req, rep) {
  const payload = {
    rackId: req.query.rackId
  }

  return await ctx.dataProxy.requestData('getWrkSettings', payload, (res, resultsArray) => {
    if (res.error) {
      resultsArray.push({ error: res.error })
    } else {
      resultsArray.push({ success: res })
    }
  })
}

async function saveThingSettings (ctx, req, rep) {
  const { write } = await ctx.authLib.getTokenPerms(req._info.authToken)
  if (!write) {
    throw new Error('ERR_WRITE_PERM_REQUIRED')
  }

  const payload = {
    rackId: req.body.rackId,
    entries: req.body.entries
  }

  return await ctx.dataProxy.requestData('saveWrkSettings', payload, (res, resultsArray) => {
    if (res.error) {
      resultsArray.push({ error: res.error })
    } else {
      resultsArray.push({ success: res })
    }
  })
}

async function processThingComment (ctx, req, operation = COMMENT_ACTION.ADD) {
  const permission = `${AUTH_PERMISSIONS.COMMENTS}:${AUTH_LEVELS.WRITE}`
  const allowed = await ctx.authLib.tokenHasPerms(req._info.authToken, false, [permission])
  if (!allowed) {
    throw new Error('ERR_WRITE_PERM_REQUIRED')
  }

  const payload = {
    id: req.body.id,
    rackId: req.body.rackId,
    thingId: req.body.thingId,
    pos: req.body.pos,
    ts: req.body.ts,
    comment: req.body.comment,
    user: req._info.user.metadata.email
  }

  return await ctx.dataProxy.requestData(operation, payload, (res, resultsArray) => {
    if (res.error) {
      resultsArray.push({ error: res.error })
    } else {
      resultsArray.push({ success: res })
    }
  })
}

async function getWorkerConfig (ctx, req, rep) {
  if (req.query.fields) {
    req.query.fields = parseJsonQueryParam(req.query.fields, 'ERR_FIELDS_INVALID_JSON')
  }

  return await ctx.dataProxy.requestDataMap('getWrkConf', req.query)
}

async function getThingConfig (ctx, req, rep) {
  return await ctx.dataProxy.requestDataMap('getThingConf', req.query)
}

module.exports = {
  listThingsRoute,
  listRacksRoute,
  getThingSettings,
  saveThingSettings,
  getWorkerConfig,
  getThingConfig,
  processThingComment
}
