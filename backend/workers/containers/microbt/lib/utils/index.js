'use strict'

const bufferToInt16Array = (buffer, unsigned = false) => {
  const int16Array = []
  for (let i = 0; i < buffer.length; i += 2) {
    int16Array.push(unsigned ? buffer.readUInt16BE(i) : buffer.readInt16BE(i))
  }
  return int16Array
}

function bufferToBitString (buffer) {
  let s = ''

  for (const bit of buffer) {
    s += parseInt(bit).toString(2).padStart(8, '0')
  }

  return s
}

module.exports = {
  bufferToInt16Array,
  bufferToBitString
}
