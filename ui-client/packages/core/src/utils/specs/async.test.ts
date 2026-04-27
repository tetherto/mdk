import { describe, expect, it } from 'vitest'

import { promisify } from '../async'

describe('promisify', () => {
  it('resolves when callback succeeds', async () => {
    const nodeStyleFn = (_arg: string, callback: (err: Error | null, result?: string) => void) => {
      callback(null, 'success')
    }

    const promisified = promisify(nodeStyleFn)
    const result = await promisified('test')
    expect(result).toBe('success')
  })

  it('rejects when callback errors', async () => {
    const nodeStyleFn = (_arg: string, callback: (err: Error | null) => void) => {
      callback(new Error('test error'))
    }

    const promisified = promisify(nodeStyleFn)
    await expect(promisified('test')).rejects.toThrow('test error')
  })

  it('resolves with undefined when no result is provided', async () => {
    const nodeStyleFn = (callback: (err: Error | null) => void) => {
      callback(null)
    }

    const promisified = promisify(nodeStyleFn)
    const result = await promisified()
    expect(result).toBeUndefined()
  })
})
