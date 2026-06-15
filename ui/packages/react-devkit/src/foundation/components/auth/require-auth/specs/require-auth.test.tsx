import { authStore } from '@tetherto/mdk-ui-core'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { consumeLastVisitedPath, RequireAuth } from '../require-auth'

const STORAGE_KEY = 'mdk:last-visited-path'

const setLocation = (pathname: string, search = '', hash = ''): void => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, pathname, search, hash },
  })
}

describe('RequireAuth', () => {
  beforeEach(() => {
    authStore.getState().reset()
    window.sessionStorage.clear()
  })

  afterEach(() => {
    authStore.getState().reset()
    window.sessionStorage.clear()
  })

  describe('rendering', () => {
    it('renders children when a token is present', () => {
      authStore.getState().setToken('tok-abc')

      render(
        <RequireAuth fallback={<span data-testid="fallback">go away</span>}>
          <span data-testid="content">welcome</span>
        </RequireAuth>,
      )

      expect(screen.getByTestId('content')).toBeInTheDocument()
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
    })

    it('renders fallback when no token is present', () => {
      render(
        <RequireAuth fallback={<span data-testid="fallback">go away</span>}>
          <span data-testid="content">welcome</span>
        </RequireAuth>,
      )

      expect(screen.getByTestId('fallback')).toBeInTheDocument()
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })
  })

  describe('rememberPath effect', () => {
    it('persists the current path when no token and rememberPath defaults true', () => {
      setLocation('/dashboard', '?tab=overview', '#frag')

      render(
        <RequireAuth fallback={<span>fb</span>}>
          <span>c</span>
        </RequireAuth>,
      )

      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('/dashboard?tab=overview#frag')
    })

    it('does not persist the path when rememberPath=false', () => {
      setLocation('/dashboard')

      render(
        <RequireAuth fallback={<span>fb</span>} rememberPath={false}>
          <span>c</span>
        </RequireAuth>,
      )

      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('does not persist the path when a token is present', () => {
      authStore.getState().setToken('tok-1')
      setLocation('/dashboard')

      render(
        <RequireAuth fallback={<span>fb</span>}>
          <span>c</span>
        </RequireAuth>,
      )

      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it("does not persist when current path equals '/signin'", () => {
      setLocation('/signin')

      render(
        <RequireAuth fallback={<span>fb</span>}>
          <span>c</span>
        </RequireAuth>,
      )

      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })
})

describe('consumeLastVisitedPath', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    window.sessionStorage.clear()
  })

  it('returns the stored value and removes it', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '/somewhere')

    expect(consumeLastVisitedPath()).toBe('/somewhere')
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(consumeLastVisitedPath()).toBeNull()
  })
})
