'use strict'

const crypto = require('node:crypto')
const path = require('node:path')

const DEFAULT_MAX_FIRMWARE_SIZE = 64 * 1024 * 1024

function decodeFirmwarePayload (firmware, maxSize = DEFAULT_MAX_FIRMWARE_SIZE) {
  if (!firmware || typeof firmware !== 'object' || Array.isArray(firmware)) {
    throw new Error('ERR_FIRMWARE_PAYLOAD_INVALID')
  }
  if (typeof firmware.filename !== 'string' || !firmware.filename ||
      path.basename(firmware.filename) !== firmware.filename) {
    throw new Error('ERR_FIRMWARE_FILENAME_INVALID')
  }
  if (firmware.encoding !== 'base64' || typeof firmware.data !== 'string' ||
      firmware.data.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(firmware.data) ||
      firmware.data.length % 4 !== 0) {
    throw new Error('ERR_FIRMWARE_ENCODING_INVALID')
  }
  if (!Number.isSafeInteger(firmware.size) || firmware.size <= 0 || firmware.size > maxSize) {
    throw new Error('ERR_FIRMWARE_SIZE_INVALID')
  }
  if (typeof firmware.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(firmware.sha256)) {
    throw new Error('ERR_FIRMWARE_SHA256_INVALID')
  }

  const content = Buffer.from(firmware.data, 'base64')
  if (content.length !== firmware.size || content.toString('base64') !== firmware.data) {
    throw new Error('ERR_FIRMWARE_SIZE_INVALID')
  }
  const sha256 = crypto.createHash('sha256').update(content).digest('hex')
  if (sha256 !== firmware.sha256.toLowerCase()) throw new Error('ERR_FIRMWARE_SHA256_MISMATCH')

  return {
    content,
    filename: firmware.filename,
    contentType: firmware.contentType || 'application/octet-stream',
    size: content.length,
    sha256
  }
}

module.exports = { DEFAULT_MAX_FIRMWARE_SIZE, decodeFirmwarePayload }
