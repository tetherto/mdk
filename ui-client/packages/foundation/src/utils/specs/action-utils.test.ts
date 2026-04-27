import { describe, expect, it, vi } from 'vitest'

import {
  enhanceAction,
  executeCreateAction,
  extractActionErrors,
  getDevicesIdList,
  getErrorMessage,
  getExistedActions,
  getIsAllSocketsAction,
  getMinerNumber,
  getRepairActionSummary,
  getSelectedDevicesTags,
  getSwitchAllSocketsParams,
  getTypeFiltersForSite,
  isBatchAction,
  isContainerAction,
  isMinerAction,
  isRackAction,
  isThingAction,
  TYPE_FILTER_MAP,
} from '../action-utils'

vi.mock('../../constants/actions', () => ({
  ACTION_TYPES: { RACK_REBOOT: 'rack_reboot' },
  ActionErrorMessages: {
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
  },
  BATCH_ACTION_TYPE: new Set(['batchReboot', 'batchSetup']),
  CONTAINER_ACTIONS: ['containerStart', 'containerStop'],
  MINER_ACTIONS: ['minerReboot', 'minerSetup'],
  SUBMIT_ACTION_TYPES: { VOTING: 'voting' },
  THING_ACTIONS: ['thingUpdate', 'thingDelete'],
}))

vi.mock('../../constants/container-constants', () => ({
  COMPLETE_CONTAINER_TYPE: { A: 'type-a', B: 'type-b' },
  CONTAINER_TYPE_NAME_MAP: { 'type-a': 'Type A', 'type-b': 'Type B' },
}))

vi.mock('../../constants/devices', () => ({
  CROSS_THING_TYPES: {
    CONTAINER: 'container',
    MINER: 'miner',
    CABINET: 'cabinet',
    POOL: 'pool',
  },
}))

vi.mock('../device-utils', () => ({
  appendIdToTag: vi.fn((id: string) => `id-${id}`),
  getRackNameFromId: vi.fn((id: string) => id.split('-').slice(0, 3).join('-')),
  isMiner: vi.fn((name: string) => name.includes('miner')),
}))

describe('Action Utils', () => {
  describe('TYPE_FILTER_MAP', () => {
    it('has CONTAINER, MINER, LV_CABINET and POOL keys', () => {
      expect(Object.keys(TYPE_FILTER_MAP)).toEqual(
        expect.arrayContaining(['CONTAINER', 'MINER', 'LV_CABINET', 'POOL']),
      )
    })

    it('each entry has value, label and children', () => {
      Object.values(TYPE_FILTER_MAP).forEach((filter) => {
        expect(filter).toHaveProperty('value')
        expect(filter).toHaveProperty('label')
        expect(filter).toHaveProperty('children')
        expect(Array.isArray(filter.children)).toBe(true)
      })
    })

    it('CONTAINER children are built from COMPLETE_CONTAINER_TYPE', () => {
      expect(TYPE_FILTER_MAP.CONTAINER!.children).toEqual([
        { label: 'Type A', value: 'type-a' },
        { label: 'Type B', value: 'type-b' },
      ])
    })
  })

  describe('getTypeFiltersForSite', () => {
    it('returns all TYPE_FILTER_MAP values when site is falsy', () => {
      const result = getTypeFiltersForSite(null)
      expect(result).toEqual(Object.values(TYPE_FILTER_MAP))
    })

    it('returns empty children when availableDevices has empty arrays', () => {
      const result = getTypeFiltersForSite('my-site', {
        availableContainerTypes: [],
        availableMinerTypes: [],
      })

      const container = result.find((f) => f.value === 'container')
      const miner = result.find((f) => f.value === 'miner')

      expect(container?.children).toEqual([])
      expect(miner?.children).toEqual([])
    })

    it('preserves LV_CABINET and POOL from TYPE_FILTER_MAP when site is provided', () => {
      const result = getTypeFiltersForSite('my-site')

      expect(result.find((f) => f.value === 'cabinet')).toEqual(TYPE_FILTER_MAP.LV_CABINET)
      expect(result.find((f) => f.value === 'pool')).toEqual(TYPE_FILTER_MAP.POOL)
    })

    it('returns 4 filters', () => {
      expect(getTypeFiltersForSite('site')).toHaveLength(4)
      expect(getTypeFiltersForSite(null)).toHaveLength(4)
    })
  })

  describe('isContainerAction', () => {
    it('returns true for a container action', () => {
      expect(isContainerAction('containerStart')).toBe(true)
    })

    it('returns false for a non-container action', () => {
      expect(isContainerAction('minerReboot')).toBe(false)
    })
  })

  describe('isMinerAction', () => {
    it('returns true for a miner action', () => {
      expect(isMinerAction('minerReboot')).toBe(true)
    })

    it('returns false for a non-miner action', () => {
      expect(isMinerAction('containerStart')).toBe(false)
    })
  })

  describe('isThingAction', () => {
    it('returns true for a thing action', () => {
      expect(isThingAction('thingUpdate')).toBe(true)
    })

    it('returns false for a non-thing action', () => {
      expect(isThingAction('minerReboot')).toBe(false)
    })
  })

  describe('isRackAction', () => {
    it('returns true for rack_reboot', () => {
      expect(isRackAction('rack_reboot')).toBe(true)
    })

    it('returns false for any other action', () => {
      expect(isRackAction('minerReboot')).toBe(false)
    })
  })

  describe('isBatchAction', () => {
    it('returns true for a batch action', () => {
      expect(isBatchAction('batchReboot')).toBe(true)
    })

    it('returns false for a non-batch action', () => {
      expect(isBatchAction('minerReboot')).toBe(false)
    })
  })

  describe('getSwitchAllSocketsParams', () => {
    it('returns correct structure for isOn=true', () => {
      expect(getSwitchAllSocketsParams(true)).toEqual([[['-1', '-1', true]]])
    })

    it('returns correct structure for isOn=false', () => {
      expect(getSwitchAllSocketsParams(false)).toEqual([[['-1', '-1', false]]])
    })
  })

  describe('getIsAllSocketsAction', () => {
    it('returns true for all-sockets sentinel values', () => {
      expect(getIsAllSocketsAction([['-1', '-1', true]])).toBe(true)
    })

    it('returns false when first element is not -1', () => {
      expect(getIsAllSocketsAction([['0', '-1', true]])).toBe(false)
    })

    it('returns false when second element is not -1', () => {
      expect(getIsAllSocketsAction([['-1', '0', true]])).toBe(false)
    })

    it('returns false for empty sockets array', () => {
      expect(getIsAllSocketsAction([])).toBe(false)
    })

    it('returns false for single-element inner array', () => {
      expect(getIsAllSocketsAction([['-1']])).toBe(false)
    })
  })

  describe('getMinerNumber', () => {
    it('extracts the first number from the string', () => {
      expect(getMinerNumber('miner-42-slot')).toBe('42')
    })

    it('returns undefined when no number found', () => {
      expect(getMinerNumber('no-numbers-here')).toBeUndefined()
    })

    it('extracts number from start of string', () => {
      expect(getMinerNumber('123abc')).toBe('123')
    })
  })

  describe('getExistedActions', () => {
    const submissions = [{ action: 'reboot' }, { action: 'setup' }, { action: 'reboot' }]

    it('returns submissions matching the action type', () => {
      expect(getExistedActions('reboot', submissions)).toHaveLength(2)
    })

    it('returns empty array when no match', () => {
      expect(getExistedActions('unknown', submissions)).toEqual([])
    })

    it('returns empty array for empty submissions', () => {
      expect(getExistedActions('reboot', [])).toEqual([])
    })
  })

  describe('getErrorMessage', () => {
    it('joins array errors with comma', () => {
      expect(getErrorMessage({ errors: ['err1', 'err2'] })).toBe('err1,err2')
    })

    it('returns string error directly', () => {
      expect(getErrorMessage({ errors: 'something went wrong' })).toBe('something went wrong')
    })

    it('uses first element when data is array', () => {
      expect(getErrorMessage([{ errors: 'first' }, { errors: 'second' }])).toBe('first')
    })

    it('returns mapped ActionErrorMessage for known message key', () => {
      expect(
        getErrorMessage(
          {},
          {
            data: { message: 'NOT_FOUND' },
            error: '',
            message: '',
            status: 0,
          },
        ),
      ).toBe('Resource not found')
    })

    it('returns raw message key when not in ActionErrorMessages', () => {
      expect(
        getErrorMessage(
          {},
          {
            data: { message: 'CUSTOM_ERROR' },
            error: '',
            message: '',
            status: 0,
          },
        ),
      ).toBe('CUSTOM_ERROR')
    })

    it('returns empty string when no error and no data errors', () => {
      expect(getErrorMessage({})).toBe('')
    })
  })

  describe('extractActionErrors', () => {
    it('returns empty array when targets is undefined', () => {
      expect(extractActionErrors({})).toEqual([])
    })

    it('extracts errors from targets calls', () => {
      const action = {
        targets: {
          t1: { calls: [{ error: 'err-a' }, { id: 'ok' }] },
          t2: { calls: [{ error: 'err-b' }] },
        },
      }
      expect(extractActionErrors(action)).toEqual(['err-a', 'err-b'])
    })

    it('skips calls without error', () => {
      const action = {
        targets: {
          t1: { calls: [{ id: 'no-error' }] },
        },
      }
      expect(extractActionErrors(action)).toEqual([])
    })

    it('handles target with no calls array', () => {
      const action = { targets: { t1: {} } }
      expect(extractActionErrors(action)).toEqual([])
    })
  })

  describe('getSelectedDevicesTags', () => {
    it('maps device ids to tags', () => {
      const devices = [{ id: 'abc' }, { id: 'def' }]
      expect(getSelectedDevicesTags(devices as never)).toEqual(['id-abc', 'id-def'])
    })

    it('returns empty array for empty input', () => {
      expect(getSelectedDevicesTags([])).toEqual([])
    })
  })

  describe('getDevicesIdList', () => {
    it('returns tags when provided', () => {
      expect(getDevicesIdList({ tags: ['tag-1', 'tag-2'] })).toEqual(['tag-1', 'tag-2'])
    })

    it('wraps minerId in a tag when no tags', () => {
      expect(getDevicesIdList({ minerId: 'miner-1' })).toEqual(['id-miner-1'])
    })

    it('extracts ids from targets.calls when no tags or minerId', () => {
      const targets = {
        t1: { calls: [{ id: 'x' }, { id: 'y' }] },
        t2: { calls: [{ id: 'z' }] },
      }
      expect(getDevicesIdList({ targets })).toEqual(['id-x', 'id-y', 'id-z'])
    })

    it('returns undefined when none of tags, minerId, targets are provided', () => {
      expect(getDevicesIdList({})).toBeUndefined()
    })

    it('tags take priority over minerId', () => {
      expect(getDevicesIdList({ tags: ['tag-1'], minerId: 'miner-1' })).toEqual(['tag-1'])
    })
  })

  describe('getRepairActionSummary', () => {
    it('returns "0 Additions, 0 Removals" for empty array', () => {
      expect(getRepairActionSummary([])).toBe('0 Additions, 0 Removals')
    })

    it('returns "0 Additions, 0 Removals" for undefined', () => {
      expect(getRepairActionSummary(undefined)).toBe('0 Additions, 0 Removals')
    })

    it('counts removals when parentDeviceId is null', () => {
      const params = [
        { params: [{ info: { parentDeviceId: null } }] },
        { params: [{ info: { parentDeviceId: 'parent-1' } }] },
      ]
      expect(getRepairActionSummary(params)).toBe('1 Additions, 1 Removals')
    })

    it('subtracts minerAction from additions', () => {
      const params = [
        { params: [{ rackId: 'site-row-miner', info: { parentDeviceId: 'x' } }] },
        { params: [{ info: { parentDeviceId: 'y' } }] },
      ]
      // minerAction found → numAttached = 2 - 0 (removals) - 1 (miner) = 1
      expect(getRepairActionSummary(params)).toBe('1 Additions, 0 Removals')
    })

    it('subtracts commentAction from additions', () => {
      const params = [
        { params: [{ comment: 'my comment', info: { parentDeviceId: 'x' } }] },
        { params: [{ info: { parentDeviceId: 'y' } }] },
      ]
      expect(getRepairActionSummary(params)).toBe('1 Additions, 0 Removals')
    })
  })

  describe('enhanceAction', () => {
    it('returns payload unchanged for batch actions', () => {
      const payload = { action: 'batchReboot', tags: ['t1'] }
      expect(enhanceAction({ actionPayload: payload })).toBe(payload)
    })

    it('replaces tags with getDevicesIdList result for non-batch actions', () => {
      const payload = { action: 'minerReboot', tags: ['existing-tag'] }
      const result = enhanceAction({ actionPayload: payload })
      expect(result.tags).toEqual(['existing-tag'])
    })

    it('builds tags from minerId when no tags', () => {
      const payload = { action: 'minerReboot', minerId: 'device-1' }
      const result = enhanceAction({ actionPayload: payload })
      expect(result.tags).toEqual(['id-device-1'])
    })

    it('builds tags from targets when no tags or minerId', () => {
      const payload = {
        action: 'minerReboot',
        targets: { t1: { calls: [{ id: 'abc' }] } },
      }
      const result = enhanceAction({ actionPayload: payload })
      expect(result.tags).toEqual(['id-abc'])
    })
  })

  describe('executeCreateAction', () => {
    const makeDelegate = (response = {}) =>
      vi.fn().mockResolvedValue({ data: 'ok', error: undefined, ...response })

    it('calls addNewAction for non-batch action', async () => {
      const addNewAction = makeDelegate()
      const addNewBatchAction = makeDelegate()

      const action = { create: { action: 'minerReboot', tags: ['t1'] } }

      await executeCreateAction({ addNewAction, addNewBatchAction, action })

      expect(addNewAction).toHaveBeenCalledOnce()
      expect(addNewBatchAction).not.toHaveBeenCalled()
    })

    it('calls addNewBatchAction for batch action', async () => {
      const addNewAction = makeDelegate()
      const addNewBatchAction = makeDelegate()

      const action = { create: { action: 'batchReboot', tags: ['t1'], batchActionsPayload: [] } }

      await executeCreateAction({ addNewAction, addNewBatchAction, action })

      expect(addNewBatchAction).toHaveBeenCalledOnce()
      expect(addNewAction).not.toHaveBeenCalled()
    })

    it('returns isBatch=false for non-batch action', async () => {
      const action = { create: { action: 'minerReboot', tags: [] } }

      const { isBatch } = await executeCreateAction({
        addNewAction: makeDelegate(),
        addNewBatchAction: makeDelegate(),
        action,
      })

      expect(isBatch).toBe(false)
    })

    it('returns isBatch=true for batch action', async () => {
      const action = { create: { action: 'batchReboot', batchActionsPayload: [] } }

      const { isBatch } = await executeCreateAction({
        addNewAction: makeDelegate(),
        addNewBatchAction: makeDelegate(),
        action,
      })

      expect(isBatch).toBe(true)
    })

    it('sets default actionType to "miner"', async () => {
      const addNewAction = makeDelegate()
      const action = { create: { action: 'minerReboot', tags: [] } }

      await executeCreateAction({ addNewAction, addNewBatchAction: makeDelegate(), action })

      const calledWith = addNewAction.mock.calls[0][0] as Record<string, unknown>
      expect(calledWith.actionType).toBe('miner')
    })

    it('deletes action and metadata from payload for batch', async () => {
      const addNewBatchAction = makeDelegate()
      const action = {
        create: {
          action: 'batchReboot',
          metadata: { foo: 'bar' },
          batchActionsPayload: [{ tags: ['t1'] }],
        },
      }

      const { newActionPayload } = await executeCreateAction({
        addNewAction: makeDelegate(),
        addNewBatchAction,
        action,
      })

      expect(newActionPayload).not.toHaveProperty('action')
      expect(newActionPayload).not.toHaveProperty('metadata')
    })

    it('deletes codesList from payload for non-batch', async () => {
      const action = { create: { action: 'minerReboot', tags: [], codesList: [1, 2, 3] } }

      const { newActionPayload } = await executeCreateAction({
        addNewAction: makeDelegate(),
        addNewBatchAction: makeDelegate(),
        action,
      })

      expect(newActionPayload).not.toHaveProperty('codesList')
    })

    it('adds query with tags for non-batch when overrideQuery is true', async () => {
      const action = { create: { action: 'minerReboot', tags: ['t1', 't2'] } }

      const { newActionPayload } = await executeCreateAction({
        addNewAction: makeDelegate(),
        addNewBatchAction: makeDelegate(),
        action,
      })

      expect((newActionPayload as Record<string, unknown>).query).toEqual({
        tags: { $in: ['t1', 't2'] },
      })
    })

    it('returns data and error from the delegate', async () => {
      const action = { create: { action: 'minerReboot', tags: [] } }

      const { data, error } = await executeCreateAction({
        addNewAction: makeDelegate({ data: 'result', error: 'oops' }),
        addNewBatchAction: makeDelegate(),
        action,
      })

      expect(data).toBe('result')
      expect(error).toBe('oops')
    })
  })
})
