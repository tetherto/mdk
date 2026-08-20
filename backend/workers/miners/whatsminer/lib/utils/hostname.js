'use strict'

function normalizeHostname (hostname) {
  if (typeof hostname !== 'string' || hostname.length < 1 || hostname.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(hostname)) {
    throw new Error('ERR_HOSTNAME_INVALID')
  }
  return hostname
}

module.exports = normalizeHostname
