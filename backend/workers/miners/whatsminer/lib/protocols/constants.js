'use strict'

const API_VERSIONS = {
  V2: '2.0.5',
  V3: '3.0.3'
}

const DEFAULT_API_VERSION = API_VERSIONS.V3

const API_DEFAULTS = {
  '2.0.5': {
    port: 4028,
    authCommand: 'get_token'
  },
  '3.0.3': {
    port: 4433,
    authCommand: 'get.device.info'
  }
}

const RESPONSE_CODES_V2 = {
  OK: 131,
  TOKEN_EXPIRED: 135,
  IP_LIMIT: 136
}

const RESPONSE_CODES_V3 = {
  SUCCESS: 0,
  FAIL: -1,
  INVALID_COMMAND: -2,
  NO_PERMISSION: -4
}

const RESPONSE_CODES = RESPONSE_CODES_V2

module.exports = {
  API_VERSIONS,
  DEFAULT_API_VERSION,
  API_DEFAULTS,
  RESPONSE_CODES,
  RESPONSE_CODES_V2,
  RESPONSE_CODES_V3
}
