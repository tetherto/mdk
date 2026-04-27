'use strict'

const test = require('brittle')
const {
  parseAvalonResponseString,
  parseAvalonPoolData,
  extractValueBetweenBrackets
} = require('../../lib/utils')

test('parseAvalonResponseString - parses simple key=value pairs', (t) => {
  const input = 'STATUS=S,Code=22,Msg=CGMiner versions'
  const result = parseAvalonResponseString(input)

  t.is(result.STATUS, 'S')
  t.is(result.Code, '22')
  t.is(result.Msg, 'CGMiner versions')
})

test('parseAvalonResponseString - parses single key=value pair', (t) => {
  const input = 'Code=119'
  const result = parseAvalonResponseString(input)
  t.is(result.Code, '119')
})

test('parseAvalonResponseString - handles keys with spaces', (t) => {
  const input = 'MHS av=295000000,MHS 30s=294000000,MHS 1m=293000000'
  const result = parseAvalonResponseString(input)
  t.is(result['MHS av'], '295000000')
  t.is(result['MHS 30s'], '294000000')
  t.is(result['MHS 1m'], '293000000')
})

test('parseAvalonResponseString - handles version response format', (t) => {
  const input = 'CGMiner=4.11.1,API=3.7,MODEL=1346-116,HWTYPE=MM4v1_X3,SWTYPE=MM317,VERSION=23042501,MAC=b4a2eb3f2348'
  const result = parseAvalonResponseString(input)

  t.is(result.CGMiner, '4.11.1')
  t.is(result.API, '3.7')
  t.is(result.MODEL, '1346-116')
  t.is(result.HWTYPE, 'MM4v1_X3')
  t.is(result.SWTYPE, 'MM317')
  t.is(result.MAC, 'b4a2eb3f2348')
})

test('parseAvalonResponseString - returns empty object for empty string', (t) => {
  const result = parseAvalonResponseString('')
  t.ok(typeof result === 'object')
})

test('parseAvalonPoolData - parses pool response with multiple pools', (t) => {
  const pool0 = 'POOL=0,URL=stratum+tcp://btc.f2pool.com:1314,Status=Alive,Priority=0,User=worker1'
  const pool1 = 'POOL=1,URL=stratum+tcp://btc-asia.f2pool.com:1314,Status=Alive,Priority=1,User=worker2'
  const input = `STATUS=S,Code=7|${pool0}|${pool1}| `

  const result = parseAvalonPoolData(input)

  t.is(result.length, 2)
  t.is(result[0].POOL, '0')
  t.is(result[0].URL, 'stratum+tcp://btc.f2pool.com:1314')
  t.is(result[0].Status, 'Alive')
  t.is(result[0].User, 'worker1')
  t.is(result[1].POOL, '1')
  t.is(result[1].User, 'worker2')
})

test('parseAvalonPoolData - strips first (status) and last (empty) segments', (t) => {
  const input = 'STATUS=S,Code=7|POOL=0,URL=stratum+tcp://pool.com:1314,User=w1|POOL=1,URL=stratum+tcp://pool2.com:1314,User=w2| '
  const result = parseAvalonPoolData(input)

  // First segment (STATUS=S...) and last (empty) are stripped
  t.is(result.length, 2)
  t.absent(result.find(p => p.STATUS === 'S'))
})

test('extractValueBetweenBrackets - extracts value for a given key', (t) => {
  const input = 'DNA[abc123def456] MEMFREE[2059656] WORKMODE[1]'

  t.is(extractValueBetweenBrackets(input, 'DNA'), 'abc123def456')
  t.is(extractValueBetweenBrackets(input, 'MEMFREE'), '2059656')
  t.is(extractValueBetweenBrackets(input, 'WORKMODE'), '1')
})

test('extractValueBetweenBrackets - returns null when key not found', (t) => {
  const input = 'DNA[abc123] MEMFREE[2059656]'
  t.is(extractValueBetweenBrackets(input, 'NONEXISTENT'), null)
})

test('extractValueBetweenBrackets - handles space-separated values inside brackets', (t) => {
  const input = 'PS[0 1 1 1 1 1 1] PLL0[2384 1150 2381 10885]'

  t.is(extractValueBetweenBrackets(input, 'PS'), '0 1 1 1 1 1 1')
  t.is(extractValueBetweenBrackets(input, 'PLL0'), '2384 1150 2381 10885')
})

test('extractValueBetweenBrackets - handles empty bracket value', (t) => {
  const input = 'MW0[] MW1[abc]'
  t.is(extractValueBetweenBrackets(input, 'MW0'), '')
  t.is(extractValueBetweenBrackets(input, 'MW1'), 'abc')
})

test('extractValueBetweenBrackets - handles numeric key suffix (PVT_T0, PVT_T1)', (t) => {
  const input = 'PVT_T0[36.1 36.2 36.3] PVT_T1[37.1 37.2 37.3]'
  t.is(extractValueBetweenBrackets(input, 'PVT_T0'), '36.1 36.2 36.3')
  t.is(extractValueBetweenBrackets(input, 'PVT_T1'), '37.1 37.2 37.3')
})
