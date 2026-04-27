'use strict'

const test = require('brittle')
const hex2a = require('../../lib/utils/hex2a')

test('hex2a - converts hex string to ASCII', (t) => {
  t.is(hex2a('48656c6c6f'), 'Hello')
})

test('hex2a - converts hex string with uppercase letters', (t) => {
  t.is(hex2a('48656C6C6F'), 'Hello')
})

test('hex2a - skips null bytes (00)', (t) => {
  t.is(hex2a('48006c6c6f'), 'Hllo')
})

test('hex2a - returns empty string for empty input', (t) => {
  t.is(hex2a(''), '')
})

test('hex2a - converts single character', (t) => {
  t.is(hex2a('41'), 'A')
})

test('hex2a - converts numbers in hex', (t) => {
  t.is(hex2a('313233'), '123')
})

test('hex2a - handles all null bytes', (t) => {
  t.is(hex2a('000000'), '')
})
