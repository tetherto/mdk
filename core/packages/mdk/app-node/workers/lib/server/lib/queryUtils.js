'use strict'

/**
 * Shared query utilities for all list endpoints.
 * Provides MongoDB-style filter field mapping, sort mapping,
 * text search, multi-ork result flattening, sorting, and pagination.
 */

const MONGO_OPERATORS = new Set([
  '$gt', '$gte', '$lt', '$lte', '$eq', '$ne',
  '$in', '$nin', '$regex', '$options', '$exists',
  '$elemMatch', '$not', '$type', '$size'
])

/**
 * Gets a nested value from an object using a dot-separated path.
 *
 * @param {Object} obj - Source object
 * @param {string} path - Dot-separated path (e.g. 'last.snap.stats.status')
 * @returns {*} The value at the path, or undefined
 */
function getNestedValue (obj, path) {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null) return undefined
    current = current[part]
  }
  return current
}

/**
 * Recursively maps clean field names to internal dot-paths in a MongoDB-style filter.
 * Handles $and, $or, $not, $elemMatch operators by recursing into their values.
 * Unknown keys are passed through as-is (allows raw internal paths).
 *
 * @param {Object} filter - MongoDB-style filter object
 * @param {Object} fieldMap - Map of clean name → internal path
 * @returns {Object} Filter with mapped field names
 *
 * @example
 * mapFilterFields({ status: 'error' }, { status: 'last.snap.stats.status' })
 * // → { 'last.snap.stats.status': 'error' }
 *
 * mapFilterFields({ $or: [{ status: 'error' }, { hashrate: { $gt: 0 } }] }, fieldMap)
 * // → { $or: [{ 'last.snap.stats.status': 'error' }, { 'last.snap.stats.hashrate_mhs': { $gt: 0 } }] }
 */
function mapFilterFields (filter, fieldMap) {
  if (!filter || typeof filter !== 'object') return filter
  if (Array.isArray(filter)) return filter.map(f => mapFilterFields(f, fieldMap))

  const mapped = {}
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$and' || key === '$or') {
      mapped[key] = Array.isArray(value)
        ? value.map(f => mapFilterFields(f, fieldMap))
        : value
    } else if (key === '$elemMatch' || key === '$not') {
      mapped[key] = mapFilterFields(value, fieldMap)
    } else if (MONGO_OPERATORS.has(key)) {
      mapped[key] = value
    } else {
      const mappedKey = fieldMap[key] || key
      mapped[mappedKey] = value
    }
  }
  return mapped
}

/**
 * Maps clean field names to internal paths in a sort specification.
 *
 * @param {Object} sort - Sort spec: { field: 1 } (1=asc, -1=desc)
 * @param {Object} fieldMap - Map of clean name → internal path
 * @returns {Object} Sort with mapped field names
 *
 * @example
 * mapSortFields({ hashrate: -1 }, { hashrate: 'last.snap.stats.hashrate_mhs' })
 * // → { 'last.snap.stats.hashrate_mhs': -1 }
 */
function mapSortFields (sort, fieldMap) {
  if (!sort || typeof sort !== 'object') return sort
  const mapped = {}
  for (const [key, value] of Object.entries(sort)) {
    mapped[fieldMap[key] || key] = value
  }
  return mapped
}

/**
 * Builds a text search query as a multi-field $or with $regex.
 *
 * @param {string} search - Search term
 * @param {Array<string>} searchFields - Internal field paths to search across
 * @returns {Object} MongoDB-style $or query
 *
 * @example
 * buildSearchQuery('192.168', ['id', 'opts.address'])
 * // → { $or: [{ id: { $regex: '192.168', $options: 'i' } }, { 'opts.address': { $regex: '192.168', $options: 'i' } }] }
 */
function buildSearchQuery (search, searchFields) {
  return {
    $or: searchFields.map(field => ({
      [field]: { $regex: search, $options: 'i' }
    }))
  }
}

/**
 * Flattens multi-ork results into a single array.
 * Each ork response for listThings is an array of items.
 * requestRpcMapLimit returns [orkResult1, orkResult2, ...].
 *
 * @param {Array} orkResults - Array of ork responses
 * @returns {Array} Flattened array of all items
 */
function flattenOrkResults (orkResults) {
  const items = []
  for (const orkResult of orkResults) {
    if (Array.isArray(orkResult)) {
      items.push(...orkResult)
    }
  }
  return items
}

/**
 * Sorts items by a sort specification using internal dot-path fields.
 * Handles multi-key sorting. Null/undefined values sort last.
 *
 * @param {Array} items - Items to sort
 * @param {Object} sort - Sort spec: { 'internal.path': 1 or -1 }
 * @returns {Array} Sorted items (mutates the original array)
 */
function sortItems (items, sort) {
  if (!sort || typeof sort !== 'object' || Object.keys(sort).length === 0) return items

  const sortEntries = Object.entries(sort)

  return items.sort((a, b) => {
    for (const [field, direction] of sortEntries) {
      const aVal = getNestedValue(a, field)
      const bVal = getNestedValue(b, field)

      if (aVal === bVal) continue
      if (aVal == null) return direction
      if (bVal == null) return -direction

      if (aVal < bVal) return -direction
      if (aVal > bVal) return direction
    }
    return 0
  })
}

/**
 * Creates a paginated response from a flat array of items.
 *
 * @param {Array} items - All matching items (already sorted)
 * @param {number} offset - Pagination offset
 * @param {number} limit - Page size
 * @returns {Object} Paginated response
 */
function paginateResults (items, offset, limit) {
  const page = items.slice(offset, offset + limit)
  return {
    data: page,
    totalCount: items.length,
    offset,
    limit,
    hasMore: offset + limit < items.length
  }
}

function parseRacks (req) {
  const raw = req.query.racks
  if (!raw) return undefined
  return raw.split(',').map(r => r.trim()).filter(Boolean)
}

module.exports = {
  getNestedValue,
  mapFilterFields,
  mapSortFields,
  buildSearchQuery,
  flattenOrkResults,
  sortItems,
  paginateResults,
  parseRacks
}
