'use strict'

module.exports = (result) => {
  if (result?.success === false) {
    throw new Error(result.error_msg || 'ERR_COMMAND_FAILED')
  }
  return result
}
