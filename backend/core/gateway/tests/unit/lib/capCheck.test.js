'use strict'

const test = require('brittle')
const { capCheck } = require('../../../workers/lib/server/lib/capCheck')

test('capCheck - has permissions', async (t) => {
  const mockCtx = {
    authLib: {
      tokenHasPerms: async (token, write, perms) => {
        t.is(token, 'test-token', 'should pass token')
        t.is(write, true, 'should pass write flag')
        t.is(perms[0], 'test:perm', 'should pass permissions')
        return true
      }
    }
  }

  const mockReq = {
    _info: {
      authToken: 'test-token'
    }
  }

  const mockRep = {}

  await capCheck(mockCtx, mockReq, mockRep, ['test:perm'], true)
  t.pass()
})

test('capCheck - no permissions', async (t) => {
  const mockCtx = {
    authLib: {
      tokenHasPerms: async () => false
    }
  }

  const mockReq = {
    _info: {
      authToken: 'test-token'
    }
  }

  const mockRep = {
    status: function (code) {
      t.is(code, 401, 'should return 401 status')
      return this
    },
    send: function (data) {
      t.is(data.message, 'ERR_AUTH_FAIL_NO_PERMS', 'should return ERR_AUTH_FAIL_NO_PERMS')
      return this
    }
  }

  await capCheck(mockCtx, mockReq, mockRep, ['test:perm'], true)
  t.pass()
})

test('capCheck - write flag false', async (t) => {
  const mockCtx = {
    authLib: {
      tokenHasPerms: async (token, write, perms) => {
        t.is(write, false, 'should pass write flag as false')
        return true
      }
    }
  }

  const mockReq = {
    _info: {
      authToken: 'test-token'
    }
  }

  const mockRep = {}

  await capCheck(mockCtx, mockReq, mockRep, ['test:perm'], false)
  t.pass()
})
