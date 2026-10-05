import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BaselineError,
  diffBaselines,
} from '../ui/packages/react-devkit/scripts/check-usage-baseline-monotonic.mjs'

const base = (...v) => JSON.stringify({ violations: v })

test('identical baselines → no adds, no removes', () => {
  const { added, removed } = diffBaselines(base('a', 'b'), base('a', 'b'))
  assert.deepEqual(added, [])
  assert.deepEqual(removed, [])
})

test('a new path is an add (fails the gate)', () => {
  const { added, removed } = diffBaselines(base('a'), base('a', 'b'))
  assert.deepEqual(added, ['b'])
  assert.deepEqual(removed, [])
})

test('a dropped path is a remove (allowed migration)', () => {
  const { added, removed } = diffBaselines(base('a', 'b'), base('a'))
  assert.deepEqual(added, [])
  assert.deepEqual(removed, ['b'])
})

test('a swap (one in, one out) still reports the add', () => {
  // Count stays at 2, so a length check would pass — the set comparison must not.
  const { added, removed } = diffBaselines(base('a', 'b'), base('a', 'c'))
  assert.deepEqual(added, ['c'])
  assert.deepEqual(removed, ['b'])
})

test('reordering and whitespace are not changes', () => {
  const head = JSON.stringify({ violations: ['b', 'a'] }, null, 2)
  const { added, removed } = diffBaselines(base('a', 'b'), head)
  assert.deepEqual(added, [])
  assert.deepEqual(removed, [])
})

test('multiple adds are all reported, sorted', () => {
  const { added } = diffBaselines(base('m'), base('m', 'z', 'a'))
  assert.deepEqual(added, ['a', 'z'])
})

test('invalid JSON on either side is a BaselineError', () => {
  assert.throws(() => diffBaselines('{ not json', base('a')), BaselineError)
  assert.throws(() => diffBaselines(base('a'), 'nope'), BaselineError)
})

test('a missing violations array is a BaselineError', () => {
  assert.throws(() => diffBaselines('{}', base('a')), BaselineError)
  assert.throws(() => diffBaselines(base('a'), JSON.stringify({ violations: 'x' })), BaselineError)
})

test('non-string entries in violations are a BaselineError', () => {
  assert.throws(() => diffBaselines(base('a'), JSON.stringify({ violations: ['a', 3] })), BaselineError)
})
