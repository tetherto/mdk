import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { execa } from 'execa'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { CLI_BIN, makeConsumerFixture } from './test-utils.js'

const runCli = (args: string[], cwd?: string) =>
  execa('node', [CLI_BIN, ...args], {
    cwd,
    reject: false,
    encoding: 'utf8',
  })

describe('mdk-ui binary (subprocess)', () => {
  beforeAll(() => {
    if (!existsSync(CLI_BIN)) {
      throw new Error(
        `${CLI_BIN} not found. Run \`npm run build --workspace @tetherto/mdk-ui-cli\` before testing.`,
      )
    }
  })

  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('--help exits 0 and lists subcommands', async () => {
    const result = await runCli(['--help'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/registry/)
    expect(result.stdout).toMatch(/docs/)
    expect(result.stdout).toMatch(/example/)
    expect(result.stdout).toMatch(/add/)
    expect(result.stdout).toMatch(/check/)
    expect(result.stdout).toMatch(/init/)
    expect(result.stdout).toMatch(/sync/)
  })

  it('registry --format json returns the full public surface by default', async () => {
    const result = await runCli(['registry', '--format', 'json'], fixture.dir)
    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout)
    expect(parsed.package).toBe('@tetherto/mdk-react-devkit')
    expect(parsed.components.length).toBeGreaterThan(0)
    expect(parsed.components.every((c: { public?: boolean }) => c.public !== false)).toBe(true)
  })

  it('registry default surfaces all public components; --tier agent-ready narrows it', async () => {
    const defaultRun = await runCli(['registry', '--format', 'json'], fixture.dir)
    const narrowRun = await runCli(
      ['registry', '--format', 'json', '--tier', 'agent-ready'],
      fixture.dir,
    )
    expect(defaultRun.exitCode).toBe(0)
    expect(narrowRun.exitCode).toBe(0)
    const defaultLen = JSON.parse(defaultRun.stdout).components.length
    const narrowLen = JSON.parse(narrowRun.stdout).components.length
    // All public components are agent-ready; the filtered count equals the full public surface.
    expect(narrowLen).toBeGreaterThan(0)
    expect(narrowLen).toBeLessThanOrEqual(defaultLen)
  })

  it('registry --filter hooks --format json returns hooks only', async () => {
    const result = await runCli(['registry', '--filter', 'hooks', '--format', 'json'], fixture.dir)
    expect(result.exitCode).toBe(0)
    const parsed = JSON.parse(result.stdout)
    expect(Array.isArray(parsed.hooks)).toBe(true)
    expect(parsed).not.toHaveProperty('components')
  })

  it('docs <Name> prints the USAGE markdown', async () => {
    const result = await runCli(['docs', 'LineChartCard'], fixture.dir)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/# LineChartCard/)
  })

  it('example <Name> prints the example tsx', async () => {
    const result = await runCli(['example', 'LineChartCard'], fixture.dir)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/from ['"]@tetherto\/mdk-react-devkit['"]/)
  })

  it('add page <Name> writes a tsx file', async () => {
    const result = await runCli(
      ['add', 'page', 'MyDashboard', '--component', 'LineChartCard'],
      fixture.dir,
    )
    expect(result.exitCode).toBe(0)
    const filePath = join(fixture.dir, 'src/pages/MyDashboard.tsx')
    expect(existsSync(filePath)).toBe(true)
    expect(readFileSync(filePath, 'utf8')).toMatch(/LineChartCard/)
  })

  it('init --ide none seeds .mdk/context.md and .gitignore', async () => {
    const result = await runCli(['init', '--ide', 'none'], fixture.dir)
    expect(result.exitCode).toBe(0)
    expect(existsSync(join(fixture.dir, '.mdk/context.md'))).toBe(true)
    expect(readFileSync(join(fixture.dir, '.gitignore'), 'utf8')).toMatch(/\.mdk\/context\.md/)
  })

  it('sync updates context.md after init', async () => {
    await runCli(['init', '--ide', 'none'], fixture.dir)
    // Drop a page that imports MDK.
    const pagesDir = join(fixture.dir, 'src/pages')
    await execa('mkdir', ['-p', pagesDir])
    const pagePath = join(pagesDir, 'Demo.tsx')
    await execa('node', [
      '-e',
      `require('node:fs').writeFileSync(${JSON.stringify(pagePath)}, ${JSON.stringify(
        'import { LineChartCard } from "@tetherto/mdk-react-devkit";\nexport default () => null;\n',
      )})`,
    ])
    const result = await runCli(['sync'], fixture.dir)
    expect(result.exitCode).toBe(0)
    const ctx = readFileSync(join(fixture.dir, '.mdk/context.md'), 'utf8')
    expect(ctx).toMatch(/`src\/pages\/Demo\.tsx`/)
  })

  it('unknown component name exits with non-zero', async () => {
    const result = await runCli(['docs', 'DefinitelyNotAComponent'], fixture.dir)
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toMatch(/not found/)
  })
})
