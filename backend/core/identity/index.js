'use strict'

/**
 * @tetherto/mdk-identity — the token issuer and the token tools around it.
 *
 *   const issuer = new TokenIssuer({ bee })         // the Kernel runs one
 *   await issuer.ready()
 *   await issuer.login({ username, password })      // → { accessToken, refreshToken, ... }
 *   await issuer.token({ assertion, cnf })          // service account sign-in
 *   await issuer.refresh({ refreshToken })          // rotates; reuse revokes the session
 *
 *   const verifier = createVerifier({ jwks })       // Gateway / MCP server / Kernel
 *   identityFromClaims(verifier.verify(token))      // → what @tetherto/mdk-rbac evaluates
 */

const { TokenIssuer, USER_NAME, SA_NAME } = require('./lib/issuer')
const { createVerifier, identityFromClaims } = require('./lib/verifier')
const { createAssertion, ServiceAccountTokenSource } = require('./lib/assertion')
const { gatewayTokenRequest } = require('./lib/http')
const { signJwt, decodeJwt, verifyJwt } = require('./lib/jwt')
const { hashPassword, verifyPassword, checkPassword, MIN_LENGTH } = require('./lib/passwords')
const keys = require('./lib/keys')

module.exports = {
  TokenIssuer,
  createVerifier,
  identityFromClaims,
  createAssertion,
  ServiceAccountTokenSource,
  gatewayTokenRequest,
  signJwt,
  decodeJwt,
  verifyJwt,
  hashPassword,
  verifyPassword,
  checkPassword,
  PASSWORD_MIN_LENGTH: MIN_LENGTH,
  USER_NAME,
  SA_NAME,
  generateCredential: keys.generateCredential,
  publicKeyOfPrivate: keys.publicKeyOfPrivate,
  normalizePublicKey: keys.normalizePublicKey
}
