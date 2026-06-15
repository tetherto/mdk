'use strict'

const { cleanup } = require('../lib')

module.exports = function (ctx) {
  const state = {
    power_w: 40000,
    voltage_v: 34500
  }

  function bind (connection) {
    connection.on('read-holding-registers', (request, reply) => {
      const address = request.request.address
      const quantity = request.request.quantity

      if (address === 1939 && quantity === 2) {
        const buf = Buffer.alloc(4)
        buf.writeInt32BE(state.power_w, 0)
        reply(null, buf)
      } else if (address === 1941 && quantity === 2) {
        const buf = Buffer.alloc(4)
        buf.writeUInt32BE(state.voltage_v, 0)
        reply(null, buf)
      } else {
        reply(new Error('address out of range'))
      }
    })
  }

  const initialState = JSON.parse(JSON.stringify(state))

  return { bind, state, cleanup: cleanup.bind(null, initialState, state) }
}
