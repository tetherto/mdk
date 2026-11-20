import { test } from 'node:test'
import assert from 'node:assert/strict'

import { findTables, extractIdentifiers } from '../docs/scripts/check-table-refs.mjs'

const table = (header) => [
  `| ${header.join(' | ')} |`,
  `| ${header.map(() => '---').join(' | ')} |`,
  '| `ERR_A` / `ERR_B` | x | y |'
]

test('findTables: a Code-first table is an error table, whatever its second column', () => {
  for (const second of ['Fires when', 'Status']) {
    const [t] = findTables(table(['Code', second, 'Fix']))
    assert.equal(t.kind, 'error', second)
  }
  assert.equal(findTables(table(['Option', 'Status', 'Notes']))[0].kind, 'option')
})

test('extractIdentifiers: every code in an error cell, slash- or comma-separated', () => {
  assert.deepEqual(extractIdentifiers('error', '`ERR_A` / `ERR_B`, `ERR_C`'), ['ERR_A', 'ERR_B', 'ERR_C'])
})
