'use strict'

const test = require('brittle')
const {
  SUPER_ADMIN_ROLE,
  GLOBAL_DATA_TYPES,
  SUPER_ADMIN_ID,
  MIGRATED_USER_ROLES,
  COMMENT_ACTION,
  AUTH_PERMISSIONS,
  AUTH_LEVELS,
  AUTH_CAPS,
  ENDPOINTS,
  HTTP_METHODS,
  OPERATIONS,
  DEFAULTS,
  STATUS_CODES,
  RPC_TIMEOUT,
  RPC_CONCURRENCY_LIMIT,
  USER_SETTINGS_TYPE
} = require('../../../workers/lib/constants')

test('constants - SUPER_ADMIN_ROLE', (t) => {
  t.is(SUPER_ADMIN_ROLE, '*', 'should be asterisk')
  t.ok(typeof SUPER_ADMIN_ROLE === 'string', 'should be string')
  t.pass()
})

test('constants - SUPER_ADMIN_ID', (t) => {
  t.is(SUPER_ADMIN_ID, '1', 'should be string "1"')
  t.ok(typeof SUPER_ADMIN_ID === 'string', 'should be string')
  t.pass()
})

test('constants - USER_SETTINGS_TYPE', (t) => {
  t.is(USER_SETTINGS_TYPE, 'userSettings', 'should be userSettings')
  t.ok(typeof USER_SETTINGS_TYPE === 'string', 'should be string')
  t.pass()
})

test('constants - GLOBAL_DATA_TYPES', (t) => {
  t.ok(typeof GLOBAL_DATA_TYPES === 'object', 'should be object')
  t.is(GLOBAL_DATA_TYPES.PRODUCTION_COSTS, 'productionCosts', 'should have PRODUCTION_COSTS')
  t.is(GLOBAL_DATA_TYPES.FEATURES, 'features', 'should have FEATURES')
  t.is(GLOBAL_DATA_TYPES.SITE_ENERGY, 'siteEnergy', 'should have SITE_ENERGY')
  t.is(GLOBAL_DATA_TYPES.CONTAINER_SETTINGS, 'containerSettings', 'should have CONTAINER_SETTINGS')
  t.is(Object.keys(GLOBAL_DATA_TYPES).length, 4, 'should have 4 types')
  t.pass()
})

test('constants - MIGRATED_USER_ROLES', (t) => {
  t.ok(typeof MIGRATED_USER_ROLES === 'object', 'should be object')
  t.is(MIGRATED_USER_ROLES.DEFAULT, 'site_operator', 'should have DEFAULT role')
  t.is(MIGRATED_USER_ROLES.READ_ONLY, 'read_only_user', 'should have READ_ONLY role')
  t.is(Object.keys(MIGRATED_USER_ROLES).length, 2, 'should have 2 roles')
  t.pass()
})

test('constants - AUTH_PERMISSIONS', (t) => {
  t.ok(typeof AUTH_PERMISSIONS === 'object', 'should be object')
  t.is(AUTH_PERMISSIONS.MINER, 'miner', 'should have MINER permission')
  t.is(AUTH_PERMISSIONS.CONTAINER, 'container', 'should have CONTAINER permission')
  t.is(AUTH_PERMISSIONS.ACTIONS, 'actions', 'should have ACTIONS permission')
  t.is(AUTH_PERMISSIONS.USERS, 'users', 'should have USERS permission')
  t.is(AUTH_PERMISSIONS.COMMENTS, 'comments', 'should have COMMENTS permission')
  t.ok(Object.keys(AUTH_PERMISSIONS).length >= 15, 'should have multiple permissions')
  t.pass()
})

test('constants - AUTH_LEVELS', (t) => {
  t.ok(typeof AUTH_LEVELS === 'object', 'should be object')
  t.is(AUTH_LEVELS.READ, 'r', 'should have READ level')
  t.is(AUTH_LEVELS.WRITE, 'w', 'should have WRITE level')
  t.is(Object.keys(AUTH_LEVELS).length, 2, 'should have 2 levels')
  t.pass()
})

test('constants - AUTH_CAPS', (t) => {
  t.ok(typeof AUTH_CAPS === 'object', 'should be object')
  t.is(AUTH_CAPS.m, 'miner', 'should map m to miner')
  t.is(AUTH_CAPS.c, 'container', 'should map c to container')
  t.is(AUTH_CAPS.f, 'features', 'should map f to features')
  t.ok(Object.isFrozen(AUTH_CAPS), 'should be frozen object')
  t.ok(Object.keys(AUTH_CAPS).length >= 7, 'should have multiple caps')
  t.pass()
})

test('constants - COMMENT_ACTION', (t) => {
  t.ok(typeof COMMENT_ACTION === 'object', 'should be object')
  t.is(COMMENT_ACTION.ADD, 'saveThingComment', 'should have ADD action')
  t.is(COMMENT_ACTION.EDIT, 'editThingComment', 'should have EDIT action')
  t.is(COMMENT_ACTION.DELETE, 'deleteThingComment', 'should have DELETE action')
  t.is(Object.keys(COMMENT_ACTION).length, 3, 'should have 3 actions')
  t.pass()
})

test('constants - ENDPOINTS', (t) => {
  t.ok(typeof ENDPOINTS === 'object', 'should be object')
  t.is(ENDPOINTS.OAUTH_GOOGLE_CALLBACK, '/oauth/google/callback', 'should have OAuth callback endpoint')
  t.is(ENDPOINTS.OAUTH_MICROSOFT_CALLBACK, '/oauth/microsoft/callback', 'should have OAuth Microsoft callback endpoint')
  t.is(ENDPOINTS.USERINFO, '/auth/userinfo', 'should have userinfo endpoint')
  t.is(ENDPOINTS.TOKEN, '/auth/token', 'should have token endpoint')
  t.is(ENDPOINTS.USERS, '/auth/users', 'should have users endpoint')
  t.is(ENDPOINTS.ACTIONS, '/auth/actions', 'should have actions endpoint')
  t.is(ENDPOINTS.TAIL_LOG, '/auth/tail-log', 'should have tail-log endpoint')
  t.is(ENDPOINTS.LIST_THINGS, '/auth/list-things', 'should have list-things endpoint')
  t.is(ENDPOINTS.WEBSOCKET, '/ws', 'should have websocket endpoint')
  t.ok(Object.keys(ENDPOINTS).length >= 20, 'should have multiple endpoints')
  t.pass()
})

test('constants - HTTP_METHODS', (t) => {
  t.ok(typeof HTTP_METHODS === 'object', 'should be object')
  t.is(HTTP_METHODS.GET, 'GET', 'should have GET method')
  t.is(HTTP_METHODS.POST, 'POST', 'should have POST method')
  t.is(HTTP_METHODS.PUT, 'PUT', 'should have PUT method')
  t.is(HTTP_METHODS.DELETE, 'DELETE', 'should have DELETE method')
  t.is(HTTP_METHODS.PATCH, 'PATCH', 'should have PATCH method')
  t.is(Object.keys(HTTP_METHODS).length, 5, 'should have 5 methods')
  t.pass()
})

test('constants - OPERATIONS', (t) => {
  t.ok(typeof OPERATIONS === 'object', 'should be object')
  t.is(OPERATIONS.AUTH_USERINFO_READ, 'auth.userinfo.read', 'should have auth userinfo read operation')
  t.is(OPERATIONS.USER_CREATE, 'user.create', 'should have user create operation')
  t.is(OPERATIONS.USER_UPDATE, 'user.update', 'should have user update operation')
  t.is(OPERATIONS.ACTIONS_QUERY, 'actions.query', 'should have actions query operation')
  t.is(OPERATIONS.THING_COMMENT_WRITE, 'thing.comment.write', 'should have thing comment write operation')
  t.ok(Object.keys(OPERATIONS).length >= 10, 'should have multiple operations')
  t.pass()
})

test('constants - DEFAULTS', (t) => {
  t.ok(typeof DEFAULTS === 'object', 'should be object')
  t.is(DEFAULTS.USER_ID, 'anonymous', 'should have USER_ID default')
  t.is(DEFAULTS.OPERATION_COUNT, 1, 'should have OPERATION_COUNT default')
  t.is(Object.keys(DEFAULTS).length, 2, 'should have 2 defaults')
  t.pass()
})

test('constants - STATUS_CODES', (t) => {
  t.ok(typeof STATUS_CODES === 'object', 'should be object')
  t.is(STATUS_CODES.OK, 200, 'should have OK status code')
  t.is(STATUS_CODES.BAD_REQUEST, 400, 'should have BAD_REQUEST status code')
  t.is(STATUS_CODES.UNAUTHORIZED, 401, 'should have UNAUTHORIZED status code')
  t.is(STATUS_CODES.FORBIDDEN, 403, 'should have FORBIDDEN status code')
  t.is(STATUS_CODES.NOT_FOUND, 404, 'should have NOT_FOUND status code')
  t.is(STATUS_CODES.INTERNAL_SERVER_ERROR, 500, 'should have INTERNAL_SERVER_ERROR status code')
  t.is(Object.keys(STATUS_CODES).length, 6, 'should have 6 status codes')
  t.pass()
})

test('constants - RPC_TIMEOUT', (t) => {
  t.is(RPC_TIMEOUT, 15000, 'should be 15000 milliseconds')
  t.ok(typeof RPC_TIMEOUT === 'number', 'should be number')
  t.ok(RPC_TIMEOUT > 0, 'should be positive')
  t.pass()
})

test('constants - RPC_CONCURRENCY_LIMIT', (t) => {
  t.is(RPC_CONCURRENCY_LIMIT, 2, 'should be 2')
  t.ok(typeof RPC_CONCURRENCY_LIMIT === 'number', 'should be number')
  t.ok(RPC_CONCURRENCY_LIMIT > 0, 'should be positive')
  t.pass()
})

test('constants - all exports are defined', (t) => {
  const constants = require('../../../workers/lib/constants')

  t.ok(constants.SUPER_ADMIN_ROLE, 'should export SUPER_ADMIN_ROLE')
  t.ok(constants.GLOBAL_DATA_TYPES, 'should export GLOBAL_DATA_TYPES')
  t.ok(constants.SUPER_ADMIN_ID, 'should export SUPER_ADMIN_ID')
  t.ok(constants.MIGRATED_USER_ROLES, 'should export MIGRATED_USER_ROLES')
  t.ok(constants.COMMENT_ACTION, 'should export COMMENT_ACTION')
  t.ok(constants.AUTH_PERMISSIONS, 'should export AUTH_PERMISSIONS')
  t.ok(constants.AUTH_LEVELS, 'should export AUTH_LEVELS')
  t.ok(constants.AUTH_CAPS, 'should export AUTH_CAPS')
  t.ok(constants.ENDPOINTS, 'should export ENDPOINTS')
  t.ok(constants.HTTP_METHODS, 'should export HTTP_METHODS')
  t.ok(constants.OPERATIONS, 'should export OPERATIONS')
  t.ok(constants.DEFAULTS, 'should export DEFAULTS')
  t.ok(constants.STATUS_CODES, 'should export STATUS_CODES')
  t.ok(constants.RPC_TIMEOUT, 'should export RPC_TIMEOUT')
  t.ok(constants.RPC_CONCURRENCY_LIMIT, 'should export RPC_CONCURRENCY_LIMIT')
  t.ok(constants.USER_SETTINGS_TYPE, 'should export USER_SETTINGS_TYPE')

  t.pass()
})

test('constants - ENDPOINTS structure', (t) => {
  // Test that all endpoint values are strings starting with / or /oauth
  Object.values(ENDPOINTS).forEach(endpoint => {
    t.ok(typeof endpoint === 'string', `endpoint ${endpoint} should be string`)
    t.ok(endpoint.startsWith('/'), `endpoint ${endpoint} should start with /`)
  })

  t.pass()
})

test('constants - HTTP_METHODS values match keys', (t) => {
  Object.entries(HTTP_METHODS).forEach(([key, value]) => {
    t.is(key, value, `HTTP_METHOD ${key} should equal its value`)
  })

  t.pass()
})

test('constants - AUTH_CAPS values match AUTH_PERMISSIONS', (t) => {
  Object.entries(AUTH_CAPS).forEach(([key, value]) => {
    const permissionKey = Object.keys(AUTH_PERMISSIONS).find(k => AUTH_PERMISSIONS[k] === value)
    t.ok(permissionKey, `AUTH_CAPS value ${value} should exist in AUTH_PERMISSIONS`)
  })

  t.pass()
})

test('constants - OPERATIONS naming convention', (t) => {
  // Test that operations follow the pattern: resource.action or resource.subresource.action
  Object.values(OPERATIONS).forEach(operation => {
    t.ok(typeof operation === 'string', `operation ${operation} should be string`)
    t.ok(operation.includes('.'), `operation ${operation} should contain dots`)
    const parts = operation.split('.')
    t.ok(parts.length >= 2, `operation ${operation} should have at least 2 parts`)
  })

  t.pass()
})

test('constants - STATUS_CODES are valid HTTP status codes', (t) => {
  const validStatusCodes = [200, 400, 401, 403, 404, 500]
  Object.values(STATUS_CODES).forEach(code => {
    t.ok(validStatusCodes.includes(code), `status code ${code} should be valid`)
    t.ok(code >= 200 && code <= 599, `status code ${code} should be in valid range`)
  })

  t.pass()
})

test('constants - GLOBAL_DATA_TYPES values are strings', (t) => {
  Object.values(GLOBAL_DATA_TYPES).forEach(type => {
    t.ok(typeof type === 'string', `type ${type} should be string`)
    t.ok(type.length > 0, `type ${type} should not be empty`)
  })

  t.pass()
})

test('constants - MIGRATED_USER_ROLES values are strings', (t) => {
  Object.values(MIGRATED_USER_ROLES).forEach(role => {
    t.ok(typeof role === 'string', `role ${role} should be string`)
    t.ok(role.length > 0, `role ${role} should not be empty`)
  })

  t.pass()
})

test('constants - COMMENT_ACTION values are strings', (t) => {
  Object.values(COMMENT_ACTION).forEach(action => {
    t.ok(typeof action === 'string', `action ${action} should be string`)
    t.ok(action.length > 0, `action ${action} should not be empty`)
  })

  t.pass()
})
