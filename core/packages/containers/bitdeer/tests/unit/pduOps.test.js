'use strict'

const { test } = require('brittle')
const { getPDUValues, unMapPDU, unMapSocket, MAPPINGS } = require('../../lib/utils/pduOps')

test('getPDUValues returns [pduIndex, socketIndex] for m56', (t) => {
  const [pdu, socket] = getPDUValues('m56', '1-1', '1')
  t.is(pdu, 0, 'PDU 1-1 is index 0')
  t.is(socket, 0, 'socket 1 is index 0')
})

test('getPDUValues all PDUs/sockets returns -1 for m56', (t) => {
  const [pdu, socket] = getPDUValues('m56', '-1', '-1')
  t.is(pdu, -1, 'all PDUs')
  t.is(socket, -1, 'all sockets')
})

test('getPDUValues invalid PDU throws', (t) => {
  try {
    getPDUValues('m56', '9-9', '1')
    t.fail('expected getPDUValues to throw for invalid PDU key')
  } catch (err) {
    t.ok(err instanceof TypeError, 'throws TypeError')
  }
})

test('getPDUValues invalid socket returns -1', (t) => {
  const [, socket] = getPDUValues('m56', '1-1', 'invalid')
  t.is(socket, -1, 'invalid socket index -1')
})

test('unMapPDU returns PDU key for index', (t) => {
  t.is(unMapPDU('m56', 0), '1-1', 'index 0 -> 1-1')
  t.is(unMapPDU('m30', 3), '1-4', 'index 3 -> 1-4')
})

test('unMapSocket returns socket name for m30', (t) => {
  t.is(unMapSocket('m30', 0, 0), 'a1', '1-1 socket 0 -> a1')
  t.is(unMapSocket('m30', 0, 15), 'c5', '1-1 socket 15 -> c5')
})

test('unMapSocket returns socket name for m56', (t) => {
  t.is(unMapSocket('m56', 0, 0), '1', 'm56 socket 0 -> 1')
  t.is(unMapSocket('m56', 0, 13), '14', 'm56 socket 13 -> 14')
})

test('unMapSocket a1346 has null for first socket on 1-3', (t) => {
  t.is(unMapSocket('a1346', 2, 0), null, '1-3 first socket is null')
})

test('pduOps re-exports MAPPINGS', (t) => {
  t.ok(MAPPINGS.m56, 'MAPPINGS from pduOps')
  t.alike(MAPPINGS, require('../../lib/utils/constants').MAPPINGS, 'same as constants')
})
