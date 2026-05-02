'use strict'

const test = require('brittle')
const { send200 } = require('../../../workers/lib/server/lib/send200')

test('send200 - sends 200 status with data', (t) => {
  let statusCalled = false
  let sendCalled = false
  let statusValue = null
  let sendValue = null

  const mockRep = {
    status: function (code) {
      statusCalled = true
      statusValue = code
      return this
    },
    send: function (data) {
      sendCalled = true
      sendValue = data
      return this
    }
  }

  const testData = { message: 'test' }
  send200(mockRep, testData)

  t.ok(statusCalled, 'should call status')
  t.is(statusValue, 200, 'should set status to 200')
  t.ok(sendCalled, 'should call send')
  t.is(sendValue, testData, 'should send correct data')

  t.pass()
})

test('send200 - sends 200 status with null data', (t) => {
  let sendValue = null

  const mockRep = {
    status: function () {
      return this
    },
    send: function (data) {
      sendValue = data
      return this
    }
  }

  send200(mockRep, null)

  t.is(sendValue, null, 'should send null data')

  t.pass()
})

test('send200 - sends 200 status with array data', (t) => {
  let sendValue = null

  const mockRep = {
    status: function () {
      return this
    },
    send: function (data) {
      sendValue = data
      return this
    }
  }

  const testData = [1, 2, 3]
  send200(mockRep, testData)

  t.ok(Array.isArray(sendValue), 'should send array data')
  t.is(sendValue.length, 3, 'should send correct array length')

  t.pass()
})
