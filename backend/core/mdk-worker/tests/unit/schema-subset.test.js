'use strict'

const test = require('brittle')
const { validateSubset, SUBSET_KEYWORDS } = require('../../lib/schema-subset')

const schema = {
  type: 'object',
  required: ['name', 'stamp'],
  properties: {
    name: { type: 'string' },
    stamp: { type: 'string', const: '1', 'x-mdk-strict': true },
    count: { type: 'integer', minimum: 0 },
    kind: { enum: ['a', 'b'] },
    tags: { type: 'array', items: { type: 'string' } },
    extra: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean' } } }
  }
}

test('validateSubset: a conforming value has no findings', (t) => {
  const out = validateSubset(schema, { name: 'n', stamp: '1', count: 2, kind: 'a', tags: ['x'], extra: { ok: true } })
  t.alike(out, { base: [], strict: [] })
})

test('validateSubset: codes carry the caller prefix', (t) => {
  const out = validateSubset(schema, { name: 7, stamp: '1' }, { codePrefix: 'ERR_ROUTES' })
  t.is(out.base.length, 1)
  t.ok(out.base[0].startsWith('ERR_ROUTES_TYPE: /name expected string, got number'))
})

test('validateSubset: default prefix is ERR_CONTRACT', (t) => {
  const out = validateSubset(schema, { name: 7, stamp: '1' })
  t.ok(out.base[0].startsWith('ERR_CONTRACT_TYPE:'))
})

test('validateSubset: x-mdk-strict findings land in the strict tier', (t) => {
  const out = validateSubset(schema, { name: 'n' })
  t.is(out.base.length, 0)
  t.is(out.strict.length, 1)
  t.ok(out.strict[0].includes("missing required property 'stamp'"))
})

test('validateSubset: enum, minimum, items and additionalProperties', (t) => {
  const out = validateSubset(schema, { name: 'n', stamp: '1', count: -1, kind: 'c', tags: [1], extra: { no: 1 } })
  const codes = out.base.map(e => e.split(':')[0]).sort()
  t.alike(codes, ['ERR_CONTRACT_ENUM', 'ERR_CONTRACT_MINIMUM', 'ERR_CONTRACT_TYPE', 'ERR_CONTRACT_UNEXPECTED'])
})

test('validateSubset: SUBSET_KEYWORDS names what the subset implements', (t) => {
  for (const k of ['type', 'enum', 'const', 'required', 'properties', 'additionalProperties', 'items', 'if', 'then', 'minimum', 'allOf', 'x-mdk-strict']) {
    t.ok(SUBSET_KEYWORDS.includes(k), k)
  }
})
