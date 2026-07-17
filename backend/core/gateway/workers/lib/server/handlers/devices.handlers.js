'use strict'

const mingo = require('mingo')
const {
  RPC_METHODS,
  STATUS_CODES,
  WORKER_TAGS,
  DEVICE_LIST_FIELDS
} = require('../../constants')
const { parseJsonQueryParam, flattenRpcResults } = require('../../utils')
const { sortItems } = require('../lib/queryUtils')

const CABINET_TAGS_QUERY = { tags: { $in: [WORKER_TAGS.POWERMETER, WORKER_TAGS.TEMP_SENSOR] } }

function parseListQuery (req) {
  return {
    filter: req.query.filter ? parseJsonQueryParam(req.query.filter, 'ERR_FILTER_INVALID_JSON') : null,
    sort: req.query.sort ? parseJsonQueryParam(req.query.sort, 'ERR_SORT_INVALID_JSON') : null,
    fields: req.query.fields ? parseJsonQueryParam(req.query.fields, 'ERR_FIELDS_INVALID_JSON') : null,
    search: req.query.search || null,
    offset: Number(req.query.offset) || 0,
    limit: Number(req.query.limit) || 0
  }
}

function buildMingoFilter (filter, search) {
  if (!filter && !search) return {}

  const searchFilter = search
    ? {
        $or: [
          { id: { $regex: search, $options: 'i' } },
          { ip: { $regex: search, $options: 'i' } }
        ]
      }
    : null

  if (!filter) return searchFilter
  if (!searchFilter) return filter
  return { $and: [filter, searchFilter] }
}

function queryAndPaginate (items, { filter, fields, sort, search, offset, limit }) {
  const mingoFilter = buildMingoFilter(filter, search)
  const query = new mingo.Query(mingoFilter)
  let cursor = query.find(items, fields || {})
  if (sort) cursor = cursor.sort(sort)
  const filtered = cursor.all()

  const total = filtered.length
  const page = (offset || limit)
    ? filtered.slice(offset, limit ? offset + limit : undefined)
    : filtered

  return { page, total }
}

async function getContainers (ctx, req) {
  const { filter, sort, fields, search, offset, limit } = parseListQuery(req)

  const userFilter = buildMingoFilter(filter, search)
  const query = Object.keys(userFilter).length
    ? { $and: [{ tags: { $in: [WORKER_TAGS.CONTAINER] } }, userFilter] }
    : { tags: { $in: [WORKER_TAGS.CONTAINER] } }

  const fetchLimit = offset + limit
  const [listResults, countResults] = await Promise.all([
    ctx.dataProxy.requestDataMap(RPC_METHODS.LIST_THINGS, {
      query,
      fields: fields || DEVICE_LIST_FIELDS,
      ...(sort && { sort }),
      ...(fetchLimit && { limit: fetchLimit })
    }),
    ctx.dataProxy.requestDataMap('getThingsCount', { query })
  ])

  let containers = flattenRpcResults(listResults)
  const total = countResults.reduce((acc, c) => acc + (Number(c) || 0), 0)
  if (sort) containers = sortItems(containers, sort)
  if (offset || limit) {
    containers = containers.slice(offset, limit ? offset + limit : undefined)
  }

  return { containers, total }
}

async function getCabinets (ctx, req) {
  const { filter, sort, offset, limit } = parseListQuery(req)

  const results = await ctx.dataProxy.requestDataAllPages(RPC_METHODS.LIST_THINGS, {
    query: CABINET_TAGS_QUERY,
    fields: DEVICE_LIST_FIELDS
  })

  const devices = flattenRpcResults(results)
  let cabinets = groupIntoCabinets(devices)

  if (filter || sort) {
    const query = new mingo.Query(filter || {})
    let cursor = query.find(cabinets)
    if (sort) cursor = cursor.sort(sort)
    cabinets = cursor.all()
  }

  const total = cabinets.length
  if (offset || limit) {
    cabinets = cabinets.slice(offset, limit ? offset + limit : undefined)
  }

  return { cabinets, total }
}

async function getCabinetById (ctx, req) {
  const cabinetId = req.params.id

  const results = await ctx.dataProxy.requestDataAllPages(RPC_METHODS.LIST_THINGS, {
    query: CABINET_TAGS_QUERY,
    fields: DEVICE_LIST_FIELDS
  })

  const devices = flattenRpcResults(results)
  const cabinets = groupIntoCabinets(devices)
  const cabinet = cabinets.find(c => c.id === cabinetId)

  if (!cabinet) {
    const err = new Error('ERR_CABINET_NOT_FOUND')
    err.statusCode = STATUS_CODES.NOT_FOUND
    throw err
  }

  return { cabinet }
}

function groupIntoCabinets (devices) {
  const groups = {}

  for (const device of devices) {
    const pos = device.info?.pos || device.pos || ''
    const root = pos.split('/')[0] || device.id || 'unknown'

    if (!groups[root]) {
      groups[root] = { id: root, devices: [], type: 'cabinet' }
    }
    groups[root].devices.push(device)
  }

  return Object.values(groups)
}

module.exports = {
  getContainers,
  getCabinets,
  getCabinetById,
  groupIntoCabinets,
  parseListQuery,
  buildMingoFilter,
  queryAndPaginate
}
