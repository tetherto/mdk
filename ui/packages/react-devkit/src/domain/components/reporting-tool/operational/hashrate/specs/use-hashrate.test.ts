import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { HashrateGroupedLog } from '../hashrate.types'
import { useHashrate } from '../use-hashrate'

const sampleLog: HashrateGroupedLog = [
  { ts: 1701388800000, hashrateMhs: { 'miner-am-s19xp': 5_000_000 } },
]

describe('useHashrate', () => {
  it('returns undefined log, isLoading=false, error=null when no query is supplied', () => {
    const { result } = renderHook(() => useHashrate())
    expect(result.current.log).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('passes through log from query.data', () => {
    const { result } = renderHook(() =>
      useHashrate({ query: { data: { log: sampleLog }, isLoading: false } }),
    )
    expect(result.current.log).toBe(sampleLog)
  })

  it('propagates loading and error state from the query', () => {
    const err = new Error('boom')
    const { result } = renderHook(() => useHashrate({ query: { isLoading: true, error: err } }))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBe(err)
    expect(result.current.log).toBeUndefined()
  })
})
