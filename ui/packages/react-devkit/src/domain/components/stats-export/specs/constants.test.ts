import { describe, expect, it } from 'vitest'
import { EXPORT_ITEM_KEYS, EXPORT_ITEMS, EXPORT_LABEL } from '../constants'

describe('stats-export constants', () => {
  it('should have export label', () => {
    expect(EXPORT_LABEL).toBe('Export')
  })

  describe('export item keys', () => {
    it('should have CSV and JSON keys', () => {
      expect(EXPORT_ITEM_KEYS.CSV).toBe('csv')
      expect(EXPORT_ITEM_KEYS.JSON).toBe('json')
    })

    it('should have lowercase keys', () => {
      Object.values(EXPORT_ITEM_KEYS).forEach((key) => {
        expect(key).toBe(key.toLowerCase())
      })
    })
  })

  describe('export items', () => {
    it('should have export items array', () => {
      expect(Array.isArray(EXPORT_ITEMS)).toBe(true)
      expect(EXPORT_ITEMS).toHaveLength(2)
    })

    it('should have CSV export item', () => {
      const csvItem = EXPORT_ITEMS[0]
      expect(csvItem.label).toBe('Export as CSV')
      expect(csvItem.key).toBe(EXPORT_ITEM_KEYS.CSV)
    })

    it('should have JSON export item', () => {
      const jsonItem = EXPORT_ITEMS[1]
      expect(jsonItem.label).toBe('Export as JSON')
      expect(jsonItem.key).toBe(EXPORT_ITEM_KEYS.JSON)
    })

    it('should have items with label and key properties', () => {
      EXPORT_ITEMS.forEach((item) => {
        expect(item).toHaveProperty('label')
        expect(item).toHaveProperty('key')
        expect(typeof item.label).toBe('string')
        expect(typeof item.key).toBe('string')
      })
    })

    it('should have matching keys between items and key constants', () => {
      expect(EXPORT_ITEMS[0].key).toBe(EXPORT_ITEM_KEYS.CSV)
      expect(EXPORT_ITEMS[1].key).toBe(EXPORT_ITEM_KEYS.JSON)
    })
  })
})
