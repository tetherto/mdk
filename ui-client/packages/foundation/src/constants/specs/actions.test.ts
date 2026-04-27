import { describe, expect, it } from 'vitest'
import type { ContainerActionValue, MinerActionValue, ThingActionValue } from '../actions'
import {
  ACTION_NAMES_MAP,
  ACTION_STATUS_TYPES,
  ACTION_SUFFIXES,
  ACTION_TYPES,
  ActionErrorMessages,
  BATCH_ACTION_TYPE,
  BATCH_ACTION_TYPES,
  CONFIRMATION_ACTIONS,
  CONTAINER_ACTIONS,
  MINER_ACTIONS,
  THING_ACTIONS,
} from '../actions'

describe('actions constants', () => {
  describe('action types', () => {
    it('should have container actions', () => {
      expect(ACTION_TYPES.SWITCH_CONTAINER).toBe('switchContainer')
      expect(ACTION_TYPES.SWITCH_COOLING_SYSTEM).toBe('switchCoolingSystem')
      expect(ACTION_TYPES.RESET_CONTAINER).toBe('resetContainer')
      expect(ACTION_TYPES.EMERGENCY_STOP).toBe('emergencyStop')
    })

    it('should have miner actions', () => {
      expect(ACTION_TYPES.REBOOT).toBe('reboot')
      expect(ACTION_TYPES.SET_POWER_MODE).toBe('setPowerMode')
      expect(ACTION_TYPES.SET_LED).toBe('setLED')
      expect(ACTION_TYPES.SETUP_POOLS).toBe('setupPools')
    })

    it('should have thing actions', () => {
      expect(ACTION_TYPES.REGISTER_THING).toBe('registerThing')
      expect(ACTION_TYPES.UPDATE_THING).toBe('updateThing')
      expect(ACTION_TYPES.FORGET_THINGS).toBe('forgetThings')
    })

    it('should have rack actions', () => {
      expect(ACTION_TYPES.RACK_REBOOT).toBe('rackReboot')
    })

    it('should have camelCase action names', () => {
      Object.values(ACTION_TYPES).forEach((action) => {
        expect(action).toMatch(/^[a-z][a-zA-Z]*$/)
      })
    })
  })

  describe('action suffixes', () => {
    it('should have repair suffix', () => {
      expect(ACTION_SUFFIXES.REPAIR).toBe('repair')
    })
  })

  describe('batch action types', () => {
    it('should have batch action types', () => {
      expect(BATCH_ACTION_TYPES.ATTACH_SPARE_PARTS).toBe('attachSpareParts')
      expect(BATCH_ACTION_TYPES.MOVE_MINER).toBe('moveMiner')
      expect(BATCH_ACTION_TYPES.BULK_ADD_SPARE_PARTS).toBe('bulkAddSpareParts')
      expect(BATCH_ACTION_TYPES.DELETE_MINER).toBe('deleteMiner')
    })

    it('should have batch action type set', () => {
      expect(BATCH_ACTION_TYPE).toBeInstanceOf(Set)
      expect(BATCH_ACTION_TYPE.has(BATCH_ACTION_TYPES.MOVE_MINER)).toBe(true)
      expect(BATCH_ACTION_TYPE.has(BATCH_ACTION_TYPES.ATTACH_SPARE_PARTS)).toBe(true)
    })

    it('should have all batch actions in the set', () => {
      const batchActions = Object.values(BATCH_ACTION_TYPES)
      batchActions.forEach((action) => {
        expect(BATCH_ACTION_TYPE.has(action)).toBe(true)
      })
    })
  })

  describe('action names map', () => {
    it('should map action types to readable names', () => {
      expect(ACTION_NAMES_MAP[ACTION_TYPES.SWITCH_CONTAINER]).toBe('Switch Container')
      expect(ACTION_NAMES_MAP[ACTION_TYPES.REBOOT]).toBeDefined()
      expect(ACTION_NAMES_MAP[ACTION_TYPES.EMERGENCY_STOP]).toBeDefined()
    })

    it('should have readable names for actions', () => {
      Object.values(ACTION_NAMES_MAP).forEach((name) => {
        expect(typeof name).toBe('string')
        expect(name.length).toBeGreaterThan(0)
      })
    })
  })

  describe('action groups', () => {
    it('should have miner actions array', () => {
      expect(Array.isArray(MINER_ACTIONS)).toBe(true)
      expect(MINER_ACTIONS).toContain(ACTION_TYPES.REBOOT)
      expect(MINER_ACTIONS).toContain(ACTION_TYPES.SET_POWER_MODE)
      expect(MINER_ACTIONS).toContain(ACTION_TYPES.SET_LED)
      expect(MINER_ACTIONS).toContain(ACTION_TYPES.SETUP_POOLS)
      expect(MINER_ACTIONS).toHaveLength(4)
    })

    it('should have container actions array', () => {
      expect(Array.isArray(CONTAINER_ACTIONS)).toBe(true)
      expect(CONTAINER_ACTIONS).toContain(ACTION_TYPES.SWITCH_CONTAINER)
      expect(CONTAINER_ACTIONS).toContain(ACTION_TYPES.EMERGENCY_STOP)
      expect(CONTAINER_ACTIONS).toContain(ACTION_TYPES.RESET_CONTAINER)
      expect(CONTAINER_ACTIONS).toHaveLength(13)
    })

    it('should have thing actions array', () => {
      expect(Array.isArray(THING_ACTIONS)).toBe(true)
      expect(THING_ACTIONS).toContain(ACTION_TYPES.REGISTER_THING)
      expect(THING_ACTIONS).toContain(ACTION_TYPES.UPDATE_THING)
      expect(THING_ACTIONS).toContain(ACTION_TYPES.FORGET_THINGS)
      expect(THING_ACTIONS).toHaveLength(3)
    })

    it('should have no overlapping actions between groups', () => {
      const minerSet = new Set(MINER_ACTIONS)
      const containerSet = new Set(CONTAINER_ACTIONS)
      const thingSet = new Set(THING_ACTIONS)

      MINER_ACTIONS.forEach((action) => {
        expect(containerSet.has(action as ContainerActionValue)).toBe(false)
        expect(thingSet.has(action as ThingActionValue)).toBe(false)
      })

      CONTAINER_ACTIONS.forEach((action) => {
        expect(minerSet.has(action as MinerActionValue)).toBe(false)
        expect(thingSet.has(action as ThingActionValue)).toBe(false)
      })

      THING_ACTIONS.forEach((action) => {
        expect(minerSet.has(action as MinerActionValue)).toBe(false)
        expect(containerSet.has(action as ContainerActionValue)).toBe(false)
      })
    })

    it('should have all actions defined in ACTION_TYPES', () => {
      const allActionTypes = Object.values(ACTION_TYPES)

      MINER_ACTIONS.forEach((action) => {
        expect(allActionTypes).toContain(action)
      })

      CONTAINER_ACTIONS.forEach((action) => {
        expect(allActionTypes).toContain(action)
      })

      THING_ACTIONS.forEach((action) => {
        expect(allActionTypes).toContain(action)
      })
    })
  })

  describe('action status types', () => {
    it('should have all status types', () => {
      expect(ACTION_STATUS_TYPES.COMPLETED).toBe('COMPLETED')
      expect(ACTION_STATUS_TYPES.DENIED).toBe('DENIED')
      expect(ACTION_STATUS_TYPES.VOTING).toBe('VOTING')
      expect(ACTION_STATUS_TYPES.APPROVED).toBe('APPROVED')
      expect(ACTION_STATUS_TYPES.EXECUTING).toBe('EXECUTING')
      expect(ACTION_STATUS_TYPES.FAILED).toBe('FAILED')
    })

    it('should have uppercase status values', () => {
      Object.values(ACTION_STATUS_TYPES).forEach((status) => {
        expect(status).toBe(status.toUpperCase())
      })
    })

    it('should have all expected status types', () => {
      const statuses = Object.values(ACTION_STATUS_TYPES)
      expect(statuses).toHaveLength(6)
    })

    it('should have status flow progression', () => {
      const statuses = Object.values(ACTION_STATUS_TYPES)
      expect(statuses).toContain('VOTING')
      expect(statuses).toContain('APPROVED')
      expect(statuses).toContain('EXECUTING')
      expect(statuses).toContain('COMPLETED')
      expect(statuses).toContain('FAILED')
      expect(statuses).toContain('DENIED')
    })
  })

  describe('action error messages', () => {
    it('should have defined error messages', () => {
      expect(ActionErrorMessages).toBeDefined()
      expect(ActionErrorMessages.ERR_WRITE_PERM_REQUIRED).toBe(
        'Invalid permissions or no action found',
      )
    })
  })

  describe('confirmation actions', () => {
    it('should have defined confirmation actions', () => {
      expect(CONFIRMATION_ACTIONS).toBeDefined()
      expect(CONFIRMATION_ACTIONS.approve).toBe('approve')
      expect(CONFIRMATION_ACTIONS.approveAll).toBe('approve all')
      expect(CONFIRMATION_ACTIONS.reject).toBe('reject')
      expect(CONFIRMATION_ACTIONS.rejectAll).toBe('reject all')
      expect(CONFIRMATION_ACTIONS.submit).toBe('submit')
      expect(CONFIRMATION_ACTIONS.discard).toBe('discard')
      expect(CONFIRMATION_ACTIONS.submitAll).toBe('submit all')
      expect(CONFIRMATION_ACTIONS.discardAll).toBe('discard all')
      expect(CONFIRMATION_ACTIONS.cancel).toBe('cancel request')
    })
  })
})
