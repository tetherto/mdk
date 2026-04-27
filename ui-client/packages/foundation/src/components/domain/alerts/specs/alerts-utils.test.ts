import { describe, expect, it, vi } from 'vitest'

import type { Alert } from '../../../../types/alerts'
import type { Device } from '../../../../types/device'
import {
  applyAlertsLocalFilters,
  getAlertsForDevices,
  getAlertsThingsQuery,
  getCurrentAlerts,
  getHistoricalAlertsData,
  onLogClicked,
} from '../alerts-utils'
import type { ParsedAlertEntry } from '../alerts-types'

vi.mock('../../../../utils/device-utils', () => ({
  getDeviceData: vi.fn((device: Record<string, unknown> | undefined | null) => {
    if (!device) return ['Device Not Found', undefined]
    const last = (device.last as Record<string, unknown> | undefined) ?? {}
    return [
      undefined,
      {
        ...device,
        snap: last.snap ?? { stats: {}, config: {} },
        alerts: last.alerts,
      },
    ]
  }),
  getMinerShortCode: vi.fn((code: string | undefined) => code ?? 'N/A'),
}))

vi.mock('../../../../utils/container-utils', () => ({
  getContainerName: vi.fn((container?: string) => container ?? ''),
}))

vi.mock('../../../../utils/query-utils', () => ({
  getByTagsWithAlertsQuery: vi.fn(
    (tags: string[], allowEmptyArray?: boolean) =>
      `byTags:${tags.join(',')}|empty:${String(allowEmptyArray ?? false)}`,
  ),
  getDeviceByAlertId: vi.fn((uuid: string) => `byAlertId:${uuid}`),
}))

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  uuid: 'alert-uuid-1',
  name: 'Overheating',
  code: 'OVERHEAT',
  description: 'Sensor over threshold',
  message: 'Temperature critical',
  severity: 'critical',
  createdAt: 1_700_000_000_000,
  ...overrides,
})

const makeDevice = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'device-1',
    code: 'M-001',
    type: 'miner-bitmain-s19',
    address: '10.0.0.1',
    tags: ['t-miner'],
    info: {
      container: 'unit-01',
      pos: '1-1',
      macAddress: 'AA:BB:CC',
      serialNum: 'SN-1',
    },
    snap: {
      config: { firmware_ver: 'v1.0' },
    },
    last: {
      snap: { stats: { status: 'mining' } },
      alerts: [makeAlert()],
    },
    ...overrides,
  }) as unknown as Device

const makeParsed = (overrides: Partial<ParsedAlertEntry> = {}): ParsedAlertEntry => ({
  shortCode: 'M-001',
  device: 'unit-01 1-1',
  tags: ['t-miner'],
  alertName: 'Overheating',
  alertCode: 'OVERHEAT',
  severity: 'critical',
  description: 'Sensor over threshold',
  message: 'msg',
  createdAt: 1_700_000_000_000,
  status: 'mining',
  uuid: 'alert-uuid-1',
  id: 'device-1',
  type: 'miner-bitmain-s19',
  actions: { uuid: 'alert-uuid-1' },
  ...overrides,
})

describe('applyAlertsLocalFilters', () => {
  const alerts: ParsedAlertEntry[] = [
    makeParsed({
      uuid: 'a1',
      severity: 'critical',
      status: 'mining',
      type: 'miner',
      tags: ['ip-1'],
    }),
    makeParsed({ uuid: 'a2', severity: 'high', status: 'offline', type: 'container', tags: [] }),
    makeParsed({ uuid: 'a3', severity: 'medium', status: 'mining', type: 'pool', tags: ['mac-x'] }),
  ]

  it('returns all alerts when filters are empty', () => {
    expect(applyAlertsLocalFilters(alerts, {})).toHaveLength(3)
  })

  it('filters by severity', () => {
    const result = applyAlertsLocalFilters(alerts, { severity: ['critical'] })
    expect(result).toHaveLength(1)
    expect(result[0]?.uuid).toBe('a1')
  })

  it('filters by status', () => {
    const result = applyAlertsLocalFilters(alerts, { status: ['mining'] })
    expect(result.map((a) => a.uuid)).toEqual(['a1', 'a3'])
  })

  it('filters by type using fast-access fields (case-insensitive)', () => {
    const result = applyAlertsLocalFilters(alerts, { type: ['MINER'] })
    expect(result.map((a) => a.uuid)).toEqual(['a1'])
  })

  it('filters by type matching tags', () => {
    const result = applyAlertsLocalFilters(alerts, { type: ['mac-'] })
    expect(result.map((a) => a.uuid)).toEqual(['a3'])
  })

  it('filters by uuid (id filter)', () => {
    const result = applyAlertsLocalFilters(alerts, { id: ['a2'] })
    expect(result.map((a) => a.uuid)).toEqual(['a2'])
  })

  it('combines filters (AND semantics)', () => {
    const result = applyAlertsLocalFilters(alerts, { severity: ['critical'], status: ['mining'] })
    expect(result.map((a) => a.uuid)).toEqual(['a1'])
  })

  it('returns empty array when allAlerts is empty', () => {
    expect(applyAlertsLocalFilters([], { severity: ['critical'] })).toEqual([])
  })

  it('uses default empty arrays when called without arguments', () => {
    expect(applyAlertsLocalFilters()).toEqual([])
  })
})

describe('getAlertsForDevices', () => {
  it('parses alerts from devices in the head of the data array', () => {
    const device = makeDevice()
    const result = getAlertsForDevices([[device]], {})
    expect(result).toHaveLength(1)
    expect(result[0]?.uuid).toBe('alert-uuid-1')
    expect(result[0]?.shortCode).toBe('M-001')
  })

  it('skips devices with no alerts', () => {
    const device = makeDevice({ last: { snap: { stats: { status: 'mining' } } } as unknown })
    const result = getAlertsForDevices([[device]], {})
    expect(result).toEqual([])
  })

  it('applies localFilters to results', () => {
    const device = makeDevice()
    const result = getAlertsForDevices([[device]], { severity: ['high'] })
    expect(result).toEqual([])
  })

  it('passes onAlertClick to actions on parsed entries', () => {
    const onClick = vi.fn()
    const device = makeDevice()
    const result = getAlertsForDevices([[device]], {}, onClick)
    expect(result[0]?.actions.onAlertClick).toBe(onClick)
  })

  it('returns empty when data array is empty', () => {
    expect(getAlertsForDevices([], {})).toEqual([])
  })
})

describe('getHistoricalAlertsData', () => {
  it('parses historical alerts using the embedded `thing` device', () => {
    const device = makeDevice()
    const alert: Alert = { ...makeAlert({ uuid: 'h-1' }), thing: device } as Alert
    const result = getHistoricalAlertsData([alert], { localFilters: {} })
    expect(result).toHaveLength(1)
    expect(result[0]?.uuid).toBe('h-1')
  })

  it('skips alerts with no thing payload', () => {
    const result = getHistoricalAlertsData([makeAlert({ uuid: 'h-1' })], { localFilters: {} })
    expect(result).toEqual([])
  })

  it('composes filterTags into the type filter', () => {
    const device = makeDevice()
    const alert: Alert = { ...makeAlert(), thing: device } as Alert
    const result = getHistoricalAlertsData([alert], {
      localFilters: {},
      filterTags: ['no-match-tag'],
    })
    expect(result).toEqual([])
  })

  it('keeps results when filterTags match alert text', () => {
    const device = makeDevice()
    const alert: Alert = { ...makeAlert(), thing: device } as Alert
    const result = getHistoricalAlertsData([alert], {
      localFilters: {},
      filterTags: ['M-001'],
    })
    expect(result).toHaveLength(1)
  })
})

describe('onLogClicked', () => {
  it('navigates to /alerts/<id>', () => {
    const navigate = vi.fn()
    onLogClicked(navigate, 'uuid-1')
    expect(navigate).toHaveBeenCalledWith('/alerts/uuid-1')
  })

  it('does nothing when navigate is undefined', () => {
    expect(() => onLogClicked(undefined, 'uuid-1')).not.toThrow()
  })

  it('does nothing when id is undefined', () => {
    const navigate = vi.fn()
    onLogClicked(navigate, undefined)
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('getAlertsThingsQuery', () => {
  it('returns a single-alert query when id is provided', () => {
    expect(getAlertsThingsQuery('uuid-1')).toBe('byAlertId:uuid-1')
  })

  it('returns a tag-based query when no id is provided', () => {
    expect(getAlertsThingsQuery(undefined, ['t1', 't2'])).toBe('byTags:t1,t2|empty:false')
  })

  it('forwards allowEmptyArray to the tag-based query helper', () => {
    expect(getAlertsThingsQuery(undefined, [], true)).toBe('byTags:|empty:true')
  })
})

describe('getCurrentAlerts', () => {
  it('drops filterTags when an alert id is provided', () => {
    const device = makeDevice()
    const result = getCurrentAlerts([[device]], {
      localFilters: {},
      filterTags: ['no-match'],
      id: 'alert-uuid-1',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.uuid).toBe('alert-uuid-1')
  })

  it('returns only the alert matching id when id is provided', () => {
    const deviceA = makeDevice({
      id: 'd-A',
      last: {
        snap: { stats: { status: 'mining' } },
        alerts: [makeAlert({ uuid: 'a-A' })],
      } as unknown,
    })
    const deviceB = makeDevice({
      id: 'd-B',
      last: {
        snap: { stats: { status: 'mining' } },
        alerts: [makeAlert({ uuid: 'a-B' })],
      } as unknown,
    })
    const result = getCurrentAlerts([[deviceA, deviceB]], { localFilters: {}, id: 'a-B' })
    expect(result.map((r) => r.uuid)).toEqual(['a-B'])
  })

  it('applies tag-based filter when no id is provided', () => {
    const device = makeDevice()
    const result = getCurrentAlerts([[device]], {
      localFilters: {},
      filterTags: ['M-001'],
    })
    expect(result).toHaveLength(1)
  })

  it('returns empty array when filterTags do not match any alert', () => {
    const device = makeDevice()
    const result = getCurrentAlerts([[device]], {
      localFilters: {},
      filterTags: ['nothing-matches'],
    })
    expect(result).toEqual([])
  })
})
