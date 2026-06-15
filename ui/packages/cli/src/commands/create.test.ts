import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { noop } from '../test-utils.js'
import { runCreate } from './create.js'

describe('runCreate', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mdk-create-test-'))
  })

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  })

  it('scaffolds project: package.json and src/ directory exist', () => {
    const { appPath } = runCreate({
      appName: 'my-test-app',
      template: 'starter',
      cwd: tempDir,
      install: false,
      out: noop,
    })

    expect(existsSync(appPath)).toBe(true)
    expect(existsSync(join(appPath, 'package.json'))).toBe(true)
    expect(existsSync(join(appPath, 'src'))).toBe(true)
  })

  it('renames _gitignore to .gitignore and deletes _meta.json', () => {
    const { appPath } = runCreate({
      appName: 'rename-test',
      template: 'starter',
      cwd: tempDir,
      install: false,
      out: noop,
    })

    expect(existsSync(join(appPath, '.gitignore'))).toBe(true)
    expect(existsSync(join(appPath, '_gitignore'))).toBe(false)
    expect(existsSync(join(appPath, '_meta.json'))).toBe(false)
  })

  it('substitutes {{appName}} in package.json', () => {
    const appName = 'my-substituted-app'
    const { appPath } = runCreate({
      appName,
      template: 'starter',
      cwd: tempDir,
      install: false,
      out: noop,
    })

    const pkg = JSON.parse(readFileSync(join(appPath, 'package.json'), 'utf8')) as {
      name: string
    }
    expect(pkg.name).toBe(appName)
  })

  it('throws on invalid app name', () => {
    expect(() =>
      runCreate({
        appName: 'Invalid App Name!',
        template: 'starter',
        cwd: tempDir,
        install: false,
        out: noop,
      }),
    ).toThrow(/Invalid app name/)
  })

  it('throws when target directory already exists', () => {
    runCreate({
      appName: 'existing-app',
      template: 'starter',
      cwd: tempDir,
      install: false,
      out: noop,
    })

    expect(() =>
      runCreate({
        appName: 'existing-app',
        template: 'starter',
        cwd: tempDir,
        install: false,
        out: noop,
      }),
    ).toThrow(/already exists/)
  })

  it('wires MDK deps to the workspace protocol when invoked inside the monorepo', () => {
    // Build a fake monorepo containing packages/ui-core/package.json with the
    // sentinel name. runCreate should detect it and rewire the scaffolded
    // package.json's @tetherto/* deps to the npm workspace protocol ("*"),
    // and rename the package to @tetherto/<appName>.
    mkdirSync(join(tempDir, 'packages', 'ui-core'), { recursive: true })
    writeFileSync(
      join(tempDir, 'packages', 'ui-core', 'package.json'),
      JSON.stringify({ name: '@tetherto/mdk-ui-core' }),
      'utf8',
    )

    const lines: string[] = []
    const { appPath } = runCreate({
      appName: 'monorepo-app',
      template: 'starter',
      cwd: tempDir,
      install: false,
      out: (l) => lines.push(l),
    })

    const pkg = JSON.parse(readFileSync(join(appPath, 'package.json'), 'utf8')) as {
      name?: string
      dependencies?: Record<string, string>
    }
    expect(pkg.name).toBe('@tetherto/monorepo-app')
    const mdkDeps = Object.entries(pkg.dependencies ?? {}).filter(([name]) =>
      name.startsWith('@tetherto/'),
    )
    expect(mdkDeps.length).toBeGreaterThan(0)
    for (const [, value] of mdkDeps) {
      expect(value).toBe('*')
    }
    expect(lines.some((l) => l.includes('Detected MDK monorepo'))).toBe(true)
  })

  it('ignores a corrupt packages/ui-core/package.json when walking up', () => {
    mkdirSync(join(tempDir, 'packages', 'ui-core'), { recursive: true })
    writeFileSync(join(tempDir, 'packages', 'ui-core', 'package.json'), '{not valid json', 'utf8')

    const { appPath } = runCreate({
      appName: 'corrupt-monorepo',
      template: 'starter',
      cwd: tempDir,
      install: false,
      out: noop,
    })

    const pkg = JSON.parse(readFileSync(join(appPath, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    const mdkDeps = Object.entries(pkg.dependencies ?? {}).filter(([name]) =>
      name.startsWith('@tetherto/'),
    )
    for (const [, value] of mdkDeps) {
      expect(value).not.toMatch(/^file:/)
    }
  })

  it('emits an "npx mdk-ui init" hint in Next steps when install is skipped', () => {
    const lines: string[] = []
    runCreate({
      appName: 'hint-app',
      template: 'starter',
      cwd: tempDir,
      install: false,
      ide: 'claude',
      out: (l) => lines.push(l),
    })
    const text = lines.join('\n')
    expect(text).toMatch(/cd hint-app/)
    expect(text).toMatch(/npm install/)
    expect(text).toMatch(/npx mdk-ui init --ide claude/)
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runCreate({
        appName: 'console-app',
        template: 'starter',
        cwd: tempDir,
        install: false,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
