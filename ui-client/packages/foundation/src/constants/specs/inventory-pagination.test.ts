import { describe, expect, it } from 'vitest'
import {
  INVENTORY_DEFAULT_PAGE_SIZE,
  INVENTORY_PAGINATION_STORAGE_KEYS,
} from '../inventory-pagination'

describe('inventory pagination constants', () => {
  it('should have pagination storage keys', () => {
    expect(INVENTORY_PAGINATION_STORAGE_KEYS.REPAIRS).toBe('inventory-repairs-pagination')
    expect(INVENTORY_PAGINATION_STORAGE_KEYS.MINERS).toBe('inventory-miners-pagination')
    expect(INVENTORY_PAGINATION_STORAGE_KEYS.MOVEMENTS).toBe('inventory-movements-pagination')
    expect(INVENTORY_PAGINATION_STORAGE_KEYS.SPARE_PARTS).toBe('inventory-spare-parts-pagination')
  })

  it('should have all inventory types', () => {
    const keys = Object.keys(INVENTORY_PAGINATION_STORAGE_KEYS)
    expect(keys).toHaveLength(4)
    expect(keys).toContain('REPAIRS')
    expect(keys).toContain('MINERS')
    expect(keys).toContain('MOVEMENTS')
    expect(keys).toContain('SPARE_PARTS')
  })

  it('should have default page size', () => {
    expect(INVENTORY_DEFAULT_PAGE_SIZE).toBe(10)
    expect(INVENTORY_DEFAULT_PAGE_SIZE).toBeGreaterThan(0)
  })

  it('should have storage keys prefixed with inventory', () => {
    Object.values(INVENTORY_PAGINATION_STORAGE_KEYS).forEach((key) => {
      expect(key).toMatch(/^inventory-/)
    })
  })
})
