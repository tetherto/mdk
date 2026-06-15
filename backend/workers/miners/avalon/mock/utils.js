'use strict'

const { cloneDeep } = require('@bitfinex/lib-js-util-base')
const crypto = require('crypto')

function proxyState (fn) {
  return function (ctx, state, req, id) {
    const _state = cloneDeep(state)
    const res = fn(ctx, _state, req)

    Object.assign(state, _state)
    return res
  }
}

function parseCmdArguments (cmd) {
  return cmd.split(',').slice(2)
}

function randomFloat () {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

function randomNumber (min, max) {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

module.exports = {
  proxyState,
  parseCmdArguments,
  randomNumber
}
