'use strict'

const test = require('brittle')
const AuthLib = require('../../../workers/lib/auth')
const { MIGRATED_USER_ROLES } = require('../../../workers/lib/constants')

test('AuthLib - constructor', (t) => {
  const mockHttpc = {}
  const mockHttpd = {}
  const mockUserService = {}
  const mockAuth = {}

  const authLib = new AuthLib({
    httpc: mockHttpc,
    httpd: mockHttpd,
    userService: mockUserService,
    auth: mockAuth
  })

  t.ok(authLib._httpc === mockHttpc, 'should store httpc')
  t.ok(authLib._httpd === mockHttpd, 'should store httpd')
  t.ok(authLib._userService === mockUserService, 'should store userService')
  t.ok(authLib._auth === mockAuth, 'should store auth')

  t.pass()
})

test('AuthLib - migrateUsers skips when users exist', async (t) => {
  const mockUsers = [
    { id: 1, email: 'admin@example.com' },
    { id: 2, email: 'user@example.com' }
  ]
  const mockAuth = {
    listUsers: async () => mockUsers
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  await authLib.migrateUsers({ conf: { users: [] } })

  t.pass()
})

test('AuthLib - migrateUsers migrates old users', async (t) => {
  const mockUsers = [
    { id: 1, email: 'admin@example.com' }
  ]
  const oldUsers = [
    { email: 'olduser1@example.com', write: true },
    { email: 'olduser2@example.com', write: false }
  ]
  const createUserCalls = []
  const mockUserService = {
    createUser: async (data) => {
      createUserCalls.push(data)
    }
  }
  const mockAuth = {
    listUsers: async () => mockUsers
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: mockUserService,
    auth: mockAuth
  })

  await authLib.migrateUsers({ conf: { users: oldUsers } })

  t.is(createUserCalls.length, 2, 'should create users for old users')
  t.is(createUserCalls[0].email, 'olduser1@example.com', 'should migrate first user')
  t.is(createUserCalls[0].role, MIGRATED_USER_ROLES.DEFAULT, 'should assign default role for write user')
  t.is(createUserCalls[1].email, 'olduser2@example.com', 'should migrate second user')
  t.is(createUserCalls[1].role, MIGRATED_USER_ROLES.READ_ONLY, 'should assign read-only role for non-write user')

  t.pass()
})

test('AuthLib - migrateUsers skips super admin', async (t) => {
  const mockUsers = [
    { id: 1, email: 'admin@example.com' }
  ]
  const oldUsers = [
    { email: 'admin@example.com', write: true },
    { email: 'user@example.com', write: true }
  ]
  const createUserCalls = []
  const mockUserService = {
    createUser: async (data) => {
      createUserCalls.push(data)
    }
  }
  const mockAuth = {
    listUsers: async () => mockUsers
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: mockUserService,
    auth: mockAuth
  })

  await authLib.migrateUsers({ conf: { users: oldUsers } })

  t.is(createUserCalls.length, 1, 'should skip super admin')
  t.is(createUserCalls[0].email, 'user@example.com', 'should only migrate non-admin user')

  t.pass()
})

test('AuthLib - start adds OAuth handlers', async (t) => {
  let handlersAdded = null
  const mockAuth = {
    addHandlers: function (handlers) {
      handlersAdded = handlers
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  await authLib.start()

  t.ok(handlersAdded, 'should call addHandlers')
  t.ok(handlersAdded.google, 'should add google handler')
  t.ok(typeof handlersAdded.google === 'function', 'google handler should be function')
  t.ok(handlersAdded.microsoft, 'should add microsoft handler')
  t.ok(typeof handlersAdded.microsoft === 'function', 'microsoft handler should be function')

  t.pass()
})

test('AuthLib - regenerateToken', async (t) => {
  let regenerateTokenCalled = false
  let regenerateTokenArgs = null
  const mockAuth = {
    regenerateToken: async (args) => {
      regenerateTokenCalled = true
      regenerateTokenArgs = args
      return 'new-token'
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  const result = await authLib.regenerateToken({
    oldToken: 'old-token',
    ips: ['127.0.0.1'],
    ttl: 300,
    pfx: 'pub',
    scope: 'api',
    roles: ['admin']
  })

  t.ok(regenerateTokenCalled, 'should call auth.regenerateToken')
  t.is(regenerateTokenArgs.oldToken, 'old-token', 'should pass oldToken')
  t.is(regenerateTokenArgs.ips[0], '127.0.0.1', 'should pass ips')
  t.is(regenerateTokenArgs.ttl, 300, 'should pass ttl')
  t.is(regenerateTokenArgs.pfx, 'pub', 'should pass pfx')
  t.is(regenerateTokenArgs.scope, 'api', 'should pass scope')
  t.is(regenerateTokenArgs.roles[0], 'admin', 'should pass roles')
  t.is(result, 'new-token', 'should return new token')

  t.pass()
})

test('AuthLib - resolveToken', async (t) => {
  let resolveTokenCalled = false
  let resolveTokenArgs = null
  const mockAuth = {
    resolveToken: async (token, ips, opts) => {
      resolveTokenCalled = true
      resolveTokenArgs = { token, ips, opts }
      return { userId: 123 }
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  const result = await authLib.resolveToken('test-token', ['127.0.0.1'])

  t.ok(resolveTokenCalled, 'should call auth.resolveToken')
  t.is(resolveTokenArgs.token, 'test-token', 'should pass token')
  t.is(resolveTokenArgs.ips[0], '127.0.0.1', 'should pass ips')
  t.ok(resolveTokenArgs.opts.updateLastActive, 'should set updateLastActive')
  t.ok(result.userId, 'should return resolved token data')

  t.pass()
})

test('AuthLib - getTokenPerms with super admin', async (t) => {
  const mockAuth = {
    getTokenPerms: function (token) {
      return { superadmin: true, perms: [] }
    },
    tokenHasPerms: async () => false,
    conf: {
      superAdminPerms: ['perm1', 'perm2']
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  const result = await authLib.getTokenPerms('token')

  t.is(result.write, true, 'should return write=true for super admin')
  t.is(result.superAdmin, true, 'should return superAdmin=true')
  t.is(result.permissions.length, 2, 'should return superAdminPerms')
  t.is(result.caps.length, 2, 'should return caps from permissions')

  t.pass()
})

test('AuthLib - getTokenPerms with regular user', async (t) => {
  const mockAuth = {
    getTokenPerms: function (token) {
      return { superadmin: false, perms: ['actions:r', 'miner:r'] }
    },
    tokenHasPerms: async (token, perm) => {
      return perm === 'actions:w'
    },
    conf: {
      superAdminPerms: []
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  const result = await authLib.getTokenPerms('token')

  t.is(result.write, true, 'should return write based on actions:w permission')
  t.is(result.superAdmin, false, 'should return superAdmin=false')
  t.is(result.permissions.length, 2, 'should return user perms')
  t.is(result.caps.length, 2, 'should return caps from permissions')

  t.pass()
})

test('AuthLib - tokenHasPerms with super admin', async (t) => {
  const mockAuth = {
    getTokenPerms: function () {
      return { superadmin: true, perms: [] }
    },
    tokenHasPerms: async () => false,
    conf: {
      superAdminPerms: []
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  const result = await authLib.tokenHasPerms('token', true, ['perm1', 'perm2'])

  t.is(result, true, 'should return true for super admin')

  t.pass()
})

test('AuthLib - tokenHasPerms without write permission', async (t) => {
  const mockAuth = {
    getTokenPerms: function () {
      return { superadmin: false, perms: [] }
    },
    tokenHasPerms: async () => false,
    conf: {
      superAdminPerms: []
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  const result = await authLib.tokenHasPerms('token', true, ['perm1'])

  t.is(result, false, 'should return false when write required but not available')

  t.pass()
})

test('AuthLib - tokenHasPerms with matchAll=true', async (t) => {
  const mockAuth = {
    getTokenPerms: function () {
      return { superadmin: false, perms: [] }
    },
    tokenHasPerms: async (token, perm) => {
      return perm === 'perm1'
    },
    conf: {
      superAdminPerms: []
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  const result = await authLib.tokenHasPerms('token', false, ['perm1', 'perm2'], true)

  t.is(result, false, 'should return false when matchAll and not all perms match')

  t.pass()
})

test('AuthLib - tokenHasPerms with matchAll=false', async (t) => {
  const mockAuth = {
    getTokenPerms: function () {
      return { superadmin: false, perms: [] }
    },
    tokenHasPerms: async (token, perm) => {
      return perm === 'perm1'
    },
    conf: {
      superAdminPerms: []
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  const result = await authLib.tokenHasPerms('token', false, ['perm1', 'perm2'], false)

  t.is(result, true, 'should return true when matchAll=false and at least one perm matches')

  t.pass()
})

test('AuthLib - cleanupTokens', async (t) => {
  let cleanupTokensCalled = false
  const mockAuth = {
    cleanupTokens: async () => {
      cleanupTokensCalled = true
    }
  }
  const authLib = new AuthLib({
    httpc: {},
    httpd: {},
    userService: {},
    auth: mockAuth
  })

  await authLib.cleanupTokens()

  t.ok(cleanupTokensCalled, 'should call auth.cleanupTokens')

  t.pass()
})

test('AuthLib - _resolveOAuthGoogle with valid response', async (t) => {
  const mockOAuthRes = {
    token: {
      access_token: 'access-token-123'
    }
  }
  const mockUserInfo = {
    email: 'user@example.com',
    name: 'Test User'
  }
  const mockHttpd = {
    server: {
      googleOAuth2: {
        getAccessTokenFromAuthorizationCodeFlow: async () => mockOAuthRes
      }
    }
  }
  const mockHttpc = {
    get: async (url, opts) => {
      t.is(url, 'https://www.googleapis.com/oauth2/v2/userinfo', 'should call correct URL')
      t.is(opts.headers.authorization, 'Bearer access-token-123', 'should pass authorization header')
      return { body: mockUserInfo }
    }
  }
  const authLib = new AuthLib({
    httpc: mockHttpc,
    httpd: mockHttpd,
    userService: {},
    auth: {}
  })

  const result = await authLib._resolveOAuthGoogle({}, {})

  t.ok(result, 'should return result')
  t.is(result.email, 'user@example.com', 'should return email')

  t.pass()
})

test('AuthLib - _resolveOAuthGoogle with null info', async (t) => {
  const mockOAuthRes = {
    token: {
      access_token: 'access-token-123'
    }
  }
  const mockHttpd = {
    server: {
      googleOAuth2: {
        getAccessTokenFromAuthorizationCodeFlow: async () => mockOAuthRes
      }
    }
  }
  const mockHttpc = {
    get: async () => {
      return { body: null }
    }
  }
  const authLib = new AuthLib({
    httpc: mockHttpc,
    httpd: mockHttpd,
    userService: {},
    auth: {}
  })

  const result = await authLib._resolveOAuthGoogle({}, {})

  t.is(result, null, 'should return null when info is null')

  t.pass()
})

test('AuthLib - _resolveOAuthMicrosoft with valid profile mail', async (t) => {
  const originalFetch = global.fetch
  global.fetch = async (url, opts) => {
    t.is(url, 'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,otherMails', 'should call graph /me endpoint')
    t.is(opts.headers.authorization, 'Bearer ms-token-123', 'should pass bearer token')
    return {
      ok: true,
      json: async () => ({ mail: 'microsoft.user@example.com' })
    }
  }

  const authLib = new AuthLib({
    httpc: {},
    httpd: {
      server: {
        microsoftOAuth2: {
          getAccessTokenFromAuthorizationCodeFlow: async () => ({ token: { access_token: 'ms-token-123' } })
        }
      }
    },
    userService: {},
    auth: {}
  })

  try {
    const result = await authLib._resolveOAuthMicrosoft({}, {})
    t.alike(result, { email: 'microsoft.user@example.com' }, 'should return email from profile mail')
  } finally {
    global.fetch = originalFetch
  }

  t.pass()
})

test('AuthLib - _resolveOAuthMicrosoft prefers otherMails for guest mail', async (t) => {
  const originalFetch = global.fetch
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      mail: 'guest_user_example.com#EXT#@tenant.onmicrosoft.com',
      userPrincipalName: 'guest_user_example.com#EXT#@tenant.onmicrosoft.com',
      otherMails: ['primary.user@example.com']
    })
  })

  const authLib = new AuthLib({
    httpc: {},
    httpd: {
      server: {
        microsoftOAuth2: {
          getAccessTokenFromAuthorizationCodeFlow: async () => ({ token: { access_token: 'ms-token-123' } })
        }
      }
    },
    userService: {},
    auth: {}
  })

  try {
    const result = await authLib._resolveOAuthMicrosoft({}, {})
    t.alike(result, { email: 'primary.user@example.com' }, 'should prefer non-guest email from otherMails')
  } finally {
    global.fetch = originalFetch
  }

  t.pass()
})

test('AuthLib - _resolveOAuthMicrosoft throws when token exchange fails', async (t) => {
  const authLib = new AuthLib({
    httpc: {},
    httpd: {
      server: {
        microsoftOAuth2: {
          getAccessTokenFromAuthorizationCodeFlow: async () => {
            throw new Error('token exchange failed')
          }
        }
      }
    },
    userService: {},
    auth: {}
  })

  try {
    await authLib._resolveOAuthMicrosoft({}, {})
    t.fail('should throw on token exchange failure')
  } catch (err) {
    t.is(err.message, 'token exchange failed', 'should bubble token exchange error message')
  }

  t.pass()
})

test('AuthLib - _resolveOAuthMicrosoft throws when graph request fails', async (t) => {
  const originalFetch = global.fetch
  global.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => 'unauthorized'
  })

  const authLib = new AuthLib({
    httpc: {},
    httpd: {
      server: {
        microsoftOAuth2: {
          getAccessTokenFromAuthorizationCodeFlow: async () => ({ token: { access_token: 'ms-token-123' } })
        }
      }
    },
    userService: {},
    auth: {}
  })

  try {
    await authLib._resolveOAuthMicrosoft({}, {})
    t.fail('should throw on graph failure')
  } catch (err) {
    t.is(err.message, 'ERR_MICROSOFT_GRAPH_401: unauthorized', 'should include graph status and body')
  } finally {
    global.fetch = originalFetch
  }

  t.pass()
})
