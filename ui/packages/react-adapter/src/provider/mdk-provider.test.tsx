import { render, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MdkProvider, useMdkContext } from './mdk-provider'

describe('MdkProvider', () => {
  it('supplies the apiBaseUrl to descendants', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MdkProvider apiBaseUrl="http://api.test">{children}</MdkProvider>
    )

    const { result } = renderHook(() => useMdkContext(), { wrapper })
    expect(result.current.apiBaseUrl).toBe('http://api.test')
  })

  it('defaults apiBaseUrl to an empty string when none is provided', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MdkProvider>{children}</MdkProvider>
    )
    const { result } = renderHook(() => useMdkContext(), { wrapper })
    expect(result.current.apiBaseUrl).toBe('')
  })

  it('useMdkContext throws outside the provider', () => {
    expect(() => renderHook(() => useMdkContext())).toThrow(/MdkProvider/)
  })

  it('renders its children', () => {
    const { getByText } = render(
      <MdkProvider>
        <span>hello</span>
      </MdkProvider>,
    )
    expect(getByText('hello')).toBeTruthy()
  })
})
