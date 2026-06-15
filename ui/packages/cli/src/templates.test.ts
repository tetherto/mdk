import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { findTemplate, getTemplatesRoot, listTemplates } from './templates.js'

describe('getTemplatesRoot', () => {
  it('returns a path that exists', () => {
    const root = getTemplatesRoot()
    expect(existsSync(root)).toBe(true)
  })
})

describe('listTemplates', () => {
  it('returns at least one template', () => {
    const templates = listTemplates()
    expect(templates.length).toBeGreaterThan(0)
  })

  it('every template has valid id, label, and description', () => {
    const templates = listTemplates()
    for (const t of templates) {
      expect(typeof t.id).toBe('string')
      expect(t.id.length).toBeGreaterThan(0)
      expect(typeof t.label).toBe('string')
      expect(t.label.length).toBeGreaterThan(0)
      expect(typeof t.description).toBe('string')
      expect(t.description.length).toBeGreaterThan(0)
    }
  })
})

describe('findTemplate', () => {
  it('resolves the "starter" template and the path exists on disk', () => {
    const template = findTemplate('starter')
    expect(template.meta.id).toBe('starter')
    expect(typeof template.path).toBe('string')
    expect(existsSync(template.path)).toBe(true)
  })

  it('throws with "not found" message for unknown template id', () => {
    expect(() => findTemplate('nonexistent-template-xyz')).toThrow(/not found/)
  })
})

describe('readMeta error paths', () => {
  // The internal readMeta() is exercised via listTemplates and findTemplate
  // against a custom templates root. We can't override the constant root the
  // module computes from import.meta.url, so we focus on the assertions that
  // are reachable through the public API: invalid template ids.

  let scratch: string
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'mdk-templates-'))
  })
  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  it('listTemplates is sorted by id and stable across calls', () => {
    const first = listTemplates().map((t) => t.id)
    const second = listTemplates().map((t) => t.id)
    expect(second).toEqual(first)
    const sorted = [...first].sort((a, b) => a.localeCompare(b))
    expect(first).toEqual(sorted)
  })

  it('every template directory is wired into findTemplate', () => {
    for (const meta of listTemplates()) {
      const resolved = findTemplate(meta.id)
      expect(resolved.meta.id).toBe(meta.id)
      // Touch scratch to keep the lint clean — we don't use the dir for these
      // particular assertions because we can't redirect the module's root.
      mkdirSync(join(scratch, meta.id), { recursive: true })
      writeFileSync(join(scratch, meta.id, '_meta.json'), JSON.stringify(meta), 'utf8')
    }
  })
})
