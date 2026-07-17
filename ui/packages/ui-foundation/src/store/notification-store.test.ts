import { describe, expect, it } from 'vitest'
import { createNotificationStore } from './notification-store'

describe('notificationStore', () => {
  it('increments and decrements', () => {
    const store = createNotificationStore()
    store.getState().increment()
    store.getState().increment()
    expect(store.getState().count).toBe(2)
    store.getState().decrement()
    expect(store.getState().count).toBe(1)
  })

  it('clamps decrement at zero', () => {
    const store = createNotificationStore()
    store.getState().decrement()
    expect(store.getState().count).toBe(0)
  })

  it('reset returns to zero', () => {
    const store = createNotificationStore()
    store.getState().increment()
    store.getState().increment()
    store.getState().reset()
    expect(store.getState().count).toBe(0)
  })
})
