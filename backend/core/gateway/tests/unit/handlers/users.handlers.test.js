'use strict'

const test = require('brittle')
const {
  createUser,
  listUsers,
  updateUser,
  deleteUser,
  saveUserSettings,
  getUserSettings,
  getRolesPermissions
} = require('../../../workers/lib/server/handlers/users.handlers')
const { SUPER_ADMIN_ROLE, SUPER_ADMIN_ID } = require('../../../workers/lib/constants')
const { createMockAuthCtxWithRoles, createMockReqWithUser, createMockUserCtx } = require('../helpers/mockHelpers')

test('createUser - basic functionality', async (t) => {
  let createUserCalled = false
  const mockCtx = createMockUserCtx({
    createUser: async (data) => {
      createUserCalled = true
      t.is(data.email, 'test@example.com', 'should pass email')
      t.is(data.name, 'Test User', 'should pass name')
      t.is(data.role, 'admin', 'should pass role')
      return { id: 123, email: 'test@example.com', name: 'Test User', role: 'admin' }
    }
  }, createMockAuthCtxWithRoles({ admin: {} }, { admin: ['admin', 'user'] }))
  const originalLog = console.log

  const mockReq = createMockReqWithUser(
    {},
    {
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
    },
    undefined,
    'admin@example.com',
    '["admin"]'
  )

  const result = await createUser(mockCtx, mockReq, {})

  console.log = originalLog

  t.ok(createUserCalled, 'should call userService.createUser')
  t.is(result.id, 123, 'should return created user id')
  t.is(result.email, 'test@example.com', 'should return created user email')
  t.is(result.name, 'Test User', 'should return created user name')
  t.is(result.role, 'admin', 'should return created user role')

  t.pass()
})

test('createUser - with invalid email', async (t) => {
  const mockCtx = createMockUserCtx({}, createMockAuthCtxWithRoles({ admin: {} }, { admin: ['admin'] }))
  const mockReq = createMockReqWithUser(
    {},
    { data: { email: 'invalid-email', role: 'admin' } },
    undefined,
    'admin@example.com',
    '["admin"]'
  )

  try {
    await createUser(mockCtx, mockReq, {})
    t.fail('should throw error for invalid email')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_EMAIL', 'should throw ERR_INVALID_EMAIL')
  }

  t.pass()
})

test('createUser - with invalid role', async (t) => {
  const mockCtx = createMockUserCtx({}, createMockAuthCtxWithRoles({ admin: {} }, { admin: ['admin'] }))
  const mockReq = createMockReqWithUser(
    {},
    { data: { email: 'test@example.com', role: 'invalid-role' } },
    undefined,
    'admin@example.com',
    '["admin"]'
  )

  try {
    await createUser(mockCtx, mockReq, {})
    t.fail('should throw error for invalid role')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_ROLE', 'should throw ERR_INVALID_ROLE')
  }

  t.pass()
})

test('listUsers - basic functionality', async (t) => {
  const mockCtx = {
    userService: {
      listUsers: async () => [
        { id: 2, email: 'user1@example.com', role: 'user' },
        { id: 3, email: 'user2@example.com', role: 'admin' }
      ]
    },
    auth_a0: {
      conf: {
        roleManagement: {
          admin: ['user', 'admin']
        }
      }
    }
  }
  const mockReq = {
    _info: {
      user: {
        metadata: {
          roles: '["admin"]'
        }
      }
    }
  }

  const result = await listUsers(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should return filtered users')

  t.pass()
})

test('listUsers - with super admin', async (t) => {
  const mockCtx = {
    userService: {
      listUsers: async () => [
        { id: 2, email: 'user1@example.com', role: 'user' }
      ]
    }
  }
  const mockReq = {
    _info: {
      user: {
        metadata: {
          roles: `["${SUPER_ADMIN_ROLE}"]`
        }
      }
    }
  }

  const result = await listUsers(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 1, 'should return all users for super admin')

  t.pass()
})

test('listUsers - with role filtering', async (t) => {
  const mockCtx = {
    userService: {
      listUsers: async () => [
        { id: 2, email: 'user1@example.com', role: 'user' },
        { id: 3, email: 'user2@example.com', role: 'admin' }
      ]
    },
    auth_a0: {
      conf: {
        roleManagement: {
          user: ['user']
        }
      }
    }
  }
  const mockReq = {
    _info: {
      user: {
        metadata: {
          roles: '["user"]'
        }
      }
    }
  }

  const result = await listUsers(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 1, 'should filter by allowed roles')
  t.is(result[0].role, 'user', 'should return only allowed role')

  t.pass()
})

test('updateUser - basic functionality', async (t) => {
  let updateUserCalled = false
  const mockCtx = {
    userService: {
      getUser: async (id) => {
        return { id: 123, email: 'test@example.com', roles: '["user"]' }
      },
      updateUser: async (data) => {
        updateUserCalled = true
        return { id: 123, email: data.email, name: data.name, role: data.role }
      }
    },
    auth_a0: {
      conf: {
        roles: {
          admin: {},
          user: {}
        },
        roleManagement: {
          admin: ['user', 'admin']
        }
      }
    }
  }
  const mockReq = {
    body: {
      data: {
        id: 123,
        email: 'updated@example.com',
        name: 'Updated User',
        role: 'admin'
      }
    },
    _info: {
      user: {
        metadata: {
          email: 'admin@example.com',
          roles: '["admin"]'
        }
      }
    }
  }

  const result = await updateUser(mockCtx, mockReq, {})

  t.ok(updateUserCalled, 'should call userService.updateUser')
  t.is(result.id, 123, 'should return updated user id')
  t.is(result.email, 'updated@example.com', 'should return updated user email')
  t.is(result.name, 'Updated User', 'should return updated user name')
  t.is(result.role, 'admin', 'should return updated user role')

  t.pass()
})

test('updateUser - prevent super admin modification', async (t) => {
  const { auditLogger } = require('../../../workers/lib/server/lib/auditLogger')
  const originalConfig = auditLogger.config
  // Enable audit logging for this test
  auditLogger.setConfig({
    auditLogging: {
      enabled: true,
      logLevel: 'INFO',
      sensitiveOperations: ['security.event']
    }
  })

  let logSecurityEventCalled = false
  const originalLog = console.log
  console.log = (message) => {
    if (message.includes('SUPER_ADMIN_MODIFICATION_ATTEMPT')) {
      logSecurityEventCalled = true
    }
  }

  const mockCtx = {
    auth_a0: {
      conf: {
        roles: {
          admin: {},
          user: {}
        },
        roleManagement: {
          admin: ['admin', 'user']
        }
      }
    }
  }
  const mockReq = {
    body: {
      data: {
        id: SUPER_ADMIN_ID,
        email: 'hacked@example.com',
        role: 'user'
      }
    },
    _info: {
      user: {
        metadata: {
          email: 'admin@example.com',
          roles: '["admin"]'
        }
      }
    }
  }

  try {
    await updateUser(mockCtx, mockReq, {})
    t.fail('should throw error for super admin modification')
  } catch (err) {
    t.is(err.message, 'ERR_NOT_ALLOWED', 'should throw ERR_NOT_ALLOWED')
  }

  console.log = originalLog
  // Restore original config
  auditLogger.setConfig(originalConfig)
  t.ok(logSecurityEventCalled, 'should log security event')

  t.pass()
})

test('updateUser - with user not found', async (t) => {
  let getUserCallCount = 0
  const mockCtx = {
    userService: {
      getUser: async (id) => {
        getUserCallCount++
        // First call is from _validateRoleByUserId, second is from updateUser
        if (getUserCallCount === 1) {
          throw new Error('User not found')
        }
        // This shouldn't be reached, but if it is, throw again
        throw new Error('User not found')
      }
    },
    auth_a0: {
      conf: {
        roles: {
          admin: {}
        },
        roleManagement: {
          admin: ['admin']
        }
      }
    }
  }
  const mockReq = {
    body: {
      data: {
        id: 999,
        email: 'test@example.com',
        role: 'admin'
      }
    },
    _info: {
      user: {
        metadata: {
          email: 'admin@example.com',
          roles: '["admin"]'
        }
      }
    }
  }

  try {
    await updateUser(mockCtx, mockReq, {})
    t.fail('should throw error for user not found')
  } catch (err) {
    // The error from _validateRoleByUserId will propagate, not ERR_USER_NOT_FOUND
    // because _validateRoleByUserId doesn't catch and rethrow
    t.ok(err.message.includes('not found') || err.message === 'ERR_USER_NOT_FOUND', 'should throw error for user not found')
  }

  t.pass()
})

test('updateUser - with invalid role permission', async (t) => {
  const mockCtx = {
    userService: {
      getUser: async (id) => {
        return { id: 123, email: 'test@example.com', roles: '["user"]' }
      }
    },
    auth_a0: {
      conf: {
        roles: {
          admin: {},
          user: {}
        },
        roleManagement: {
          user: ['user']
        }
      }
    }
  }
  const mockReq = {
    body: {
      data: {
        id: 123,
        email: 'test@example.com',
        role: 'admin'
      }
    },
    _info: {
      user: {
        metadata: {
          email: 'user@example.com',
          roles: '["user"]'
        }
      }
    }
  }

  try {
    await updateUser(mockCtx, mockReq, {})
    t.fail('should throw error for invalid role permission')
  } catch (err) {
    t.is(err.message, 'ERR_AUTH_FAIL_NO_PERMS', 'should throw ERR_AUTH_FAIL_NO_PERMS')
  }

  t.pass()
})

test('deleteUser - basic functionality', async (t) => {
  let deleteUserCalled = false
  const mockCtx = {
    userService: {
      getUser: async (id) => {
        return { id: 123, email: 'test@example.com', roles: '["user"]' }
      },
      deleteUser: async (id) => {
        deleteUserCalled = true
        t.is(id, 123, 'should pass correct id')
        return true
      }
    },
    auth_a0: {
      conf: {
        roleManagement: {
          admin: ['user']
        }
      }
    }
  }
  const mockReq = {
    body: {
      data: {
        id: 123
      }
    },
    _info: {
      user: {
        userId: 456,
        metadata: {
          email: 'admin@example.com',
          roles: '["admin"]'
        }
      }
    }
  }

  const result = await deleteUser(mockCtx, mockReq, {})

  t.ok(deleteUserCalled, 'should call userService.deleteUser')
  t.is(result, true, 'should return result')

  t.pass()
})

test('deleteUser - prevent self-deletion', async (t) => {
  const mockCtx = {
    auth_a0: {
      conf: {
        roleManagement: {}
      }
    }
  }
  const mockReq = {
    body: {
      data: {
        id: 123
      }
    },
    _info: {
      user: {
        userId: 123,
        metadata: {
          email: 'user@example.com',
          roles: '["user"]'
        }
      }
    }
  }

  try {
    await deleteUser(mockCtx, mockReq, {})
    t.fail('should throw error for self-deletion')
  } catch (err) {
    t.is(err.message, 'ERR_AUTH_FAIL_NO_PERMS', 'should throw ERR_AUTH_FAIL_NO_PERMS')
  }

  t.pass()
})

test('deleteUser - with user not found', async (t) => {
  const mockCtx = {
    userService: {
      getUser: async (id) => {
        // First call is from _validateRoleByUserId, which will throw
        // Second call is from deleteUser try-catch, which will be caught and rethrown as ERR_USER_NOT_FOUND
        throw new Error('User not found')
      },
      deleteUser: async () => true
    },
    auth_a0: {
      conf: {
        roleManagement: {
          admin: ['user']
        }
      }
    }
  }
  const mockReq = {
    body: {
      data: {
        id: 999
      }
    },
    _info: {
      user: {
        userId: 456,
        metadata: {
          email: 'admin@example.com',
          roles: '["admin"]'
        }
      }
    }
  }

  try {
    await deleteUser(mockCtx, mockReq, {})
    t.fail('should throw error for user not found')
  } catch (err) {
    // _validateRoleByUserId throws first, so we get the raw error
    // The try-catch in deleteUser only catches the second getUser call
    t.ok(err.message.includes('not found') || err.message === 'ERR_USER_NOT_FOUND', 'should throw error for user not found')
  }

  t.pass()
})

test('saveUserSettings - basic functionality', async (t) => {
  let setUserSettingsCalled = false
  const mockCtx = {
    globalDataLib: {
      setUserSettings: async (userId, settings) => {
        setUserSettingsCalled = true
        t.is(userId, 123, 'should pass correct userId')
        return true
      }
    }
  }
  const mockReq = {
    body: {
      settings: { theme: 'dark' }
    },
    _info: {
      user: {
        userId: 123
      }
    }
  }

  const result = await saveUserSettings(mockCtx, mockReq, {})

  t.ok(setUserSettingsCalled, 'should call globalDataLib.setUserSettings')
  t.is(result, true, 'should return result')

  t.pass()
})

test('getUserSettings - basic functionality', async (t) => {
  let getUserSettingsCalled = false
  const mockCtx = {
    globalDataLib: {
      getUserSettings: async (userId) => {
        getUserSettingsCalled = true
        t.is(userId, 123, 'should pass correct userId')
        return { theme: 'dark' }
      }
    }
  }
  const mockReq = {
    _info: {
      user: {
        userId: 123
      }
    }
  }

  const result = await getUserSettings(mockCtx, mockReq, {})

  t.ok(getUserSettingsCalled, 'should call globalDataLib.getUserSettings')
  t.ok(result.theme, 'should return settings')

  t.pass()
})

test('getRolesPermissions - super admin returns all roles', (t) => {
  const mockCtx = {
    auth_a0: {
      conf: {
        roles: {
          admin: ['miner:rw', 'users:rw'],
          site_operator: ['miner:rw']
        },
        roleManagement: {
          admin: ['site_operator']
        }
      }
    }
  }
  const mockReq = {
    _info: {
      user: {
        metadata: {
          roles: `["${SUPER_ADMIN_ROLE}"]`
        }
      }
    }
  }

  const result = getRolesPermissions(mockCtx, mockReq)

  t.ok(result.roles, 'should return roles')
  t.ok(!result.roleManagement, 'should not return roleManagement')
  t.alike(result.roles.admin, ['miner:rw', 'users:rw'], 'should return correct admin permissions')

  t.pass()
})

test('getRolesPermissions - non-super admin returns filtered roles', (t) => {
  const mockCtx = {
    auth_a0: {
      conf: {
        roles: {
          admin: ['miner:rw', 'users:rw'],
          site_operator: ['miner:rw'],
          viewer: ['miner:r']
        },
        roleManagement: {
          admin: ['site_operator', 'viewer'],
          site_operator: ['viewer']
        }
      }
    }
  }
  const mockReq = {
    _info: {
      user: {
        metadata: {
          roles: '["admin"]'
        }
      }
    }
  }

  const result = getRolesPermissions(mockCtx, mockReq)

  t.ok(result.roles.site_operator, 'should include allowed role site_operator')
  t.ok(result.roles.viewer, 'should include allowed role viewer')
  t.ok(!result.roles.admin, 'should not include own role admin')
  t.ok(!result.roleManagement, 'should not return roleManagement')

  t.pass()
})
