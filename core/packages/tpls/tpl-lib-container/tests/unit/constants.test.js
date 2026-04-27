'use strict'

const { test } = require('brittle')
const { RUNNING_STATUS } = require('../../lib/utils/constants')

test('RUNNING_STATUS has running, stopped, error', (t) => {
  t.is(RUNNING_STATUS.RUNNING, 'running', 'RUNNING')
  t.is(RUNNING_STATUS.STOPPED, 'stopped', 'STOPPED')
  t.is(RUNNING_STATUS.ERROR, 'error', 'ERROR')
})

test('RUNNING_STATUS has exactly three keys', (t) => {
  t.is(Object.keys(RUNNING_STATUS).length, 3, 'three keys')
})
