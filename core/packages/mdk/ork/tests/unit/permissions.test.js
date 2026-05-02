'use strict'

const test = require('brittle')
const { hasPermission, hasWritePermission, hasReadPermission, hasReadWritePermission } = require('../../workers/lib/permissions')

test('hasPermission', async (t) => {
  t.test('should return false when requested permission is falsy', async (t) => {
    t.ok(!hasPermission(['miner:rw'], null))
    t.ok(!hasPermission(['miner:rw'], undefined))
    t.ok(!hasPermission(['miner:rw'], ''))
  })

  t.test('read', async (t) => {
    t.ok(hasPermission([
      'miner:rw',
      'container:r'
    ], 'miner:r'), 'should allow permission')

    t.ok(hasPermission([
      'miner:r',
      'container:r'
    ], 'miner:r'), 'should allow permission')

    t.ok(!hasPermission([
      'miner:w',
      'container:r'
    ], 'miner:r'), 'should not allow permission')
  })

  t.test('write', async (t) => {
    t.ok(hasPermission([
      'miner:rw',
      'container:r'
    ], 'miner:w'), 'should allow permission')

    t.ok(hasPermission([
      'miner:w',
      'container:r'
    ], 'miner:w'), 'should allow permission')

    t.ok(!hasPermission([
      'miner:r',
      'container:r'
    ], 'miner:w'), 'should not allow permission')
  })

  t.test('read-write', async (t) => {
    t.ok(hasPermission([
      'miner:rw',
      'container:r'
    ], 'miner:rw'), 'should allow permission')

    t.ok(!hasPermission([
      'miner:r',
      'container:r'
    ], 'miner:rw'), 'should not allow permission')

    t.ok(!hasPermission([
      'miner:w',
      'container:r'
    ], 'miner:rw'), 'should not allow permission')
  })
})

test('hasWritePermission', async (t) => {
  t.test('should return true for write permission', async (t) => {
    t.ok(hasWritePermission(['miner:w'], 'miner'), 'should allow write permission')
    t.ok(hasWritePermission(['miner:rw'], 'miner'), 'should allow write permission from rw')
    t.ok(!hasWritePermission(['miner:r'], 'miner'), 'should not allow write permission from read only')
    t.ok(!hasWritePermission(['container:r'], 'miner'), 'should not allow write permission for different type')
  })

  t.test('should return false for empty permissions', async (t) => {
    t.ok(!hasWritePermission([], 'miner'), 'should not allow write permission with empty array')
  })
})

test('hasReadPermission', async (t) => {
  t.test('should return true for read permission', async (t) => {
    t.ok(hasReadPermission(['miner:r'], 'miner'), 'should allow read permission')
    t.ok(hasReadPermission(['miner:rw'], 'miner'), 'should allow read permission from rw')
    t.ok(!hasReadPermission(['miner:w'], 'miner'), 'should not allow read permission from write only')
    t.ok(!hasReadPermission(['container:r'], 'miner'), 'should not allow read permission for different type')
  })

  t.test('should return false for empty permissions', async (t) => {
    t.ok(!hasReadPermission([], 'miner'), 'should not allow read permission with empty array')
  })
})

test('hasReadWritePermission', async (t) => {
  t.test('should return true for read-write permission', async (t) => {
    t.ok(hasReadWritePermission(['miner:rw'], 'miner'), 'should allow read-write permission')
    t.ok(!hasReadWritePermission(['miner:r'], 'miner'), 'should not allow read-write permission from read only')
    t.ok(!hasReadWritePermission(['miner:w'], 'miner'), 'should not allow read-write permission from write only')
    t.ok(!hasReadWritePermission(['container:rw'], 'miner'), 'should not allow read-write permission for different type')
  })

  t.test('should return false for empty permissions', async (t) => {
    t.ok(!hasReadWritePermission([], 'miner'), 'should not allow read-write permission with empty array')
  })
})
