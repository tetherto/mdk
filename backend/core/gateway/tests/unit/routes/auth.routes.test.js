'use strict'

const test = require('brittle')
const { testModuleStructure } = require('../helpers/routeTestHelpers')

test('auth routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/auth.routes.js', 'auth')
  t.pass()
})

test('auth routes - contains only OAuth callback routes', (t) => {
  const mockCtx = {
    auth_a0: { authCallbackHandler: async () => 'token' },
    httpdOauth2_h0: { callbackUriUI: () => 'http://localhost:3000/callback' },
    httpdOauth2_h1: { callbackUriUI: () => 'http://localhost:3000/ms-callback' }
  }
  const routes = require('../../../workers/lib/server/routes/auth.routes.js')(mockCtx)
  const routeUrls = routes.map(r => r.url)

  t.ok(routeUrls.includes('/oauth/google/callback'), 'should have OAuth Google callback route')
  t.ok(routeUrls.includes('/oauth/microsoft/callback'), 'should have OAuth Microsoft callback route')
  t.is(routes.length, 2, 'only OAuth callbacks remain — data api routes are in the auth plugin')
  t.pass()
})

test('auth routes - Google callback redirects with token', async (t) => {
  const mockCtx = {
    auth_a0: {
      authCallbackHandler: async (provider) => {
        t.is(provider, 'google', 'should invoke google auth provider')
        return 'google-token'
      }
    },
    httpdOauth2_h0: {
      callbackUriUI: () => 'http://localhost:3000/callback'
    }
  }
  const routes = require('../../../workers/lib/server/routes/auth.routes.js')(mockCtx)
  const oauthRoute = routes.find(r => r.url === '/oauth/google/callback')

  let redirectUrl
  const rep = {
    redirect (url) {
      redirectUrl = url
      return url
    }
  }

  await oauthRoute.handler({}, rep)
  t.ok(redirectUrl.includes('http://localhost:3000/callback?'), 'should redirect to UI callback URI')
  t.ok(redirectUrl.includes('authToken=google-token'), 'should include auth token in querystring')
  t.pass()
})

test('auth routes - Microsoft callback redirects with error', async (t) => {
  const mockCtx = {
    auth_a0: {
      authCallbackHandler: async (provider) => {
        t.is(provider, 'microsoft', 'should invoke microsoft auth provider')
        throw new Error('ERR_MICROSOFT_AUTH')
      }
    },
    httpdOauth2_h0: { callbackUriUI: () => 'http://localhost:3000/callback' },
    httpdOauth2_h1: { callbackUriUI: () => 'http://localhost:3000/ms-callback' }
  }
  const routes = require('../../../workers/lib/server/routes/auth.routes.js')(mockCtx)
  const oauthRoute = routes.find(r => r.url === '/oauth/microsoft/callback')

  let redirectUrl
  const rep = {
    redirect (url) {
      redirectUrl = url
      return url
    }
  }

  await oauthRoute.handler({}, rep)
  t.ok(redirectUrl.includes('http://localhost:3000/ms-callback?'), 'should redirect to microsoft UI callback URI')
  t.ok(redirectUrl.includes('error=ERR_MICROSOFT_AUTH'), 'should include error in querystring')
  t.pass()
})
