'use strict'

const test = require('brittle')
const {
  getCoolingSystemData,
  getFieldProjection,
  buildCoolingViewData,
  buildMinersCircuit1View,
  buildMinersCircuit2View,
  buildMinersLayoutView,
  buildHvacCircuit1View,
  buildHvacCircuit2View,
  buildHvacLayoutView,
  buildHvacAmbientView
} = require('../../../workers/lib/server/handlers/coolingSystem.handlers')
const { COOLING_SYSTEM_PROJECTIONS } = require('../../../workers/lib/constants')
const { extractDcsThing, getDCSTag, isCentralDCSEnabled } = require('../../../workers/lib/dcs.utils')

// Sample enriched equipment data (as provided by the DCS worker)
// All data includes units - app-node is completely agnostic
const createMockEquipment = () => ({
  pumps: [
    { equipment: 'B-7513', circuit: 'MINER_LOOP', status: 'Running', fbk_run_out: true, speed: { value: 100, unit: '%' }, current: { value: 42.3, unit: 'A' }, trip: false, intlock: false, label: 'Pump 1' },
    { equipment: 'B-7514', circuit: 'MINER_LOOP', status: 'Running', fbk_run_out: true, speed: { value: 100, unit: '%' }, current: { value: 41.8, unit: 'A' }, trip: false, intlock: false, label: 'Pump 2' },
    { equipment: 'B-7515', circuit: 'MINER_LOOP', status: 'Standby', fbk_run_out: false, speed: { value: 0, unit: '%' }, current: { value: 0, unit: 'A' }, trip: false, intlock: false, label: 'Pump 3' },
    { equipment: 'B-7516', circuit: 'COOLING_TOWER', status: 'Running', fbk_run_out: true, speed: { value: 100, unit: '%' }, current: { value: 48.1, unit: 'A' }, trip: false, intlock: false, label: 'CT Pump 1' },
    { equipment: 'B-7517', circuit: 'COOLING_TOWER', status: 'Running', fbk_run_out: true, speed: { value: 100, unit: '%' }, current: { value: 47.6, unit: 'A' }, trip: false, intlock: false, label: 'CT Pump 2' },
    { equipment: 'B-7501', circuit: 'HVAC_RETURN', status: 'Running', fbk_run_out: true, speed: { value: 100, unit: '%' }, current: { value: 15.2, unit: 'A' }, trip: false, intlock: false, label: 'HVAC Return' },
    { equipment: 'B-7502', circuit: 'HVAC_SUPPLY', status: 'Running', fbk_run_out: true, speed: { value: 100, unit: '%' }, current: { value: 14.8, unit: 'A' }, trip: false, intlock: false, label: 'HVAC Supply' },
    { equipment: 'B-7503', circuit: 'HVAC_CONDENSER', status: 'Running', fbk_run_out: true, speed: { value: 100, unit: '%' }, current: { value: 22.1, unit: 'A' }, trip: false, intlock: false, label: 'HVAC Condenser' }
  ],
  temperatures: [
    { equipment: 'TS-7513', value: 37.1, unit: '°C' },
    { equipment: 'TS-7514', value: 37.3, unit: '°C' },
    { equipment: 'TS-7515', value: 44.6, unit: '°C' },
    { equipment: 'TS-7516', value: 45.0, unit: '°C' },
    { equipment: 'TS-7521', value: 37.0, unit: '°C' },
    { equipment: 'TS-7522', value: 37.1, unit: '°C' },
    { equipment: 'TS-7501', value: 7.2, unit: '°C' },
    { equipment: 'TS-7502', value: 13.8, unit: '°C' }
  ],
  pressures: [
    { equipment: 'PIT-7502', value: 2.9, unit: 'bar' },
    { equipment: 'PIT-7503', value: 1.4, unit: 'bar' },
    { equipment: 'PIT-7504', value: 2.7, unit: 'bar' },
    { equipment: 'PIT-7505', value: 1.3, unit: 'bar' },
    { equipment: 'PIT-7501', value: 3.1, unit: 'bar' }
  ],
  flows: [
    { equipment: 'FIT-7513', value: 192.4, unit: 'm³/h' },
    { equipment: 'FIT-7514', value: 191.6, unit: 'm³/h' },
    { equipment: 'FIT-7501', value: 35.3, unit: 'm³/h' },
    { equipment: 'FIT-7502', value: 35.3, unit: 'm³/h' }
  ],
  levels: [
    { equipment: 'LIT-7501', value: 88, unit: '%' },
    { equipment: 'LIT-7502', value: 82, unit: '%' },
    { equipment: 'LIT-7503', value: 76, unit: '%' }
  ],
  heat_exchangers: [
    { equipment: 'TC-7502', is_active: true, miner_side_out_temp: { value: 37.0, unit: '°C' }, tower_side_in_temp: { value: 29.1, unit: '°C' }, tower_side_out_temp: { value: 36.8, unit: '°C' }, tcv_position: { value: 45, unit: '%' } },
    { equipment: 'TC-7501', is_active: true, miner_side_out_temp: { value: 37.1, unit: '°C' }, tower_side_in_temp: { value: 29.2, unit: '°C' }, tower_side_out_temp: { value: 36.9, unit: '°C' }, tcv_position: { value: 55, unit: '%' } }
  ],
  cooling_towers: [
    { equipment: 'TR-7501', is_running: true, fan_status: 'Running', fan_power: { value: 60, unit: 'kW' }, level: { value: 82, unit: '%' }, vibration: { value: 0.8, unit: 'mm/s', status: 'Normal' } },
    { equipment: 'TR-7502', is_running: true, fan_status: 'Running', fan_power: { value: 45, unit: 'kW' }, level: { value: 85, unit: '%' }, vibration: { value: 0.6, unit: 'mm/s', status: 'Normal' } }
  ],
  valves: [
    { equipment: 'PCV-7502', position: { value: 12, unit: '%' } },
    { equipment: 'PCV-7501', position: { value: 15, unit: '%' } },
    { equipment: 'TCV-7501', position: { value: 55, unit: '%' } },
    { equipment: 'TCV-7502', position: { value: 45, unit: '%' } },
    { equipment: 'LCV-7501', position: { value: 25, unit: '%' } },
    { equipment: 'LCV-7502', position: { value: 0, unit: '%' } }
  ],
  tanks: [
    { equipment: 'TQ-7501' },
    { equipment: 'TQ-7502' }
  ],
  chillers: [
    { equipment: 'CH-7501', is_running: true, mode: 'Auto', cooling_capacity: { value: 275, unit: 'kW' }, power_consumption: { value: 180, unit: 'kW' }, evaporator_temp: { value: 7.2, unit: '°C' }, condenser_temp: { value: 13.8, unit: '°C' } }
  ],
  fan_coils: [
    { equipment: 'FC-7513', is_running: true, temperature: { value: 27.5, unit: '°C' }, valve_position: { value: 45, unit: '%' } },
    { equipment: 'FC-7514', is_running: true, temperature: { value: 27.3, unit: '°C' }, valve_position: { value: 42, unit: '%' } },
    { equipment: 'FC-7529', is_running: true, temperature: { value: 27.8, unit: '°C' }, valve_position: { value: 48, unit: '%' } },
    { equipment: 'FC-7530', is_running: false, temperature: { value: 28.1, unit: '°C' }, valve_position: { value: 0, unit: '%' } }
  ],
  humidity_sensors: [
    { equipment: 'HT-7501', value: 42.5, unit: '%' },
    { equipment: 'HT-7502', value: 43.2, unit: '%' },
    { equipment: 'HT-7503', value: 41.8, unit: '%' },
    { equipment: 'HT-7504', value: 44.1, unit: '%' },
    { equipment: 'HT-7505', value: 55.1, unit: '%' }
  ],
  vibration_sensors: [
    { equipment: 'VT-7501', value: 0.6, unit: 'mm/s', status: 'Normal' },
    { equipment: 'VT-7503', value: 0.8, unit: 'mm/s', status: 'Normal' }
  ],
  flow_switches: [
    { equipment: 'FS-7501', is_active: true },
    { equipment: 'FS-7502', is_active: true }
  ]
})

// Sample config data (site-specific cooling system configuration)
// All labels, defaults, and metadata come from config
const createMockConfig = () => ({
  mining: {
    total_groups: 16,
    racks_per_group: 4,
    miners_per_rack: 20,
    vlan_start: 129,
    miner_model: 'S21'
  },
  cooling_system: {
    miner_loop: {
      name: 'Circuit 1 - Miner Loop',
      description: 'Cooling Water',
      water_type: 'Cooling Water',
      defaults: {
        supply_temp: { value: 37, unit: '°C' },
        return_temp: { value: 47, unit: '°C' },
        rated_flow: { value: 400, unit: 'm³/h' },
        pumps_config: { rated_head: 30, rated_flow: 200 }
      },
      line1: {
        name: 'LINE 1',
        groups: 'Groups 1-8',
        heat_exchanger: 'TC-7501',
        supply_temp_sensor: 'TS-7513',
        return_temp_sensor: 'TS-7515',
        supply_pressure_sensor: 'PIT-7502',
        return_pressure_sensor: 'PIT-7503',
        supply_flow_sensor: 'FIT-7513',
        control_valve: 'TCV-7501'
      },
      line2: {
        name: 'LINE 2',
        groups: 'Groups 9-16',
        heat_exchanger: 'TC-7502',
        supply_temp_sensor: 'TS-7514',
        return_temp_sensor: 'TS-7516',
        supply_pressure_sensor: 'PIT-7504',
        return_pressure_sensor: 'PIT-7505',
        supply_flow_sensor: 'FIT-7514',
        control_valve: 'TCV-7502'
      },
      heat_exchangers: {
        'tc-7501': { miner_side_out_sensor: 'TS-7521' },
        'tc-7502': { miner_side_out_sensor: 'TS-7522' }
      },
      control_valves: {
        pressure_bypass: 'PCV-7502'
      }
    },
    cooling_tower_loop: {
      name: 'Circuit 2 - Cooling Tower Loop',
      description: 'Filtered Water',
      water_type: 'Filtered Water',
      defaults: {
        tower_capacity: { value: 1000, unit: 'kW' },
        tower_capacity_gcal: { value: 0.86, unit: 'Gcal/h' },
        pumps_config: { rated_head: 25, rated_flow: 150 }
      },
      tower_level_sensor: 'LIT-7501',
      tower_vibration_sensor: 'VT-7501',
      tower_fan: 'FAN-7501',
      heat_exchangers: {
        'tc-7501': { miner_side_out_sensor: 'TS-7521', tower_side_in_sensor: 'TS-7513', tower_side_out_sensor: 'TS-7515' },
        'tc-7502': { miner_side_out_sensor: 'TS-7522', tower_side_in_sensor: 'TS-7514', tower_side_out_sensor: 'TS-7516' }
      },
      makeup: {
        tank: 'TQ-7501',
        level_sensor: 'LIT-7503',
        level_control_valve: 'LCV-7502',
        on_off_valves: ['LCV-7501']
      }
    },
    makeup: {
      pump: 'B-7515',
      defaults: {
        tank_volume: { value: 50, unit: 'm³' },
        pump_head: { value: 20, unit: 'm' },
        pump_flow: { value: 10, unit: 'm³/h' }
      }
    },
    hvac_chilled_water: {
      name: 'Circuit 1 - Chilled Water Loop',
      defaults: {
        supply_temp: { value: 7, unit: '°C' },
        return_temp: { value: 14, unit: '°C' }
      },
      supply_return: {
        supply_temp_sensor: 'TS-7501',
        return_temp_sensor: 'TS-7502',
        supply_flow_sensor: 'FIT-7501',
        return_flow_sensor: 'FIT-7502',
        pressure_sensor: 'PIT-7501',
        flow_switches: ['FS-7501', 'FS-7502']
      },
      buffer_tank: {
        tank: 'TQ-7502',
        level_sensor: 'LIT-7501',
        makeup_valve: 'LCV-7501'
      },
      control_valves: {
        pressure_bypass: 'PCV-7501'
      }
    },
    hvac_condenser: {
      name: 'Circuit 2 - Condenser Water Loop',
      defaults: {
        supply_temp: { value: 29, unit: '°C' },
        return_temp: { value: 39, unit: '°C' }
      }
    },
    ambient: {
      rooms: [
        { name: 'Miner Room 1', fan_coils: ['FC-7513', 'FC-7514'], humidity_sensors: ['HT-7501'] },
        { name: 'Miner Room 2', fan_coils: ['FC-7529', 'FC-7530'], humidity_sensors: ['HT-7502'] }
      ],
      ambient_sensors: ['HT-7505']
    },
    view_metadata: {
      miners: {
        layout: { title: 'Miners Cooling Layout', description: 'Complete cooling system overview' }
      },
      hvac: {
        layout: { title: 'HVAC Cooling Layout', description: 'Complete HVAC cooling system overview' },
        ambient: { title: 'Ambient Conditions', description: 'Room temperatures and humidity levels' }
      }
    }
  }
})

// Sample snap data with enriched equipment data
const createMockSnapData = () => ({
  success: true,
  stats: {
    dcs_specific: {
      equipment: createMockEquipment()
    },
    flow: {
      miner_loop: { value: 384, unit: 'm³/h' },
      cooling_tower: { value: 800, unit: 'm³/h' }
    },
    humidity: {
      avg: 45.3,
      min: 41.8,
      max: 55.1
    }
  },
  config: createMockConfig()
})

function createMockCtx (featureEnabled = true, customDcsResponse = null) {
  const snapData = createMockSnapData()
  const defaultResponse = [[{
    id: 'dcs-1',
    type: 'dcs',
    tags: ['t-dcs'],
    last: { snap: snapData }
  }]]

  const featureConfig = {
    centralDCSSetup: {
      enabled: featureEnabled,
      tag: 't-dcs'
    }
  }

  return {
    conf: {
      featureConfig,
      orks: [{ rpcPublicKey: 'key1' }]
    },
    dataProxy: {
      requestDataMap: async () => {
        return customDcsResponse !== null ? customDcsResponse : defaultResponse
      }
    }
  }
}

// Feature flag tests
test('isCentralDCSEnabled - returns true with new config', (t) => {
  const ctx = { conf: { featureConfig: { centralDCSSetup: { enabled: true } } } }
  t.is(isCentralDCSEnabled(ctx), true)
  t.pass()
})

test('isCentralDCSEnabled - ignores legacy config key', (t) => {
  const ctx = { conf: { featureConfig: { isCentralPCS7Setup: true } } }
  t.is(isCentralDCSEnabled(ctx), false)
  t.pass()
})

test('isCentralDCSEnabled - returns false when disabled', (t) => {
  const ctx = { conf: { featureConfig: { centralDCSSetup: { enabled: false } } } }
  t.is(isCentralDCSEnabled(ctx), false)
  t.pass()
})

// DCS Tag tests
test('getDCSTag - returns configured tag', (t) => {
  const ctx = { conf: { featureConfig: { centralDCSSetup: { tag: 't-custom-dcs' } } } }
  t.is(getDCSTag(ctx), 't-custom-dcs')
  t.pass()
})

test('getDCSTag - returns default tag when not configured', (t) => {
  const ctx = { conf: { featureConfig: {} } }
  t.is(getDCSTag(ctx), 't-dcs')
  t.pass()
})

// Field projection tests
test('getFieldProjection - returns correct projection for miners/circuit1', (t) => {
  const projection = getFieldProjection('miners', 'circuit1')
  t.ok(projection.id, 'should have base field id')
  t.ok(projection['last.snap.stats.dcs_specific.equipment.pumps'], 'should have pumps projection')
  t.ok(projection['last.snap.stats.dcs_specific.equipment.temperatures'], 'should have temperatures projection')
  t.ok(projection['last.snap.config.cooling_system'], 'should have config projection')
  t.pass()
})

test('getFieldProjection - returns correct projection for hvac/ambient', (t) => {
  const projection = getFieldProjection('hvac', 'ambient')
  t.ok(projection.id, 'should have base field id')
  t.ok(projection['last.snap.stats.dcs_specific.equipment.fan_coils'], 'should have fan_coils projection')
  t.ok(projection['last.snap.stats.dcs_specific.equipment.humidity_sensors'], 'should have humidity_sensors projection')
  t.pass()
})

test('COOLING_SYSTEM_PROJECTIONS - has correct structure', (t) => {
  t.ok(COOLING_SYSTEM_PROJECTIONS.base, 'should have base projection')
  t.ok(COOLING_SYSTEM_PROJECTIONS.miners, 'should have miners projections')
  t.ok(COOLING_SYSTEM_PROJECTIONS.hvac, 'should have hvac projections')
  t.ok(COOLING_SYSTEM_PROJECTIONS.miners.circuit1, 'should have miners.circuit1')
  t.ok(COOLING_SYSTEM_PROJECTIONS.miners.circuit2, 'should have miners.circuit2')
  t.ok(COOLING_SYSTEM_PROJECTIONS.miners.layout, 'should have miners.layout')
  t.ok(COOLING_SYSTEM_PROJECTIONS.hvac.circuit1, 'should have hvac.circuit1')
  t.ok(COOLING_SYSTEM_PROJECTIONS.hvac.circuit2, 'should have hvac.circuit2')
  t.ok(COOLING_SYSTEM_PROJECTIONS.hvac.layout, 'should have hvac.layout')
  t.ok(COOLING_SYSTEM_PROJECTIONS.hvac.ambient, 'should have hvac.ambient')
  t.pass()
})

// Extract DCS thing tests
test('extractDcsThing - extracts thing from valid results', (t) => {
  const snapData = createMockSnapData()
  const rpcResults = [[{
    id: 'dcs-1',
    type: 'dcs',
    tags: ['t-dcs'],
    last: { snap: snapData }
  }]]

  const thing = extractDcsThing(rpcResults)
  t.ok(thing, 'should extract thing')
  t.is(thing.type, 'dcs', 'should have correct type')
  t.ok(thing.last.snap, 'should have snap data')
  t.pass()
})

test('extractDcsThing - returns null for empty results', (t) => {
  const thing = extractDcsThing([])
  t.is(thing, null)
  t.pass()
})

test('extractDcsThing - returns null for non-array', (t) => {
  const thing = extractDcsThing(null)
  t.is(thing, null)
  t.pass()
})

// View builder tests
test('buildMinersCircuit1View - builds view from enriched equipment', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit1View(equipment, config)

  t.ok(view, 'should return view')
  t.is(view.title, 'Circuit 1 - Miner Loop', 'title from config')
  t.is(view.water_type, 'Cooling Water', 'water_type from config')
  t.ok(view.lines, 'should have lines')
  t.is(view.lines.length, 2, 'should have 2 lines')
  t.ok(view.pumps, 'should have pumps')
  t.is(view.pumps.length, 3, 'should have 3 miner loop pumps')
  // Check enriched data with units
  t.ok(view.pumps[0].speed.unit, 'pump speed should have unit')
  t.ok(view.pumps[0].current.unit, 'pump current should have unit')
  t.pass()
})

test('buildMinersCircuit2View - builds view from enriched equipment', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit2View(equipment, config)

  t.ok(view, 'should return view')
  t.is(view.title, 'Circuit 2 - Cooling Tower Loop', 'title from config')
  t.ok(view.cooling_towers, 'should have cooling_towers')
  t.ok(view.makeup, 'should have makeup system')
  t.ok(view.makeup.tank, 'should have makeup tank')
  t.ok(view.heat_exchangers, 'should have heat_exchangers')
  t.ok(view.summary, 'should have summary')
  // Check enriched data with units
  t.ok(view.cooling_towers[0].fan_power.unit, 'fan_power should have unit')
  t.ok(view.cooling_towers[0].level.unit, 'level should have unit')
  // Check tower sensor refs
  t.ok(view.cooling_towers[0].level_sensor, 'should have level_sensor ref')
  t.ok(view.cooling_towers[0].vibration_sensor, 'should have vibration_sensor ref')
  t.pass()
})

test('buildHvacCircuit1View - builds view from enriched equipment', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildHvacCircuit1View(equipment, config)

  t.ok(view, 'should return view')
  t.is(view.title, 'Circuit 1 - Chilled Water Loop', 'title from config')
  t.ok(view.chiller, 'should have chiller')
  t.is(view.chiller.is_running, true, 'chiller should be running')
  // Check enriched data with units
  t.ok(view.chiller.cooling_capacity.unit, 'cooling_capacity should have unit')
  t.ok(view.chiller.evaporator_temp.unit, 'evaporator_temp should have unit')
  t.pass()
})

test('buildHvacAmbientView - builds view from enriched equipment', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const stats = { humidity: { avg: 45.3 } }
  const view = buildHvacAmbientView(equipment, config, stats)

  t.ok(view, 'should return view')
  t.ok(view.rooms, 'should have rooms')
  t.is(view.rooms.length, 2, 'should have 2 rooms from config')
  t.is(view.rooms[0].name, 'Miner Room 1', 'room name from config')
  // Check fan coil enriched data
  t.ok(view.rooms[0].fan_coils[0].temperature.unit, 'fan coil temp should have unit')
  t.pass()
})

// buildCoolingViewData tests
test('buildCoolingViewData - returns miners circuit1 data', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'miners', 'circuit1')

  t.ok(data, 'should return data')
  t.ok(data.title, 'should have title')
  t.ok(data.lines, 'should have lines')
  t.ok(data.pumps, 'should have pumps')
  t.pass()
})

test('buildCoolingViewData - returns miners circuit2 data', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'miners', 'circuit2')

  t.ok(data, 'should return data')
  t.ok(data.cooling_towers, 'should have cooling_towers')
  t.ok(data.makeup, 'should have makeup')
  t.ok(data.heat_exchangers, 'should have heat_exchangers')
  t.pass()
})

test('buildCoolingViewData - returns hvac circuit1 data', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'hvac', 'circuit1')

  t.ok(data, 'should return data')
  t.ok(data.chiller, 'should have chiller')
  t.ok(data.supply_return, 'should have supply_return')
  t.pass()
})

test('buildCoolingViewData - returns hvac ambient data', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'hvac', 'ambient')

  t.ok(data, 'should return data')
  t.ok(data.rooms, 'should have rooms')
  t.is(data.rooms.length, 2, 'should have 2 rooms')
  t.pass()
})

test('buildCoolingViewData - returns null for invalid type', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'invalid', 'circuit1')

  t.is(data, null, 'should return null')
  t.pass()
})

// getCoolingSystemData integration tests
test('getCoolingSystemData - returns miners circuit1 data', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'miners', view: 'circuit1' } }

  const result = await getCoolingSystemData(ctx, req)

  t.is(result.type, 'miners', 'type should be miners')
  t.is(result.view, 'circuit1', 'view should be circuit1')
  t.ok(result.data, 'should have data')
  t.ok(result.data.title, 'should have title from config')
  t.ok(result.data.lines, 'should have lines')
  t.ok(result.data.pumps, 'should have pumps')
  t.pass()
})

test('getCoolingSystemData - returns miners circuit2 data', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'miners', view: 'circuit2' } }

  const result = await getCoolingSystemData(ctx, req)

  t.is(result.type, 'miners', 'type should be miners')
  t.is(result.view, 'circuit2', 'view should be circuit2')
  t.ok(result.data, 'should have data')
  t.ok(result.data.cooling_towers, 'should have cooling_towers')
  t.pass()
})

test('getCoolingSystemData - returns hvac circuit1 data', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'hvac', view: 'circuit1' } }

  const result = await getCoolingSystemData(ctx, req)

  t.is(result.type, 'hvac', 'type should be hvac')
  t.is(result.view, 'circuit1', 'view should be circuit1')
  t.ok(result.data, 'should have data')
  t.ok(result.data.chiller, 'should have chiller')
  t.pass()
})

test('getCoolingSystemData - returns hvac ambient data', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'hvac', view: 'ambient' } }

  const result = await getCoolingSystemData(ctx, req)

  t.is(result.type, 'hvac', 'type should be hvac')
  t.is(result.view, 'ambient', 'view should be ambient')
  t.ok(result.data, 'should have data')
  t.ok(result.data.rooms, 'should have rooms')
  t.pass()
})

test('getCoolingSystemData - throws error when feature disabled', async (t) => {
  const ctx = createMockCtx(false)
  const req = { query: { type: 'miners', view: 'circuit1' } }

  try {
    await getCoolingSystemData(ctx, req)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'ERR_FEATURE_NOT_ENABLED', 'should throw ERR_FEATURE_NOT_ENABLED')
  }
  t.pass()
})

test('getCoolingSystemData - throws error for invalid type', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'invalid', view: 'circuit1' } }

  try {
    await getCoolingSystemData(ctx, req)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_TYPE', 'should throw ERR_INVALID_TYPE')
  }
  t.pass()
})

test('getCoolingSystemData - throws error for invalid view', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'miners', view: 'invalid' } }

  try {
    await getCoolingSystemData(ctx, req)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_VIEW', 'should throw ERR_INVALID_VIEW')
  }
  t.pass()
})

test('getCoolingSystemData - throws error when DCS data not found', async (t) => {
  const ctx = createMockCtx(true, [])
  const req = { query: { type: 'miners', view: 'circuit1' } }

  try {
    await getCoolingSystemData(ctx, req)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'ERR_DCS_DATA_NOT_FOUND', 'should throw ERR_DCS_DATA_NOT_FOUND')
  }
  t.pass()
})

// buildMinersCircuit1View - summary and sensor details
test('buildMinersCircuit1View - computes summary with avgSupplyTemp, avgReturnTemp, deltaT, totalFlow', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit1View(equipment, config)

  t.ok(view.summary, 'should have summary')
  t.ok(view.summary.supply_temp, 'should have supply_temp summary')
  t.ok(view.summary.return_temp, 'should have return_temp summary')
  t.ok(view.summary.delta_t, 'should have delta_t summary')
  t.ok(view.summary.total_flow, 'should have total_flow summary')
  t.ok(view.summary.system_pressure, 'should have system_pressure summary')
  t.ok(view.summary.rated_flow, 'should have rated_flow')
  t.ok(view.pumps_config, 'should have pumps_config')
  t.pass()
})

test('buildMinersCircuit1View - lines include sensors arrays', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit1View(equipment, config)

  const line = view.lines[0]
  t.ok(line.supply.sensors, 'supply should have sensors')
  t.ok(line.supply.sensors.length > 0, 'supply sensors should not be empty')
  t.ok(line.return.sensors, 'return should have sensors')
  t.ok(line.return.sensors.length > 0, 'return sensors should not be empty')
  // Each sensor should have tag and reading
  const sensor = line.supply.sensors[0]
  t.ok(sensor.tag, 'sensor should have tag')
  t.pass()
})

test('buildMinersCircuit1View - lines have heat_exchanger with sensors and control_valve', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit1View(equipment, config)

  const line = view.lines[0]
  t.ok(line.heat_exchanger, 'should have heat_exchanger')
  t.ok(line.heat_exchanger.sensors, 'heat_exchanger should have sensors')
  t.ok(line.heat_exchanger.control_valve, 'heat_exchanger should have control_valve')
  t.ok(line.heat_exchanger.control_valve.id, 'control_valve should have id')
  t.pass()
})

test('buildMinersCircuit1View - control_valves from config', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit1View(equipment, config)

  t.ok(view.control_valves, 'should have control_valves')
  t.ok(view.control_valves.pressure_bypass, 'should have pressure_bypass')
  t.is(view.control_valves.pressure_bypass.id, 'PCV-7502', 'bypass valve id')
  t.pass()
})

test('buildMinersCircuit1View - control_valves null when config has none', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  delete config.cooling_system.miner_loop.control_valves
  const view = buildMinersCircuit1View(equipment, config)

  t.is(view.control_valves, null, 'should be null when no control_valves configured')
  t.pass()
})

test('buildMinersCircuit1View - pumps include label and has_interlock', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit1View(equipment, config)

  t.is(view.pumps[0].label, 'Pump 1', 'pump should have label')
  t.is(view.pumps[0].has_interlock, false, 'pump should have has_interlock')
  t.is(view.pumps[0].has_fault, false, 'pump should have has_fault')
  t.pass()
})

// buildMinersCircuit2View - detailed tests
test('buildMinersCircuit2View - heat_exchangers have groups mapping', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit2View(equipment, config)

  t.ok(view.heat_exchangers.length > 0, 'should have heat exchangers')
  // TC-7501 is mapped to line1 groups
  const hx1 = view.heat_exchangers.find(hx => hx.id === 'TC-7501')
  t.is(hx1.groups, 'Groups 1-8', 'HX should have groups from line config')
  t.pass()
})

test('buildMinersCircuit2View - summary with pre_hx and post_hx temps', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit2View(equipment, config)

  t.ok(view.summary, 'should have summary')
  t.ok(view.summary.pre_hx_temp, 'should have pre_hx_temp')
  t.ok(view.summary.post_hx_temp, 'should have post_hx_temp')
  t.ok(view.summary.delta_t, 'should have delta_t')
  t.ok(view.summary.tower_capacity, 'should have tower_capacity')
  t.pass()
})

test('buildMinersCircuit2View - makeup system includes pump and on_off_valves', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit2View(equipment, config)

  t.ok(view.makeup, 'should have makeup')
  t.ok(view.makeup.tank, 'should have tank')
  t.ok(view.makeup.pump, 'should have pump')
  t.is(view.makeup.pump.id, 'B-7515', 'makeup pump id')
  t.ok(view.makeup.on_off_valves, 'should have on_off_valves')
  t.is(view.makeup.on_off_valves.length, 1, 'should have 1 on_off_valve')
  t.pass()
})

test('buildMinersCircuit2View - makeup pump null when no pump configured', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  delete config.cooling_system.makeup
  const view = buildMinersCircuit2View(equipment, config)

  t.is(view.makeup.pump, null, 'makeup pump should be null')
  t.pass()
})

// buildMinersLayoutView tests
test('buildMinersLayoutView - builds complete layout', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const stats = {
    flow: {
      miner_loop: { value: 384, unit: 'm³/h' },
      cooling_tower: { value: 800, unit: 'm³/h' }
    }
  }
  const view = buildMinersLayoutView(equipment, config, stats)

  t.ok(view, 'should return view')
  t.ok(view.summary, 'should have summary')
  t.is(view.summary.pumps_running, 7, 'should count running pumps')
  t.is(view.summary.pumps_total, 8, 'should count total pumps')
  t.ok(view.legend, 'should have legend')
  t.ok(view.mining_room, 'should have mining_room')
  t.is(view.mining_room.total_groups, 16, 'should have total_groups')
  t.is(view.mining_room.total_miners, 1280, 'should compute total_miners')
  t.is(view.mining_room.miner_model, 'S21', 'should have miner_model')
  t.is(view.mining_room.groups.length, 16, 'should have 16 groups')
  t.is(view.mining_room.groups[0].id, 'G1', 'first group id')
  t.is(view.mining_room.groups[0].vlan, 129, 'first group vlan')
  t.pass()
})

test('buildMinersLayoutView - circuit1 and circuit2 sections', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersLayoutView(equipment, config, {})

  t.ok(view.circuit1, 'should have circuit1')
  t.ok(view.circuit1.summary, 'circuit1 should have summary')
  t.ok(view.circuit1.lines, 'circuit1 should have lines')
  t.ok(view.circuit1.pumps, 'circuit1 should have pumps')
  t.ok(view.circuit2, 'should have circuit2')
  t.ok(view.circuit2.summary, 'circuit2 should have summary')
  t.ok(view.circuit2.heat_exchangers, 'circuit2 should have heat_exchangers')
  t.ok(view.circuit2.cooling_towers, 'circuit2 should have cooling_towers')
  t.ok(view.circuit2.makeup, 'circuit2 should have makeup')
  t.pass()
})

// buildHvacCircuit2View tests
test('buildHvacCircuit2View - builds view from enriched equipment', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildHvacCircuit2View(equipment, config)

  t.ok(view, 'should return view')
  t.ok(view.cooling_towers, 'should have cooling_towers')
  t.ok(view.pumps, 'should have pumps')
  t.ok(view.supply_return, 'should have supply_return')
  t.pass()
})

// buildHvacLayoutView tests
test('buildHvacLayoutView - builds complete HVAC layout', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildHvacLayoutView(equipment, config)

  t.ok(view, 'should return view')
  t.ok(view.summary, 'should have summary')
  t.is(view.summary.chiller_running, true, 'chiller should be running')
  t.is(view.summary.fan_coils_running, 3, 'should have 3 fan coils running')
  t.is(view.summary.fan_coils_total, 4, 'should have 4 fan coils total')
  t.is(view.summary.pumps_running, 7, 'should count running pumps')
  t.ok(view.circuit1, 'should have circuit1')
  t.ok(view.circuit1.chiller, 'should have chiller in circuit1')
  t.ok(view.circuit2, 'should have circuit2')
  t.ok(view.circuit2.cooling_towers, 'should have cooling_towers in circuit2')
  t.pass()
})

// buildCoolingViewData - layout views
test('buildCoolingViewData - returns miners layout data', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'miners', 'layout')

  t.ok(data, 'should return data')
  t.ok(data.summary, 'should have summary')
  t.ok(data.mining_room, 'should have mining_room')
  t.ok(data.circuit1, 'should have circuit1')
  t.ok(data.circuit2, 'should have circuit2')
  t.pass()
})

test('buildCoolingViewData - returns hvac layout data', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'hvac', 'layout')

  t.ok(data, 'should return data')
  t.ok(data.summary, 'should have summary')
  t.ok(data.circuit1, 'should have circuit1')
  t.ok(data.circuit2, 'should have circuit2')
  t.pass()
})

test('buildCoolingViewData - returns hvac circuit2 data', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'hvac', 'circuit2')

  t.ok(data, 'should return data')
  t.ok(data.cooling_towers, 'should have cooling_towers')
  t.ok(data.pumps, 'should have pumps')
  t.pass()
})

test('buildCoolingViewData - returns null for invalid miners view', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'miners', 'nonexistent')

  t.is(data, null, 'should return null')
  t.pass()
})

test('buildCoolingViewData - returns null for invalid hvac view', (t) => {
  const snap = createMockSnapData()
  const data = buildCoolingViewData(snap, 'hvac', 'nonexistent')

  t.is(data, null, 'should return null')
  t.pass()
})

// getCoolingSystemData - layout views
test('getCoolingSystemData - returns miners layout data', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'miners', view: 'layout' } }

  const result = await getCoolingSystemData(ctx, req)

  t.is(result.type, 'miners', 'type should be miners')
  t.is(result.view, 'layout', 'view should be layout')
  t.ok(result.data, 'should have data')
  t.ok(result.data.mining_room, 'should have mining_room')
  t.pass()
})

test('getCoolingSystemData - returns hvac layout data', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'hvac', view: 'layout' } }

  const result = await getCoolingSystemData(ctx, req)

  t.is(result.type, 'hvac', 'type should be hvac')
  t.is(result.view, 'layout', 'view should be layout')
  t.ok(result.data, 'should have data')
  t.ok(result.data.summary, 'should have summary')
  t.pass()
})

test('getCoolingSystemData - returns hvac circuit2 data', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'hvac', view: 'circuit2' } }

  const result = await getCoolingSystemData(ctx, req)

  t.is(result.type, 'hvac', 'type should be hvac')
  t.is(result.view, 'circuit2', 'view should be circuit2')
  t.ok(result.data, 'should have data')
  t.pass()
})

// Empty equipment - exercises all the || [], ?., and fallback branches
const createEmptyEquipment = () => ({
  pumps: [],
  temperatures: [],
  pressures: [],
  flows: [],
  levels: [],
  heat_exchangers: [],
  cooling_towers: [],
  valves: [],
  tanks: [],
  chillers: [],
  fan_coils: [],
  humidity_sensors: [],
  vibration_sensors: [],
  flow_switches: []
})

const createMinimalConfig = () => ({
  cooling_system: {
    miner_loop: {
      line1: {
        name: 'LINE 1',
        groups: 'Groups 1-8',
        supply_temp_sensor: 'MISSING-1',
        return_temp_sensor: 'MISSING-2',
        supply_pressure_sensor: 'MISSING-3',
        return_pressure_sensor: 'MISSING-4',
        supply_flow_sensor: 'MISSING-5'
      }
    },
    cooling_tower_loop: {},
    hvac_chilled_water: {},
    hvac_condenser: {},
    ambient: {},
    view_metadata: {
      miners: {
        circuit1: { title: 'C1', description: 'D1', water_type: 'W1' },
        circuit2: { title: 'C2', description: 'D2', water_type: 'W2' },
        layout: { title: 'Layout', description: 'Layout Desc' }
      },
      hvac: {
        circuit1: { title: 'HVAC C1', description: 'HVAC D1' },
        circuit2: { title: 'HVAC C2', description: 'HVAC D2' },
        layout: { title: 'HVAC Layout', description: 'HVAC Layout Desc' },
        ambient: { title: 'Ambient', description: 'Ambient Desc' }
      }
    }
  }
})

test('buildMinersCircuit1View - empty equipment uses fallbacks', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildMinersCircuit1View(equipment, config)

  t.is(view.title, 'C1', 'title from view_metadata fallback')
  t.is(view.water_type, 'W1', 'water_type from view_metadata fallback')
  t.is(view.target_supply_temp, undefined, 'no target_supply_temp')
  t.is(view.target_return_temp, undefined, 'no target_return_temp')
  t.is(view.summary.supply_temp, null, 'no supply_temp summary')
  t.is(view.summary.return_temp, null, 'no return_temp summary')
  t.is(view.summary.delta_t, null, 'no delta_t summary')
  t.is(view.summary.total_flow, null, 'no total_flow summary')
  t.is(view.summary.system_pressure, null, 'no system_pressure summary')
  t.is(view.summary.rated_flow, null, 'no rated_flow')
  t.is(view.pumps_config, null, 'no pumps_config')
  t.is(view.lines.length, 1, 'should have 1 line from config')
  t.is(view.lines[0].heat_exchanger, null, 'heat_exchanger null when not found')
  t.is(view.control_valves, null, 'no control_valves')
  t.is(view.pumps.length, 0, 'no miner loop pumps')
  t.pass()
})

test('buildMinersCircuit1View - line with no heat_exchanger config key', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildMinersCircuit1View(equipment, config)

  t.is(view.lines[0].heat_exchanger, null, 'heat_exchanger null')
  t.ok(view.lines[0].supply.sensors.length > 0, 'sensors still created for missing sensors')
  t.is(view.lines[0].supply.sensors[0].reading, null, 'sensor reading null when not found')
  t.pass()
})

test('buildMinersCircuit1View - line with heat_exchanger but no control_valve', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  // Remove control_valve from line config
  delete config.cooling_system.miner_loop.line1.control_valve
  delete config.cooling_system.miner_loop.line2.control_valve
  const view = buildMinersCircuit1View(equipment, config)

  t.ok(view.lines[0].heat_exchanger, 'heat_exchanger present')
  t.ok(view.lines[0].heat_exchanger.control_valve, 'control_valve still present via tcv_id')
  t.pass()
})

test('buildMinersCircuit2View - empty equipment uses fallbacks', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildMinersCircuit2View(equipment, config)

  t.is(view.title, 'C2', 'title from view_metadata fallback')
  t.is(view.water_type, 'W2', 'water_type from view_metadata fallback')
  t.is(view.summary.pre_hx_temp, null, 'no pre_hx_temp')
  t.is(view.summary.post_hx_temp, null, 'no post_hx_temp')
  t.is(view.summary.delta_t, null, 'no delta_t')
  t.is(view.summary.tower_capacity, null, 'no tower_capacity')
  t.is(view.summary.tower_level, null, 'no tower_level')
  t.is(view.heat_exchangers.length, 0, 'no heat_exchangers')
  t.is(view.cooling_towers.length, 0, 'no cooling_towers')
  t.is(view.makeup.pump, null, 'no makeup pump')
  t.is(view.makeup.level_control_valve, null, 'no level_control_valve')
  t.is(view.makeup.on_off_valves.length, 0, 'no on_off_valves')
  t.is(view.pumps.length, 0, 'no pumps')
  t.is(view.pumps_config, null, 'no pumps_config')
  t.pass()
})

test('buildMinersCircuit2View - heat_exchangers with no controlValveId', (t) => {
  const equipment = createMockEquipment()
  const config = createMinimalConfig()
  config.cooling_system.miner_loop.line1 = { ...config.cooling_system.miner_loop.line1, heat_exchanger: 'TC-7501' }
  config.cooling_system.miner_loop.line2 = { name: 'LINE 2', groups: 'Groups 9-16', heat_exchanger: 'TC-7502' }
  const view = buildMinersCircuit2View(equipment, config)

  t.ok(view.heat_exchangers.length > 0, 'should have heat exchangers')
  t.is(view.heat_exchangers[0].control_valve, null, 'control_valve null when not configured')
  t.pass()
})

test('buildMinersCircuit2View - makeup tank falls back to first tank', (t) => {
  const equipment = createMockEquipment()
  const config = createMinimalConfig()
  const view = buildMinersCircuit2View(equipment, config)

  t.is(view.makeup.tank.id, 'TQ-7501', 'falls back to first tank')
  t.pass()
})

test('buildMinersCircuit2View - on_off_valves with position > 50 are open', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildMinersCircuit2View(equipment, config)

  const onOffValves = view.makeup.on_off_valves
  t.is(onOffValves[0].is_open, false, 'valve with position 25 should be closed')
  t.pass()
})

test('buildMinersLayoutView - uses defaults when no mining config', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildMinersLayoutView(equipment, config, {})

  t.is(view.mining_room.total_groups, 16, 'default total_groups')
  t.is(view.mining_room.racks_per_group, 4, 'default racks_per_group')
  t.is(view.mining_room.miners_per_rack, 20, 'default miners_per_rack')
  t.is(view.mining_room.total_miners, 1280, 'default total_miners')
  t.is(view.mining_room.miner_model, null, 'no miner_model')
  t.is(view.mining_room.groups[0].vlan, 129, 'default vlan_start')
  t.is(view.summary.pumps_running, 0, 'no pumps running')
  t.is(view.summary.pumps_total, 0, 'no pumps total')
  t.pass()
})

test('buildMinersLayoutView - null flow stats', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildMinersLayoutView(equipment, config, null)

  t.is(view.summary.total_miner_loop_flow, undefined, 'no miner_loop flow')
  t.is(view.summary.total_tower_loop_flow, undefined, 'no tower_loop flow')
  t.pass()
})

test('buildHvacCircuit1View - empty equipment uses fallbacks', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildHvacCircuit1View(equipment, config)

  t.is(view.title, 'HVAC C1', 'title from view_metadata fallback')
  t.is(view.chiller, null, 'no chiller')
  t.is(view.control_valves, null, 'no control_valves')
  t.is(view.return_pumps.length, 0, 'no return_pumps')
  t.is(view.supply_pumps.length, 0, 'no supply_pumps')
  t.is(view.fan_coils.total, 0, 'no fan coils')
  t.is(view.fan_coils.running, 0, 'no fan coils running')
  t.pass()
})

test('buildHvacCircuit1View - buffer tank falls back to first tank', (t) => {
  const equipment = createMockEquipment()
  const config = createMinimalConfig()
  const view = buildHvacCircuit1View(equipment, config)

  t.is(view.buffer_tank.id, 'TQ-7501', 'falls back to first tank')
  t.pass()
})

test('buildHvacCircuit1View - with full config has bypass valve and buffer tank', (t) => {
  const equipment = createMockEquipment()
  const config = createMockConfig()
  const view = buildHvacCircuit1View(equipment, config)

  t.ok(view.control_valves, 'should have control_valves')
  t.ok(view.control_valves.pressure_bypass, 'should have pressure_bypass')
  t.ok(view.buffer_tank.makeup_valve, 'should have makeup_valve')
  t.ok(view.supply_return.flow_switches.length > 0, 'should have flow_switches')
  t.pass()
})

test('buildHvacCircuit2View - empty equipment uses fallbacks', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildHvacCircuit2View(equipment, config)

  t.is(view.title, 'HVAC C2', 'title from view_metadata fallback')
  t.is(view.cooling_towers.length, 0, 'no cooling_towers')
  t.is(view.pumps.length, 0, 'no pumps')
  t.pass()
})

test('buildHvacLayoutView - empty equipment', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildHvacLayoutView(equipment, config)

  t.is(view.summary.chiller_running, false, 'no chiller running')
  t.is(view.summary.fan_coils_running, 0, 'no fan coils running')
  t.is(view.summary.fan_coils_total, 0, 'no fan coils')
  t.is(view.summary.pumps_running, 0, 'no pumps running')
  t.is(view.summary.pumps_total, 0, 'no pumps')
  t.pass()
})

test('buildHvacAmbientView - empty equipment and no rooms config', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  const view = buildHvacAmbientView(equipment, config, {})

  t.is(view.title, 'Ambient', 'title from view_metadata')
  t.is(view.rooms.length, 0, 'no rooms')
  t.is(view.summary.average_humidity, null, 'no humidity')
  t.is(view.summary.rooms_count, 0, 'no rooms count')
  t.is(view.ambient_sensors.length, 0, 'no ambient sensors')
  t.pass()
})

test('buildHvacAmbientView - rooms with no matching fan coils or humidity', (t) => {
  const equipment = createEmptyEquipment()
  const config = createMinimalConfig()
  config.cooling_system.ambient = {
    rooms: [
      { name: 'Empty Room', fan_coils: ['MISSING-FC'], humidity_sensors: ['MISSING-HT'] }
    ],
    ambient_sensors: ['MISSING-AS']
  }
  const view = buildHvacAmbientView(equipment, config, { humidity: { avg: null } })

  t.is(view.rooms.length, 1, 'should have 1 room')
  t.is(view.rooms[0].fan_coils.length, 0, 'no matching fan coils')
  t.is(view.rooms[0].humidity_sensors.length, 0, 'no matching humidity sensors')
  t.is(view.rooms[0].temperature, null, 'no temperature')
  t.is(view.rooms[0].humidity, null, 'no humidity')
  t.pass()
})

test('buildHvacAmbientView - room with fan coils that have zero temperature', (t) => {
  const equipment = createEmptyEquipment()
  equipment.fan_coils = [
    { equipment: 'FC-1', is_running: false, temperature: { value: 0, unit: '°C' }, valve_position: { value: 0, unit: '%' } }
  ]
  const config = createMinimalConfig()
  config.cooling_system.ambient = {
    rooms: [{ name: 'Cold Room', fan_coils: ['FC-1'], humidity_sensors: [] }]
  }
  const view = buildHvacAmbientView(equipment, config, {})

  t.is(view.rooms[0].temperature, null, 'zero temp filtered out')
  t.pass()
})

test('formatPump - pump with no optional fields', (t) => {
  const equipment = {
    pumps: [{ equipment: 'P-1', circuit: 'MINER_LOOP', status: 'Off' }],
    temperatures: [],
    pressures: [],
    flows: [],
    levels: [],
    heat_exchangers: [],
    cooling_towers: [],
    valves: [],
    tanks: []
  }
  const config = createMinimalConfig()
  const view = buildMinersCircuit1View(equipment, config)

  t.is(view.pumps.length, 1, 'should have 1 pump')
  t.is(view.pumps[0].is_running, false, 'fbk_run_out defaults to false')
  t.is(view.pumps[0].has_fault, false, 'trip defaults to false')
  t.is(view.pumps[0].has_interlock, false, 'intlock defaults to false')
  t.is(view.pumps[0].label, undefined, 'no label')
  t.pass()
})

test('getCoolingSystemData - throws for missing type', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { view: 'circuit1' } }

  try {
    await getCoolingSystemData(ctx, req)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_TYPE')
  }
  t.pass()
})

test('getCoolingSystemData - throws for missing view', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'miners' } }

  try {
    await getCoolingSystemData(ctx, req)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_VIEW')
  }
  t.pass()
})

test('getCoolingSystemData - hvac ambient is valid view', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'hvac', view: 'ambient' } }

  const result = await getCoolingSystemData(ctx, req)
  t.is(result.view, 'ambient')
  t.pass()
})

test('getCoolingSystemData - miners ambient is invalid view', async (t) => {
  const ctx = createMockCtx(true)
  const req = { query: { type: 'miners', view: 'ambient' } }

  try {
    await getCoolingSystemData(ctx, req)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_VIEW')
  }
  t.pass()
})
