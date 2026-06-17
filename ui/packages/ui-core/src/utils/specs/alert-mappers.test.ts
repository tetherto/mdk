import { describe, expect, it } from 'vitest'
import type { HistoricalAlert, ListThingsDevice } from '@/types/api-mining.types'
import {
  getAlertsForDevices,
  mapDevicesToIncidents,
  mapHistoryLogToAlerts,
  sortIncidentsBySeverity,
} from '../alert-mappers'

const fmt = (d: Date): string => d.toISOString()

const device = (
  id: string,
  alerts: ListThingsDevice['last'] extends infer L
    ? L extends { alerts?: infer A }
      ? A
      : never
    : never,
  info: ListThingsDevice['info'] = {},
): ListThingsDevice => ({
  id,
  type: 'miner',
  info,
  last: { alerts },
})

describe('getAlertsForDevices', () => {
  it('flattens device alerts into incident rows', () => {
    const rows = getAlertsForDevices(
      [
        device(
          'm1',
          [
            {
              uuid: 'a1',
              name: 'High Temperature',
              description: 'Hashboard 0 at 95C',
              severity: 'critical',
              createdAt: 1700000000000,
            },
          ],
          { container: 'c1', pos: 'A-12' },
        ),
        device('m2', [
          {
            uuid: 'a2',
            name: 'Low Hashrate',
            description: 'below 80% nominal',
            severity: 'high',
            createdAt: 1700000010000,
          },
        ]),
      ],
      fmt,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'a1',
      title: 'High Temperature',
      severity: 'critical',
      subtitle: 'c1 · A-12',
    })
    expect(rows[1]).toMatchObject({ id: 'a2', severity: 'high' })
  })

  it('skips devices without alerts', () => {
    expect(getAlertsForDevices([device('m1', null)], fmt)).toEqual([])
    expect(getAlertsForDevices([device('m1', [])], fmt)).toEqual([])
  })

  it('synthesises an id when uuid is absent', () => {
    const rows = getAlertsForDevices(
      [
        device('m1', [
          {
            name: 'X',
            description: 'y',
            severity: 'high',
            createdAt: 1700,
          },
        ]),
      ],
      fmt,
    )
    expect(rows[0]!.id).toBe('m1:1700:X')
  })
})

describe('sortIncidentsBySeverity', () => {
  it('orders critical → high → medium', () => {
    const sorted = sortIncidentsBySeverity([
      { id: 'b', title: '', subtitle: '', body: '', severity: 'medium' },
      { id: 'a', title: '', subtitle: '', body: '', severity: 'critical' },
      { id: 'c', title: '', subtitle: '', body: '', severity: 'high' },
    ])
    expect(sorted.map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('breaks ties by id', () => {
    const sorted = sortIncidentsBySeverity([
      { id: 'b', title: '', subtitle: '', body: '', severity: 'critical' },
      { id: 'a', title: '', subtitle: '', body: '', severity: 'critical' },
    ])
    expect(sorted.map((r) => r.id)).toEqual(['a', 'b'])
  })
})

describe('mapDevicesToIncidents', () => {
  it('runs the full pipeline', () => {
    const rows = mapDevicesToIncidents(
      [
        device('m1', [
          {
            uuid: 'low',
            name: 'X',
            description: 'medium one',
            severity: 'medium',
            createdAt: 1,
          },
        ]),
        device('m2', [
          {
            uuid: 'hi',
            name: 'Y',
            description: 'critical one',
            severity: 'critical',
            createdAt: 2,
          },
        ]),
      ],
      fmt,
    )
    expect(rows[0]!.severity).toBe('critical')
    expect(rows[1]!.severity).toBe('medium')
  })
})

describe('mapHistoryLogToAlerts', () => {
  it('keeps an already-nested thing untouched', () => {
    const row: HistoricalAlert = {
      uuid: 'a1',
      name: 'temp_high',
      description: 'hot',
      severity: 'warning',
      createdAt: 1,
      thing: { id: 'miner-1', type: 'miner', tags: ['t-miner'] },
    }
    const [mapped] = mapHistoryLogToAlerts([row])
    expect(mapped!.thing).toEqual({ id: 'miner-1', type: 'miner', tags: ['t-miner'] })
    expect(mapped!.severity).toBe('warning')
  })

  it('rebuilds thing from flattened device fields', () => {
    const row: HistoricalAlert = {
      uuid: 'a2',
      name: 'offline',
      description: 'gone',
      severity: 'critical',
      createdAt: 2,
      deviceId: 'miner-9',
      deviceType: 'miner',
      container: 'C3',
      position: 'r1',
      tags: ['site-a'],
      code: '001',
    }
    const [mapped] = mapHistoryLogToAlerts([row])
    expect(mapped!.thing).toEqual({
      id: 'miner-9',
      type: 'miner',
      code: '001',
      info: { container: 'C3', pos: 'r1' },
      tags: ['site-a'],
    })
  })

  it('returns [] for empty input', () => {
    expect(mapHistoryLogToAlerts()).toEqual([])
    expect(mapHistoryLogToAlerts([])).toEqual([])
  })
})
