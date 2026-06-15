'use strict'

const { test } = require('brittle')

let utils
try {
  utils = require('../../lib/utils')
} catch (e) {
  test.skip('lib/utils requires tpl-lib-thing', (t) => {
    t.pass('skipped')
  })
}

if (utils) {
  test('getRandomString: returns string of requested length', (t) => {
    const s = utils.getRandomString(15)
    t.is(typeof s, 'string')
    t.is(s.length, 15)
    t.ok(/^[a-zA-Z0-9]+$/.test(s), 'only alphanumeric')
  })

  test('getRandomString: different each time', (t) => {
    const a = utils.getRandomString(20)
    const b = utils.getRandomString(20)
    t.not(a, b)
  })

  test('sumPoolsShares: non-array returns 0', (t) => {
    t.is(utils.sumPoolsShares(null, 'accepted'), 0)
    t.is(utils.sumPoolsShares(undefined, 'accepted'), 0)
  })

  test('sumPoolsShares: sums pool key', (t) => {
    const pools = [
      { accepted: 10, rejected: 1 },
      { accepted: 5, rejected: 2 },
      { accepted: 3 }
    ]
    t.is(utils.sumPoolsShares(pools, 'accepted'), 18)
    t.is(utils.sumPoolsShares(pools, 'rejected'), 3)
  })

  test('sumPoolsShares: ignores NaN', (t) => {
    const pools = [
      { accepted: 10 },
      { accepted: 'x' },
      { accepted: 5 }
    ]
    t.is(utils.sumPoolsShares(pools, 'accepted'), 15)
  })

  test('sumPoolsShares: empty array', (t) => {
    t.is(utils.sumPoolsShares([], 'accepted'), 0)
  })

  test('hasErrorAndPositiveHashrate: true when errors and hashrate > 0', (t) => {
    const entry = {
      last: {
        snap: {
          stats: {
            errors: ['e1'],
            hashrate_mhs: { t_5m: 100 }
          }
        }
      }
    }
    t.ok(utils.hasErrorAndPositiveHashrate(entry))
  })

  test('hasErrorAndPositiveHashrate: false when no errors', (t) => {
    const entry = {
      last: {
        snap: {
          stats: {
            errors: [],
            hashrate_mhs: { t_5m: 100 }
          }
        }
      }
    }
    t.not(utils.hasErrorAndPositiveHashrate(entry))
  })

  test('hasErrorAndPositiveHashrate: false when hashrate 0', (t) => {
    const entry = {
      last: {
        snap: {
          stats: {
            errors: ['e1'],
            hashrate_mhs: { t_5m: 0 }
          }
        }
      }
    }
    t.not(utils.hasErrorAndPositiveHashrate(entry))
  })

  test('hasErrorAndPositiveHashrate: safe for missing entry', (t) => {
    t.ok(!utils.hasErrorAndPositiveHashrate(null))
    t.ok(!utils.hasErrorAndPositiveHashrate(undefined))
    t.ok(!utils.hasErrorAndPositiveHashrate({}))
  })
}
