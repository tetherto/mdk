'use strict'

const { createSuccessResponse } = require('../utils')

module.exports = function downloadLogs () {
  const response = createSuccessResponse()
  response.Msg = { logfilelen: '0' }
  return response
}
