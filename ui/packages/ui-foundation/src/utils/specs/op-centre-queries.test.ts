import { describe, expect, it } from 'vitest'
import {
  buildCabinetDetailParams,
  buildContainerWidgetsRealtimeTailLogParams,
  buildExplorerListThingsParams,
  EXPLORER_TAB,
  EXPLORER_TAB_TAGS,
  OP_CENTRE_CABINET_DETAIL_FIELDS,
  OP_CENTRE_LIST_THINGS_FIELDS,
} from '../op-centre-queries'

describe('EXPLORER_TAB_TAGS', () => {
  it('maps each tab to its thing tags', () => {
    expect(EXPLORER_TAB_TAGS[EXPLORER_TAB.CONTAINER]).toEqual(['t-container'])
    expect(EXPLORER_TAB_TAGS[EXPLORER_TAB.MINER]).toEqual(['t-miner'])
    expect(EXPLORER_TAB_TAGS[EXPLORER_TAB.CABINET]).toEqual(['t-powermeter', 't-sensor'])
  })
})

describe('buildExplorerListThingsParams', () => {
  it('builds a tag-filtered, projected query for the container tab', () => {
    const params = buildExplorerListThingsParams(EXPLORER_TAB.CONTAINER)

    expect(JSON.parse(params.query ?? '')).toEqual({ tags: { $in: ['t-container'] } })
    expect(params.status).toBe(1)
    expect(params.fields).toBe(OP_CENTRE_LIST_THINGS_FIELDS)
    expect(params.limit).toBe(1000)
    expect(params.offset).toBeUndefined()
  })

  it('unions powermeter and sensor tags for the cabinet tab', () => {
    const params = buildExplorerListThingsParams(EXPLORER_TAB.CABINET)
    expect(JSON.parse(params.query ?? '')).toEqual({
      tags: { $in: ['t-powermeter', 't-sensor'] },
    })
  })

  it('honours limit/offset overrides', () => {
    const params = buildExplorerListThingsParams(EXPLORER_TAB.MINER, { limit: 50, offset: 100 })
    expect(params.limit).toBe(50)
    expect(params.offset).toBe(100)
  })
})

describe('buildCabinetDetailParams', () => {
  it('queries the cabinet family by root pos and status, projected to the detail fields', () => {
    const params = buildCabinetDetailParams('lv1')

    expect(JSON.parse(params.query ?? '')).toEqual({
      $and: [{ 'info.pos': { $regex: 'lv1' } }, { tags: { $in: ['t-powermeter', 't-sensor-temp'] } }],
    })
    expect(params.status).toBe(1)
    expect(params.fields).toBe(OP_CENTRE_CABINET_DETAIL_FIELDS)
  })
})

describe('buildContainerWidgetsRealtimeTailLogParams', () => {
  it('requests the latest realtime sample across miners with grouped aggregates', () => {
    const params = buildContainerWidgetsRealtimeTailLogParams()

    expect(params.key).toBe('stat-realtime')
    expect(params.type).toBe('miner')
    expect(params.tag).toBe('t-miner')
    expect(params.limit).toBe(1)
    expect(JSON.parse(params.aggrFields ?? '')).toEqual({
      power_w_sum_aggr: 1,
      power_w_group_aggr: 1,
      status_group_aggr: 1,
      power_mode_group_aggr: 1,
      hashrate_mhs_5m_sum_aggr: 1,
      hashrate_mhs_1m_group_aggr: 1,
      container_specific_stats_group_aggr: 1,
      // Superset the widget cards actually slice (see container-widgets-derive).
      offline_cnt: 1,
      not_mining_cnt: 1,
      power_mode_normal_include_error_cnt: 1,
      power_mode_low_cnt: 1,
      power_mode_normal_cnt: 1,
      power_mode_high_cnt: 1,
      hashrate_mhs_1m_group_sum_aggr: 1,
      temperature_c_group_max_aggr: 1,
      temperature_c_group_avg_aggr: 1,
    })
    expect(JSON.parse(params.fields ?? '')).toEqual({
      power_w_sum: 1,
      power_w_group: 1,
      status_group: 1,
      power_mode_group: 1,
      hashrate_mhs_5m_sum: 1,
      hashrate_mhs_1m_group: 1,
      container_specific_stats_group: 1,
    })
  })
})

describe('OP_CENTRE_LIST_THINGS_FIELDS', () => {
  it('projects the identity, snap-stats, and snap-config fields the tables read', () => {
    const fields = JSON.parse(OP_CENTRE_LIST_THINGS_FIELDS)
    expect(fields.id).toBe(1)
    expect(fields.type).toBe(1)
    expect(fields.tags).toBe(1)
    expect(fields['last.alerts']).toBe(1)
    expect(fields['last.snap.stats.status']).toBe(1)
    expect(fields['last.snap.stats.hashrate_mhs']).toBe(1)
    expect(fields['last.snap.config.power_mode']).toBe(1)
  })
})
