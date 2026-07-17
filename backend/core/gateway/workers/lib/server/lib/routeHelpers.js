'use strict'

const { authCheck } = require('./authCheck')
const { send200 } = require('./send200')
const { cachedRoute } = require('./cachedRoute')
const { capCheck } = require('./capCheck')

/**
 * Creates a standard authenticated route handler
 * @param {Function} handler - The handler function (ctx, req, rep)
 * @returns {Function} Route handler
 */
function createAuthHandler (ctx, handler) {
  return async (req, rep) => {
    const result = await handler(ctx, req, rep)
    return send200(rep, result)
  }
}

/**
 * Creates an authenticated route
 * @param {Object} ctx - Context object
 * @param {Array} perms - Optional permissions
 * @returns {Function} onRequest handler
 */
function createAuthOnRequest (ctx, perms = null) {
  return async (req, rep) => {
    await authCheck(ctx, req, rep)
    if (perms) {
      await capCheck(ctx, req, rep, perms)
    }
  }
}

/**
 * Creates a cached route handler
 * @param {Object} ctx - Context object
 * @param {Array|Function} keyParts - Cache key parts or function to generate them
 * @param {string} endpoint - Endpoint path
 * @param {Function} handler - Handler function (ctx, req, rep)
 * @returns {Function} Route handler
 */
function createCachedHandler (ctx, keyParts, endpoint, handler) {
  return async (req, rep) => {
    const key = typeof keyParts === 'function' ? keyParts(req) : keyParts
    const handlerFunc = () => handler(ctx, req, rep)
    const result = await cachedRoute(ctx, key, endpoint, handlerFunc, !!req.query.overwriteCache)
    return send200(rep, result)
  }
}

/**
 * Creates a simple authenticated route
 * @param {Object} ctx - Context object
 * @param {Function} handler - Handler function (ctx, req, rep)
 * @param {Array} perms - Optional permissions array
 * @returns {Object} Route configuration
 */
function createAuthRoute (ctx, handler, perms = null) {
  return {
    onRequest: createAuthOnRequest(ctx, perms),
    handler: createAuthHandler(ctx, handler)
  }
}

/**
 * Creates a cached authenticated route
 * @param {Object} ctx - Context object
 * @param {Array|Function} keyParts - Cache key parts or function to generate them
 * @param {string} endpoint - Endpoint path
 * @param {Function} handler - Handler function (ctx, req, rep)
 * @param {Array} perms - Optional permissions array
 * @returns {Object} Route configuration
 */
function createCachedAuthRoute (ctx, keyParts, endpoint, handler, perms = null) {
  return {
    onRequest: createAuthOnRequest(ctx, perms),
    handler: createCachedHandler(ctx, keyParts, endpoint, handler)
  }
}

module.exports = {
  createAuthHandler,
  createAuthOnRequest,
  createCachedHandler,
  createAuthRoute,
  createCachedAuthRoute
}
