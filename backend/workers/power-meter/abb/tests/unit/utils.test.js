'use strict'

const test = require('brittle')
const {
  obisToBytes,
  buildAlarmConfig,
  parseAlarmConfig,
  asciiBufferToStr,
  bufferToBitString
} = require('../../lib/utils')

test('obisToBytes converts valid OBIS code to 6-byte buffer', t => {
  const out = obisToBytes('1.2.3.4.5.6')
  t.is(out.length, 6)
  t.alike([...out], [1, 2, 3, 4, 5, 6])
})

test('obisToBytes rejects malformed OBIS code', t => {
  t.exception(() => obisToBytes('1.2.3.4.5'), /Invalid OBIS code format/)
})

test('alarm config build+parse roundtrip preserves key fields', t => {
  const cfg = {
    index: 7,
    quantity: '1.2.3.4.5.6',
    limit_on: 1000,
    limit_off: 500,
    delay_on: 10,
    delay_off: 20,
    action: {
      types: ['writeLog', 'setOutput'],
      output: 2
    }
  }

  const parsed = parseAlarmConfig(buildAlarmConfig(cfg))

  t.is(parsed.index, cfg.index)
  t.is(typeof parsed.quantity, 'string')
  t.is(parsed.quantity.length, 11)
  t.is(parsed.delay_on, cfg.delay_on)
  t.is(parsed.delay_off, cfg.delay_off)
  t.alike(parsed.action.types.sort(), cfg.action.types.sort())
  t.is(parsed.action.output, cfg.action.output)
})

test('obisToBytes rejects out-of-range and non-numeric components', t => {
  t.exception(() => obisToBytes('1.2.3.4.5.256'), /Invalid byte value in OBIS code/)
  t.exception(() => obisToBytes('1.2.3.4.5.x'), /Invalid byte value in OBIS code/)
})

test('parseAlarmConfig rejects a quantity packet of wrong length', t => {
  const packets = buildAlarmConfig({
    index: 1,
    quantity: '1.2.3.4.5.6',
    limit_on: 1,
    limit_off: 0,
    delay_on: 0,
    delay_off: 0,
    action: { types: ['setAlarmBit'], output: 0 }
  })
  packets[1] = Buffer.alloc(5)

  t.exception(() => parseAlarmConfig(packets), /Invalid OBIS code byte length/)
})

test('asciiBufferToStr strips zero bytes and decodes', t => {
  const out = asciiBufferToStr(Buffer.from([65, 0, 66, 0, 67]))
  t.is(out, 'ABC')
})

test('bufferToBitString converts bytes to bit string', t => {
  const out = bufferToBitString(Buffer.from([0b10100000, 0b00001111]))
  t.is(out, '1010000000001111')
})
