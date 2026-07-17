import { describe, expect, it } from 'vitest'

import { computeCoverage, type CuratedCatalog, formatCoverage } from './docs-coverage.js'
import type { DocsComponentRecord, DocsHookRecord } from './docs-data.js'

const component = (name: string): DocsComponentRecord => ({
  name,
  subpackage: 'primitives',
  description: '',
  props: [],
  sourcePath: `src/primitives/${name}.tsx`,
})

const hook = (name: string): DocsHookRecord => ({
  name,
  package: 'react-devkit',
  description: '',
  signature: '() => void',
})

describe('computeCoverage', () => {
  it('flags new components/hooks and catalog page rot, honouring the skip-list', () => {
    const components = [component('Alpha'), component('Bravo'), component('Skipped')]
    const hooks = [hook('useFresh')]
    const curated: CuratedCatalog = {
      componentNames: new Set(['Alpha', 'Gone']),
      hookNames: new Set(),
      skip: new Set(['Skipped']),
    }
    const report = computeCoverage(components, hooks, curated)
    expect(report.newComponents).toEqual(['Bravo'])
    expect(report.removedComponents).toEqual(['Gone'])
    expect(report.newHooks).toEqual(['useFresh'])
    expect(report.clean).toBe(false)
  })

  it('is clean when the catalog matches the generated surface', () => {
    const curated: CuratedCatalog = {
      componentNames: new Set(['Alpha']),
      hookNames: new Set(['useX']),
      skip: new Set(),
    }
    const report = computeCoverage([component('Alpha')], [hook('useX')], curated)
    expect(report.clean).toBe(true)
  })
})

describe('formatCoverage', () => {
  it('summarises a clean report on one line', () => {
    expect(formatCoverage({ newComponents: [], removedComponents: [], newHooks: [], clean: true })).toMatch(
      /matches/,
    )
  })

  it('lists each bucket that needs attention', () => {
    const text = formatCoverage({
      newComponents: ['Bravo'],
      removedComponents: ['Gone'],
      newHooks: ['useFresh'],
      clean: false,
    })
    expect(text).toContain('+ Bravo')
    expect(text).toContain('- Gone')
    expect(text).toContain('+ useFresh')
  })

  it('omits empty buckets (only the non-empty ones render)', () => {
    const text = formatCoverage({
      newComponents: [],
      removedComponents: [],
      newHooks: ['useOnly'],
      clean: false,
    })
    expect(text).toContain('+ useOnly')
    expect(text).not.toContain('component(s)')
  })
})
