'use strict'

module.exports = function (ctx, state) {
  return {
    STATUS: [{ STATUS: 'S', Msg: 'Summary' }],
    SUMMARY: [
      {
        ...state.summary,
        Elapsed: parseInt((+new Date() - state.elapsed) / 1000),
        Uptime: parseInt((+new Date() - state.uptime) / 1000)
      }
    ],
    id: 1
  }
}
