import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useFormReset } from '../form-hooks'

describe('useFormReset', () => {
  it('returns resetForm function and isDirty state', () => {
    const mockForm = {
      reset: vi.fn(),
      formState: { isDirty: false },
    } as any

    const { result } = renderHook(() => useFormReset({ form: mockForm }))

    expect(result.current.resetForm).toBeDefined()
    expect(typeof result.current.resetForm).toBe('function')
    expect(result.current.isDirty).toBe(false)
  })

  it('calls form.reset when resetForm is invoked', () => {
    const mockForm = {
      reset: vi.fn(),
      formState: { isDirty: true },
    } as any

    const { result } = renderHook(() => useFormReset({ form: mockForm }))

    result.current.resetForm()

    expect(mockForm.reset).toHaveBeenCalledTimes(1)
  })

  it('calls onBeforeReset callback before reset', () => {
    const mockForm = {
      reset: vi.fn(),
      formState: { isDirty: true },
    } as any
    const onBeforeReset = vi.fn()

    const { result } = renderHook(() =>
      useFormReset({
        form: mockForm,
        onBeforeReset,
      }),
    )

    result.current.resetForm()

    expect(onBeforeReset).toHaveBeenCalledTimes(1)
    expect(onBeforeReset).toHaveBeenCalledBefore(mockForm.reset)
  })

  it('calls onAfterReset callback after reset', () => {
    const mockForm = {
      reset: vi.fn(),
      formState: { isDirty: true },
    } as any
    const onAfterReset = vi.fn()

    const { result } = renderHook(() =>
      useFormReset({
        form: mockForm,
        onAfterReset,
      }),
    )

    result.current.resetForm()

    expect(onAfterReset).toHaveBeenCalledTimes(1)
  })

  it('calls callbacks in correct order', () => {
    const callOrder: string[] = []

    const mockForm = {
      reset: vi.fn(() => callOrder.push('reset')),
      formState: { isDirty: true },
    } as any

    const onBeforeReset = vi.fn(() => callOrder.push('before'))
    const onAfterReset = vi.fn(() => callOrder.push('after'))

    const { result } = renderHook(() =>
      useFormReset({
        form: mockForm,
        onBeforeReset,
        onAfterReset,
      }),
    )

    result.current.resetForm()

    expect(callOrder).toEqual(['before', 'reset', 'after'])
  })

  it('reflects form.formState.isDirty', () => {
    const mockForm = {
      reset: vi.fn(),
      formState: { isDirty: true },
    } as any

    const { result } = renderHook(() => useFormReset({ form: mockForm }))

    expect(result.current.isDirty).toBe(true)
  })

  it('works without callbacks', () => {
    const mockForm = {
      reset: vi.fn(),
      formState: { isDirty: false },
    } as any

    const { result } = renderHook(() => useFormReset({ form: mockForm }))

    expect(() => result.current.resetForm()).not.toThrow()
    expect(mockForm.reset).toHaveBeenCalledTimes(1)
  })
})
