import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  findComponent,
  findHook,
  loadBlueprints,
  loadHooksManifest,
  loadRegistry,
  loadStoresManifest,
} from './registry-loader.js'
import { makeConsumerFixture } from './test-utils.js'

describe('registry-loader', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('resolves the devkit package and reads dist/registry.json', () => {
    const { registry, packageDir } = loadRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
    })
    expect(registry.package).toBe('@tetherto/mdk-react-devkit')
    expect(registry.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(Array.isArray(registry.components)).toBe(true)
    expect(registry.components.length).toBeGreaterThan(0)
    expect(packageDir).toMatch(/react-devkit$/)
  })

  it('throws when the package cannot be resolved', () => {
    expect(() =>
      loadRegistry({
        packageName: '@tetherto/does-not-exist',
        cwd: fixture.dir,
      }),
    ).toThrow(/Could not resolve/)
  })

  it('finds components case-insensitively', () => {
    const { registry } = loadRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
    })
    expect(findComponent(registry, 'LineChartCard')?.name).toBe('LineChartCard')
    expect(findComponent(registry, 'linechartcard')?.name).toBe('LineChartCard')
    expect(findComponent(registry, 'does-not-exist')).toBeUndefined()
  })

  it('finds hooks case-insensitively', () => {
    const { registry } = loadRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
    })
    if (registry.hooks.length === 0) return
    const first = registry.hooks[0]!.name
    expect(findHook(registry, first)?.name).toBe(first)
    expect(findHook(registry, first.toUpperCase())?.name).toBe(first)
  })

  it('loadBlueprints returns null when the package is not resolvable', () => {
    const empty = mkdtempSync(join(tmpdir(), 'mdk-rl-blueprints-'))
    try {
      const result = loadBlueprints({ packageName: '@tetherto/does-not-exist', cwd: empty })
      expect(result).toBeNull()
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })

  it('loadHooksManifest returns null when the package is not resolvable', () => {
    const empty = mkdtempSync(join(tmpdir(), 'mdk-rl-hooks-'))
    try {
      const result = loadHooksManifest({ packageName: '@tetherto/does-not-exist', cwd: empty })
      expect(result).toBeNull()
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })

  it('loadStoresManifest returns null when the package is not resolvable', () => {
    const empty = mkdtempSync(join(tmpdir(), 'mdk-rl-stores-'))
    try {
      const result = loadStoresManifest({ packageName: '@tetherto/does-not-exist', cwd: empty })
      expect(result).toBeNull()
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })

  it('loadBlueprints/Hooks/Stores accept process.cwd() default when cwd is omitted', () => {
    // We can't easily assert success here without depending on the cwd,
    // but we *can* assert these calls don't throw — they should fall back
    // to process.cwd() and return either a manifest or null.
    expect(() => loadBlueprints({ packageName: '@tetherto/does-not-exist' })).not.toThrow()
    expect(() => loadHooksManifest({ packageName: '@tetherto/does-not-exist' })).not.toThrow()
    expect(() => loadStoresManifest({ packageName: '@tetherto/does-not-exist' })).not.toThrow()
  })
})
