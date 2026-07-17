import { describe, expect, it } from 'vitest'
import {
  ADD_COMMENT_ACTION,
  CSV_PART_TYPE_TO_SPARE_PART_TYPE,
  CSV_PART_TYPES,
  DELETE_SPARE_PART,
  FREE_SPARE_PART_ACTIONS,
  INVENTORY_LOGS_ACTION,
  MOVE_SPARE_PART,
  PART_ABBRV_MAPPING,
  SEARCHABLE_SPARE_PART_ATTRIBUTES,
  SPARE_PART_ACTIONS,
  SPARE_PART_LOCATION_BG_COLORS,
  SPARE_PART_LOCATION_BORDER_COLORS,
  SPARE_PART_LOCATIONS,
  SPARE_PART_STATUS_NAMES,
  SPARE_PART_STATUSES,
  SPARE_PART_TYPE_TO_CSV_PART_TYPE,
  SPARE_PARTS_LIST_TAB_ITEMS,
  SparePartTypes,
} from '../spare-parts-constants'

describe('Spare Parts Constants', () => {
  describe('Actions and Permissions', () => {
    it('should have the correct SPARE_PART_ACTIONS mapping', () => {
      expect(SPARE_PART_ACTIONS[1]).toBe(MOVE_SPARE_PART)
      expect(SPARE_PART_ACTIONS[4]).toBe(ADD_COMMENT_ACTION)
    })

    it('should correctly identify free actions in the Set', () => {
      expect(FREE_SPARE_PART_ACTIONS.has(MOVE_SPARE_PART)).toBe(true)
      expect(FREE_SPARE_PART_ACTIONS.has(DELETE_SPARE_PART)).toBe(true)
      expect(FREE_SPARE_PART_ACTIONS.has(INVENTORY_LOGS_ACTION)).toBe(false)
    })
  })

  describe('Locations and Visuals', () => {
    it('should ensure all locations have corresponding background and border colors', () => {
      const locations = Object.values(SPARE_PART_LOCATIONS)

      locations.forEach((loc) => {
        expect(SPARE_PART_LOCATION_BG_COLORS).toHaveProperty(loc)
        expect(SPARE_PART_LOCATION_BORDER_COLORS).toHaveProperty(loc)
      })
    })

    it('should use 20% alpha (33) suffix for background colors', () => {
      const vendorBg = SPARE_PART_LOCATION_BG_COLORS[SPARE_PART_LOCATIONS.VENDOR]
      expect(vendorBg.endsWith('33')).toBe(true)
    })
  })

  describe('Statuses', () => {
    it('should map status keys to human-readable names', () => {
      expect(SPARE_PART_STATUS_NAMES[SPARE_PART_STATUSES.OK_RECOVERED]).toBe('Recovered')
      expect(SPARE_PART_STATUS_NAMES[SPARE_PART_STATUSES.FAULTY]).toBe('Faulty')
    })
  })

  describe('Spare Part Types and Derived Lists', () => {
    it('should have correct internal type strings', () => {
      expect(SparePartTypes.HASHBOARD).toBe('inventory-miner_part-hashboard')
    })

    it('should correctly generate SPARE_PARTS_LIST_TAB_ITEMS via lodash map', () => {
      const tabs = SPARE_PARTS_LIST_TAB_ITEMS

      expect(tabs).toHaveLength(3)
      expect(tabs).toContainEqual({
        key: 'inventory-miner_part-psu',
        label: 'PSU',
      })
    })

    it('should provide correct abbreviation mapping', () => {
      expect(PART_ABBRV_MAPPING[SparePartTypes.CONTROLLER]).toBe('CB')
      expect(PART_ABBRV_MAPPING[SparePartTypes.HASHBOARD]).toBe('HB')
    })
  })

  describe('CSV Mapping Logic', () => {
    it('should correctly map internal types to CSV types', () => {
      const internalPsu = SparePartTypes.PSU
      expect(SPARE_PART_TYPE_TO_CSV_PART_TYPE[internalPsu]).toBe(CSV_PART_TYPES.PSU)
    })

    it('should correctly invert the CSV mapping via lodash invert', () => {
      const invertedMap = CSV_PART_TYPE_TO_SPARE_PART_TYPE

      // The key should be the CSV string 'controller'
      // The value should be the internal type 'inventory-miner_part-controller'
      expect(invertedMap.controller).toBe(SparePartTypes.CONTROLLER)
      expect(invertedMap.hashboard).toBe(SparePartTypes.HASHBOARD)
    })
  })

  describe('Search Configuration', () => {
    it('should contain all required searchable attributes', () => {
      const expectedAttributes = ['serialNum', 'macAddress', 'parentDeviceCode', 'status']
      expectedAttributes.forEach((attr) => {
        expect(SEARCHABLE_SPARE_PART_ATTRIBUTES).toContain(attr)
      })
    })
  })
})
