'use strict'

const crypto = require('node:crypto')
const test = require('brittle')
const { decodeFirmwarePayload } = require('../../lib/utils/firmware-payload')

function payload (content = Buffer.from('firmware')) {
  return {
    filename: 'whatsminer-h616.bin',
    contentType: 'application/octet-stream',
    encoding: 'base64',
    size: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    data: content.toString('base64')
  }
}

test('firmware payload - validates and decodes canonical Base64', (t) => {
  const decoded = decodeFirmwarePayload(payload())
  t.is(decoded.filename, 'whatsminer-h616.bin')
  t.is(decoded.content.toString(), 'firmware')
  t.is(decoded.size, 8)
})

test('firmware payload - rejects unsafe metadata and corrupted content', (t) => {
  t.exception(() => decodeFirmwarePayload(), /ERR_FIRMWARE_PAYLOAD_INVALID/)
  t.exception(() => decodeFirmwarePayload({ ...payload(), filename: '../firmware.bin' }), /ERR_FIRMWARE_FILENAME_INVALID/)
  t.exception(() => decodeFirmwarePayload({ ...payload(), encoding: 'raw' }), /ERR_FIRMWARE_ENCODING_INVALID/)
  t.exception(() => decodeFirmwarePayload({ ...payload(), size: 9 }), /ERR_FIRMWARE_SIZE_INVALID/)
  t.exception(() => decodeFirmwarePayload({ ...payload(), sha256: 'bad' }), /ERR_FIRMWARE_SHA256_INVALID/)
  t.exception(() => decodeFirmwarePayload({ ...payload(), sha256: '0'.repeat(64) }), /ERR_FIRMWARE_SHA256_MISMATCH/)
  t.exception(() => decodeFirmwarePayload(payload(Buffer.alloc(65)), 64), /ERR_FIRMWARE_SIZE_INVALID/)
})
