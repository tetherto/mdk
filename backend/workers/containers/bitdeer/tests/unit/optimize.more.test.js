'use strict'

const { test } = require('brittle')
const { optimizeSocketCalls } = require('../../lib/utils/optimize')

const M56_SOCKETS = 14

function pduState (index, value) {
  return { index, socketStatus: Array.from({ length: M56_SOCKETS }, () => value) }
}

function mixedPduState (index) {
  const state = pduState(index, false)
  state.socketStatus[0] = true
  return state
}

test('PDU-level on op kept when PDU not already all on', (t) => {
  const state = [pduState(0, false), mixedPduState(1)]
  const result = optimizeSocketCalls([['1-1', '-1', true]], state, 'm56')
  t.alike(result, [['1-1', -1, true]], 'kept as PDU-level on')
})

test('PDU-level on op dropped when PDU already all on', (t) => {
  const state = [pduState(0, true), mixedPduState(1)]
  const result = optimizeSocketCalls([['1-1', '-1', true]], state, 'm56')
  t.alike(result, [], 'no state change, no ops')
})

test('PDU-level on op kept when PDU state unknown', (t) => {
  const state = [mixedPduState(1)]
  const result = optimizeSocketCalls([['1-1', '-1', true]], state, 'm56')
  t.alike(result, [['1-1', -1, true]], 'kept without verifiable state')
})

test('PDU-level off op kept when PDU not already all off', (t) => {
  const state = [mixedPduState(0), pduState(1, true)]
  const result = optimizeSocketCalls([['1-1', '-1', false]], state, 'm56')
  t.alike(result, [['1-1', -1, false]], 'kept as PDU-level off')
})

test('PDU-level off op dropped when PDU already all off', (t) => {
  const state = [pduState(0, false), mixedPduState(1)]
  const result = optimizeSocketCalls([['1-1', '-1', false]], state, 'm56')
  t.alike(result, [], 'no state change, no ops')
})

test('PDU-level off op kept when PDU state unknown', (t) => {
  const state = [mixedPduState(1)]
  const result = optimizeSocketCalls([['1-1', '-1', false]], state, 'm56')
  t.alike(result, [['1-1', -1, false]], 'kept without verifiable state')
})

test('full set of individual on ops collapses to PDU-level on', (t) => {
  const state = [pduState(0, false), mixedPduState(1)]
  const ops = Array.from({ length: M56_SOCKETS }, (_, i) => ['1-1', `${i + 1}`, true])
  const result = optimizeSocketCalls(ops, state, 'm56')
  t.alike(result, [['1-1', -1, true]], 'collapsed to PDU-level on')
})

test('full set of individual off ops collapses to PDU-level off', (t) => {
  const state = [mixedPduState(0), pduState(1, true)]
  const ops = Array.from({ length: M56_SOCKETS }, (_, i) => ['1-1', `${i + 1}`, false])
  const result = optimizeSocketCalls(ops, state, 'm56')
  t.alike(result, [['1-1', -1, false]], 'collapsed to PDU-level off')
})

test('mixed ops keep only state-changing ones', (t) => {
  const state = [mixedPduState(0), pduState(1, true)]
  const ops = [
    ['1-1', '1', true],
    ['1-1', '2', true],
    ['1-1', '3', false],
    ['1-1', 'zz', true]
  ]
  const result = optimizeSocketCalls(ops, state, 'm56')
  t.alike(result, [['1-1', '2', true]], 'unchanged and unmappable ops dropped')
})

test('mixed ops for PDU without state are dropped', (t) => {
  const state = [mixedPduState(1)]
  const ops = [['1-1', '1', true], ['1-1', '2', false]]
  const result = optimizeSocketCalls(ops, state, 'm56')
  t.alike(result, [], 'no verifiable state, no delta ops')
})

test('all-PDUs specific-socket op applies across PDUs', (t) => {
  const state = [mixedPduState(0), pduState(1, true)]
  const result = optimizeSocketCalls([['-1', '2', true]], state, 'm56')
  t.ok(result.length > 0, 'global ops passed through')
  t.ok(result.every((op) => op[0] === '-1'), 'kept at global level')
})

test('ops against PDU entries missing socketStatus are ignored', (t) => {
  const state = [{ index: 0 }, mixedPduState(1)]
  const result = optimizeSocketCalls([['1-1', '-1', true]], state, 'm56')
  t.alike(result, [['1-1', -1, true]], 'unverifiable PDU keeps op')
})

test('unknown PDU key op does not mutate state and collapses to zero-socket off', (t) => {
  const state = [mixedPduState(0)]
  const result = optimizeSocketCalls([['9-9', '1', true]], state, 'm56')
  t.alike(result, [['9-9', -1, false]], 'unknown PDU has zero mapped sockets')
})

test('state entries with unknown index or missing sockets are skipped', (t) => {
  const state = [{ index: 99, socketStatus: [true] }, { index: 0 }]
  const result = optimizeSocketCalls([], state, 'm56')
  t.alike(result, [['-1', '-1', false]], 'unconvertible state treated as all-off')
})

test('empty ops with partially-on state returns nothing', (t) => {
  const state = [mixedPduState(0)]
  const result = optimizeSocketCalls([], state, 'm56')
  t.alike(result, [], 'no ops when state not all-off')
})

test('ops with undefined state collapse to global all-off', (t) => {
  const result = optimizeSocketCalls([['1-1', '1', true]], undefined, 'm56')
  t.alike(result, [['-1', '-1', false]], 'empty modified state is all-off')
})

test('global all-sockets op mixed with per-socket ops stays global', (t) => {
  const state = [mixedPduState(0), pduState(1, true)]
  const result = optimizeSocketCalls([['-1', '-1', true], ['1-1', '1', true]], state, 'm56')
  t.alike(result, [['-1', '-1', true]], 'collapses to global all-on')
})
