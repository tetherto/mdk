'use strict'

const { getStartOfDay } = require('./period.utils')

const getAuthTokenFromHeaders = (headers) => {
  const authHeader = headers.authorization || headers.Authorization
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.split(' ')[1]
  }

  return null
}

const parseJsonQueryParam = (jsonString, errorCode = 'ERR_INVALID_JSON') => {
  if (!jsonString) return undefined
  try {
    return JSON.parse(jsonString)
  } catch {
    throw new Error(errorCode)
  }
}

const safeDiv = (numerator, denominator) =>
  typeof numerator === 'number' &&
    typeof denominator === 'number' &&
    denominator !== 0
    ? numerator / denominator
    : null

module.exports = {
  getAuthTokenFromHeaders,
  parseJsonQueryParam,
  safeDiv,
  getStartOfDay
}
