'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const readFirmware = require('../../lib/utils/firmware')

const PI_SIZE = 16
const MAX_PACKAGE_COUNT = 64
const PACKAGE_INFO_SIZE = PI_SIZE * 2 + 4 + 4 + PI_SIZE * 4
const IMAGE_HEADER_SIZE = 6 * 4 + MAX_PACKAGE_COUNT * PACKAGE_INFO_SIZE + 4 * 32 + 4

function buildCombineFirmware ({ datasize, count, packages, payload }) {
  const header = Buffer.alloc(IMAGE_HEADER_SIZE)
  header.writeUInt32LE(datasize, 4 * 4)
  header.writeUInt32LE(count, 5 * 4)
  packages.forEach((pkg, i) => {
    const base = 6 * 4 + i * PACKAGE_INFO_SIZE
    header.write(pkg.chip, base)
    header.write(pkg.platform, base + PI_SIZE)
    header.writeUInt32LE(pkg.offset, base + 32)
    header.writeUInt32LE(pkg.size, base + 36)
  })
  return Buffer.concat([header, payload])
}

function writeTmpFirmware (t, buf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-fw-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'firmware.bin')
  fs.writeFileSync(file, buf)
  return file
}

test('readFirmware - extracts the package matching the chip', (t) => {
  const payload = Buffer.from('AAAABBBBCCCC')
  const file = writeTmpFirmware(t, buildCombineFirmware({
    datasize: payload.length,
    count: 2,
    packages: [
      { chip: 'h615', platform: 'sun50iw9', offset: IMAGE_HEADER_SIZE, size: 4 },
      { chip: 'h616', platform: 'sun50iw9', offset: IMAGE_HEADER_SIZE + 4, size: 8 }
    ],
    payload
  }))

  const fw = readFirmware('h616', file)
  t.is(fw.size, 8)
  t.is(fw.content.toString(), 'BBBBCCCC')
})

test('readFirmware - full-width chip name without NUL terminator', (t) => {
  const chip = 'a'.repeat(PI_SIZE)
  const payload = Buffer.from('PAYLOAD1')
  const file = writeTmpFirmware(t, buildCombineFirmware({
    datasize: payload.length,
    count: 1,
    packages: [{ chip, platform: 'p', offset: IMAGE_HEADER_SIZE, size: payload.length }],
    payload
  }))

  const fw = readFirmware(chip, file)
  t.is(fw.content.toString(), 'PAYLOAD1')
})

test('readFirmware - returns null when no package matches the chip', (t) => {
  const payload = Buffer.from('AAAA')
  const file = writeTmpFirmware(t, buildCombineFirmware({
    datasize: payload.length,
    count: 1,
    packages: [{ chip: 'h615', platform: 'p', offset: IMAGE_HEADER_SIZE, size: 4 }],
    payload
  }))

  t.is(readFirmware('h616', file), null)
})

test('readFirmware - falls back to whole file when package count exceeds max', (t) => {
  const buf = buildCombineFirmware({
    datasize: 4,
    count: MAX_PACKAGE_COUNT + 1,
    packages: [],
    payload: Buffer.from('AAAA')
  })
  const file = writeTmpFirmware(t, buf)

  const fw = readFirmware('h616', file)
  t.is(fw.size, buf.length)
  t.ok(fw.content.equals(buf))
})

test('readFirmware - falls back to whole file when declared datasize overflows the file', (t) => {
  const buf = buildCombineFirmware({
    datasize: 1024 * 1024,
    count: 1,
    packages: [{ chip: 'h616', platform: 'p', offset: IMAGE_HEADER_SIZE, size: 4 }],
    payload: Buffer.from('AAAA')
  })
  const file = writeTmpFirmware(t, buf)

  const fw = readFirmware('h616', file)
  t.is(fw.size, buf.length)
  t.ok(fw.content.equals(buf))
})
