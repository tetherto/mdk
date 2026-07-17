import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPosHistory } from '../position-change-dialog-utils'

const FROZEN_NOW = 1_700_000_000_000

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(FROZEN_NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const existingHistory = [
  { container: 'CON-OLD-01', pos: 'A1', removedAt: 1_699_000_000_000 },
  { container: 'CON-OLD-02', pos: 'B2', removedAt: 1_698_000_000_000 },
]

const baseSocket = {
  containerInfo: { container: 'CON-BBR-01' },
  pos: 'C3',
  pdu: 'PDU-01',
  socket: 'S1',
  miner: {
    info: { posHistory: existingHistory },
  },
}

describe('getPosHistory', () => {
  describe('new entry construction', () => {
    it('sets container from containerInfo.container', () => {
      const result = getPosHistory(baseSocket)
      expect(result[0].container).toBe('CON-BBR-01')
    })

    it('sets removedAt to Date.now()', () => {
      const result = getPosHistory(baseSocket)
      expect(result[0].removedAt).toBe(FROZEN_NOW)
    })

    it('uses pos field when present', () => {
      const result = getPosHistory(baseSocket)
      expect(result[0].pos).toBe('C3')
    })

    it('falls back to pdu_socket format when pos is absent', () => {
      const { pos: _omitted, ...socketWithoutPos } = baseSocket
      const result = getPosHistory(socketWithoutPos)
      expect(result[0].pos).toBe('PDU-01_S1')
    })

    it('falls back to pdu_socket format when pos is an empty string', () => {
      const result = getPosHistory({ ...baseSocket, pos: '' })
      expect(result[0].pos).toBe('PDU-01_S1')
    })

    it('uses empty string for container when containerInfo is absent', () => {
      const { containerInfo: _omitted, ...socketWithoutContainer } = baseSocket
      const result = getPosHistory(socketWithoutContainer)
      expect(result[0].container).toBe('')
    })

    it('uses empty string for container when containerInfo.container is falsy', () => {
      const result = getPosHistory({ ...baseSocket, containerInfo: { container: '' } })
      expect(result[0].container).toBe('')
    })
  })

  describe('prepend to existing history', () => {
    it('prepends the new entry to the front of existing posHistory', () => {
      const result = getPosHistory(baseSocket)
      expect(result[0].container).toBe('CON-BBR-01')
      expect(result[1]).toEqual(existingHistory[0])
      expect(result[2]).toEqual(existingHistory[1])
    })

    it('returns total length of existing history + 1', () => {
      const result = getPosHistory(baseSocket)
      expect(result).toHaveLength(existingHistory.length + 1)
    })

    it('does not mutate the original posHistory array', () => {
      const original = [...existingHistory]
      getPosHistory(baseSocket)
      expect(existingHistory).toEqual(original)
    })
  })

  describe('no existing history', () => {
    it('returns array with only the new entry when posHistory is absent', () => {
      const socket = { ...baseSocket, miner: { info: {} } }
      const result = getPosHistory(socket)
      expect(result).toHaveLength(1)
      expect(result[0].container).toBe('CON-BBR-01')
    })

    it('returns array with only the new entry when miner is absent', () => {
      const { miner: _omitted, ...socketWithoutMiner } = baseSocket
      const result = getPosHistory(socketWithoutMiner)
      expect(result).toHaveLength(1)
    })

    it('returns array with only the new entry when posHistory is not an array', () => {
      const socket = { ...baseSocket, miner: { info: { posHistory: 'invalid' } } }
      const result = getPosHistory(socket)
      expect(result).toHaveLength(1)
    })

    it('returns array with only the new entry when posHistory is null', () => {
      const socket = { ...baseSocket, miner: { info: { posHistory: null } } }
      const result = getPosHistory(socket)
      expect(result).toHaveLength(1)
    })

    it('returns array with only the new entry when posHistory is an empty array', () => {
      const socket = { ...baseSocket, miner: { info: { posHistory: [] } } }
      const result = getPosHistory(socket)
      expect(result).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    it('handles completely empty socket object', () => {
      const result = getPosHistory({})
      expect(result).toHaveLength(1)
      expect(result[0].container).toBe('')
      expect(result[0].pos).toBe('undefined_undefined')
      expect(result[0].removedAt).toBe(FROZEN_NOW)
    })

    it('returns a new array reference each call', () => {
      const a = getPosHistory(baseSocket)
      const b = getPosHistory(baseSocket)
      expect(a).not.toBe(b)
    })
  })
})
