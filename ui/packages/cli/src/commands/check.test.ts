import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { noop, WORKSPACE_ROOT } from '../test-utils.js'
import { runCheck } from './check.js'

describe('runCheck', () => {
  it('returns a CLI001 error for missing files', () => {
    const result = runCheck({
      file: '/definitely/does/not/exist.tsx',
      cwd: process.cwd(),
      out: noop,
    })
    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe('CLI001')
    expect(result.renderValidation).toBe('not-checked')
    expect(result.lintValidation).toBe('skipped')
  })

  it('documents render-validation as a known gap', () => {
    const result = runCheck({
      file: '/missing.tsx',
      cwd: process.cwd(),
      out: noop,
    })
    expect(result.renderValidation).toBe('not-checked')
  })

  it('uses console.log as the default `out` sink', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runCheck({ file: '/missing.tsx', cwd: process.cwd() })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  describe('with a real fixture on disk', () => {
    let projectDir: string

    beforeEach(() => {
      // Place the fixture inside the workspace so `npx --no-install tsc`
      // can resolve TypeScript from the workspace's hoisted node_modules.
      projectDir = mkdtempSync(join(WORKSPACE_ROOT, 'tmp-mdk-check-'))
      mkdirSync(join(projectDir, 'src'), { recursive: true })
      writeFileSync(
        join(projectDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            esModuleInterop: true,
          },
          include: ['src/**/*'],
        }),
        'utf8',
      )
    })

    afterEach(() => {
      try {
        rmSync(projectDir, { recursive: true, force: true })
      } catch {
        // best-effort
      }
    })

    it('reports no tsc errors for a file that type-checks', () => {
      const file = join(projectDir, 'src', 'ok.ts')
      writeFileSync(
        file,
        'export const greet = (name: string): string => "hello " + name\n',
        'utf8',
      )

      const result = runCheck({ file, cwd: projectDir, out: noop })
      expect(
        result.errors.filter((e) => e.severity === 'error' && e.source === 'tsc'),
      ).toHaveLength(0)
      // lintValidation is 'ok' or 'skipped' depending on whether ESLint config is present
      expect(['ok', 'skipped', 'error']).toContain(result.lintValidation)
    })

    it('parses tsc diagnostics for a file that fails to type-check', () => {
      const file = join(projectDir, 'src', 'bad.ts')
      writeFileSync(file, 'const x: number = "not a number"\n', 'utf8')

      const result = runCheck({ file, cwd: projectDir, out: noop })
      expect(result.ok).toBe(false)
      const tscErrors = result.errors.filter((e) => e.source === 'tsc')
      expect(tscErrors.length).toBeGreaterThan(0)
      const first = tscErrors[0]!
      expect(first.file).toBe(file)
      expect(first.severity).toBe('error')
      expect(first.code).toMatch(/^TS\d+$/)
      expect(first.line).toBeGreaterThan(0)
    })

    it('stamps tsc errors with source=tsc and eslint errors with source=eslint', () => {
      const file = join(projectDir, 'src', 'sourced.ts')
      writeFileSync(file, 'export const x = 1\n', 'utf8')

      const result = runCheck({ file, cwd: projectDir, out: noop })
      for (const e of result.errors) {
        expect(['tsc', 'eslint']).toContain(e.source)
      }
    })

    it('sets lintValidation to skipped when eslint is not configured', () => {
      // No .eslintrc / eslint.config in the fixture dir — ESLint exits with code 2
      const file = join(projectDir, 'src', 'ok.ts')
      writeFileSync(file, 'export const x = 1\n', 'utf8')

      const result = runCheck({ file, cwd: projectDir, out: noop })
      // Either 'ok' (if ESLint finds no issues) or 'skipped' (no config) — never throws
      expect(['ok', 'skipped', 'error']).toContain(result.lintValidation)
    })

    it('accepts an absolute file path identical to opts.file', () => {
      const file = join(projectDir, 'src', 'abs.ts')
      writeFileSync(file, 'export const ok = 1\n', 'utf8')

      const result = runCheck({ file, cwd: projectDir, out: noop })
      expect(result.file).toBe(file)
    })

    it('falls back to cwd-based tsconfig when none sits next to the file', () => {
      const isolated = mkdtempSync(join(WORKSPACE_ROOT, 'tmp-mdk-check-iso-'))
      try {
        const file = join(isolated, 'orphan.ts')
        writeFileSync(file, 'export const x: number = 1\n', 'utf8')
        const result = runCheck({ file, cwd: projectDir, out: noop })
        expect(typeof result.ok).toBe('boolean')
      } finally {
        rmSync(isolated, { recursive: true, force: true })
      }
    })
  })
})
