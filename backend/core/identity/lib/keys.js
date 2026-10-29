'use strict'

const crypto = require('crypto')

// Ed25519 keys in the two shapes MDK uses: JWKs for the issuer's signing keys
// (published as a JWKS), and raw 32-byte hex public keys for service-account
// credentials (the same convention as the trusted-keys dir).

const HEX_KEY = /^[0-9a-f]{64}$/

/** RFC 7638 thumbprint of an Ed25519 JWK, shortened: a stable `kid`. */
function thumbprint (publicJwk) {
  const canonical = JSON.stringify({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x })
  return crypto.createHash('sha256').update(canonical).digest('base64url').slice(0, 16)
}

/** A new signing key: `{ kid, privateJwk, publicJwk }`. */
function generateSigningKey () {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const publicJwk = publicKey.export({ format: 'jwk' })
  const privateJwk = privateKey.export({ format: 'jwk' })
  const kid = thumbprint(publicJwk)
  return { kid, privateJwk, publicJwk: { ...publicJwk, kid, alg: 'EdDSA', use: 'sig' } }
}

function privateKeyFromJwk (jwk) {
  return crypto.createPrivateKey({ key: jwk, format: 'jwk' })
}

function publicKeyFromJwk (jwk) {
  if (!jwk || jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') {
    throw new Error('ERR_IDENTITY_KEY_INVALID: expected an Ed25519 OKP JWK')
  }
  return crypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, format: 'jwk' })
}

/** Normalize a raw Ed25519 public key (hex or Buffer) to lowercase hex. */
function normalizePublicKey (key) {
  const hex = Buffer.isBuffer(key) ? key.toString('hex') : (typeof key === 'string' ? key.trim().toLowerCase() : '')
  if (!HEX_KEY.test(hex)) throw new Error('ERR_IDENTITY_KEY_INVALID: expected a 32-byte hex Ed25519 public key')
  return hex
}

function publicKeyFromHex (hex) {
  return publicKeyFromJwk({ kty: 'OKP', crv: 'Ed25519', x: Buffer.from(normalizePublicKey(hex), 'hex').toString('base64url') })
}

/**
 * A service-account credential: the private key stays in this instance
 * (written to a 0600 file by the CLI), the public key is registered with the
 * issuer. Never part of a package.
 * @returns {{ publicKey: string, privateKeyPem: string }}
 */
function generateCredential () {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const x = publicKey.export({ format: 'jwk' }).x
  return {
    publicKey: Buffer.from(x, 'base64url').toString('hex'),
    privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' })
  }
}

/** The hex public key of a PEM (or KeyObject) Ed25519 private key. */
function publicKeyOfPrivate (privateKey) {
  const key = typeof privateKey === 'string' ? crypto.createPrivateKey(privateKey) : privateKey
  return Buffer.from(crypto.createPublicKey(key).export({ format: 'jwk' }).x, 'base64url').toString('hex')
}

module.exports = {
  thumbprint,
  generateSigningKey,
  privateKeyFromJwk,
  publicKeyFromJwk,
  publicKeyFromHex,
  normalizePublicKey,
  generateCredential,
  publicKeyOfPrivate
}
