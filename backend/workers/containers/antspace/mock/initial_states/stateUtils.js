'use strict'

function cleanup (state, initialState) {
  Object.assign(state, initialState)
  return state
}

module.exports = { cleanup }
