import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { RegistryComponent } from './registry-loader.js'
import { readExampleSource } from './examples.js'

const makeComponent = (overrides: Partial<RegistryComponent> = {}): RegistryComponent => ({
  name: 'TestComponent',
  path: 'src/test.tsx',
  description: 'A test component',
  props: [],
  ...overrides,
})

describe('readExampleSource', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mdk-examples-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns null when component.examples is empty', () => {
    const component = makeComponent({ examples: [] })
    const result = readExampleSource(tmpDir, component)
    expect(result).toBeNull()
  })

  it('returns null when component.examples is undefined', () => {
    const component = makeComponent({ examples: undefined })
    const result = readExampleSource(tmpDir, component)
    expect(result).toBeNull()
  })

  it('returns source string when the example path resolves on disk', () => {
    const exampleRelPath = 'src/components/button/button.example.tsx'
    const fullPath = join(tmpDir, exampleRelPath)
    mkdirSync(join(tmpDir, 'src/components/button'), { recursive: true })
    const source = 'export default function ButtonExample() { return null; }'
    writeFileSync(fullPath, source, 'utf8')

    const component = makeComponent({ examples: [exampleRelPath] })
    const result = readExampleSource(tmpDir, component)

    expect(result).not.toBeNull()
    expect(result!.source).toBe(source)
    expect(result!.path).toBe(fullPath)
  })

  it('returns null when the example path does not exist on disk', () => {
    const component = makeComponent({ examples: ['src/does-not-exist.example.tsx'] })
    const result = readExampleSource(tmpDir, component)
    expect(result).toBeNull()
  })
})
