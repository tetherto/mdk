import { describe, expect, it } from 'vitest'
import { decrement, increment, notificationSlice, reset } from '../notification-slice'

describe('notification slice', () => {
  it('should have initial state with count 0', () => {
    const state = notificationSlice.reducer(undefined, { type: 'unknown' })
    expect(state.count).toBe(0)
  })

  describe('increment action', () => {
    it('should increment count', () => {
      const initialState = { count: 0 }
      const state = notificationSlice.reducer(initialState, increment())
      expect(state.count).toBe(1)
    })

    it('should increment from existing count', () => {
      const initialState = { count: 5 }
      const state = notificationSlice.reducer(initialState, increment())
      expect(state.count).toBe(6)
    })
  })

  describe('decrement action', () => {
    it('should decrement count', () => {
      const initialState = { count: 5 }
      const state = notificationSlice.reducer(initialState, decrement())
      expect(state.count).toBe(4)
    })

    it('should not go below 0', () => {
      const initialState = { count: 0 }
      const state = notificationSlice.reducer(initialState, decrement())
      expect(state.count).toBe(0)
    })

    it('should handle decrement from 1', () => {
      const initialState = { count: 1 }
      const state = notificationSlice.reducer(initialState, decrement())
      expect(state.count).toBe(0)
    })
  })

  describe('reset action', () => {
    it('should reset count to 0', () => {
      const initialState = { count: 10 }
      const state = notificationSlice.reducer(initialState, reset())
      expect(state.count).toBe(0)
    })

    it('should reset from any count', () => {
      const initialState = { count: 999 }
      const state = notificationSlice.reducer(initialState, reset())
      expect(state.count).toBe(0)
    })
  })

  describe('slice metadata', () => {
    it('should have correct slice name', () => {
      expect(notificationSlice.name).toBe('notifications')
    })

    it('should export all actions', () => {
      expect(increment).toBeDefined()
      expect(decrement).toBeDefined()
      expect(reset).toBeDefined()
    })
  })
})
