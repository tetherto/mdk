import { describe, expect, it } from 'vitest'
import type {
  ContainerSettingsEntry,
  ListThingsDevice,
  TailLogEntry,
} from '@/types/api-mining.types'
import {
  deriveContainerActivity,
  deriveContainerSummary,
  deriveContainerTanks,
  findMatchingContainer,
  getContainerSettingsModel,
  getWidgetAlarmState,
} from '../container-widgets-derive'

const MODEL = 'bitdeer-1a'

const realtime = (fields: Record<string, Record<string, number>>): TailLogEntry => ({
  ts: 1,
  ...fields,
})

describe('deriveContainerActivity', () => {
  it('collapses every miner into disconnected when there is no realtime sample', () => {
    expect(deriveContainerActivity(undefined, MODEL, 56)).toEqual({
      disconnected: 56,
      total: 56,
      actualMiners: 0,
    })
  })

  it('slices the per-model counts and derives disconnected + actualMiners', () => {
    const sample = realtime({
      offline_cnt: { [MODEL]: 2 },
      power_mode_normal_include_error_cnt: { [MODEL]: 1 },
      power_mode_low_cnt: { [MODEL]: 3 },
      power_mode_normal_cnt: { [MODEL]: 40 },
      power_mode_high_cnt: { [MODEL]: 4 },
    })

    const activity = deriveContainerActivity(sample, MODEL, 56)

    expect(activity.offline).toBe(2)
    expect(activity.error).toBe(1)
    expect(activity.low).toBe(3)
    expect(activity.normal).toBe(40)
    expect(activity.high).toBe(4)
    // 56 total - (2+1+3+40+4 = 50 counted) = 6 disconnected
    expect(activity.disconnected).toBe(6)
    expect(activity.total).toBe(56)
    expect(activity.actualMiners).toBe(50)
  })

  it('floors disconnected at zero when counts exceed the nominal total', () => {
    const sample = realtime({ power_mode_normal_cnt: { [MODEL]: 60 } })
    const activity = deriveContainerActivity(sample, MODEL, 56)
    expect(activity.disconnected).toBe(0)
    expect(activity.actualMiners).toBe(56)
  })

  it('ignores counts for other container models', () => {
    const sample = realtime({ power_mode_normal_cnt: { 'other-model': 10 } })
    const activity = deriveContainerActivity(sample, MODEL, 20)
    expect(activity.normal).toBe(0)
    expect(activity.disconnected).toBe(20)
  })

  it('treats a missing/zero nominal capacity as an empty container', () => {
    expect(deriveContainerActivity(undefined, MODEL, Number.NaN)).toEqual({
      disconnected: 0,
      total: 0,
      actualMiners: 0,
    })
  })
})

describe('deriveContainerSummary', () => {
  it('converts the hashrate MH/s aggregate to TH/s and reads the temperatures', () => {
    const sample = realtime({
      hashrate_mhs_1m_group_sum_aggr: { [MODEL]: 5_000_000 },
      temperature_c_group_max_aggr: { [MODEL]: 72 },
      temperature_c_group_avg_aggr: { [MODEL]: 65 },
    })

    expect(deriveContainerSummary(sample, MODEL)).toEqual({
      hashrateThs: 5,
      maxTempC: 72,
      avgTempC: 65,
    })
  })

  it('returns undefined fields when the aggregate has no sample for the model', () => {
    expect(deriveContainerSummary(undefined, MODEL)).toEqual({
      hashrateThs: undefined,
      maxTempC: undefined,
      avgTempC: undefined,
    })
  })
})

describe('getContainerSettingsModel', () => {
  it('maps each container family to its settings-model key', () => {
    expect(getContainerSettingsModel('container-bd-d40-m56')).toBe('bd')
    expect(getContainerSettingsModel('container-mbt-alpha')).toBe('mbt')
    expect(getContainerSettingsModel('container-as-hk3')).toBe('hydro')
    expect(getContainerSettingsModel('container-as-immersion')).toBe('immersion')
  })

  it('returns null for an unknown or empty type', () => {
    expect(getContainerSettingsModel('container-unknown-x')).toBeNull()
    expect(getContainerSettingsModel(undefined)).toBeNull()
  })
})

describe('findMatchingContainer', () => {
  const settings: ContainerSettingsEntry[] = [
    { model: 'container-bd-d40-m56' },
    { model: 'bd' },
    { model: 'mbt' },
  ]

  it('prefers an exact model match', () => {
    expect(findMatchingContainer(settings, 'container-bd-d40-m56')).toBe(settings[0])
  })

  it('falls back to the settings-model family', () => {
    expect(findMatchingContainer(settings, 'container-bd-d40-s19xp')).toBe(settings[1])
  })

  it('returns null when nothing matches or inputs are missing', () => {
    expect(findMatchingContainer(settings, 'container-unknown-x')).toBeNull()
    expect(findMatchingContainer(undefined, 'container-bd-d40-m56')).toBeNull()
    expect(findMatchingContainer(settings, undefined)).toBeNull()
  })
})

describe('getWidgetAlarmState', () => {
  it('reads non-alarming for the generic read-only grid (vendor math deferred)', () => {
    const container = { id: 'c1', type: 'container-bd-d40-m56' } as ListThingsDevice
    expect(getWidgetAlarmState(container)).toEqual({ shouldFlash: false, isCriticallyHigh: false })
  })
})

describe('deriveContainerTanks', () => {
  const withCooling = (cooling: unknown): ListThingsDevice =>
    ({
      id: 'c1',
      type: 'container-bd-d40-m56',
      last: { snap: { stats: { container_specific: { cooling_system: cooling } } } },
    }) as ListThingsDevice

  it('joins each oil pump with its water pump into a labelled tank row', () => {
    const tanks = deriveContainerTanks(
      withCooling({
        oil_pump: [
          { index: 0, enabled: false, cold_temp_c: 44 },
          { index: 1, enabled: true, cold_temp_c: 45 },
        ],
        water_pump: [
          { index: 0, enabled: false },
          { index: 1, enabled: true },
        ],
      }),
    )

    expect(tanks).toEqual([
      { label: 'Tank 1', temperatureC: 44, oilPumpEnabled: false, waterPumpEnabled: false, pressureBar: undefined },
      { label: 'Tank 2', temperatureC: 45, oilPumpEnabled: true, waterPumpEnabled: true, pressureBar: undefined },
    ])
  })

  it('includes tank pressure when the container reports it', () => {
    const [tank1] = deriveContainerTanks(
      withCooling({
        oil_pump: [{ enabled: true, cold_temp_c: 44 }],
        water_pump: [{ enabled: true }],
        tank1_bar: 1.4,
      }),
    )
    expect(tank1?.pressureBar).toBe(1.4)
  })

  it('returns no tanks for a container without an immersion cooling system', () => {
    expect(deriveContainerTanks({ id: 'c1', type: 'container-x' } as ListThingsDevice)).toEqual([])
  })
})
