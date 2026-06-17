import { describe, expect, it } from 'vitest'
import {
  buildCurrentAlertDevicesParams,
  buildHistoricalAlertsParams,
  DEFAULT_HISTORICAL_WINDOW_MS,
  getDefaultHistoricalAlertsRange,
  ONE_DAY_MS,
} from '../alert-queries'

describe('alert-queries', () => {
  describe('buildCurrentAlertDevicesParams', () => {
    it('queries devices carrying a non-null last.alerts', () => {
      const params = buildCurrentAlertDevicesParams()
      expect(params.status).toBe(1)
      expect(params.limit).toBe(1000)
      expect(JSON.parse(params.query as string)).toEqual({ 'last.alerts': { $ne: null } })
    })

    it('widens the selector with an $or when filter tags are present', () => {
      const params = buildCurrentAlertDevicesParams(['ip-10.0.0.1'])
      const query = JSON.parse(params.query as string) as { $or: unknown[] }
      expect(query.$or).toEqual(
        expect.arrayContaining([
          { 'last.alerts': { $ne: null } },
          { 'last.alerts.name': { $in: ['ip-10.0.0.1'] } },
        ]),
      )
    })

    it('requests the fields the current-alerts table reads', () => {
      const fields = JSON.parse(buildCurrentAlertDevicesParams().fields as string)
      // Filter tokens + status + firmware are derived from these.
      expect(fields).toMatchObject({
        id: 1,
        type: 1,
        tags: 1,
        info: 1,
        'last.alerts': 1,
        'last.snap.stats.status': 1,
        'last.snap.config.firmware_ver': 1,
      })
    })
  })

  describe('buildHistoricalAlertsParams', () => {
    it('emits an alerts-typed history-log window', () => {
      expect(buildHistoricalAlertsParams({ start: 100, end: 200 })).toEqual({
        logType: 'alerts',
        start: 100,
        end: 200,
      })
    })
  })

  describe('getDefaultHistoricalAlertsRange', () => {
    it('spans the default window ending at the given instant', () => {
      const now = 1_750_000_000_000
      expect(getDefaultHistoricalAlertsRange(now)).toEqual({
        start: now - DEFAULT_HISTORICAL_WINDOW_MS,
        end: now,
      })
    })

    it('defaults the upper bound to now', () => {
      const before = Date.now()
      const range = getDefaultHistoricalAlertsRange()
      expect(range.end).toBeGreaterThanOrEqual(before)
      expect(range.end - range.start).toBe(DEFAULT_HISTORICAL_WINDOW_MS)
    })
  })

  it('exposes the day/window constants', () => {
    expect(ONE_DAY_MS).toBe(86_400_000)
    expect(DEFAULT_HISTORICAL_WINDOW_MS).toBe(14 * ONE_DAY_MS)
  })
})
