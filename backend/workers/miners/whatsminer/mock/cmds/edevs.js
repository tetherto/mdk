'use strict'

module.exports = function (ctx, state) {
  return {
    STATUS: [{ STATUS: 'S', Msg: `${state.devs.length} ASC(s)` }],
    DEVS: state.devs,
    id: 1
  }
}
