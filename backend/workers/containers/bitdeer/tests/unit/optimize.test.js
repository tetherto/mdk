'use strict'

const { test } = require('brittle')
const { optimizeSocketCalls } = require('../../lib/utils/optimize')

test('optimizeSocketCalls empty ops and empty state returns all-off', (t) => {
  const result = optimizeSocketCalls([], [], 'm56')
  t.alike(result, [['-1', '-1', false]], 'single all-off op')
})

test('optimizeSocketCalls empty ops and undefined state returns all-off', (t) => {
  const result = optimizeSocketCalls([], undefined, 'm56')
  t.alike(result, [['-1', '-1', false]], 'single all-off op')
})

test('optimizeSocketCalls null ops returns all-off', (t) => {
  const result = optimizeSocketCalls(null, [], 'm56')
  t.alike(result, [['-1', '-1', false]], 'single all-off op')
})

test('optimizeSocketCalls single op with matching state yields delta ops', (t) => {
  const state = [
    { index: 0, socketStatus: [false, false, false, false, false, false, false, false, false, false, false, false, false, false] }
  ]
  const result = optimizeSocketCalls([['1-1', '1', true]], state, 'm56')
  t.is(result.length, 1, 'one op')
  t.alike(result[0], ['1-1', '1', true], 'same op when only one socket changes')
})

test('optimizeSocketCalls all PDUs all sockets on with empty state yields all-off', (t) => {
  const result = optimizeSocketCalls([['-1', '-1', true]], [], 'm56')
  t.alike(result, [['-1', '-1', false]], 'empty state collapses to all-off')
})

test('optimizeSocketCalls all PDUs all sockets off', (t) => {
  const result = optimizeSocketCalls([['-1', '-1', false]], [], 'm56')
  t.alike(result, [['-1', '-1', false]], 'single all-off op')
})

test('optimizeSocketCalls with state: all sockets on same PDU collapses to global all-on', (t) => {
  const state = [
    { index: 0, socketStatus: [false, false, false, false, false, false, false, false, false, false, false, false, false, false] }
  ]
  const ops = [
    ['1-1', '1', true], ['1-1', '2', true], ['1-1', '3', true], ['1-1', '4', true],
    ['1-1', '5', true], ['1-1', '6', true], ['1-1', '7', true], ['1-1', '8', true],
    ['1-1', '9', true], ['1-1', '10', true], ['1-1', '11', true], ['1-1', '12', true],
    ['1-1', '13', true], ['1-1', '14', true]
  ]
  const result = optimizeSocketCalls(ops, state, 'm56')
  t.is(result.length, 1, 'collapsed to one op')
  t.alike(result[0], ['-1', '-1', true], 'global all-on')
})

test('optimizeSocketCalls with state: all sockets off same PDU collapses to global all-off', (t) => {
  const state = [
    { index: 0, socketStatus: [true, true, true, true, true, true, true, true, true, true, true, true, true, true] }
  ]
  const ops = [
    ['1-1', '1', false], ['1-1', '2', false], ['1-1', '3', false], ['1-1', '4', false],
    ['1-1', '5', false], ['1-1', '6', false], ['1-1', '7', false], ['1-1', '8', false],
    ['1-1', '9', false], ['1-1', '10', false], ['1-1', '11', false], ['1-1', '12', false],
    ['1-1', '13', false], ['1-1', '14', false]
  ]
  const result = optimizeSocketCalls(ops, state, 'm56')
  t.is(result.length, 1, 'collapsed to one op')
  t.alike(result[0], ['-1', '-1', false], 'global all-off')
})

test('optimizeSocketCalls m30 socket names with state', (t) => {
  const state = [{ index: 0, socketStatus: Array(16).fill(false) }]
  const result = optimizeSocketCalls([['1-1', 'a1', true]], state, 'm30')
  t.is(result.length, 1, 'one op')
  t.alike(result[0], ['1-1', 'a1', true], 'm30 socket a1')
})
