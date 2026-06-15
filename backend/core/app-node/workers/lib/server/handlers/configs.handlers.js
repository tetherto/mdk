'use strict'

const { CONFIG_TYPES, RPC_METHODS, WORKER_TYPES } = require('../../constants')

const VALID_CONFIG_TYPES = Object.values(CONFIG_TYPES)

function validateConfigType (type) {
  if (!type || !VALID_CONFIG_TYPES.includes(type)) {
    throw new Error('ERR_CONFIG_TYPE_INVALID')
  }
}

async function getConfigs (ctx, req) {
  const { type } = req.params
  validateConfigType(type)

  const payload = { type }

  if (req.query.query) {
    try {
      payload.query = JSON.parse(req.query.query)
    } catch {
      throw new Error('ERR_QUERY_INVALID_JSON')
    }
  }

  if (req.query.fields) {
    try {
      payload.fields = JSON.parse(req.query.fields)
    } catch {
      throw new Error('ERR_FIELDS_INVALID_JSON')
    }
  }

  const configs = await ctx.dataProxy.requestData('getConfigs', payload, (res, resultsArray) => {
    if (res.error) {
      console.error(new Date().toISOString(), res.error)
    } else if (Array.isArray(res)) {
      resultsArray.push(...res)
    }
  })

  if (type !== CONFIG_TYPES.POOL) return configs
  return fetchPoolConfigThings(ctx, configs)
}

const fetchPoolConfigThings = async (ctx, configs) => {
  const ids = configs.map(c => c.id)
  const things = await ctx.dataProxy.requestData(RPC_METHODS.LIST_THINGS, {
    query: { 'info.poolConfig': { $in: ids } },
    fields: { 'info.poolConfig': 1 }
  })
  return configs.map(config => {
    const containers = things?.[0]?.filter(t => t.info?.poolConfig === config.id && t.rack.startsWith(WORKER_TYPES.CONTAINER))?.length || 0
    const miners = things?.[0]?.filter(t => t.info?.poolConfig === config.id && t.rack.startsWith(WORKER_TYPES.MINER))?.length || 0
    return { ...config, containers, miners }
  })
}

module.exports = {
  getConfigs
}
