'use strict'

function hex2a (hex) {
  let str = ''
  for (let i = 0; i < hex.length; i += 2) {
    if (parseInt(hex.substr(i, 2), 16) === 0) continue
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
  }
  return str
}

module.exports = hex2a
