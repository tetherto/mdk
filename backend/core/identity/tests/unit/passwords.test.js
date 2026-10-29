'use strict'

const test = require('brittle')
const { hashPassword, verifyPassword, checkPassword } = require('../../index')
const { FAST_SCRYPT } = require('./helpers')

test('hash and verify', async (t) => {
  const hash = await hashPassword('correct horse battery', FAST_SCRYPT)
  t.ok(hash.startsWith('scrypt$1024$8$1$'))
  t.ok(await verifyPassword('correct horse battery', hash))
  t.absent(await verifyPassword('correct horse batterY', hash))
  t.not(hash, await hashPassword('correct horse battery', FAST_SCRYPT), 'salted')
})

test('normalizes unicode before hashing', async (t) => {
  const hash = await hashPassword('café-password-1', FAST_SCRYPT)
  t.ok(await verifyPassword('café-password-1', hash))
})

test('length rules', async (t) => {
  t.exception(() => checkPassword('short'), /ERR_IDENTITY_PASSWORD_WEAK/)
  t.exception(() => checkPassword('x'.repeat(2000)), /ERR_IDENTITY_PASSWORD_WEAK/)
  await t.exception(hashPassword('short'), /ERR_IDENTITY_PASSWORD_WEAK/)
})

test('malformed stored hashes never verify', async (t) => {
  for (const stored of [undefined, '', 'bcrypt$x', 'scrypt$a$b$c$d$e', 'scrypt$1024$8$1$AA']) {
    t.absent(await verifyPassword('correct horse battery', stored))
  }
  t.absent(await verifyPassword(123, 'scrypt$1024$8$1$AA$AA'))
})
