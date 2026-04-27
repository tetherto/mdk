// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearSidebarState,
  useSidebarExpandedState,
  useSidebarSectionState,
} from '../use-sidebar-state'

describe('useSidebarExpandedState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns default expanded state when no stored value', () => {
    const { result } = renderHook(() => useSidebarExpandedState(true))

    expect(result.current[0]).toBe(true)
  })

  it('returns stored expanded state when available', () => {
    localStorage.setItem('mdk-sidebar-state', JSON.stringify({ expanded: false }))

    const { result } = renderHook(() => useSidebarExpandedState(true))

    expect(result.current[0]).toBe(false)
  })

  it('updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useSidebarExpandedState(false))

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem('mdk-sidebar-state')).toBe(JSON.stringify({ expanded: true }))
  })

  it('handles localStorage read errors gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('mdk-sidebar-state', 'invalid-json')

    const { result } = renderHook(() => useSidebarExpandedState(true))

    expect(result.current[0]).toBe(true)
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('handles localStorage write errors gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result } = renderHook(() => useSidebarExpandedState(false))

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)
    expect(consoleWarnSpy).toHaveBeenCalled()

    setItemSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })
})

describe('useSidebarSectionState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns default open state when no stored value', () => {
    const { result } = renderHook(() => useSidebarSectionState('section-1', true))

    expect(result.current[0]).toBe(true)
  })

  it('returns stored section state when available', () => {
    localStorage.setItem('mdk-sidebar-sections', JSON.stringify({ 'section-1': false }))

    const { result } = renderHook(() => useSidebarSectionState('section-1', true))

    expect(result.current[0]).toBe(false)
  })

  it('updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useSidebarSectionState('section-1', false))

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)

    const stored = JSON.parse(localStorage.getItem('mdk-sidebar-sections') || '{}')
    expect(stored['section-1']).toBe(true)
  })

  it('persists multiple section states independently', () => {
    const { result: result1 } = renderHook(() => useSidebarSectionState('section-1', false))
    const { result: result2 } = renderHook(() => useSidebarSectionState('section-2', false))

    act(() => {
      result1.current[1](true)
    })

    act(() => {
      result2.current[1](false)
    })

    const stored = JSON.parse(localStorage.getItem('mdk-sidebar-sections') || '{}')
    expect(stored['section-1']).toBe(true)
    expect(stored['section-2']).toBe(false)
  })

  it('handles localStorage read errors gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('mdk-sidebar-sections', 'invalid-json')

    const { result } = renderHook(() => useSidebarSectionState('section-1', true))

    expect(result.current[0]).toBe(true)
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('handles localStorage write errors gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result } = renderHook(() => useSidebarSectionState('section-1', false))

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)
    expect(consoleWarnSpy).toHaveBeenCalled()

    setItemSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  it('returns default when section not in stored state', () => {
    localStorage.setItem('mdk-sidebar-sections', JSON.stringify({ 'section-1': false }))

    const { result } = renderHook(() => useSidebarSectionState('section-2', true))

    expect(result.current[0]).toBe(true)
  })
})

describe('clearSidebarState', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('mdk-sidebar-state', JSON.stringify({ expanded: true }))
    localStorage.setItem('mdk-sidebar-sections', JSON.stringify({ 'section-1': true }))
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('removes sidebar state from localStorage', () => {
    clearSidebarState()

    expect(localStorage.getItem('mdk-sidebar-state')).toBe(null)
    expect(localStorage.getItem('mdk-sidebar-sections')).toBe(null)
  })

  it('handles localStorage errors gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('localStorage disabled')
    })

    expect(() => clearSidebarState()).not.toThrow()
    expect(consoleWarnSpy).toHaveBeenCalled()

    removeItemSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })
})
