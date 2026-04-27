'use strict'

const ACTION_TYPES = {
  writeLog: 0b001,
  setOutput: 0b010,
  setAlarmBit: 0b100
}

function obisToBytes (obisCode) {
  const components = obisCode.split('.')

  if (components.length !== 6) {
    throw new Error('Invalid OBIS code format')
  }

  const bytes = components.map(component => parseInt(component, 10))

  if (bytes.some(byte => isNaN(byte) || byte < 0 || byte > 255)) {
    throw new Error('Invalid byte value in OBIS code')
  }

  return Buffer.from(bytes)
}

function bytesToObis (bytes) {
  if (bytes.length !== 6) {
    throw new Error('Invalid OBIS code byte length')
  }

  const components = [...bytes].map(byte => byte.toString())

  return components.join('.')
}

function buildActionConfig (actionConfig, buffer) {
  let op = 0
  for (const action of actionConfig.types) {
    op |= ACTION_TYPES[action]
  }
  buffer.writeUInt8(op, 0)
  buffer.writeUInt8(actionConfig.output, 1)
}

function parseActionConfig (actionPacket) {
  const op = actionPacket.readUInt8(0)
  const output = actionPacket.readUInt8(1)

  const types = []
  for (const actionType in ACTION_TYPES) {
    const actionOp = op & ACTION_TYPES[actionType]
    if (actionOp !== 0) {
      types.push(actionType)
    }
  }

  return { types, output }
}

function buildAlarmConfig (alarmConfig) {
  const packets = [
    Buffer.alloc(2),
    Buffer.alloc(6),
    Buffer.alloc(16),
    Buffer.alloc(8),
    Buffer.alloc(4)
  ]

  packets[0].writeUInt16BE(alarmConfig.index, 0)
  packets[1].write(obisToBytes(alarmConfig.quantity).toString('utf8'), 0, 'utf8')
  packets[2].writeBigInt64BE(BigInt(alarmConfig.limit_on), 0)
  packets[2].writeBigInt64BE(BigInt(alarmConfig.limit_off), 8)
  packets[3].writeUInt32BE(alarmConfig.delay_on, 0)
  packets[3].writeUInt32BE(alarmConfig.delay_off, 4)
  buildActionConfig(alarmConfig.action, packets[4])

  return packets
}

function parseAlarmConfig (packets) {
  return {
    index: packets[0].readUInt16BE(0),
    quantity: bytesToObis(packets[1].toString('utf8')),
    limit_on: packets[2].readBigInt64BE(0),
    limit_off: packets[2].readBigInt64BE(8),
    delay_on: packets[3].readUInt32BE(0),
    delay_off: packets[3].readUInt32BE(4),
    action: parseActionConfig(packets[4])
  }
}

function asciiBufferToStr (buffer) {
  let s = ''

  for (const bit of buffer) {
    // skip if 0x00
    if (bit !== 0) s += String.fromCharCode(bit)
  }

  return s
}

function bufferToBitString (buffer) {
  let s = ''

  for (const bit of buffer) {
    s += parseInt(bit).toString(2).padStart(8, '0')
  }

  return s
}

module.exports = {
  obisToBytes,
  buildAlarmConfig,
  parseAlarmConfig,
  buildActionConfig,
  parseActionConfig,
  asciiBufferToStr,
  bufferToBitString,
  ACTION_TYPES
}
