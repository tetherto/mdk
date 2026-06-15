'use strict'

const { MAPPINGS } = require('./constants')

function getPDUValues (containerType, PDUIndex, socketIndex) {
  const map = MAPPINGS[containerType]
  const pdu = PDUIndex === '-1' ? -1 : Object.keys(map).indexOf(PDUIndex)
  const socket = socketIndex === '-1' ? -1 : map[PDUIndex].indexOf(socketIndex)
  return [pdu, socket]
}

function unMapPDU (containerType, index) {
  return Object.keys(MAPPINGS[containerType])[index]
}

function unMapSocket (containerType, pduIndex, index) {
  const pdu = unMapPDU(containerType, pduIndex)
  return MAPPINGS[containerType][pdu][index]
}

module.exports = {
  getPDUValues,
  unMapPDU,
  unMapSocket,
  MAPPINGS
}
