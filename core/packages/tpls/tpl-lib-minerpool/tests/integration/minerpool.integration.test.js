'use strict'

const test = require('brittle')
const MinerpoolManager = require('../../lib/minerpool.manager')

test('MinerpoolManager can be constructed with rack and required conf', (t) => {
  const m = new MinerpoolManager(
    { wtype: 'integration', baseUrl: 'http://127.0.0.1:9000' },
    { rack: 'rack-a' }
  )
  t.is(m.prefix, 'integration-rack-a')
  t.is(typeof m.getHttpUrl(), 'string')
})
