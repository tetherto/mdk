import { describe, expect, it } from 'vitest'
import { SEVERITY, SEVERITY_COLORS, SEVERITY_KEY, SEVERITY_LEVELS } from '../alerts'

describe('alerts constants', () => {
  it('should have severity levels defined', () => {
    expect(SEVERITY.HIGH).toBe('high')
    expect(SEVERITY.MEDIUM).toBe('medium')
    expect(SEVERITY.CRITICAL).toBe('critical')
  })

  it('should have severity colors mapped', () => {
    expect(SEVERITY_COLORS[SEVERITY.MEDIUM]).toBeDefined()
    expect(SEVERITY_COLORS[SEVERITY.HIGH]).toBeDefined()
    expect(SEVERITY_COLORS[SEVERITY.CRITICAL]).toBeDefined()
  })

  it('should have severity level ordering', () => {
    expect(SEVERITY_LEVELS[SEVERITY.MEDIUM]).toBe(0)
    expect(SEVERITY_LEVELS[SEVERITY.HIGH]).toBe(1)
    expect(SEVERITY_LEVELS[SEVERITY.CRITICAL]).toBe(2)
    expect(SEVERITY_LEVELS[SEVERITY.CRITICAL]).toBeGreaterThan(SEVERITY_LEVELS[SEVERITY.HIGH])
  })

  it('should have severity key constant', () => {
    expect(SEVERITY_KEY).toBe('severity')
  })
})
