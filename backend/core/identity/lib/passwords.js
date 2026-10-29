'use strict'

const crypto = require('crypto')
const { promisify } = require('util')

const scrypt = promisify(crypto.scrypt)

// scrypt password hashes, self-describing so the parameters can be raised
// later without invalidating stored hashes:
//   scrypt$<N>$<r>$<p>$<salt b64url>$<hash b64url>

const DEFAULT_PARAMS = Object.freeze({ N: 16384, r: 8, p: 1 })
const KEY_LEN = 64
const MIN_LENGTH = 12
const MAX_LENGTH = 1024

function checkPassword (password) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    throw new Error(`ERR_IDENTITY_PASSWORD_WEAK: a password needs at least ${MIN_LENGTH} characters`)
  }
  if (password.length > MAX_LENGTH) throw new Error(`ERR_IDENTITY_PASSWORD_WEAK: at most ${MAX_LENGTH} characters`)
}

async function _derive (password, salt, { N, r, p }) {
  return scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N, r, p, maxmem: 256 * N * r })
}

/** Hash a password (checked against the length rules first). */
async function hashPassword (password, params = DEFAULT_PARAMS) {
  checkPassword(password)
  const salt = crypto.randomBytes(16)
  const hash = await _derive(password, salt, params)
  return ['scrypt', params.N, params.r, params.p, salt.toString('base64url'), hash.toString('base64url')].join('$')
}

/** Constant-time check of `password` against a stored hash; false for anything malformed. */
async function verifyPassword (password, stored) {
  if (typeof password !== 'string' || password.length > MAX_LENGTH || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [N, r, p] = parts.slice(1, 4).map(Number)
  if (![N, r, p].every(Number.isInteger)) return false
  const expected = Buffer.from(parts[5], 'base64url')
  const actual = await _derive(password, Buffer.from(parts[4], 'base64url'), { N, r, p })
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

module.exports = { hashPassword, verifyPassword, checkPassword, DEFAULT_PARAMS, MIN_LENGTH }
