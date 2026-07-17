import { describe, expect, it, vi } from 'vitest'

import { isEnterOrSpaceKey, runOnEnterOrSpace } from '../keyboard-activation'

describe('isEnterOrSpaceKey', () => {
  it.each([
    ['Enter', true],
    [' ', true],
    ['Space', false],
    ['Escape', false],
    ['Tab', false],
    ['a', false],
  ] as const)('returns %s → %s', (key, expected) => {
    expect(isEnterOrSpaceKey(key)).toBe(expected)
  })
})

describe('runOnEnterOrSpace', () => {
  const activationEvent = (key: string) => ({
    key,
    preventDefault: vi.fn(),
  })

  it('runs the action and prevents default on Enter', () => {
    const action = vi.fn()
    const event = activationEvent('Enter')
    runOnEnterOrSpace(event, action)
    expect(action).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('runs the action and prevents default on Space', () => {
    const action = vi.fn()
    const event = activationEvent(' ')
    runOnEnterOrSpace(event, action)
    expect(action).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('ignores other keys', () => {
    const action = vi.fn()
    const event = activationEvent('ArrowDown')
    runOnEnterOrSpace(event, action)
    expect(action).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
