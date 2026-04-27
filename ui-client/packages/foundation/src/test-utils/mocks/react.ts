/* eslint-disable vars-on-top */
import type React from 'react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'

// Mock React context to prevent useContext errors
type MockContextType = {
  Provider: ({ children }: { children: ReactNode }) => ReactNode
  Consumer: ({ children }: { children: ReactNode }) => ReactNode
  _currentValue: unknown
  _currentValue2: unknown
}

const mockContext: MockContextType = {
  Provider: vi.fn(({ children }) => children),
  Consumer: vi.fn(({ children }) => children),
  _currentValue: {},
  _currentValue2: {},
}

// Mock React modules to prevent context issues - use real hooks for testing
vi.mock('react', async (importOriginal: () => Promise<typeof React>) => {
  const actual: typeof React = await importOriginal()
  return {
    ...actual,
    useMemo: actual.useMemo,
    useCallback: actual.useCallback,
    useState: actual.useState,
    useEffect: actual.useEffect,
    useRef: actual.useRef,
    useContext: actual.useContext,
    useReducer: actual.useReducer,
    useImperativeHandle: actual.useImperativeHandle,
    forwardRef: actual.forwardRef,
    memo: actual.memo,
    createElement: actual.createElement,
    Component: actual.Component,
    act: actual.act,
    version: actual.version,
    createContext: vi.fn(() => mockContext),
  }
})

// Mock react-dom
vi.mock('react-dom', () => ({
  render: vi.fn(),
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}))

// Make getPrefixCls available globally for Antd components
declare global {
  var getPrefixCls: (suffix?: string, customizePrefixCls?: string) => string
  var ConfigContext: MockContextType
}

globalThis.getPrefixCls = vi.fn(
  (suffix, customizePrefixCls) => customizePrefixCls || `ant-${suffix}`,
)
globalThis.ConfigContext = mockContext
