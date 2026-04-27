'use strict'

const libUtils = require('../../../tpl-lib-thing/lib/utils')
const crypto = require('crypto')

function getRandomString (length) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, length)
}

function hasErrorAndPositiveHashrate (entry) {
  const { errors, hashrate_mhs: hashrateMHS } = entry?.last?.snap?.stats || {}
  const hashrate = hashrateMHS?.t_5m

  return errors?.length && hashrate > 0
}

function sumPoolsShares (pools, key) {
  if (!Array.isArray(pools)) return 0

  return pools?.reduce((acc, pool) => {
    const value = parseInt(pool[key])
    return acc + (isNaN(value) ? 0 : value)
  }, 0)
}

module.exports = {
  ...libUtils,
  getRandomString,
  hasErrorAndPositiveHashrate,
  sumPoolsShares
}
