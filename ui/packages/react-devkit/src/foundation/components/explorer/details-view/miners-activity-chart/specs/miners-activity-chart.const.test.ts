import { describe, expect, it } from 'vitest'

import { MinerStatuses } from '@/constants/device-constants'
import { PowerModeColors } from '@/utils/device-utils'
import { MINER_POWER_MODE, SOCKET_STATUSES } from '@/utils/status-utils'
import {
  MINERS_ACTIVITY_ITEMS,
  MINERS_ACTIVITY_LABELS,
  MINERS_ACTIVITY_TOOLTIPS,
  MinersActivityIndicatorColors,
  MinerStatusColors,
  SOCKET_CONTAINER_COLOR,
} from '../miners-activity-chart.const'

describe('MINERS_ACTIVITY_ITEMS', () => {
  describe('SHORT', () => {
    it('WITH_MAINTENANCE includes all common items plus MAINTENANCE', () => {
      const items = MINERS_ACTIVITY_ITEMS.SHORT.WITH_MAINTENANCE

      expect(items).toContain(MinerStatuses.OFFLINE)
      expect(items).toContain(MinerStatuses.NOT_MINING)
      expect(items).toContain(MINER_POWER_MODE.LOW)
      expect(items).toContain(MINER_POWER_MODE.NORMAL)
      expect(items).toContain(MINER_POWER_MODE.HIGH)
      expect(items).toContain(MinerStatuses.MAINTENANCE)
    })

    it('WOUT_MAINTENANCE includes all common items plus MINER_DISCONNECTED', () => {
      const items = MINERS_ACTIVITY_ITEMS.SHORT.WOUT_MAINTENANCE

      expect(items).toContain(MinerStatuses.OFFLINE)
      expect(items).toContain(MinerStatuses.NOT_MINING)
      expect(items).toContain(MINER_POWER_MODE.LOW)
      expect(items).toContain(MINER_POWER_MODE.NORMAL)
      expect(items).toContain(MINER_POWER_MODE.HIGH)
      expect(items).toContain(SOCKET_STATUSES.MINER_DISCONNECTED)
    })

    it('WITH_MAINTENANCE does not contain MINER_DISCONNECTED', () => {
      expect(MINERS_ACTIVITY_ITEMS.SHORT.WITH_MAINTENANCE).not.toContain(
        SOCKET_STATUSES.MINER_DISCONNECTED,
      )
    })

    it('WOUT_MAINTENANCE does not contain MAINTENANCE', () => {
      expect(MINERS_ACTIVITY_ITEMS.SHORT.WOUT_MAINTENANCE).not.toContain(MinerStatuses.MAINTENANCE)
    })
  })

  describe('EXTENDED', () => {
    it('replaces NOT_MINING with ERROR and SLEEP in WITH_MAINTENANCE', () => {
      const items = MINERS_ACTIVITY_ITEMS.EXTENDED.WITH_MAINTENANCE

      expect(items).not.toContain(MinerStatuses.NOT_MINING)
      expect(items).toContain(MinerStatuses.ERROR)
      expect(items).toContain(MINER_POWER_MODE.SLEEP)
    })

    it('replaces NOT_MINING with ERROR and SLEEP in WOUT_MAINTENANCE', () => {
      const items = MINERS_ACTIVITY_ITEMS.EXTENDED.WOUT_MAINTENANCE

      expect(items).not.toContain(MinerStatuses.NOT_MINING)
      expect(items).toContain(MinerStatuses.ERROR)
      expect(items).toContain(MINER_POWER_MODE.SLEEP)
    })

    it('ERROR and SLEEP are inserted at the same position NOT_MINING was', () => {
      const shortItems = MINERS_ACTIVITY_ITEMS.SHORT.WITH_MAINTENANCE
      const extendedItems = MINERS_ACTIVITY_ITEMS.EXTENDED.WITH_MAINTENANCE

      const notMiningIndex = shortItems.indexOf(MinerStatuses.NOT_MINING)

      expect(extendedItems[notMiningIndex]).toBe(MinerStatuses.ERROR)
      expect(extendedItems[notMiningIndex + 1]).toBe(MINER_POWER_MODE.SLEEP)
    })

    it('EXTENDED has one more item than SHORT (splice replaces 1 with 2)', () => {
      expect(MINERS_ACTIVITY_ITEMS.EXTENDED.WITH_MAINTENANCE.length).toBe(
        MINERS_ACTIVITY_ITEMS.SHORT.WITH_MAINTENANCE.length + 1,
      )
      expect(MINERS_ACTIVITY_ITEMS.EXTENDED.WOUT_MAINTENANCE.length).toBe(
        MINERS_ACTIVITY_ITEMS.SHORT.WOUT_MAINTENANCE.length + 1,
      )
    })

    it('WITH_MAINTENANCE still contains MAINTENANCE', () => {
      expect(MINERS_ACTIVITY_ITEMS.EXTENDED.WITH_MAINTENANCE).toContain(MinerStatuses.MAINTENANCE)
    })

    it('WOUT_MAINTENANCE still contains MINER_DISCONNECTED', () => {
      expect(MINERS_ACTIVITY_ITEMS.EXTENDED.WOUT_MAINTENANCE).toContain(
        SOCKET_STATUSES.MINER_DISCONNECTED,
      )
    })
  })

  describe('immutability', () => {
    it('SHORT and EXTENDED arrays are independent (splice does not mutate source)', () => {
      expect(MINERS_ACTIVITY_ITEMS.SHORT.WITH_MAINTENANCE).toContain(MinerStatuses.NOT_MINING)
      expect(MINERS_ACTIVITY_ITEMS.EXTENDED.WITH_MAINTENANCE).not.toContain(
        MinerStatuses.NOT_MINING,
      )
    })
  })
})

describe('MINERS_ACTIVITY_TOOLTIPS', () => {
  it('has a tooltip for ERROR status', () => {
    expect(MINERS_ACTIVITY_TOOLTIPS[MinerStatuses.ERROR]).toBeDefined()
  })

  it('ERROR tooltip is a non-empty string', () => {
    expect(typeof MINERS_ACTIVITY_TOOLTIPS[MinerStatuses.ERROR]).toBe('string')
    expect(MINERS_ACTIVITY_TOOLTIPS[MinerStatuses.ERROR].length).toBeGreaterThan(0)
  })
})

describe('MINERS_ACTIVITY_LABELS', () => {
  it('maps MINER_DISCONNECTED to "empty"', () => {
    expect(MINERS_ACTIVITY_LABELS[SOCKET_STATUSES.MINER_DISCONNECTED]).toBe('empty')
  })
})

describe('MinersActivityIndicatorColors', () => {
  it('maps OFFLINE to "gray"', () => {
    expect(MinersActivityIndicatorColors[MinerStatuses.OFFLINE]).toBe('gray')
  })

  it('maps ERROR to "red"', () => {
    expect(MinersActivityIndicatorColors[MinerStatuses.ERROR]).toBe('red')
  })

  it('maps LOW power mode to "yellow"', () => {
    expect(MinersActivityIndicatorColors[MINER_POWER_MODE.LOW]).toBe('yellow')
  })

  it('maps NORMAL power mode to "green"', () => {
    expect(MinersActivityIndicatorColors[MINER_POWER_MODE.NORMAL]).toBe('green')
  })

  it('maps HIGH power mode to "purple"', () => {
    expect(MinersActivityIndicatorColors[MINER_POWER_MODE.HIGH]).toBe('purple')
  })

  it('all values are valid IndicatorColor literals', () => {
    const validColors = ['red', 'gray', 'blue', 'yellow', 'green', 'purple', 'amber', 'slate']

    Object.values(MinersActivityIndicatorColors).forEach((color) => {
      expect(validColors).toContain(color)
    })
  })
})

describe('MinerStatusColors', () => {
  it('has a color for ERROR', () => {
    expect(MinerStatusColors[MinerStatuses.ERROR]).toBeDefined()
  })

  it('has a color for NOT_MINING', () => {
    expect(MinerStatusColors[MinerStatuses.NOT_MINING]).toBeDefined()
  })

  it('has a color for OFFLINE', () => {
    expect(MinerStatusColors[MinerStatuses.OFFLINE]).toBeDefined()
  })

  it('has a color for SLEEPING', () => {
    expect(MinerStatusColors[MinerStatuses.SLEEPING]).toBeDefined()
  })

  it('has a color for MAINTENANCE', () => {
    expect(MinerStatusColors[MinerStatuses.MAINTENANCE]).toBeDefined()
  })

  it('all values are non-empty strings', () => {
    Object.values(MinerStatusColors).forEach((color) => {
      expect(typeof color).toBe('string')
      expect((color as string).length).toBeGreaterThan(0)
    })
  })
})

describe('SOCKET_CONTAINER_COLOR', () => {
  it('includes all MinerStatusColors entries', () => {
    Object.entries(MinerStatusColors).forEach(([key, value]) => {
      expect(SOCKET_CONTAINER_COLOR[key as keyof typeof SOCKET_CONTAINER_COLOR]).toBe(value)
    })
  })

  it('includes all PowerModeColors entries', () => {
    Object.entries(PowerModeColors).forEach(([key, value]) => {
      expect(SOCKET_CONTAINER_COLOR[key as keyof typeof SOCKET_CONTAINER_COLOR]).toBe(value)
    })
  })

  it('has a color for ERROR_MINING socket status', () => {
    expect(SOCKET_CONTAINER_COLOR[SOCKET_STATUSES.ERROR_MINING]).toBeDefined()
  })

  it('has a color for MINER_DISCONNECTED socket status', () => {
    expect(SOCKET_CONTAINER_COLOR[SOCKET_STATUSES.MINER_DISCONNECTED]).toBeDefined()
  })

  it('all values are non-empty strings', () => {
    Object.values(SOCKET_CONTAINER_COLOR).forEach((color) => {
      expect(typeof color).toBe('string')
      expect((color as string).length).toBeGreaterThan(0)
    })
  })
})
