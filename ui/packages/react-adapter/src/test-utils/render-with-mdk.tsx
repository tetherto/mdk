import type { ReactNode } from 'react'
import { MdkProvider } from '../provider/mdk-provider'

export type RenderWithMdkOptions = {
  apiBaseUrl?: string
}

/**
 * Returns a wrapper component for `@testing-library/react`'s `render`'s
 * `wrapper` option.
 */
export const createMdkWrapper = (options: RenderWithMdkOptions = {}) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MdkProvider apiBaseUrl={options.apiBaseUrl}>{children}</MdkProvider>
  )
  return { Wrapper }
}
