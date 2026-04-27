import { describe, expect, it } from 'vitest'
import { getAlarms, getSingleAlarmMessage } from '../device-explorer.utils'

describe('device-explorer utils', () => {
  const getFormattedDate = (date: Date) => date.toISOString()

  describe('getSingleAlarmMessage', () => {
    it('should format single alarm with all fields', () => {
      const alarm = {
        name: 'test-alarm',
        description: 'test description',
        severity: 'high',
        createdAt: new Date('2024-01-01').toISOString(),
        message: 'test message',
      }

      const result = getSingleAlarmMessage(alarm, getFormattedDate)
      expect(result).toContain('high')
      expect(result).toContain('test-alarm')
      expect(result).toContain('test description')
      expect(result).toContain('test message')
      expect(result).toContain('2024-01-01T00:00:00.000Z')
    })

    it('should format alarm without custom date formatter', () => {
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
      expect(result).toContain('msg')
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
      expect(result).toContain('medium')
    })

    it('should format alarm with different severities', () => {
      const severities = ['low', 'medium', 'high', 'critical']

      severities.forEach((severity) => {
        const alarm = {
          name: 'test',
          description: 'test',
          severity,
          createdAt: new Date().toISOString(),
        }
        const result = getSingleAlarmMessage(alarm, getFormattedDate)
        expect(result).toContain(severity)
      })
    })
  })

  describe('getAlarms', () => {
    it('should return alarms array when getString is not provided', () => {
      const alarms = [
        {
          name: 'alarm1',
          description: 'desc1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
        },
      ]

      const result = getAlarms({
        last: { alerts: alarms },
      })

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(alarms)
    })

    it('should return alarms array when getString is undefined', () => {
      const alarms = [
        {
          name: 'alarm1',
          description: 'desc1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
        },
      ]

      const result = getAlarms(
        {
          last: { alerts: alarms },
        },
        undefined,
        getFormattedDate,
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(alarms)
    })

    it('should return formatted string when getString is provided', () => {
      const alarms = [
        {
          name: 'alarm1',
          description: 'desc1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
          message: 'msg1',
        },
        {
          name: 'alarm2',
          description: 'desc2',
          severity: 'low',
          createdAt: new Date('2024-01-02').toISOString(),
          message: 'msg2',
        },
      ]

      const result = getAlarms(
        {
          last: { alerts: alarms },
        },
        () => {},
        getFormattedDate,
      )

      expect(typeof result).toBe('string')
      expect(result).toContain('alarm1')
      expect(result).toContain('alarm2')
      expect(result).toContain('desc1')
      expect(result).toContain('desc2')
      expect(result).toContain(',\n')
    })

    it('should handle device without alerts', () => {
      const result = getAlarms({
        last: {},
      })

      expect(result).toBeUndefined()
    })

    it('should handle empty device', () => {
      const result = getAlarms()

      expect(result).toBeUndefined()
    })

    it('should handle device with null alerts', () => {
      const result = getAlarms(
        {
          last: { alerts: null },
        },
        () => {},
      )

      expect(result).toBeNull()
    })

    it('should format multiple alarms with custom date formatter', () => {
      const alarms = [
        {
          name: 'alarm1',
          description: 'desc1',
          severity: 'high',
          createdAt: new Date('2024-01-01').toISOString(),
        },
        {
          name: 'alarm2',
          description: 'desc2',
          severity: 'low',
          createdAt: new Date('2024-01-02').toISOString(),
        },
      ]

      const result = getAlarms(
        {
          last: { alerts: alarms },
        },
        () => {},
        getFormattedDate,
      )

      expect(typeof result).toBe('string')
      if (typeof result === 'string') {
        const lines = result.split(',\n')
        expect(lines).toHaveLength(2)
        expect(lines[0]).toContain('2024-01-01T00:00:00.000Z')
        expect(lines[1]).toContain('2024-01-02T00:00:00.000Z')
      }
    })
  })
})
