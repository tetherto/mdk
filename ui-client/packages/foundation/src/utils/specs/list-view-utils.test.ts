import { describe, expect, it, vi } from 'vitest'

import { getFilterOptionsByTab, LIST_VIEW_FILTER_OPTIONS } from '../list-view-utils'

vi.mock('../status-utils', () => ({
  CONTAINER_STATUS: {
    RUNNING: 'running',
    OFFLINE: 'offline',
    STOPPED: 'stopped',
  },
  MINER_POWER_MODE: {
    SLEEP: 'sleep',
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
  },
}))

vi.mock('../../constants/devices', () => ({
  CROSS_THING_TYPES: {
    CONTAINER: 'container',
    MINER: 'miner',
    CABINET: 'cabinet',
    POOL: 'pool',
  },
}))

vi.mock('../../constants/device-constants', () => ({
  MinerStatuses: {
    MINING: 'mining',
    OFFLINE: 'offline',
    SLEEPING: 'sleeping',
    ERROR: 'error',
    NOT_MINING: 'not_mining',
  },
  COMPLETE_MINER_TYPES: {
    ANTMINER: 'miner-am-s19xp',
    WHATSMINER: 'miner-wm-m30sp',
  },
  MINER_TYPE_NAME_MAP: {
    'miner-am-s19xp': 'Antminer S19XP',
    'miner-wm-m30sp': 'Whatsminer M30SP',
  },
  LV_CABINET_DEVICES_TYPE: {
    POWERMETER: 'powermeter-abb-b24',
  },
  CABINET_DEVICES_TYPES_NAME_MAP: {
    'powermeter-abb-b24': 'Powermeter ABB B24',
  },
}))

vi.mock('../../constants/container-constants', () => ({
  COMPLETE_CONTAINER_TYPE: {
    BITMAIN_HYDRO: 'container-as-hk3',
    BITDEER_M30: 'container-bd-d40-m30',
  },
  CONTAINER_TYPE_NAME_MAP: {
    'container-as-hk3': 'Bitmain Hydro',
    'container-bd-d40-m30': 'Bitdeer M30',
  },
}))

describe('list view utils', () => {
  describe('LIST_VIEW_FILTER_OPTIONS', () => {
    describe('structure', () => {
      it('is an array', () => {
        expect(Array.isArray(LIST_VIEW_FILTER_OPTIONS)).toBe(true)
      })

      it('has 6 entries', () => {
        expect(LIST_VIEW_FILTER_OPTIONS).toHaveLength(6)
      })

      it('every option has a label', () => {
        LIST_VIEW_FILTER_OPTIONS.forEach((opt) => {
          expect(typeof opt.label).toBe('string')
          expect(opt.label.length).toBeGreaterThan(0)
        })
      })

      it('every option has a value', () => {
        LIST_VIEW_FILTER_OPTIONS.forEach((opt) => {
          expect(opt.value).toBeDefined()
        })
      })

      it('every option has a tab array', () => {
        LIST_VIEW_FILTER_OPTIONS.forEach((opt) => {
          expect(Array.isArray(opt.tab)).toBe(true)
          expect(opt.tab!.length).toBeGreaterThan(0)
        })
      })

      it('every option has an order number', () => {
        LIST_VIEW_FILTER_OPTIONS.forEach((opt) => {
          expect(typeof opt.order).toBe('number')
        })
      })

      it('every option has children array', () => {
        LIST_VIEW_FILTER_OPTIONS.forEach((opt) => {
          expect(Array.isArray(opt.children)).toBe(true)
          expect(opt.children!.length).toBeGreaterThan(0)
        })
      })
    })

    // ── Type filter ─────────────────────────────────────────────────────────────

    describe('Type filter', () => {
      const typeFilter = LIST_VIEW_FILTER_OPTIONS.find((o) => o.value === 'type')

      it('exists', () => {
        expect(typeFilter).toBeDefined()
      })

      it('has order 1', () => {
        expect(typeFilter?.order).toBe(1)
      })

      it('is scoped to container and miner tabs', () => {
        expect(typeFilter?.tab).toContain('container')
        expect(typeFilter?.tab).toContain('miner')
      })

      it('has Container, Miner and LV cabinet child groups', () => {
        const childValues = typeFilter?.children?.map((c) => c.value)
        expect(childValues).toContain('container')
        expect(childValues).toContain('miner')
        expect(childValues).toContain('cabinet')
      })

      it('Container group has children from COMPLETE_CONTAINER_TYPE', () => {
        const containerGroup = typeFilter?.children?.find((c) => c.value === 'container')
        expect(containerGroup?.children?.length).toBeGreaterThan(0)
        containerGroup?.children?.forEach((child) => {
          expect(typeof child.value).toBe('string')
          expect(child.label.length).toBeGreaterThan(0)
        })
      })

      it('Miner group has children from COMPLETE_MINER_TYPES', () => {
        const minerGroup = typeFilter?.children?.find((c) => c.value === 'miner')
        expect(minerGroup?.children?.length).toBeGreaterThan(0)
      })

      it('LV cabinet group has children from LV_CABINET_DEVICES_TYPE', () => {
        const cabinetGroup = typeFilter?.children?.find((c) => c.value === 'cabinet')
        expect(cabinetGroup?.children?.length).toBeGreaterThan(0)
      })
    })

    // ── Status filters ──────────────────────────────────────────────────────────

    describe('Status filters', () => {
      const statusFilters = LIST_VIEW_FILTER_OPTIONS.filter(
        (o) => o.value === 'last.snap.stats.status',
      )

      it('has two Status entries (container + miner)', () => {
        expect(statusFilters).toHaveLength(2)
      })

      it('both have order 2', () => {
        statusFilters.forEach((f) => expect(f.order).toBe(2))
      })

      it('container Status is scoped to container tab only', () => {
        const containerStatus = statusFilters.find((f) => f.tab?.includes('container'))
        expect(containerStatus?.tab).toEqual(['container'])
      })

      it('container Status children match CONTAINER_STATUS values', () => {
        const containerStatus = statusFilters.find((f) => f.tab?.includes('container'))
        const values = containerStatus?.children?.map((c) => c.value)
        expect(values).toContain('running')
        expect(values).toContain('offline')
        expect(values).toContain('stopped')
      })

      it('container Status children labels are capitalized', () => {
        const containerStatus = statusFilters.find((f) => f.tab?.includes('container'))
        containerStatus?.children?.forEach((child) => {
          const label = child.label as string
          expect(label[0]).toBe(label[0]?.toUpperCase())
        })
      })

      it('miner Status is scoped to miner tab only', () => {
        const minerStatus = statusFilters.find((f) => f.tab?.includes('miner'))
        expect(minerStatus?.tab).toEqual(['miner'])
      })

      it('miner Status children include filterable statuses', () => {
        const minerStatus = statusFilters.find((f) => f.tab?.includes('miner'))
        const values = minerStatus?.children?.map((c) => c.value)
        expect(values).toContain('mining')
        expect(values).toContain('offline')
        expect(values).toContain('sleeping')
        expect(values).toContain('error')
        expect(values).toContain('not_mining')
      })

      it('miner Status does not include maintenance or alert', () => {
        const minerStatus = statusFilters.find((f) => f.tab?.includes('miner'))
        const values = minerStatus?.children?.map((c) => c.value)
        expect(values).not.toContain('maintenance')
        expect(values).not.toContain('alert')
      })
    })

    // ── Container Alarm filter ──────────────────────────────────────────────────

    describe('Container Alarm filter', () => {
      const alarmFilter = LIST_VIEW_FILTER_OPTIONS.find(
        (o) => o.value === 'last.snap.stats.alarm_status',
      )

      it('exists', () => {
        expect(alarmFilter).toBeDefined()
      })

      it('has order 3', () => {
        expect(alarmFilter?.order).toBe(3)
      })

      it('is scoped to container tab', () => {
        expect(alarmFilter?.tab).toEqual(['container'])
      })

      it('has Alarm on (true) and Alarm off (false) children', () => {
        const values = alarmFilter?.children?.map((c) => c.value)
        expect(values).toContain(true)
        expect(values).toContain(false)
      })
    })

    // ── Power mode filter ───────────────────────────────────────────────────────

    describe('Power mode filter', () => {
      const powerFilter = LIST_VIEW_FILTER_OPTIONS.find(
        (o) => o.value === 'last.snap.config.power_mode',
      )

      it('exists', () => {
        expect(powerFilter).toBeDefined()
      })

      it('has order 4', () => {
        expect(powerFilter?.order).toBe(4)
      })

      it('is scoped to miner tab', () => {
        expect(powerFilter?.tab).toEqual(['miner'])
      })

      it('children match MINER_POWER_MODE values', () => {
        const values = powerFilter?.children?.map((c) => c.value)
        expect(values).toContain('sleep')
        expect(values).toContain('low')
        expect(values).toContain('normal')
        expect(values).toContain('high')
      })

      it('children labels are capitalized', () => {
        powerFilter?.children?.forEach((child) => {
          const label = child.label as string
          expect(label[0]).toBe(label[0]?.toUpperCase())
        })
      })
    })

    // ── Miner LED filter ────────────────────────────────────────────────────────

    describe('Miner LED filter', () => {
      const ledFilter = LIST_VIEW_FILTER_OPTIONS.find(
        (o) => o.value === 'last.snap.config.led_status',
      )

      it('exists', () => {
        expect(ledFilter).toBeDefined()
      })

      it('has order 7', () => {
        expect(ledFilter?.order).toBe(7)
      })

      it('is scoped to miner tab', () => {
        expect(ledFilter?.tab).toEqual(['miner'])
      })

      it('has LED on (true) and LED off (false) children', () => {
        const values = ledFilter?.children?.map((c) => c.value)
        expect(values).toContain(true)
        expect(values).toContain(false)
      })
    })
  })

  describe('getFilterOptionsByTab', () => {
    describe('container tab', () => {
      const result = getFilterOptionsByTab('container')

      it('returns only options scoped to container', () => {
        result.forEach((opt) => {
          expect(opt.tab).toContain('container')
        })
      })

      it('includes the Type filter', () => {
        expect(result.some((o) => o.value === 'type')).toBe(true)
      })

      it('includes the container Status filter', () => {
        const statusOpts = result.filter((o) => o.value === 'last.snap.stats.status')
        expect(statusOpts.some((o) => o.tab?.includes('container'))).toBe(true)
      })

      it('includes the Container Alarm filter', () => {
        expect(result.some((o) => o.value === 'last.snap.stats.alarm_status')).toBe(true)
      })

      it('does not include Power mode', () => {
        expect(result.some((o) => o.value === 'last.snap.config.power_mode')).toBe(false)
      })

      it('does not include Miner LED', () => {
        expect(result.some((o) => o.value === 'last.snap.config.led_status')).toBe(false)
      })
    })

    describe('miner tab', () => {
      const result = getFilterOptionsByTab('miner')

      it('returns only options scoped to miner', () => {
        result.forEach((opt) => {
          expect(opt.tab).toContain('miner')
        })
      })

      it('includes the Type filter', () => {
        expect(result.some((o) => o.value === 'type')).toBe(true)
      })

      it('includes the miner Status filter', () => {
        const statusOpts = result.filter((o) => o.value === 'last.snap.stats.status')
        expect(statusOpts.some((o) => o.tab?.includes('miner'))).toBe(true)
      })

      it('includes Power mode filter', () => {
        expect(result.some((o) => o.value === 'last.snap.config.power_mode')).toBe(true)
      })

      it('includes Miner LED filter', () => {
        expect(result.some((o) => o.value === 'last.snap.config.led_status')).toBe(true)
      })

      it('does not include Container Alarm', () => {
        expect(result.some((o) => o.value === 'last.snap.stats.alarm_status')).toBe(false)
      })
    })

    describe('unknown tab', () => {
      it('returns empty array for unknown tab', () => {
        expect(getFilterOptionsByTab('unknown')).toEqual([])
      })

      it('returns empty array for empty string', () => {
        expect(getFilterOptionsByTab('')).toEqual([])
      })
    })

    describe('return shape', () => {
      it('returns an array', () => {
        expect(Array.isArray(getFilterOptionsByTab('miner'))).toBe(true)
      })

      it('returned options retain tab and order fields', () => {
        getFilterOptionsByTab('miner').forEach((opt) => {
          expect(opt.tab).toBeDefined()
          expect(opt.order).toBeDefined()
        })
      })

      it('does not mutate LIST_VIEW_FILTER_OPTIONS', () => {
        const before = LIST_VIEW_FILTER_OPTIONS.length
        getFilterOptionsByTab('miner')
        expect(LIST_VIEW_FILTER_OPTIONS.length).toBe(before)
      })
    })
  })
})
