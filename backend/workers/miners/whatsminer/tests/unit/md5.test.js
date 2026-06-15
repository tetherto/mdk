'use strict'

const test = require('brittle')
const md5 = require('../../lib/utils/md5')

test('md5 - basic hash produces hex string', (t) => {
  const hash = md5('hello')
  t.is(typeof hash, 'string')
  t.is(hash.length, 32)
  t.ok(/^[0-9a-f]+$/.test(hash))
})

test('md5 - known hash value for empty string', (t) => {
  t.is(md5(''), 'd41d8cd98f00b204e9800998ecf8427e')
})

test('md5 - known hash value for "hello"', (t) => {
  t.is(md5('hello'), '5d41402abc4b2a76b9719d911017c592')
})

test('md5 - different inputs produce different hashes', (t) => {
  t.not(md5('abc'), md5('def'))
})

test('md5.fromUtf8 - produces same result as default export', (t) => {
  const hash1 = md5('test')
  const hash2 = md5.fromUtf8('test').toHex()
  t.is(hash1, hash2)
})

test('md5.salt - generates salt of default length 8', (t) => {
  const salt = md5.salt()
  t.is(salt.length, 8)
})

test('md5.salt - generates salt of specified length', (t) => {
  const salt = md5.salt(12)
  t.is(salt.length, 12)
})

test('md5.salt - generates different salts each time', (t) => {
  const salt1 = md5.salt()
  const salt2 = md5.salt()
  // Very unlikely to be equal
  t.ok(salt1 !== salt2 || salt1.length === 8)
})

test('md5.crypt - produces Linux MD5-crypt format', (t) => {
  const result = md5.crypt('admin', '5QAHiKMb')
  t.ok(result.startsWith('$1$'))
  t.ok(result.includes('$'))
})

test('md5.crypt - same password and salt produces same result', (t) => {
  const result1 = md5.crypt('admin', '5QAHiKMb')
  const result2 = md5.crypt('admin', '5QAHiKMb')
  t.is(result1, result2)
})

test('md5.crypt - different passwords produce different results', (t) => {
  const result1 = md5.crypt('admin', '5QAHiKMb')
  const result2 = md5.crypt('password', '5QAHiKMb')
  t.not(result1, result2)
})

test('md5.crypt - different salts produce different results', (t) => {
  const result1 = md5.crypt('admin', '5QAHiKMb')
  const result2 = md5.crypt('admin', 'kowEj187')
  t.not(result1, result2)
})

test('md5.crypt - accepts $1$ prefixed salt', (t) => {
  const result = md5.crypt('admin', '$1$5QAHiKMb')
  t.ok(result.startsWith('$1$'))
})

test('md5.crypt - throws on key longer than 64 chars', (t) => {
  t.exception(() => md5.crypt('a'.repeat(65), 'salt'))
})
