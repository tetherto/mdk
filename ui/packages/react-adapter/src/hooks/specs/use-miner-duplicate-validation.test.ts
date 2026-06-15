import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMinerDuplicateValidation } from '../use-miner-duplicate-validation'

describe('useMinerDuplicateValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with default states', () => {
    const { result } = renderHook(() => useMinerDuplicateValidation())

    expect(result.current.duplicateError).toBe(false)
    expect(result.current.isDuplicateCheckLoading).toBe(false)
  })

  it('should detect a duplicate MAC address', async () => {
    const { result } = renderHook(() => useMinerDuplicateValidation())

    let checkPromise: Promise<boolean>

    act(() => {
      // Searching for a MAC that exists in MOCK_MINERS_DB
      checkPromise = result.current.checkDuplicate(null, {
        macAddress: 'AA:BB:CC:DD:EE:FF',
      })
    })

    // Verify loading state is active immediately
    expect(result.current.isDuplicateCheckLoading).toBe(true)

    // Fast-forward the 600ms timeout
    await act(async () => {
      vi.runAllTimers()
    })

    const isDuplicate = await checkPromise!
    expect(isDuplicate).toBe(true)
    expect(result.current.duplicateError).toBe(true)
    expect(result.current.isDuplicateCheckLoading).toBe(false)
  })

  it('should return false if we are editing the same miner (ID match)', async () => {
    const { result } = renderHook(() => useMinerDuplicateValidation())

    const editingSocket = { miner: { id: 'miner-1' } }
    const validationData = { macAddress: 'AA:BB:CC:DD:EE:FF' } // This MAC belongs to miner-1

    let checkPromise: Promise<boolean>

    act(() => {
      checkPromise = result.current.checkDuplicate(editingSocket, validationData)
    })

    await act(async () => {
      vi.runAllTimers()
    })

    const isDuplicate = await checkPromise!
    expect(isDuplicate).toBe(false)
    expect(result.current.duplicateError).toBe(false)
  })

  it('should detect duplicate by serial number regardless of other fields', async () => {
    const { result } = renderHook(() => useMinerDuplicateValidation())

    let checkPromise: Promise<boolean>

    act(() => {
      checkPromise = result.current.checkDuplicate(null, {
        serialNumber: 'SN67890',
      })
    })

    await act(async () => {
      vi.runAllTimers()
    })

    const isDuplicate = await checkPromise!
    expect(isDuplicate).toBe(true)
  })

  it('should return false for totally new data', async () => {
    const { result } = renderHook(() => useMinerDuplicateValidation())

    let checkPromise: Promise<boolean>

    act(() => {
      checkPromise = result.current.checkDuplicate(null, {
        macAddress: '00:00:00:00:00:00',
        serialNumber: 'NEW-SN',
        address: '1.1.1.1',
        code: 'NEW-CODE',
      })
    })

    await act(async () => {
      vi.runAllTimers()
    })

    const isDuplicate = await checkPromise!
    expect(isDuplicate).toBe(false)
    expect(result.current.duplicateError).toBe(false)
  })

  it('should reset duplicateError via setDuplicateError', () => {
    const { result } = renderHook(() => useMinerDuplicateValidation())

    act(() => {
      result.current.setDuplicateError(true)
    })
    expect(result.current.duplicateError).toBe(true)

    act(() => {
      result.current.setDuplicateError(false)
    })
    expect(result.current.duplicateError).toBe(false)
  })
})
