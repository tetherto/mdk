import { describe, expect, it, vi } from 'vitest'
import {
  DELETE_MINER,
  MINER_ACTIONS,
  MINER_COLUMN_ITEMS,
  MINER_LOCATION_BORDER_COLORS,
  MINER_LOCATIONS,
  MINER_PART_LIMITS,
  MINER_REPAIR_LOCATIONS,
  MINER_STATUS_BG_COLORS,
  MINER_STATUS_NAMES,
  MINER_STATUSES,
  MOVE_MINER,
  READ_ONLY_ACTIONS,
  SEARCHABLE_MINER_ATTRIBUTES,
} from '../miner-constants'
import { INVENTORY_LOGS_ACTION, SparePartTypes } from '../spare-parts-constants'

vi.mock('@tetherto/core', () => ({
  COLOR: {
    LIGHT_BLUE: '#0000FF',
    GRASS_GREEN: '#00FF00',
    BRICK_RED: '#FF0000',
    COLD_ORANGE: '#FFA500',
    YELLOW: '#FFFF00',
    AGED_YELLOW: '#CCCC00',
    DARK_GREEN: '#006400',
  },
}))

describe('Miner Constants', () => {
  describe('Actions', () => {
    it('should have the correct set of MINER_ACTIONS', () => {
      expect(MINER_ACTIONS).toContain(MOVE_MINER)
      expect(MINER_ACTIONS).toContain(DELETE_MINER)
      expect(MINER_ACTIONS).toHaveLength(6)
    })

    it('should identify read-only actions correctly', () => {
      expect(READ_ONLY_ACTIONS).toContain(INVENTORY_LOGS_ACTION)
      expect(READ_ONLY_ACTIONS).not.toContain(MOVE_MINER)
    })
  })

  describe('Locations and Colors', () => {
    it('should have defined locations', () => {
      expect(MINER_LOCATIONS.SITE_CONTAINER).toBe('site.container')
      expect(MINER_LOCATIONS.VENDOR).toBe('vendor')
    })

    it('should define repair locations as a Set of specific locations', () => {
      expect(MINER_REPAIR_LOCATIONS.has(MINER_LOCATIONS.WORKSHOP_LAB)).toBe(true)
      expect(MINER_REPAIR_LOCATIONS.has(MINER_LOCATIONS.SITE_LAB)).toBe(true)
    })

    it('should have a border color for every defined location', () => {
      const locations = Object.values(MINER_LOCATIONS)
      locations.forEach((loc) => {
        expect(MINER_LOCATION_BORDER_COLORS).toHaveProperty(loc)
      })
    })
  })

  describe('Statuses', () => {
    it('should map internal status keys to readable names', () => {
      expect(MINER_STATUS_NAMES[MINER_STATUSES.OK_BRAND_NEW]).toBe('Brand New')
      expect(MINER_STATUS_NAMES[MINER_STATUSES.FAULTY]).toBe('Faulty')
    })

    it('should have background colors for statuses with correct alpha transparency (33)', () => {
      const faultyBg = MINER_STATUS_BG_COLORS[MINER_STATUSES.FAULTY]
      expect(faultyBg).contain('33')
    })
  })

  describe('UI Configuration', () => {
    it('should contain the required searchable attributes for filtering', () => {
      expect(SEARCHABLE_MINER_ATTRIBUTES).toContain('serialNum')
      expect(SEARCHABLE_MINER_ATTRIBUTES).toContain('macAddress')
    })

    it('should have a valid structure for MINER_COLUMN_ITEMS', () => {
      const powerModeColumn = MINER_COLUMN_ITEMS.find((item) => item.key === 'powerMode')

      expect(powerModeColumn).toBeDefined()
      expect(powerModeColumn?.children).toBeInstanceOf(Array)
      expect(powerModeColumn?.children?.some((c) => c.key === 'powerMode.efficiency')).toBe(true)
    })
  })

  describe('Part Limits', () => {
    it('should define specific limits for hardware components', () => {
      // Import the mocked values
      expect(MINER_PART_LIMITS[SparePartTypes.CONTROLLER]).toBe(1)
      expect(MINER_PART_LIMITS[SparePartTypes.PSU]).toBe(1)
      expect(MINER_PART_LIMITS[SparePartTypes.HASHBOARD]).toBe(Infinity)
    })
  })
})
