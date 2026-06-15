import { describe, expect, it } from 'vitest'
import type { ListThingsDevice } from '@/types/api-mining.types'
import {
  getAlertsForDevices,
  mapDevicesToIncidents,
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
