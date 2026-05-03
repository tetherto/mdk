'use strict'
const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')

const {
  getUserInfo,
  newAuthToken,
  getUserPermissions,
  extDataRoute
} = require('../handlers/auth.handlers')
const { createAuthRoute, createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.OAUTH_GOOGLE_CALLBACK,
    handler: async (req, rep) => {
      const qs = new URLSearchParams()

      try {
        const token = await ctx.auth_a0.authCallbackHandler('google', req)
        qs.set('authToken', token)
      } catch (err) {
        qs.set('error', err.message)
      }

      const redirectUri = ctx.httpdOauth2_h0.callbackUriUI() + '?' + qs.toString()
      return rep.redirect(redirectUri)
    }
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.OAUTH_MICROSOFT_CALLBACK,
    handler: async (req, rep) => {
      const qs = new URLSearchParams()

      try {
        const token = await ctx.auth_a0.authCallbackHandler('microsoft', req)
        qs.set('authToken', token)
      } catch (err) {
        qs.set('error', err.message)
      }

      const redirectUri = ctx.httpdOauth2_h1?.callbackUriUI?.() + '?' + qs.toString()
      return rep.redirect(redirectUri)
    }
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.USERINFO,
    ...createAuthRoute(ctx, getUserInfo)
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.TOKEN,
    ...createAuthRoute(ctx, async (ctx, req) => ({ token: await newAuthToken(ctx, req) }))
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.PERMISSIONS,
    ...createAuthRoute(ctx, async (ctx, req) => ({ permissions: await getUserPermissions(ctx, req) }))
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.EXT_DATA,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          query: { type: 'string' },
          overwriteCache: { type: 'boolean' }
        },
        required: ['type']
      }
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => ['ext-data', req.query.type, req.query.query],
      ENDPOINTS.EXT_DATA,
      extDataRoute
    )
  }
]
