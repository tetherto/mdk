'use strict'

const test = require('brittle')
const { isTransformerPM } = require('../../lib/templates/utils')

test('isTransformerPM matches tr + digits', (t) => {
  t.ok(isTransformerPM({ info: { pos: 'tr1' } }))
  t.ok(isTransformerPM({ info: { pos: 'tr42' } }))
})

test('isTransformerPM rejects non-matching pos', (t) => {
  t.absent(isTransformerPM({ info: { pos: 'rack1' } }))
  t.absent(isTransformerPM({ info: { pos: 'tr' } }))
  t.absent(isTransformerPM({}))
  t.absent(isTransformerPM(null))
})
