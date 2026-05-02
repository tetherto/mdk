'use strict'

const { authCheck } = require('../lib/authCheck')
const { send200 } = require('../lib/send200')
const { capCheck } = require('../lib/capCheck')
const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')
const {
  createUser,
  listUsers,
  updateUser,
  deleteUser,
  getRolesPermissions
} = require('../handlers/users.handlers')
const { createAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.USERS,
    schema: {
      body: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              role: { type: 'string' }
            },
            required: ['email', 'role']
          }
        },
        required: ['data']
      }
    },
    onRequest: async (req, rep) => {
      await authCheck(ctx, req, rep)
      await capCheck(ctx, req, rep, ['users:w'])
    },
    handler: async (req, rep) => {
      const user = await createUser(ctx, req, rep)
      return send200(rep, { user })
    }
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.USERS,
    onRequest: async (req, rep) => {
      await authCheck(ctx, req, rep)
      await capCheck(ctx, req, rep, ['users:w'])
    },
    handler: async (req, rep) => {
      const users = await listUsers(ctx, req, rep)
      return send200(rep, { users })
    }
  },
  {
    method: HTTP_METHODS.PUT,
    url: ENDPOINTS.USERS,
    schema: {
      body: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' }
            },
            required: ['id', 'email', 'role']
          }
        },
        required: ['data']
      }
    },
    onRequest: async (req, rep) => {
      await authCheck(ctx, req, rep)
      await capCheck(ctx, req, rep, ['users:w'])
    },
    handler: async (req, rep) => {
      const user = await updateUser(ctx, req, rep)
      return send200(rep, { user })
    }
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.USERS_DELETE,
    schema: {
      body: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              id: { type: 'number' }
            },
            required: ['id']
          }
        },
        required: ['data']
      }
    },
    onRequest: async (req, rep) => {
      await authCheck(ctx, req, rep)
      await capCheck(ctx, req, rep, ['users:w'])
    },
    handler: async (req, rep) => {
      const success = await deleteUser(ctx, req, rep)
      return send200(rep, { success })
    }
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.ROLES_PERMISSIONS,
    ...createAuthRoute(ctx, getRolesPermissions, ['users:w'])
  }
]
