'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')
const { saveUserSettings, getUserSettings } = require('../handlers/users.handlers')
const { createAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.USER_SETTINGS,
    ...createAuthRoute(ctx, getUserSettings)
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.USER_SETTINGS,
    schema: {
      body: {
        type: 'object',
        properties: {
          settings: { type: 'object' }
        },
        required: ['settings']
      }
    },
    ...createAuthRoute(ctx, async (ctx, req) => {
      const success = await saveUserSettings(ctx, req)
      return { success }
    })
  }
]
