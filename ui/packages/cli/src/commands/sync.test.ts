import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { makeConsumerFixture, noop } from '../test-utils.js'
import { runInit } from './init.js'
import { runSync } from './sync.js'

describe('runSync', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(async () => {
    fixture = makeConsumerFixture()
    await runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide: 'none',
      cwd: fixture.dir,
      out: noop,
    })
  })
  afterEach(() => fixture.dispose())

  it('detects MDK imports in src/pages and src/hooks', () => {
    mkdirSync(join(fixture.dir, 'src/pages'), { recursive: true })
    mkdirSync(join(fixture.dir, 'src/hooks'), { recursive: true })
    writeFileSync(
      join(fixture.dir, 'src/pages/Dashboard.tsx'),
      'import { LineChartCard } from "@tetherto/mdk-react-devkit";\nexport default () => null;\n',
      'utf8',
    )
    writeFileSync(
      join(fixture.dir, 'src/hooks/use-miners.ts'),
      'import { useDevices } from "@tetherto/mdk-react-adapter";\nexport const useMiners = useDevices;\n',
      'utf8',
    )

    const result = runSync({ cwd: fixture.dir, out: noop })
    expect(result.pages).toContain('src/pages/Dashboard.tsx')
    expect(result.hooks).toContain('src/hooks/use-miners.ts')

    const ctx = readFileSync(join(fixture.dir, '.mdk/context.md'), 'utf8')
    expect(ctx).toMatch(/`src\/pages\/Dashboard\.tsx`/)
    expect(ctx).toMatch(/`src\/hooks\/use-miners\.ts`/)
  })

  it('renders an empty list when no MDK imports exist', () => {
    mkdirSync(join(fixture.dir, 'src/pages'), { recursive: true })
    writeFileSync(join(fixture.dir, 'src/pages/Plain.tsx'), 'export default () => null;\n', 'utf8')

    const result = runSync({ cwd: fixture.dir, out: noop })
    expect(result.pages).toHaveLength(0)
    expect(result.hooks).toHaveLength(0)
    const ctx = readFileSync(join(fixture.dir, '.mdk/context.md'), 'utf8')
    expect(ctx).toMatch(/_None yet\._/)
  })

  it('throws if .mdk/context.md is missing', () => {
    const dir = fixture.dir
    writeFileSync(join(dir, '.mdk/context.md'), '', 'utf8')
    expect(() => runSync({ cwd: '/tmp/does-not-exist-xyz123', out: noop })).toThrow(
      /\.mdk\/context\.md not found/,
    )
  })
})
