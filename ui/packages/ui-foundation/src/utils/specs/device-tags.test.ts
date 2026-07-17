import { describe, expect, it } from 'vitest'
import {
  appendContainerToTag,
  appendIdToTag,
  appendIdToTags,
  isAntminer,
  isAvalon,
  isContainer,
  isMiner,
  isWhatsminer,
  removeContainerPrefix,
} from '../device-tags'

describe('device-tags', () => {
  describe('isMiner', () => {
    it('returns true for "miner-…" type', () => {
      expect(isMiner('miner-s19')).toBe(true)
      expect(isMiner('miner-')).toBe(true)
    })
    it('returns false for non-miner types', () => {
      expect(isMiner('container-s19')).toBe(false)
      expect(isMiner('powermeter')).toBe(false)
    })
    it('returns false for undefined or wrong-case', () => {
      expect(isMiner(undefined)).toBe(false)
      expect(isMiner('MINER-s19')).toBe(false)
    })
  })

  describe('isContainer', () => {
    it('returns true for "container-…" type', () => {
      expect(isContainer('container-s19')).toBe(true)
      expect(isContainer('container-')).toBe(true)
    })
    it('returns false for non-container types', () => {
      expect(isContainer('miner-s19')).toBe(false)
    })
    it('returns false for undefined or wrong-case', () => {
      expect(isContainer(undefined)).toBe(false)
      expect(isContainer('CONTAINER-s19')).toBe(false)
    })
  })

  describe('isAvalon', () => {
    it('returns true when a miner type contains the avalon code', () => {
      expect(isAvalon('miner-av')).toBe(true)
      expect(isAvalon('miner-av-a1346')).toBe(true)
    })
    it('returns false for non-avalon miners', () => {
      expect(isAvalon('miner-wm')).toBe(false)
      expect(isAvalon('miner-am')).toBe(false)
    })
    it('returns false outside the miner namespace or undefined', () => {
      expect(isAvalon('container-av')).toBe(false)
      expect(isAvalon(undefined)).toBe(false)
    })
  })

  describe('isWhatsminer', () => {
    it('returns true when a miner type contains the whatsminer code', () => {
      expect(isWhatsminer('miner-wm')).toBe(true)
      expect(isWhatsminer('miner-wm-m63')).toBe(true)
    })
    it('returns false for non-whatsminer miners', () => {
      expect(isWhatsminer('miner-av')).toBe(false)
      expect(isWhatsminer('miner-am')).toBe(false)
    })
    it('returns false outside the miner namespace or undefined', () => {
      expect(isWhatsminer(undefined)).toBe(false)
    })
  })

  describe('isAntminer', () => {
    it('returns true when a miner type contains the antminer code', () => {
      expect(isAntminer('miner-am')).toBe(true)
      expect(isAntminer('miner-am-s21')).toBe(true)
    })
    it('returns false for non-antminer miners', () => {
      expect(isAntminer('miner-wm')).toBe(false)
    })
    it('returns false outside the miner namespace or undefined', () => {
      expect(isAntminer(undefined)).toBe(false)
    })
  })

  describe('removeContainerPrefix', () => {
    it('strips a leading "container-"', () => {
      expect(removeContainerPrefix('container-bd-d40')).toBe('bd-d40')
    })
    it('returns the original string when no prefix is present', () => {
      expect(removeContainerPrefix('bd-d40')).toBe('bd-d40')
      expect(removeContainerPrefix('')).toBe('')
    })
    it('only strips the leading occurrence', () => {
      expect(removeContainerPrefix('container-container-x')).toBe('container-x')
    })
  })

  describe('appendContainerToTag', () => {
    it('prefixes the id with "container-"', () => {
      expect(appendContainerToTag('C1')).toBe('container-C1')
      expect(appendContainerToTag('bd-01')).toBe('container-bd-01')
    })
    it('still prefixes an empty id', () => {
      expect(appendContainerToTag('')).toBe('container-')
    })
  })

  describe('appendIdToTag', () => {
    it('prefixes the device id with "id-"', () => {
      expect(appendIdToTag('abc123')).toBe('id-abc123')
      expect(appendIdToTag('42')).toBe('id-42')
    })
    it('handles compound device ids', () => {
      expect(appendIdToTag('site-row-rack')).toBe('id-site-row-rack')
      expect(appendIdToTag('device:001')).toBe('id-device:001')
    })
    it('still prefixes an empty id', () => {
      expect(appendIdToTag('')).toBe('id-')
    })
  })

  describe('appendIdToTags', () => {
    it('maps each id with appendIdToTag', () => {
      expect(appendIdToTags(['a', 'b', 'c'])).toEqual(['id-a', 'id-b', 'id-c'])
    })
    it('returns an empty array for empty input', () => {
      expect(appendIdToTags([])).toEqual([])
    })
    it('preserves order', () => {
      expect(appendIdToTags(['z', 'a', 'm'])).toEqual(['id-z', 'id-a', 'id-m'])
    })
    it('is consistent with appendIdToTag applied individually', () => {
      const ids = ['x', 'y', 'z']
      const result = appendIdToTags(ids)
      ids.forEach((id, i) => {
        expect(result[i]).toBe(appendIdToTag(id))
      })
    })
  })
})
