import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeConsumerFixture, noop } from '../test-utils.js'
import { runInit } from './init.js'

describe('runInit', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('creates .mdk/context.md', async () => {
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'none',
      cwd: fixture.dir,
      out: noop,
    })
    const ctxPath = join(fixture.dir, '.mdk/context.md')
    expect(existsSync(ctxPath)).toBe(true)
    const text = readFileSync(ctxPath, 'utf8')
    expect(text).toMatch(/MDK context/)
    expect(text).toMatch(/mdk-ui registry/)
    expect(text).toMatch(/<!-- mdk:pages:start -->/)
    expect(text).toMatch(/<!-- mdk:hooks:start -->/)
  })

  it('adds .mdk/context.md to .gitignore', async () => {
    writeFileSync(join(fixture.dir, '.gitignore'), 'dist/\n', 'utf8')
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'none',
      cwd: fixture.dir,
      out: noop,
    })
    const gi = readFileSync(join(fixture.dir, '.gitignore'), 'utf8')
    expect(gi).toMatch(/^dist\/$/m)
    expect(gi).toMatch(/^\.mdk\/context\.md$/m)
  })

  it('does not duplicate an existing .gitignore entry', async () => {
    writeFileSync(join(fixture.dir, '.gitignore'), '.mdk/context.md\n', 'utf8')
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'none',
      cwd: fixture.dir,
      out: noop,
    })
    const gi = readFileSync(join(fixture.dir, '.gitignore'), 'utf8')
    const matches = gi.match(/\.mdk\/context\.md/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('writes a CLAUDE.md when --ide claude', async () => {
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'claude',
      cwd: fixture.dir,
      out: noop,
    })
    const claude = readFileSync(join(fixture.dir, 'CLAUDE.md'), 'utf8')
    expect(claude).toMatch(/MDK UI/)
    expect(claude).toMatch(/npx mdk-ui suggest/)
  })

  it('writes a .cursor/rules/mdk.mdc when --ide cursor', async () => {
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'cursor',
      cwd: fixture.dir,
      out: noop,
    })
    const rule = readFileSync(join(fixture.dir, '.cursor/rules/mdk.mdc'), 'utf8')
    expect(rule).toMatch(/MDK UI/)
    expect(rule).toMatch(/alwaysApply: true/)
  })

  it('skips an existing context.md without --force', async () => {
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'none',
      cwd: fixture.dir,
      out: noop,
    })
    writeFileSync(join(fixture.dir, '.mdk/context.md'), 'DO NOT TOUCH', 'utf8')
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'none',
      cwd: fixture.dir,
      out: noop,
    })
    expect(readFileSync(join(fixture.dir, '.mdk/context.md'), 'utf8')).toBe('DO NOT TOUCH')
  })

  it('overwrites when --force is set', async () => {
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'none',
      cwd: fixture.dir,
      out: noop,
    })
    writeFileSync(join(fixture.dir, '.mdk/context.md'), 'STALE', 'utf8')
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'none',
      cwd: fixture.dir,
      force: true,
      out: noop,
    })
    expect(readFileSync(join(fixture.dir, '.mdk/context.md'), 'utf8')).toMatch(/MDK context/)
  })

  it('skips an existing CLAUDE.md without --force', async () => {
    writeFileSync(join(fixture.dir, 'CLAUDE.md'), 'KEEP ME', 'utf8')
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'claude',
      cwd: fixture.dir,
      out: noop,
    })
    expect(readFileSync(join(fixture.dir, 'CLAUDE.md'), 'utf8')).toBe('KEEP ME')
  })

  it('skips an existing .cursor/rules/mdk.mdc without --force', async () => {
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'cursor',
      cwd: fixture.dir,
      out: noop,
    })
    const rulePath = join(fixture.dir, '.cursor/rules/mdk.mdc')
    writeFileSync(rulePath, 'KEEP ME', 'utf8')
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'cursor',
      cwd: fixture.dir,
      out: noop,
    })
    expect(readFileSync(rulePath, 'utf8')).toBe('KEEP ME')
  })

  it('uses console.log as the default `out` sink', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await runInit({
        packageName: '@tetherto/mdk-react-devkit',
        ide: 'none',
        cwd: fixture.dir,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
