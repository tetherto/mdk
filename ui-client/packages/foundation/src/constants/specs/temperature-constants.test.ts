import { describe, expect, it } from 'vitest'
import { HEATMAP_MODE } from '../temperature-constants'

describe('temperature constants', () => {
  it('should have heatmap modes', () => {
    expect(HEATMAP_MODE.PCB).toBe('pcb')
    expect(HEATMAP_MODE.CHIP).toBe('chip')
    expect(HEATMAP_MODE.INLET).toBe('inlet')
    expect(HEATMAP_MODE.HASHRATE).toBe('hashrate')
  })

  it('should have all heatmap mode options', () => {
    const modes = Object.values(HEATMAP_MODE)
    expect(modes).toHaveLength(4)
    expect(modes).toContain('pcb')
    expect(modes).toContain('chip')
    expect(modes).toContain('inlet')
    expect(modes).toContain('hashrate')
  })
})
