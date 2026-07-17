'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')

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
  }
]
