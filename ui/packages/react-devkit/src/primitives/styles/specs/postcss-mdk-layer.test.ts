import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

import mdkLayer from '../../../../postcss-mdk-layer.mjs'

const run = async (input: string) => {
  const result = await postcss([mdkLayer()]).process(input, { from: undefined })
  return result.css
}

describe('postcss-mdk-layer', () => {
  it('prepends the layer order declaration', async () => {
    const css = await run('.mdk-button { color: red; }')
    expect(css.startsWith('@layer base, mdk, app;')).toBe(true)
  })

  it('wraps top-level rules into a trailing @layer mdk block', async () => {
    const css = await run('.mdk-button { color: red; }\n.mdk-card { padding: 1rem; }')
    expect(css).toContain('@layer mdk {')
    expect(css).toContain('.mdk-button { color: red; }')
    expect(css).toContain('.mdk-card { padding: 1rem; }')
    // The closing brace of the mdk layer should come at the very end.
    expect(css.trim().endsWith('}')).toBe(true)
  })

  it('preserves existing @layer base blocks untouched', async () => {
    const input = '@layer base { :root { --mdk-color-primary: #f7931a; } }'
    const css = await run(input)
    expect(css).toContain('@layer base {')
    expect(css).toContain('--mdk-color-primary: #f7931a')
    // No empty mdk layer should be added when nothing else exists.
    expect(css).not.toMatch(/@layer mdk\s*\{\s*\}/)
  })

  it('leaves rules in pre-existing layers in place and only wraps unlayered rules', async () => {
    const input = '@layer base { body { color: white; } }\n.mdk-button { color: red; }'
    const css = await run(input)
    expect(css.indexOf('@layer base {')).toBeLessThan(css.indexOf('@layer mdk {'))
    expect(css).toMatch(/@layer mdk \{[\s\S]*\.mdk-button[\s\S]*\}/u)
  })

  it('keeps @charset at the very top of the output', async () => {
    const input = '@charset "UTF-8";\n.mdk-button { color: red; }'
    const css = await run(input)
    expect(css.startsWith('@charset')).toBe(true)
    expect(css.indexOf('@layer base, mdk, app;')).toBeGreaterThan(0)
  })
})
