import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContextualModal } from '../use-contextual-modal'

describe('useContextualModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('modalOpen is false initially', () => {
      const { result } = renderHook(() => useContextualModal())
      expect(result.current.modalOpen).toBe(false)
    })

    it('subject is null initially', () => {
      const { result } = renderHook(() => useContextualModal())
      expect(result.current.subject).toBeNull()
    })

    it('returns handleOpen as a function', () => {
      const { result } = renderHook(() => useContextualModal())
      expect(typeof result.current.handleOpen).toBe('function')
    })

    it('returns handleClose as a function', () => {
      const { result } = renderHook(() => useContextualModal())
      expect(typeof result.current.handleClose).toBe('function')
    })

    it('returns setSubject as a function', () => {
      const { result } = renderHook(() => useContextualModal())
      expect(typeof result.current.setSubject).toBe('function')
    })

    it('works without params', () => {
      expect(() => renderHook(() => useContextualModal())).not.toThrow()
    })
  })

  describe('handleOpen', () => {
    it('sets modalOpen to true', () => {
      const { result } = renderHook(() => useContextualModal())
      act(() => {
        result.current.handleOpen(null)
      })
      expect(result.current.modalOpen).toBe(true)
    })

    it('sets subject when a non-null value is passed', () => {
      const { result } = renderHook(() => useContextualModal<{ id: string }>())
      act(() => {
        result.current.handleOpen({ id: 'abc' })
      })
      expect(result.current.subject).toEqual({ id: 'abc' })
    })

    it('does not update subject when null is passed', () => {
      const { result } = renderHook(() => useContextualModal<{ id: string }>())
      act(() => {
        result.current.handleOpen({ id: 'abc' })
      })
      act(() => {
        result.current.handleOpen(null)
      })
      expect(result.current.subject).toEqual({ id: 'abc' })
    })

    it('updates subject when called multiple times with different values', () => {
      const { result } = renderHook(() => useContextualModal<string>())
      act(() => {
        result.current.handleOpen('first')
      })
      act(() => {
        result.current.handleOpen('second')
      })
      expect(result.current.subject).toBe('second')
    })

    it('calls onOpen callback', () => {
      const onOpen = vi.fn()
      const { result } = renderHook(() => useContextualModal({ onOpen }))
      act(() => {
        result.current.handleOpen(null)
      })
      expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('calls onOpen even when subject is null', () => {
      const onOpen = vi.fn()
      const { result } = renderHook(() => useContextualModal({ onOpen }))
      act(() => {
        result.current.handleOpen(null)
      })
      expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('does not call onClose when opening', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() => useContextualModal({ onClose }))
      act(() => {
        result.current.handleOpen(null)
      })
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('handleClose', () => {
    it('sets modalOpen to false', () => {
      const { result } = renderHook(() => useContextualModal())
      act(() => {
        result.current.handleOpen(null)
      })
      act(() => {
        result.current.handleClose()
      })
      expect(result.current.modalOpen).toBe(false)
    })

    it('resets subject to null', () => {
      const { result } = renderHook(() => useContextualModal<string>())
      act(() => {
        result.current.handleOpen('some-subject')
      })
      act(() => {
        result.current.handleClose()
      })
      expect(result.current.subject).toBeNull()
    })

    it('calls onClose callback', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() => useContextualModal({ onClose }))
      act(() => {
        result.current.handleOpen(null)
      })
      act(() => {
        result.current.handleClose()
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onOpen when closing', () => {
      const onOpen = vi.fn()
      const { result } = renderHook(() => useContextualModal({ onOpen }))
      act(() => {
        result.current.handleOpen(null)
      })
      vi.clearAllMocks()
      act(() => {
        result.current.handleClose()
      })
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('is safe to call when modal is already closed', () => {
      const { result } = renderHook(() => useContextualModal())
      expect(() =>
        act(() => {
          result.current.handleClose()
        }),
      ).not.toThrow()
      expect(result.current.modalOpen).toBe(false)
    })
  })

  describe('setSubject', () => {
    it('updates subject directly', () => {
      const { result } = renderHook(() => useContextualModal<number>())
      act(() => {
        result.current.setSubject(42)
      })
      expect(result.current.subject).toBe(42)
    })

    it('can set subject to null', () => {
      const { result } = renderHook(() => useContextualModal<number>())
      act(() => {
        result.current.setSubject(42)
      })
      act(() => {
        result.current.setSubject(null)
      })
      expect(result.current.subject).toBeNull()
    })

    it('does not affect modalOpen', () => {
      const { result } = renderHook(() => useContextualModal<number>())
      act(() => {
        result.current.setSubject(42)
      })
      expect(result.current.modalOpen).toBe(false)
    })
  })

  describe('open → close cycle', () => {
    it('restores initial state after a full open/close cycle', () => {
      const { result } = renderHook(() => useContextualModal<string>())
      act(() => {
        result.current.handleOpen('test')
      })
      act(() => {
        result.current.handleClose()
      })
      expect(result.current.modalOpen).toBe(false)
      expect(result.current.subject).toBeNull()
    })

    it('can be opened again after closing', () => {
      const { result } = renderHook(() => useContextualModal<string>())
      act(() => {
        result.current.handleOpen('first')
      })
      act(() => {
        result.current.handleClose()
      })
      act(() => {
        result.current.handleOpen('second')
      })
      expect(result.current.modalOpen).toBe(true)
      expect(result.current.subject).toBe('second')
    })

    it('onOpen and onClose are each called once per cycle', () => {
      const onOpen = vi.fn()
      const onClose = vi.fn()
      const { result } = renderHook(() => useContextualModal({ onOpen, onClose }))
      act(() => {
        result.current.handleOpen(null)
      })
      act(() => {
        result.current.handleClose()
      })
      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('generic type', () => {
    it('works with object subject type', () => {
      const { result } = renderHook(() => useContextualModal<{ name: string; age: number }>())
      act(() => {
        result.current.handleOpen({ name: 'Alice', age: 30 })
      })
      expect(result.current.subject).toEqual({ name: 'Alice', age: 30 })
    })

    it('works with primitive subject type', () => {
      const { result } = renderHook(() => useContextualModal<number>())
      act(() => {
        result.current.handleOpen(99)
      })
      expect(result.current.subject).toBe(99)
    })

    it('defaults to unknown type when no generic is provided', () => {
      const { result } = renderHook(() => useContextualModal())
      act(() => {
        result.current.handleOpen('anything')
      })
      expect(result.current.subject).toBe('anything')
    })
  })
})
