import { describe, expect, it, vi } from 'vitest'
import { getColumnConfig } from '../device-explorer.columns'

describe('device-explorer columns', () => {
  const mockParams = {
    getFormattedDate: vi.fn((date: Date) => date.toISOString()),
    renderAction: vi.fn(() => null),
  }

  it('should return column config for all device types', () => {
    const config = getColumnConfig(mockParams)
    expect(config).toBeDefined()
    expect(config.miner).toBeDefined()
    expect(config.container).toBeDefined()
    expect(config.cabinet).toBeDefined()
  })

  it('should return arrays for each device type', () => {
    const config = getColumnConfig(mockParams)
    expect(Array.isArray(config.miner)).toBe(true)
    expect(Array.isArray(config.container)).toBe(true)
    expect(Array.isArray(config.cabinet)).toBe(true)
  })

  it('should return non-empty column arrays', () => {
    const config = getColumnConfig(mockParams)
    expect(config.miner.length).toBeGreaterThan(0)
    expect(config.container.length).toBeGreaterThan(0)
    expect(config.cabinet.length).toBeGreaterThan(0)
  })

  it('should return column definitions with required properties', () => {
    const config = getColumnConfig(mockParams)

    config.miner.forEach((col) => {
      expect(col.header).toBeDefined()
      expect(col.id || col.accessorKey).toBeDefined()
    })

    config.container.forEach((col) => {
      expect(col.header).toBeDefined()
      expect(col.id || col.accessorKey).toBeDefined()
    })

    config.cabinet.forEach((col) => {
      expect(col.header).toBeDefined()
      expect(col.id || col.accessorKey).toBeDefined()
    })
  })
})
