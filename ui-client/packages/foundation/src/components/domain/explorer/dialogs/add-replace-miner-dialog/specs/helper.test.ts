import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTION_TYPES } from '../../../../../../constants/actions'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../../constants/dialog'
import { MINER_STATUSES } from '../../../../../../constants/miner-constants'
import { getExistedActions } from '../../../../../../utils/action-utils'
import { buildAddReplaceMinerParams, getTitle, isActionExists, isValidMacAddress } from '../helper'

vi.mock('../../../../../../utils/action-utils', () => ({
  getExistedActions: vi.fn(),
}))

vi.mock('../../../../../../utils/container-utils', () => ({
  getContainerName: vi.fn((id) => `Container-${id}`),
}))

describe('Miner Position Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTitle', () => {
    it('returns maintenance title when isDirectToMaintenanceMode is true', () => {
      const result = getTitle({ isDirectToMaintenanceMode: true })
      expect(result).toBe('Register miner directly in maintenance mode')
    })

    it('returns change info title when flow is CHANGE_INFO', () => {
      const result = getTitle({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO })
      expect(result).toBe('Change Miner info')
    })

    it('returns formatted socket title for standard flow', () => {
      const selectedEditSocket = {
        pdu: 'PDU1',
        socket: '05',
        containerInfo: { container: 'C1' },
      }
      const result = getTitle({ selectedEditSocket })
      expect(result).toBe('Add miner to socket: Container-C1 PDU1_05')
    })

    it('returns empty string if no socket info provided', () => {
      expect(getTitle({})).toBe('')
    })
  })

  describe('isActionExists', () => {
    it('returns false if pendingSubmissions is empty', () => {
      expect(isActionExists({ pendingSubmissions: [] })).toBe(false)
    })

    it('returns true if a match is found by macAddress', () => {
      const mockAction = {
        action: 'addMiner',
        params: [{ info: { macAddress: 'AA:BB:CC:DD:EE:FF' } }],
      }

      vi.mocked(getExistedActions).mockReturnValue([mockAction])

      const result = isActionExists({
        pendingSubmissions: [{}],
        macAddress: 'AA:BB:CC:DD:EE:FF',
      })
      expect(result).toBe(true)
    })

    it('returns true if a match is found by serialNumber', () => {
      const mockAction = {
        action: 'addMiner',
        params: [{ info: { serialNum: 'SN123' } }],
      }
      vi.mocked(getExistedActions).mockReturnValue([mockAction])

      const result = isActionExists({
        pendingSubmissions: [{}],
        serialNumber: 'SN123',
      })
      expect(result).toBe(true)
    })
  })

  describe('buildAddReplaceMinerParams', () => {
    const defaultInput = {
      serialNumber: 'SN_TEST',
      macAddress: 'AA:BB',
      selectedEditSocket: {
        pdu: 'P1',
        socket: 'S1',
        containerInfo: { container: 'CONT_A', subnet: '10.0.0.1' },
      },
    }

    it('builds params correctly for maintenance mode', () => {
      const result = buildAddReplaceMinerParams({
        ...defaultInput,
        isDirectToMaintenanceMode: true,
        currentSite: 'Site_1',
      })

      expect(result[0].info).toMatchObject({
        container: ACTION_TYPES.MAINTENANCE,
        status: MINER_STATUSES.ON_HOLD,
        site: 'Site_1',
      })
    })

    it('builds params correctly for Change Info flow', () => {
      const input = {
        ...defaultInput,
        isChangeInfo: true,
        selectedEditSocket: {
          ...defaultInput.selectedEditSocket,
          miner: { id: 'MINER_ID_123' },
        },
        tags: ['tag1', ''], // includes empty string to test filtering
      }

      const result = buildAddReplaceMinerParams(input)
      expect(result[0].id).toBe('MINER_ID_123')
      expect(result[0].tags).toEqual(['tag1'])
    })

    it('includes credentials and IP address in opts when provided', () => {
      const result = buildAddReplaceMinerParams({
        ...defaultInput,
        username: 'admin',
        password: 'password123',
        isStaticIpAssignment: true,
        forceSetIp: true,
        minerIp: '192.168.1.50',
      })

      expect(result[0].opts).toEqual({
        username: 'admin',
        password: 'password123',
        forceSetIp: true,
        address: '192.168.1.50',
      })
    })

    it('generates correct tags for Add/Replace flow', () => {
      const result = buildAddReplaceMinerParams({
        ...defaultInput,
        tags: ['custom-tag'],
      })

      expect(result[0].tags).toContain('custom-tag')
      expect(result[0].tags).toContain('pos-P1_S1')
      expect(result[0].tags).toContain('container-CONT_A')
    })
  })

  describe('isValidMacAddress', () => {
    it('returns true for empty/undefined input', () => {
      expect(isValidMacAddress('')).toBe(true)
      expect(isValidMacAddress(undefined)).toBe(true)
    })

    it('validates correct MAC formats', () => {
      expect(isValidMacAddress('00:1A:2B:3C:4D:5E')).toBe(true)
      expect(isValidMacAddress('00-1a-2b-3c-4d-5e')).toBe(true)
    })

    it('invalidates incorrect MAC formats', () => {
      expect(isValidMacAddress('00:1A:2B')).toBe(false)
      expect(isValidMacAddress('GG:HH:II:JJ:KK:LL')).toBe(false)
      expect(isValidMacAddress('001A2B3C4D5E')).toBe(false) // Missing separators
    })
  })
})
