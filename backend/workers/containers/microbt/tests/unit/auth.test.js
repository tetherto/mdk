'use strict'

const { test } = require('brittle')
const { getAuthData } = require('../../lib/utils/auth')
const crypto = require('crypto')

test('getAuthData returns Buffer of length 32', (t) => {
  const random = Buffer.alloc(8)
  const result = getAuthData('user', 'pass', random)
  t.ok(Buffer.isBuffer(result), 'returns Buffer')
  t.is(result.length, 32, 'SHA256 length 32')
})

test('getAuthData is deterministic for same inputs', (t) => {
  const random = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8])
  const a = getAuthData('admin', 'secret', random)
  const b = getAuthData('admin', 'secret', random)
  t.alike(a, b, 'same inputs give same output')
})

test('getAuthData differs for different password', (t) => {
  const random = Buffer.alloc(8)
  const a = getAuthData('admin', 'pass1', random)
  const b = getAuthData('admin', 'pass2', random)
  t.not(a.equals(b), 'different password gives different hash')
})

test('getAuthData differs for different random', (t) => {
  const r1 = Buffer.from([1, 1, 1, 1, 1, 1, 1, 1])
  const r2 = Buffer.from([2, 2, 2, 2, 2, 2, 2, 2])
  const a = getAuthData('admin', 'secret', r1)
  const b = getAuthData('admin', 'secret', r2)
  t.not(a.equals(b), 'different random gives different hash')
})

test('getAuthData output is SHA256 of random + md5(user) + md5(pass)', (t) => {
  const random = Buffer.alloc(8, 0)
  const md5User = crypto.createHash('md5').update('u').digest()
  const md5Pass = crypto.createHash('md5').update('p').digest()
  const expected = crypto.createHash('sha256').update(Buffer.concat([random, md5User, md5Pass])).digest()
  const result = getAuthData('u', 'p', random)
  t.ok(result.equals(expected), 'matches expected SHA256')
})
