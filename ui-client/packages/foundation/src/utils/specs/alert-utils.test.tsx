import type { LogData } from '@tetherto/core'
import { LogItem } from '@tetherto/core'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Alert } from '../../types/alerts'
import type { Device } from '../../types/device'
import type { LocalFilters, ParsedAlertEntry } from '../alerts-utils'
import {
  applyAlertsLocalFilters,
  getAlarms,
  getAlertsForDevices,
  getAlertsString,
  getAlertsThingsQuery,
  getAlertTimelineItems,
  getCurrentAlerts,
  getHistoricalAlertsData,
  getLogFormattedAlertData,
  getSingleAlarmMessage,
  onLogClicked,
} from '../alerts-utils'
import { getDeviceData } from '../device-utils'
import { getByTagsWithAlertsQuery, getDeviceByAlertId } from '../query-utils'

vi.mock('../device-utils.ts', () => ({
  getDeviceData: vi.fn(),
  getMinerShortCode: vi.fn((code) => `short-${code}`),
}))

vi.mock('../container-utils.ts', () => ({
  getContainerName: vi.fn((container) => container ?? 'unknown'),
}))

vi.mock('../query-utils.ts', () => ({
  getDeviceByAlertId: vi.fn((id) => `{"last.alerts":{"$elemMatch":{"uuid":"${id}"}}}`),
  getByTagsWithAlertsQuery: vi.fn((tags) => `{"tags":{"$in":${JSON.stringify(tags)}}}`),
}))

vi.mock('../../constants/alerts', () => ({
  SEVERITY_LEVELS: {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  },
}))

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...actual,
    LogItem: vi.fn(({ data, onLogClicked }) => (
      <div data-testid="log-item" data-uuid={data?.uuid} data-has-click={String(!!onLogClicked)} />
    )),
    LogDot: vi.fn(({ status, type }) => (
      <div data-testid="log-dot" data-status={status} data-type={type} />
    )),
  }
})

const makeParsedAlert = (overrides: Partial<ParsedAlertEntry> = {}): ParsedAlertEntry => ({
  shortCode: 'short-M001',
  device: 'container-1 pos-1',
  tags: ['tag-1', 'tag-2'],
  alertName: 'High Temperature',
  alertCode: 'ALERT_001',
  severity: 'critical',
  description: 'Temperature exceeded threshold',
  message: 'Critical alert',
  createdAt: 1700000000000,
  status: 'normal',
  uuid: 'uuid-001',
  id: 'device-001',
  type: 't-miner',
  actions: { uuid: 'uuid-001' },
  ...overrides,
})

const makeDevice = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'device-001',
    code: 'M001',
    tags: ['t-miner', 'container:container-1'],
    info: { container: 'container-1', pos: 'pos-1' },
    last: { snap: { stats: { status: 'normal' } } },
    ...overrides,
  }) as Device

const makeAlert = (overrides: Partial<Alert> = {}): Alert =>
  ({
    name: 'High Temperature',
    code: 'ALERT_001',
    severity: 'critical',
    description: 'Temperature exceeded threshold',
    message: 'Critical alert',
    createdAt: 1700000000000,
    uuid: 'uuid-001',
    ...overrides,
  }) as Alert

const makeLogData = (overrides = {}): LogData => ({
  uuid: 'uuid-001',
  status: 'critical',
  title: 'Test Alert',
  subtitle: 'Test Subtitle',
  body: 'Test Body',
  ...overrides,
})

const makeAlertForFormatting = (overrides = {}) => ({
  name: 'High Temperature',
  code: 'ALERT_001',
  severity: 'critical',
  description: 'Temperature exceeded',
  message: 'Critical alert',
  createdAt: new Date('2024-01-01').toISOString(),
  uuid: 'uuid-001',
  ...overrides,
})

describe('alert utils', () => {
  const getFormattedDate = (date: Date) => date.toISOString()
  describe('getAlarms', () => {
    it('should get alarms properly', () => {
      const alerts = [
        {
          name: 'alert-1',
          description: 'alert 1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
          message: 'message 1',
        },
        {
          name: 'alert-2',
          description: 'alert 2',
          severity: 'low',
          createdAt: new Date('2024-01-02').toISOString(),
          message: 'message 2',
        },
      ]
      const result = getAlarms(
        {
          id: 'dev-1',
          type: 'type-1',
          last: {
            alerts,
          },
        },
        false,
        getFormattedDate,
      )

      expect(result).toBe(alerts)
    })

    it('should format alarms properly', () => {
      const alerts = [
        {
          name: 'alert-1',
          description: 'alert 1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
          message: 'message 1',
        },
        {
          name: 'alert-2',
          description: 'alert 2',
          severity: 'low',
          createdAt: new Date('2024-01-02').toISOString(),
          message: 'message 2',
        },
      ]

      const result = getAlarms(
        {
          id: 'dev-1',
          type: 'type-1',
          last: {
            alerts,
          },
        },
        true,
        getFormattedDate,
      )

      expect(typeof result).toBe('string')
      if (typeof result === 'string') {
        expect(result.split(',\n')).toEqual([
          '(high) 2024-01-01T00:00:00.000Z: alert-1 Description: alert 1 message 1',
          '(low) 2024-01-02T00:00:00.000Z: alert-2 Description: alert 2 message 2',
        ])
      }
    })
  })

  describe('getAlertsString', () => {
    it('should format alarms properly', () => {
      const alerts = [
        {
          name: 'alert-1',
          description: 'alert 1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
          message: 'message 1',
        },
        {
          name: 'alert-2',
          description: 'alert 2',
          severity: 'low',
          createdAt: new Date('2024-01-02').toISOString(),
          message: 'message 2',
        },
      ]

      const result = getAlertsString(alerts, getFormattedDate)

      expect(typeof result).toBe('string')
      if (typeof result === 'string') {
        expect(result.split(',\n\n')).toEqual([
          '(high) 2024-01-01T00:00:00.000Z : alert-1 Description: alert 1 message 1',
          '(low) 2024-01-02T00:00:00.000Z : alert-2 Description: alert 2 message 2',
        ])
      }
    })

    it('should handle alerts without custom date formatter', () => {
      const alerts = [
        {
          name: 'alert-1',
          description: 'alert 1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
          message: 'message 1',
        },
      ]

      const result = getAlertsString(alerts)
      expect(typeof result).toBe('string')
      expect(result).toContain('alert-1')
      expect(result).toContain('alert 1')
    })

    it('should handle alerts without message', () => {
      const alerts = [
        {
          name: 'alert-1',
          description: 'alert 1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
        },
      ]

      const result = getAlertsString(alerts, getFormattedDate)
      expect(typeof result).toBe('string')
      expect(result).toContain('alert-1')
    })
  })

  describe('getSingleAlarmMessage', () => {
    it('should format single alarm with custom date formatter', () => {
      const alarm = {
        name: 'critical-alarm',
        description: 'critical issue',
        severity: 'critical',
        createdAt: new Date('2024-01-01').toISOString(),
        message: 'urgent',
      }

      const result = getSingleAlarmMessage(alarm, getFormattedDate)
      expect(result).toContain('critical')
      expect(result).toContain('critical-alarm')
      expect(result).toContain('critical issue')
      expect(result).toContain('urgent')
      expect(result).toContain('2024-01-01T00:00:00.000Z')
    })

    it('should format single alarm without custom date formatter', () => {
      const alarm = {
        name: 'alarm',
        description: 'desc',
        severity: 'low',
        createdAt: new Date('2024-01-01').toISOString(),
        message: 'msg',
      }

      const result = getSingleAlarmMessage(alarm)
      expect(result).toContain('alarm')
      expect(result).toContain('desc')
      expect(result).toContain('low')
    })

    it('should handle alarm without message', () => {
      const alarm = {
        name: 'alarm',
        description: 'desc',
        severity: 'medium',
        createdAt: new Date('2024-01-01').toISOString(),
      }

      const result = getSingleAlarmMessage(alarm, getFormattedDate)
      expect(result).toContain('alarm')
      expect(result).toContain('desc')
      expect(result).not.toContain('undefined')
    })
  })

  describe('getAlarms edge cases', () => {
    it('should handle device without alerts', () => {
      const result = getAlarms({
        id: 'dev-1',
        type: 'type-1',
        last: {},
      })
      expect(result).toBeUndefined()
    })

    it('should handle empty device', () => {
      const result = getAlarms()
      expect(result).toBeUndefined()
    })

    it('should return alerts array when getString is false', () => {
      const alerts = [
        {
          name: 'alert',
          description: 'desc',
          severity: 'low',
          createdAt: new Date('2024-01-01').toISOString(),
        },
      ]

      const result = getAlarms(
        {
          id: 'dev-1',
          type: 'type-1',
          last: { alerts },
        },
        false,
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(alerts)
    })

    it('should format multiple alarms as string', () => {
      const alerts = [
        {
          name: 'alert1',
          description: 'desc1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
          message: 'msg1',
        },
        {
          name: 'alert2',
          description: 'desc2',
          severity: 'low',
          createdAt: new Date('2024-01-02').toISOString(),
          message: 'msg2',
        },
      ]

      const result = getAlarms(
        {
          id: 'dev-1',
          type: 'type-1',
          last: { alerts },
        },
        true,
        getFormattedDate,
      )

      expect(typeof result).toBe('string')
      if (typeof result === 'string') {
        expect(result).toContain('alert1')
        expect(result).toContain('alert2')
        expect(result.split(',\n')).toHaveLength(2)
      }
    })

    it('should handle single alarm in array', () => {
      const alerts = [
        {
          name: 'single-alert',
          description: 'single description',
          severity: 'medium',
          createdAt: new Date('2024-01-01').toISOString(),
        },
      ]

      const result = getAlarms(
        {
          id: 'dev-1',
          type: 'type-1',
          last: { alerts },
        },
        true,
        getFormattedDate,
      )

      expect(typeof result).toBe('string')
      if (typeof result === 'string') {
        expect(result).toContain('single-alert')
        expect(result).not.toContain(',\n')
      }
    })
  })

  describe('applyAlertsLocalFilters', () => {
    const mockAlerts: ParsedAlertEntry[] = [
      makeParsedAlert({
        severity: 'critical',
        status: 'active',
        uuid: 'uuid-001',
        type: 't-miner',
        alertCode: 'ALERT_001',
        alertName: 'High Temp',
        shortCode: 'M001',
        device: 'container-1',
        tags: ['tag-1'],
      }),
      makeParsedAlert({
        severity: 'warning',
        status: 'resolved',
        uuid: 'uuid-002',
        type: 't-container',
        alertCode: 'ALERT_002',
        alertName: 'Low Power',
        shortCode: 'M002',
        device: 'container-2',
        tags: ['tag-2'],
      }),
      makeParsedAlert({
        severity: 'info',
        status: 'active',
        uuid: 'uuid-003',
        type: 't-sensor',
        alertCode: 'ALERT_003',
        alertName: 'Fan Speed',
        shortCode: 'M003',
        device: 'container-3',
        tags: ['tag-3'],
      }),
    ]

    describe('no filters', () => {
      it('returns all alerts when no filters applied', () => {
        const result = applyAlertsLocalFilters(mockAlerts, {} as LocalFilters)
        expect(result).toHaveLength(3)
      })

      it('returns all alerts when localFilters is undefined', () => {
        const result = applyAlertsLocalFilters(mockAlerts)
        expect(result).toHaveLength(3)
      })

      it('returns empty array when allAlerts is empty', () => {
        const result = applyAlertsLocalFilters([], {} as LocalFilters)
        expect(result).toHaveLength(0)
      })

      it('returns empty array when allAlerts is undefined', () => {
        const result = applyAlertsLocalFilters()
        expect(result).toHaveLength(0)
      })
    })

    describe('severity filter', () => {
      it('filters by single severity', () => {
        const result = applyAlertsLocalFilters(mockAlerts, {
          severity: ['critical'],
        } as LocalFilters)
        expect(result).toHaveLength(1)
        expect(result[0].severity).toBe('critical')
      })

      it('filters by multiple severities', () => {
        const result = applyAlertsLocalFilters(mockAlerts, {
          severity: ['critical', 'warning'],
        } as LocalFilters)
        expect(result).toHaveLength(2)
      })

      it('returns empty array when no severity matches', () => {
        const result = applyAlertsLocalFilters(mockAlerts, {
          severity: ['unknown'],
        } as LocalFilters)
        expect(result).toHaveLength(0)
      })
    })

    describe('status filter', () => {
      it('filters by single status', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { status: ['active'] })
        expect(result).toHaveLength(2)
        result.forEach((alert) => expect(alert.status).toBe('active'))
      })

      it('filters by multiple statuses', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { status: ['active', 'resolved'] })
        expect(result).toHaveLength(3)
      })

      it('returns empty array when no status matches', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { status: ['unknown'] })
        expect(result).toHaveLength(0)
      })
    })

    describe('type filter', () => {
      it('filters by type field', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['t-miner'] })
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('t-miner')
      })

      it('filters by alertCode', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['alert_001'] })
        expect(result).toHaveLength(1)
        expect(result[0].alertCode).toBe('ALERT_001')
      })

      it('filters by alertName', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['high temp'] })
        expect(result).toHaveLength(1)
        expect(result[0].alertName).toBe('High Temp')
      })

      it('filters by uuid', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['uuid-002'] })
        expect(result).toHaveLength(1)
        expect(result[0].uuid).toBe('uuid-002')
      })

      it('filters by shortCode', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['m001'] })
        expect(result).toHaveLength(1)
        expect(result[0].shortCode).toBe('M001')
      })

      it('filters by device', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['container-2'] })
        expect(result).toHaveLength(1)
        expect(result[0].device).toBe('container-2')
      })

      it('filters by tags', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['tag-3'] })
        expect(result).toHaveLength(1)
        expect(result[0].tags).toContain('tag-3')
      })

      it('is case insensitive', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['T-MINER'] })
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('t-miner')
      })

      it('filters by partial match', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['miner'] })
        expect(result).toHaveLength(1)
      })

      it('returns empty array when no type matches', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['no-match-xyz'] })
        expect(result).toHaveLength(0)
      })

      it('returns matches for multiple type filters', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { type: ['t-miner', 't-container'] })
        expect(result).toHaveLength(2)
      })
    })

    describe('id filter', () => {
      it('filters by uuid', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { id: ['uuid-001'] })
        expect(result).toHaveLength(1)
        expect(result[0].uuid).toBe('uuid-001')
      })

      it('filters by multiple uuids', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { id: ['uuid-001', 'uuid-003'] })
        expect(result).toHaveLength(2)
      })

      it('returns empty array when uuid not found', () => {
        const result = applyAlertsLocalFilters(mockAlerts, { id: ['non-existent-uuid'] })
        expect(result).toHaveLength(0)
      })
    })

    describe('combined filters', () => {
      it('applies severity and status filters together', () => {
        const result = applyAlertsLocalFilters(mockAlerts, {
          severity: ['critical'],
          status: ['active'],
        })
        expect(result).toHaveLength(1)
        expect(result[0].uuid).toBe('uuid-001')
      })

      it('applies all filters simultaneously', () => {
        const result = applyAlertsLocalFilters(mockAlerts, {
          severity: ['critical'],
          status: ['active'],
          type: ['t-miner'],
          id: ['uuid-001'],
        })
        expect(result).toHaveLength(1)
      })

      it('returns empty when combined filters have no matches', () => {
        const result = applyAlertsLocalFilters(mockAlerts, {
          severity: ['critical'],
          status: ['resolved'],
        })
        expect(result).toHaveLength(0)
      })
    })
  })

  describe('getHistoricalAlertsData', () => {
    const mockDeviceStats = {
      id: 'device-001',
      type: 't-miner',
      address: '192.168.1.1',
      tags: ['t-miner'],
      info: { container: 'container-1', pos: 'pos-1', macAddress: 'AA:BB', serialNum: 'SN001' },
      snap: { config: { firmware_ver: '1.0.0' } },
    }

    it('returns parsed alerts from alert things', () => {
      const mockAlert = makeAlert({
        thing: makeDevice() as unknown,
      })

      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getHistoricalAlertsData([mockAlert], {
        localFilters: {} as LocalFilters,
      })

      expect(result).toHaveLength(1)
    })

    it('filters out alerts with no device (thing)', () => {
      const mockAlert = makeAlert({ thing: undefined })
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getHistoricalAlertsData([mockAlert], { localFilters: {} as LocalFilters })
      expect(result).toHaveLength(0)
    })

    it('applies local filters', () => {
      const mockAlert = makeAlert({
        severity: 'warning',
        thing: makeDevice() as unknown,
      })
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getHistoricalAlertsData([mockAlert], {
        localFilters: { severity: ['critical'] } as LocalFilters,
      })

      expect(result).toHaveLength(0)
    })

    it('applies filterTags as type filter', () => {
      const mockAlert = makeAlert({ thing: makeDevice() as unknown })
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getHistoricalAlertsData([mockAlert], {
        localFilters: {} as LocalFilters,
        filterTags: ['no-match-tag'],
      })

      expect(result).toHaveLength(0)
    })

    it('returns empty array when alerts is empty', () => {
      const result = getHistoricalAlertsData([], { localFilters: {} as LocalFilters })
      expect(result).toHaveLength(0)
    })

    it('calls onAlertClick correctly', () => {
      const mockOnAlertClick = vi.fn()
      const mockAlert = makeAlert({ thing: makeDevice() as unknown })
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getHistoricalAlertsData([mockAlert], {
        localFilters: {} as LocalFilters,
        onAlertClick: mockOnAlertClick,
      })

      expect(result[0]?.actions.onAlertClick).toBe(mockOnAlertClick)
    })
  })

  describe('getAlertsForDevices', () => {
    const mockDeviceStats = {
      id: 'device-001',
      type: 't-miner',
      tags: ['t-miner'],
      address: '192.168.1.1',
      info: { container: 'container-1', pos: 'pos-1' },
      alerts: [makeAlert()],
    }

    it('returns alerts from devices', () => {
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getAlertsForDevices([[makeDevice()]], {})
      expect(result).toHaveLength(1)
    })

    it('returns empty array when data is empty', () => {
      const result = getAlertsForDevices([[]], {} as LocalFilters)
      expect(result).toHaveLength(0)
    })

    it('returns empty array when data[0] is undefined', () => {
      const result = getAlertsForDevices([], {} as LocalFilters)
      expect(result).toHaveLength(0)
    })

    it('returns empty array when getDeviceData returns error', () => {
      getDeviceData.mockReturnValue(['error', null])

      const result = getAlertsForDevices([[makeDevice()]], {} as LocalFilters)
      expect(result).toHaveLength(0)
    })

    it('applies local filters to results', () => {
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getAlertsForDevices([[makeDevice()]], {
        severity: ['warning'],
      } as LocalFilters)
      expect(result).toHaveLength(0)
    })

    it('calls onAlertClick correctly', () => {
      const mockOnAlertClick = vi.fn()
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getAlertsForDevices([[makeDevice()]], {} as LocalFilters, mockOnAlertClick)
      expect(result[0]?.actions.onAlertClick).toBe(mockOnAlertClick)
    })
  })

  describe('onLogClicked', () => {
    it('calls navigate with correct path', () => {
      const mockNavigate = vi.fn()
      onLogClicked(mockNavigate, 'alert-123')
      expect(mockNavigate).toHaveBeenCalledWith('/alerts/alert-123')
    })

    it('does not call navigate when navigate is undefined', () => {
      expect(() => onLogClicked(undefined, 'alert-123')).not.toThrow()
    })

    it('does not call navigate when id is undefined', () => {
      const mockNavigate = vi.fn()
      onLogClicked(mockNavigate, undefined)
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('does not throw when both navigate and id are undefined', () => {
      expect(() => onLogClicked(undefined, undefined)).not.toThrow()
    })
  })

  describe('getAlertsThingsQuery', () => {
    it('returns getDeviceByAlertId query when id is provided', () => {
      getAlertsThingsQuery('alert-uuid-123')
      expect(getDeviceByAlertId).toHaveBeenCalledWith('alert-uuid-123')
    })

    it('returns getByTagsWithAlertsQuery when id is not provided', () => {
      getAlertsThingsQuery(undefined, ['tag-1', 'tag-2'])
      expect(getByTagsWithAlertsQuery).toHaveBeenCalledWith(['tag-1', 'tag-2'], undefined)
    })

    it('passes allowEmptyArray to getByTagsWithAlertsQuery', () => {
      getAlertsThingsQuery(undefined, ['tag-1'], true)
      expect(getByTagsWithAlertsQuery).toHaveBeenCalledWith(['tag-1'], true)
    })

    it('uses empty array when filterTags not provided', () => {
      getAlertsThingsQuery(undefined, undefined)
      expect(getByTagsWithAlertsQuery).toHaveBeenCalledWith([], undefined)
    })

    it('prefers id over filterTags when both provided', () => {
      getAlertsThingsQuery('alert-id', ['tag-1'])
      expect(getDeviceByAlertId).toHaveBeenCalled()
      expect(getByTagsWithAlertsQuery).not.toHaveBeenCalled()
    })
  })

  describe('getCurrentAlerts', () => {
    const mockDeviceStats = {
      id: 'device-001',
      type: 't-miner',
      tags: ['t-miner'],
      address: '192.168.1.1',
      info: { container: 'container-1', pos: 'pos-1' },
      alerts: [makeAlert({ uuid: 'uuid-001' })],
    }

    it('returns all device alerts when id is not provided', () => {
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getCurrentAlerts([[makeDevice()]], { localFilters: {} as LocalFilters })
      expect(result).toHaveLength(1)
    })

    it('filters by uuid when id is provided', () => {
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getCurrentAlerts([[makeDevice()]], {
        localFilters: {} as LocalFilters,
        id: 'uuid-001',
      })
      expect(result).toHaveLength(1)
      expect(result[0].uuid).toBe('uuid-001')
    })

    it('returns empty array when id does not match any uuid', () => {
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getCurrentAlerts([[makeDevice()]], {
        localFilters: {} as LocalFilters,
        id: 'non-existent-uuid',
      })
      expect(result).toHaveLength(0)
    })

    it('applies filterTags when id is not provided', () => {
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getCurrentAlerts([[makeDevice()]], {
        localFilters: {} as LocalFilters,
        filterTags: ['no-match'],
      })
      expect(result).toHaveLength(0)
    })

    it('ignores filterTags when id is provided', () => {
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getCurrentAlerts([[makeDevice()]], {
        localFilters: {} as LocalFilters,
        filterTags: ['no-match'],
        id: 'uuid-001',
      })
      expect(result).toHaveLength(1)
    })

    it('applies localFilters', () => {
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getCurrentAlerts([[makeDevice()]], {
        localFilters: { severity: ['warning'] } as LocalFilters,
      })
      expect(result).toHaveLength(0)
    })

    it('returns empty array when data is empty', () => {
      const result = getCurrentAlerts([[]], { localFilters: {} as LocalFilters })
      expect(result).toHaveLength(0)
    })

    it('calls onAlertClick correctly', () => {
      const mockOnAlertClick = vi.fn()
      getDeviceData.mockReturnValue([null, mockDeviceStats])

      const result = getCurrentAlerts([[makeDevice()]], {
        localFilters: {} as LocalFilters,
        onAlertClick: mockOnAlertClick,
      })
      expect(result[0]?.actions.onAlertClick).toBe(mockOnAlertClick)
    })
  })

  describe('getLogFormattedAlertData', () => {
    const getFormattedDate = vi.fn((date: Date) => date.toISOString())

    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('title', () => {
      it('returns alert name as title', () => {
        const result = getLogFormattedAlertData(
          { alert: makeAlertForFormatting(), info: {}, type: 't-miner', id: 'device-001' },
          getFormattedDate,
        )
        expect(result.title).toBe('High Temperature')
      })
    })

    describe('subtitle', () => {
      it('combines description and message as subtitle', () => {
        const result = getLogFormattedAlertData(
          { alert: makeAlertForFormatting(), info: {}, type: 't-miner', id: 'device-001' },
          getFormattedDate,
        )
        expect(result.subtitle).toBe('Temperature exceeded Critical alert')
      })

      it('handles missing message in subtitle', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ message: undefined }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.subtitle).toBe('Temperature exceeded ')
        expect(result.subtitle).not.toContain('undefined')
      })

      it('handles empty message in subtitle', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ message: '' }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.subtitle).toBe('Temperature exceeded ')
      })
    })

    describe('status', () => {
      it('returns severity as status', () => {
        const result = getLogFormattedAlertData(
          { alert: makeAlertForFormatting(), info: {}, type: 't-miner', id: 'device-001' },
          getFormattedDate,
        )
        expect(result.status).toBe('critical')
      })

      it('returns correct status for high severity', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ severity: 'high' }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.status).toBe('high')
      })
    })

    describe('severityLevel', () => {
      it('returns correct severity level for critical', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ severity: 'critical' }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.severityLevel).toBe(1)
      })

      it('returns correct severity level for high', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ severity: 'high' }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.severityLevel).toBe(2)
      })

      it('returns correct severity level for medium', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ severity: 'medium' }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.severityLevel).toBe(3)
      })

      it('returns correct severity level for low', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ severity: 'low' }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.severityLevel).toBe(4)
      })
    })

    describe('body', () => {
      it('calls getFormattedDate with createdAt date', () => {
        getLogFormattedAlertData(
          { alert: makeAlertForFormatting(), info: {}, type: 't-miner', id: 'device-001' },
          getFormattedDate,
        )
        expect(getFormattedDate).toHaveBeenCalledWith(new Date('2024-01-01'))
      })

      it('includes formatted date in body', () => {
        const result = getLogFormattedAlertData(
          { alert: makeAlertForFormatting(), info: {}, type: 't-miner', id: 'device-001' },
          getFormattedDate,
        )
        expect(result.body).toContain('2024-01-01T00:00:00.000Z')
      })

      it('includes container name in body', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting(),
            info: { container: 'container-1' },
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.body).toContain('container-1')
      })

      it('includes pos in body when provided', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting(),
            info: { container: 'container-1', pos: 'A1' },
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.body).toContain('A1')
      })

      it('does not include pos when not provided', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting(),
            info: { container: 'container-1' },
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.body).not.toContain('undefined')
      })
    })

    describe('id and uuid', () => {
      it('returns correct id', () => {
        const result = getLogFormattedAlertData(
          { alert: makeAlertForFormatting(), info: {}, type: 't-miner', id: 'device-001' },
          getFormattedDate,
        )
        expect(result.id).toBe('device-001')
      })

      it('returns correct uuid from alert', () => {
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ uuid: 'alert-uuid-999' }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.uuid).toBe('alert-uuid-999')
      })
    })

    describe('creationDate', () => {
      it('returns alert createdAt as creationDate', () => {
        const createdAt = new Date('2024-06-15').toISOString()
        const result = getLogFormattedAlertData(
          {
            alert: makeAlertForFormatting({ createdAt }),
            info: {},
            type: 't-miner',
            id: 'device-001',
          },
          getFormattedDate,
        )
        expect(result.creationDate).toBe(createdAt)
      })
    })

    describe('info edge cases', () => {
      it('handles undefined info', () => {
        expect(() =>
          getLogFormattedAlertData(
            { alert: makeAlertForFormatting(), info: undefined, type: 't-miner', id: 'device-001' },
            getFormattedDate,
          ),
        ).not.toThrow()
      })

      it('handles empty info object', () => {
        const result = getLogFormattedAlertData(
          { alert: makeAlertForFormatting(), info: {}, type: 't-miner', id: 'device-001' },
          getFormattedDate,
        )
        expect(result).toBeDefined()
      })
    })
  })

  describe('getAlertTimelineItems', () => {
    const mockOnNavigate = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('output structure', () => {
      it('returns array with same length as input', () => {
        const logs = [makeLogData(), makeLogData({ uuid: 'uuid-002' })]
        const result = getAlertTimelineItems(logs, mockOnNavigate)
        expect(result).toHaveLength(2)
      })

      it('returns empty array when input is empty', () => {
        const result = getAlertTimelineItems([], mockOnNavigate)
        expect(result).toHaveLength(0)
      })

      it('each item has item, children, and dot properties', () => {
        const result = getAlertTimelineItems([makeLogData()], mockOnNavigate)
        expect(result[0]).toHaveProperty('item')
        expect(result[0]).toHaveProperty('children')
        expect(result[0]).toHaveProperty('dot')
      })

      it('maps log data to item property', () => {
        const log = makeLogData({ uuid: 'uuid-test' })
        const result = getAlertTimelineItems([log], mockOnNavigate)
        expect(result[0].item).toBe(log)
      })
    })

    describe('children rendering', () => {
      it('renders LogItem as children', () => {
        const result = getAlertTimelineItems([makeLogData()], mockOnNavigate)
        const { getByTestId } = render(<>{result[0].children}</>)
        expect(getByTestId('log-item')).toBeInTheDocument()
      })

      it('passes correct data to LogItem', () => {
        const log = makeLogData({ uuid: 'uuid-children-test' })
        const result = getAlertTimelineItems([log], mockOnNavigate)
        const { getByTestId } = render(<>{result[0].children}</>)
        expect(getByTestId('log-item')).toHaveAttribute('data-uuid', 'uuid-children-test')
      })

      it('passes onLogClicked to LogItem', () => {
        const result = getAlertTimelineItems([makeLogData()], mockOnNavigate)
        const { getByTestId } = render(<>{result[0].children}</>)
        expect(getByTestId('log-item')).toHaveAttribute('data-has-click', 'true')
      })

      it('renders correct children for each log', () => {
        const logs = [makeLogData({ uuid: 'uuid-1' }), makeLogData({ uuid: 'uuid-2' })]
        const result = getAlertTimelineItems(logs, mockOnNavigate)
        const { getAllByTestId } = render(
          <>
            {result.map((r, i) => (
              <span key={i}>{r.children}</span>
            ))}
          </>,
        )
        const items = getAllByTestId('log-item')
        expect(items[0]).toHaveAttribute('data-uuid', 'uuid-1')
        expect(items[1]).toHaveAttribute('data-uuid', 'uuid-2')
      })
    })

    describe('dot rendering', () => {
      it('renders LogDot as dot', () => {
        const result = getAlertTimelineItems([makeLogData()], mockOnNavigate)
        const { getByTestId } = render(<>{result[0].dot}</>)
        expect(getByTestId('log-dot')).toBeInTheDocument()
      })

      it('passes correct status to LogDot', () => {
        const result = getAlertTimelineItems([makeLogData({ status: 'critical' })], mockOnNavigate)
        const { getByTestId } = render(<>{result[0].dot}</>)
        expect(getByTestId('log-dot')).toHaveAttribute('data-status', 'critical')
      })

      it('passes INCIDENTS type to LogDot', () => {
        const result = getAlertTimelineItems([makeLogData()], mockOnNavigate)
        const { getByTestId } = render(<>{result[0].dot}</>)
        expect(getByTestId('log-dot')).toHaveAttribute('data-type', 'Incidents')
      })

      it('passes correct status per item to LogDot', () => {
        const logs = [makeLogData({ status: 'critical' }), makeLogData({ status: 'high' })]
        const result = getAlertTimelineItems(logs, mockOnNavigate)
        const { getAllByTestId } = render(
          <>
            {result.map((r, i) => (
              <span key={i}>{r.dot}</span>
            ))}
          </>,
        )
        const dots = getAllByTestId('log-dot')
        expect(dots[0]).toHaveAttribute('data-status', 'critical')
        expect(dots[1]).toHaveAttribute('data-status', 'high')
      })
    })

    describe('onNavigate integration', () => {
      it('passes onNavigate through to LogItem via onLogClicked', () => {
        const log = makeLogData()
        getAlertTimelineItems([log], mockOnNavigate)
        render(<>{getAlertTimelineItems([log], mockOnNavigate)[0].children}</>)
        expect(LogItem).toHaveBeenCalledWith(
          expect.objectContaining({ onLogClicked: expect.any(Function) }),
          expect.anything(),
        )
      })
    })
  })
})
