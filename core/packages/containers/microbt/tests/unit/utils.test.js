'use strict'

const { test } = require('brittle')
const { bufferToInt16Array, bufferToBitString } = require('../../lib/utils')

test('bufferToInt16Array signed: reads int16 BE', (t) => {
  const buf = Buffer.alloc(4)
  buf.writeInt16BE(100, 0)
  buf.writeInt16BE(-200, 2)
  const arr = bufferToInt16Array(buf, false)
  t.alike(arr, [100, -200], 'signed int16 values')
})

test('bufferToInt16Array unsigned: reads uint16 BE', (t) => {
  const buf = Buffer.alloc(4)
  buf.writeUInt16BE(100, 0)
  buf.writeUInt16BE(65535, 2)
  const arr = bufferToInt16Array(buf, true)
  t.alike(arr, [100, 65535], 'unsigned uint16 values')
})

test('bufferToInt16Array default is signed', (t) => {
  const buf = Buffer.alloc(2)
  buf.writeInt16BE(-1, 0)
  const arr = bufferToInt16Array(buf)
  t.alike(arr, [-1], 'default signed')
})

test('bufferToBitString converts buffer to bit string', (t) => {
  const buf = Buffer.from([0xff, 0x00])
  const s = bufferToBitString(buf)
  t.is(s, '1111111100000000', 'bit string for 0xff 0x00')
})

test('bufferToBitString single byte', (t) => {
  const buf = Buffer.from([0x0f])
  const s = bufferToBitString(buf)
  t.is(s, '00001111', 'bit string for 0x0f')
})
