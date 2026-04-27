import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MINER_TYPE } from '../../constants/device-constants'
import { isAntminer, isAvalon, isWhatsminer } from '../device-utils'

import type { Device } from '../../types'
import { isAntminerContainer, isAvalonContainer, isWhatsminerContainer } from '../container-utils'
import { getDeviceModel } from '../power-mode-utils'

vi.mock('../device-utils', () => ({
  isAntminer: vi.fn(),
  isAvalon: vi.fn(),
  isWhatsminer: vi.fn(),
}))

vi.mock('../container-utils', () => ({
  isAntminerContainer: vi.fn(),
  isAvalonContainer: vi.fn(),
  isWhatsminerContainer: vi.fn(),
}))

describe('power mode utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns "other" when device is undefined', () => {
    expect(getDeviceModel(undefined)).toBe('other')
  })

  it('returns "other" when device type is missing', () => {
    expect(getDeviceModel({} as unknown as Device)).toBe('other')
  })

  it('returns AVALON when isAvalon is true', () => {
    vi.mocked(isAvalon).mockReturnValue(true)

    const result = getDeviceModel({
      type: 'avalon-device',
      id: '',
    })

    expect(result).toBe(MINER_TYPE.AVALON)
  })

  it('returns AVALON when isAvalonContainer is true', () => {
    vi.mocked(isAvalonContainer).mockReturnValue(true)

    const result = getDeviceModel({
      type: 'avalon-container',
      id: '',
    })

    expect(result).toBe(MINER_TYPE.AVALON)
  })

  it('returns WHATSMINER when isWhatsminer is true', () => {
    vi.mocked(isWhatsminer).mockReturnValue(true)

    const result = getDeviceModel({
      type: 'whatsminer-device',
      id: '',
    })

    expect(result).toBe(MINER_TYPE.WHATSMINER)
  })

  it('returns WHATSMINER when isWhatsminerContainer is true', () => {
    vi.mocked(isWhatsminerContainer).mockReturnValue(true)

    const result = getDeviceModel({
      type: 'whatsminer-container',
      id: '',
    })

    expect(result).toBe(MINER_TYPE.WHATSMINER)
  })

  it('returns ANTMINER when isAntminer is true', () => {
    vi.mocked(isAntminer).mockReturnValue(true)

    const result = getDeviceModel({
      type: 'antminer-device',
      id: '',
    })

    expect(result).toBe(MINER_TYPE.ANTMINER)
  })

  it('returns ANTMINER when isAntminerContainer is true', () => {
    vi.mocked(isAntminerContainer).mockReturnValue(true)

    const result = getDeviceModel({
      type: 'antminer-container',
      id: '',
    })

    expect(result).toBe(MINER_TYPE.ANTMINER)
  })

  it('returns "other" when no matchers return true', () => {
    const result = getDeviceModel({
      type: 'unknown-device',
      id: '',
    })

    expect(result).toBe('other')
  })

  it('respects priority order (first match wins)', () => {
    vi.mocked(isAvalon).mockReturnValue(true)
    vi.mocked(isWhatsminer).mockReturnValue(true)

    const result = getDeviceModel({
      type: 'multi-match',
      id: '',
    })

    expect(result).toBe(MINER_TYPE.AVALON)
  })
})
