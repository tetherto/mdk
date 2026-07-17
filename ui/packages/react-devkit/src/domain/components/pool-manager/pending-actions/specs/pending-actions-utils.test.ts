import { describe, expect, it } from 'vitest'

import { ACTION_TYPES } from '../../../../constants/actions'
import {
  describeLiveAction,
  describePendingAction,
  describePendingActionExpanded,
  extractSubmittedActionId,
  formatActionTimestamp,
  getActionErrorMessage,
  isAssignPoolAction,
} from '../pending-actions-utils'

describe('describePendingAction', () => {
  it('labels a create action with the pool config name', () => {
    expect(
      describePendingAction({
        action: ACTION_TYPES.REGISTER_POOL_CONFIG,
        params: [{ data: { poolConfigName: 'Pool One' } }],
      }),
    ).toEqual({ label: 'Create pool', detail: 'Pool One' })
  })

  it('labels an update action with the pool config name', () => {
    expect(
      describePendingAction({
        action: ACTION_TYPES.UPDATE_POOL_CONFIG,
        params: [{ data: { poolConfigName: 'Pool Two' } }],
      }),
    ).toEqual({ label: 'Update pool', detail: 'Pool Two' })
  })

  it('labels an assign action with the miner count from the device query', () => {
    expect(
      describePendingAction({
        action: ACTION_TYPES.SETUP_POOLS,
        query: { id: { $in: ['d1', 'd2', 'd3'] } },
      }),
    ).toEqual({ label: 'Assign miners', detail: '3 miners' })
  })

  it('singularizes the miner count', () => {
    expect(
      describePendingAction({
        action: ACTION_TYPES.SETUP_POOLS,
        query: { id: { $in: ['d1'] } },
      }).detail,
    ).toBe('1 miner')
  })

  it('falls back to the raw action string for unknown actions', () => {
    expect(describePendingAction({ action: 'somethingElse' })).toEqual({
      label: 'somethingElse',
      detail: '',
    })
  })

  it('tolerates a missing action key', () => {
    expect(describePendingAction({})).toEqual({ label: 'Action', detail: '' })
  })
})

describe('describePendingActionExpanded', () => {
  it('titles a SETUP_POOLS action with multiple miners', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SETUP_POOLS,
      query: { id: { $in: ['d1', 'd2'] } },
      poolName: 'Alpha',
      codesList: ['ABC', 'DEF'],
    })
    expect(result.title).toBe('2 MINERS - ASSIGN POOLS')
    expect(result.description).toMatch(/Alpha/)
    expect(result.badge).toBe('Pending Submission')
  })

  it('singularizes MINERS when count is 1', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SETUP_POOLS,
      query: { id: { $in: ['d1'] } },
    })
    expect(result.title).toBe('1 MINER - ASSIGN POOLS')
  })

  it('titles a SETUP_POOLS action with container tags', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SETUP_POOLS,
      query: { tags: { $in: ['t1', 't2'] } },
      poolName: 'Beta',
      containersList: ['C1', 'C2'],
    })
    expect(result.title).toBe('2 CONTAINERS - ASSIGN POOLS')
    expect(result.description).toMatch(/Beta/)
  })

  it('singularizes CONTAINER when count is 1', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SETUP_POOLS,
      query: { tags: { $in: ['t1'] } },
    })
    expect(result.title).toBe('1 CONTAINER - ASSIGN POOLS')
  })

  it('falls back to ASSIGN POOLS when no miner or container ids', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SETUP_POOLS,
      poolName: 'Gamma',
    })
    expect(result.title).toBe('ASSIGN POOLS')
  })

  it('handles REGISTER_POOL_CONFIG', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.REGISTER_POOL_CONFIG,
      params: [{ data: { poolConfigName: 'MyPool' } }],
    })
    expect(result.title).toBe('ADD POOL CONFIG')
    expect(result.description).toMatch(/MyPool/)
  })

  it('handles UPDATE_POOL_CONFIG', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.UPDATE_POOL_CONFIG,
      params: [{ data: { poolConfigName: 'MyPool2' } }],
    })
    expect(result.title).toBe('UPDATE POOL CONFIG')
  })

  it('describes a container start action with its on/off state and target count', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SWITCH_CONTAINER,
      params: [true],
      tags: ['id-c1', 'id-c2'],
    })
    expect(result.title).toBe('SWITCH CONTAINER')
    expect(result.description).toBe('Turn container On — 2 devices')
  })

  it('describes a set-tank action with the tank number and state', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SET_TANK_ENABLED,
      params: [1, false],
      tags: ['id-c1'],
    })
    expect(result.description).toBe('Tank 1 Off — 1 device')
  })

  it('describes a set-power-mode action against named miners', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SET_POWER_MODE,
      params: ['high'],
      codesList: ['MNR-1', 'MNR-2'],
    })
    expect(result.title).toBe('SET POWER MODE')
    expect(result.description).toBe('Power mode high — MINERS: MNR-1, MNR-2')
  })

  it('describes a power-all-sockets action reading the nested on/off flag', () => {
    const result = describePendingActionExpanded({
      action: ACTION_TYPES.SWITCH_SOCKET,
      params: [[['-1', '-1', false]]] as never,
      tags: ['id-c1'],
    })
    expect(result.description).toBe('Power all sockets Off — 1 device')
  })

  it('falls back for an unknown action key', () => {
    const result = describePendingActionExpanded({ action: 'unknownAction' })
    expect(result.title).toBe('UNKNOWNACTION')
    expect(result.description).toBe('')
  })

  it('tolerates a missing action key', () => {
    const result = describePendingActionExpanded({})
    expect(result.badge).toBe('Pending Submission')
  })
})

describe('formatActionTimestamp', () => {
  it('returns empty string when createdAt is falsy', () => {
    expect(formatActionTimestamp(undefined)).toBe('')
    expect(formatActionTimestamp(0)).toBe('')
  })

  it('returns a formatted date string for a valid timestamp', () => {
    const ts = new Date('2026-06-18T20:15:42').getTime()
    const result = formatActionTimestamp(ts)
    expect(result).toMatch(/18/)
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/)
  })
})

describe('describeLiveAction', () => {
  it('describes a REGISTER_POOL_CONFIG live action with title + URLS detail', () => {
    const result = describeLiveAction({
      id: '1',
      action: ACTION_TYPES.REGISTER_POOL_CONFIG,
      status: 'VOTING',
      params: [
        {
          data: {
            poolConfigName: 'Dev-6',
            description: 'Testing pool',
            poolUrls: [{ url: 'stratum+tcp://pool.example.com:3333' }],
          },
        } as never,
      ],
    })
    expect(result.title).toBe('Add Pool Config: Dev-6. Description: Testing pool')
    expect(result.detail).toBe('URLS: ["stratum+tcp://pool.example.com:3333"]')
    // VOTING (uppercase from the server) resolves to the human-readable label.
    expect(result.statusBadge).toBe('Action Submitted')
  })

  it('describes an UPDATE_POOL_CONFIG live action', () => {
    const result = describeLiveAction({
      id: '2',
      action: ACTION_TYPES.UPDATE_POOL_CONFIG,
      status: 'ready',
      params: [{ data: { poolConfigName: 'UpdatedPool', description: 'x' } } as never],
    })
    expect(result.title).toBe('Update Pool Config: UpdatedPool. Description: x')
    expect(result.detail).toBe('URLS: []')
  })

  it('describes a SETUP_POOLS live action with multiple miners', () => {
    const result = describeLiveAction({
      id: '3',
      action: ACTION_TYPES.SETUP_POOLS,
      status: 'voting',
      query: { id: { $in: ['d1', 'd2'] } } as never,
    })
    expect(result.title).toBe('2 Miners - Assign pools')
  })

  it('singularizes miner count in SETUP_POOLS live action', () => {
    const result = describeLiveAction({
      id: '4',
      action: ACTION_TYPES.SETUP_POOLS,
      status: 'voting',
      query: { id: { $in: ['d1'] } } as never,
    })
    expect(result.title).toBe('1 Miner - Assign pools')
  })

  it('falls back to params length when query ids are absent', () => {
    const result = describeLiveAction({
      id: '5',
      action: ACTION_TYPES.SETUP_POOLS,
      status: 'voting',
      params: [{} as never, {} as never],
    })
    expect(result.title).toBe('2 Miners - Assign pools')
  })

  it('describes a device control live action with its param + affected count', () => {
    const result = describeLiveAction({
      id: '7',
      action: ACTION_TYPES.RESET_ALARM,
      status: 'voting',
      query: { tags: { $in: ['id-c1', 'id-c2', 'id-c3'] } },
    } as never)
    expect(result.title).toBe('Reset Alarm')
    expect(result.detail).toBe('Reset alarm — 3 devices')
  })

  it('handles an unknown action key', () => {
    const result = describeLiveAction({ id: '6', action: 'unknown', status: 'done' })
    expect(result.title).toBe('unknown')
    expect(result.detail).toBe('')
    expect(result.statusBadge).toBe('Completed')
  })
})

describe('isAssignPoolAction', () => {
  it('is true for a draft with the SETUP_POOLS action', () => {
    expect(isAssignPoolAction({ action: ACTION_TYPES.SETUP_POOLS })).toBe(true)
  })

  it('falls back to the `type` field for live actions', () => {
    expect(isAssignPoolAction({ type: ACTION_TYPES.SETUP_POOLS })).toBe(true)
  })

  it('is false for other action types and empty input', () => {
    expect(isAssignPoolAction({ action: ACTION_TYPES.REGISTER_POOL_CONFIG })).toBe(false)
    expect(isAssignPoolAction({})).toBe(false)
  })
})

describe('getActionErrorMessage', () => {
  it('prefers the API body message', () => {
    expect(getActionErrorMessage({ body: { message: 'nope' } }, 'fallback')).toBe('nope')
  })

  it('falls back to the Error message', () => {
    expect(getActionErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('uses the fallback when nothing is extractable', () => {
    expect(getActionErrorMessage(undefined, 'fallback')).toBe('fallback')
    expect(getActionErrorMessage({}, 'fallback')).toBe('fallback')
  })
})

describe('extractSubmittedActionId', () => {
  it('returns the stringified id from the first response entry', () => {
    expect(extractSubmittedActionId([{ id: 99 }])).toBe('99')
    expect(extractSubmittedActionId([{ id: 'abc' }])).toBe('abc')
  })

  it('returns undefined for empty, missing, or non-array responses', () => {
    expect(extractSubmittedActionId([])).toBeUndefined()
    expect(extractSubmittedActionId([{}])).toBeUndefined()
    expect(extractSubmittedActionId(null)).toBeUndefined()
  })
})
