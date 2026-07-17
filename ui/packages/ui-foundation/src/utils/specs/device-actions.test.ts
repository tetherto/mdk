import { describe, expect, it } from 'vitest'
import {
  buildContainerCrossThing,
  buildDeviceActionSubmission,
  buildMinerCrossThing,
  buildRebootAction,
  buildResetAlarmAction,
  buildSetAirExhaustEnabledAction,
  buildSetLedAction,
  buildSetPlcRegistersAction,
  buildSetPowerModeAction,
  buildSetPowerPctAction,
  buildSetTankEnabledAction,
  buildSwitchContainerAction,
  buildSwitchCoolingSystemAction,
  buildSwitchSocketAction,
  buildUpdateThingBatchEntry,
  DEVICE_ACTION,
  POWER_MODE,
  VOTING_SUBMISSION_TYPE,
} from '../device-actions'

const MINER_TAGS = ['id-YzIBV6iIkbsg7vr']
const CONTAINER_TAGS = ['container-bitdeer-1a']

describe('cross-thing builders', () => {
  it('builds the container fan-out for miner-level actions', () => {
    expect(buildContainerCrossThing(['bitdeer-1a'])).toEqual({
      type: 'container',
      params: { containers: ['bitdeer-1a'] },
    })
  })

  it('builds the miner fan-out for container-level actions', () => {
    expect(buildMinerCrossThing(['bitdeer-1a'])).toEqual({
      type: 'miner',
      params: { containers: ['bitdeer-1a'] },
    })
  })
})

describe('miner action builders', () => {
  it('reboot: no params', () => {
    expect(buildRebootAction(MINER_TAGS)).toEqual({
      type: VOTING_SUBMISSION_TYPE,
      action: DEVICE_ACTION.REBOOT,
      tags: MINER_TAGS,
      params: [],
    })
  })

  it('setPowerMode: single mode param, optional fan-out', () => {
    expect(buildSetPowerModeAction(MINER_TAGS, POWER_MODE.SLEEP)).toEqual({
      type: 'voting',
      action: 'setPowerMode',
      tags: MINER_TAGS,
      params: ['sleep'],
    })

    const crossThing = buildContainerCrossThing(['bitdeer-1a'])
    expect(buildSetPowerModeAction(CONTAINER_TAGS, POWER_MODE.HIGH, crossThing)).toEqual({
      type: 'voting',
      action: 'setPowerMode',
      tags: CONTAINER_TAGS,
      params: ['high'],
      crossThing,
    })
  })

  it('setPowerPct: percentage encoded as a string', () => {
    expect(buildSetPowerPctAction(MINER_TAGS, 50)).toEqual({
      type: 'voting',
      action: 'setPowerPct',
      tags: MINER_TAGS,
      params: ['50'],
    })
  })

  it('setLED: single boolean param', () => {
    expect(buildSetLedAction(MINER_TAGS, true).params).toEqual([true])
    expect(buildSetLedAction(MINER_TAGS, false).action).toBe('setLED')
  })
})

describe('container action builders', () => {
  it('switchContainer: single boolean param', () => {
    expect(buildSwitchContainerAction(CONTAINER_TAGS, false)).toEqual({
      type: 'voting',
      action: 'switchContainer',
      tags: CONTAINER_TAGS,
      params: [false],
    })
  })

  it('switchCoolingSystem: boolean param with miner fan-out', () => {
    const crossThing = buildMinerCrossThing(['bitdeer-1a'])
    expect(buildSwitchCoolingSystemAction(CONTAINER_TAGS, true, crossThing)).toEqual({
      type: 'voting',
      action: 'switchCoolingSystem',
      tags: CONTAINER_TAGS,
      params: [true],
      crossThing,
    })
  })

  it('setTankEnabled: positional [tankNumber, isOn]', () => {
    expect(buildSetTankEnabledAction(CONTAINER_TAGS, 3, true).params).toEqual([3, true])
  })

  it('setAirExhaustEnabled: single boolean param', () => {
    expect(buildSetAirExhaustEnabledAction(CONTAINER_TAGS, false).params).toEqual([false])
  })

  it('resetAlarm: no params', () => {
    expect(buildResetAlarmAction(CONTAINER_TAGS).params).toEqual([])
  })

  it('switchSocket: one object param per toggled socket', () => {
    const sockets = [
      { pdu: '1-1', socket: 'a1', enabled: false },
      { pdu: '1-2', socket: '4', enabled: true },
    ]
    expect(buildSwitchSocketAction(CONTAINER_TAGS, sockets).params).toEqual(sockets)
  })

  it('setPlcRegisters: single register-map param', () => {
    expect(buildSetPlcRegistersAction(CONTAINER_TAGS, { reg_1: 42 }).params).toEqual([
      { reg_1: 42 },
    ])
  })
})

describe('buildDeviceActionSubmission', () => {
  it('merges display extras into the submission', () => {
    const submission = buildDeviceActionSubmission(DEVICE_ACTION.REBOOT, MINER_TAGS, [], {
      codesList: ['WM-M56S-0001'],
    })
    expect(submission.codesList).toEqual(['WM-M56S-0001'])
    expect(submission.type).toBe('voting')
  })

  it('never lets extras override the pinned submission fields', () => {
    const submission = buildDeviceActionSubmission(DEVICE_ACTION.REBOOT, MINER_TAGS, [], {
      type: 'not-voting',
      action: 'selfDestruct',
      tags: ['id-someone-else'],
      params: ['boom'],
    })
    expect(submission.type).toBe(VOTING_SUBMISSION_TYPE)
    expect(submission.action).toBe(DEVICE_ACTION.REBOOT)
    expect(submission.tags).toEqual(MINER_TAGS)
    expect(submission.params).toEqual([])
  })
})

describe('buildUpdateThingBatchEntry', () => {
  it('wraps the thing patch as a positional updateThing param', () => {
    const params = {
      id: 'miner-1',
      rackId: 'rack-0',
      code: 'WM-M56S-0001',
      info: { container: 'bitdeer-1a', pos: '1-1_a1' },
      opts: { forceSetIp: false },
    }
    expect(buildUpdateThingBatchEntry(params)).toEqual({
      action: 'updateThing',
      params: [params],
      minerId: 'miner-1',
    })
  })

  it('honours an explicit batch-grouping miner id', () => {
    const entry = buildUpdateThingBatchEntry({ id: 'miner-2', rackId: 'rack-0' }, 'miner-9')
    expect(entry.minerId).toBe('miner-9')
  })
})
