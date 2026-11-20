'use strict'

const test = require('brittle')
const createSweepMemo = require('../../lib/sweep-memo')

test('reads are shared within one params object and repeated across them', async (t) => {
  const sweep = createSweepMemo()
  let reads = 0
  const read = () => { reads++; return Promise.resolve(reads) }

  const params = {}
  t.is(await sweep(params, 'stats', read), 1)
  t.is(await sweep(params, 'stats', read), 1, 'same sweep, same read')
  t.is(await sweep(params, 'estats', read), 2, 'another name is another read')
  t.is(await sweep({}, 'stats', read), 3, 'a new params object reads again')
  t.is(reads, 3)
})

test('a failed read is not cached beyond its sweep and non-object params never share', async (t) => {
  const sweep = createSweepMemo()
  let calls = 0
  const failing = () => { calls++; throw new Error('ERR_DOWN') }
  const params = {}
  await t.exception(sweep(params, 'x', failing), /ERR_DOWN/)
  await t.exception(sweep(params, 'x', failing), /ERR_DOWN/)
  t.is(calls, 1, 'the sweep sees the one failure it got')
  await t.exception(sweep({}, 'x', failing), /ERR_DOWN/)
  t.is(calls, 2)

  const counted = () => { calls++; return calls }
  await sweep(undefined, 'y', counted)
  await sweep(undefined, 'y', counted)
  t.is(calls, 4, 'no params object, no sharing')
})
