'use strict'

module.exports = function (ctx, state) {
  return {
    STATUS: [{ STATUS: 'S', Msg: 'Device Details' }],
    DEVDETAILS: state.devdetails,
    id: 1
  }
}
