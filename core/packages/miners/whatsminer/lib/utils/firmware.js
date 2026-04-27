'use strict'

const fs = require('fs')
const debug = require('debug')('firmware')

const PI_SIZE = 16
const MAX_PACKAGE_COUNT = 64
const PACKAGE_INFO_SIZE = PI_SIZE * 2 + 4 + 4 + PI_SIZE * 4
const IMAGE_HEADER_SIZE = 6 * 4 + MAX_PACKAGE_COUNT * PACKAGE_INFO_SIZE + 4 * 32 + 4

const sliceSubArray = (buf, s, e) => {
  const sl = buf.subarray(s, e)
  const ni = (typeof sl.indexOf === 'function' ? sl.indexOf(0) : Array.prototype.indexOf.call(sl, 0))
  return Buffer.from(ni === -1 ? sl : sl.subarray(0, ni)).toString('utf8')
}

function _readCombineFirmwareToBuffer (fw) {
  const ret = []
  const fileSize = fs.statSync(fw).size
  const headerBuf = fs.readFileSync(fw, null, IMAGE_HEADER_SIZE)
  const ihDatasize = headerBuf.readUInt32LE(4 * 4)
  const ihPackagecount = headerBuf.readUInt32LE(5 * 4)
  const ihPackageinfo = headerBuf.subarray(6 * 4, 6 * 4 + MAX_PACKAGE_COUNT * PACKAGE_INFO_SIZE)

  if (ihPackagecount > MAX_PACKAGE_COUNT) {
    debug('package count error')
    return ret
  }
  if (ihDatasize + IMAGE_HEADER_SIZE > fileSize) {
    debug('datasize error')
    return ret
  }
  for (let i = 0; i < ihPackagecount; i++) {
    const packageInfo = ihPackageinfo.subarray(i * PACKAGE_INFO_SIZE, (i + 1) * PACKAGE_INFO_SIZE)
    const piChiptype = sliceSubArray(packageInfo, 0, 16)
    const piPlatform = sliceSubArray(packageInfo, 16, 32)
    const piOffset = packageInfo.readUInt32LE(32)
    const piSize = packageInfo.readUInt32LE(36)
    ret.push({ chip: piChiptype, platform: piPlatform, offset: piOffset, size: piSize })
  }
  return ret
}

function readFirmware (chip, fw) {
  const ret = _readCombineFirmwareToBuffer(fw)
  if (ret.length > 0) {
    const correctUpdate = ret.find((item) => {
      return item.chip === chip
    })
    if (correctUpdate) {
      return {
        content: fs.readFileSync(fw).subarray(correctUpdate.offset, correctUpdate.offset + correctUpdate.size),
        size: correctUpdate.size
      }
    } else {
      return null
    }
  } else {
    return {
      content: fs.readFileSync(fw),
      size: fs.statSync(fw).size
    }
  }
}

module.exports = readFirmware
