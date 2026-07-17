import { type ComponentType, type ReactElement, type ReactNode, Suspense, useMemo } from 'react'
import type { SpinnerProps } from '../spinner'
import { Spinner } from '../spinner'

type LazyTabWrapperProps<T = Record<string, unknown>> = {
  /**
   * Lazy-loaded component to render
   */
  Component: ComponentType<{ data?: T }>

  /**
   * Data to pass to the component
   */
  data?: T

  /**
   * Custom fallback component while loading
   * @default <Spinner />
   */
  fallback?: ReactNode

  /**
   * Spinner type when using default fallback
   * @default 'circle'
   */
  spinnerType?: SpinnerProps['type']
}

/**
 * LazyTabWrapper - Wrapper for lazy-loaded tab components with Suspense
 *
 * Handles lazy loading with a fallback spinner while the component loads.
 * Useful for code-splitting large tab components.
 *
 * @example
 * ```tsx
 * const DetailsTab = lazy(() => import('./DetailsTab'))
 *
 * <LazyTabWrapper
 *   Component={DetailsTab}
 *   data={deviceData}
 * />
 * ```
 *
 * @example
 * // With custom fallback
 * ```tsx
 * <LazyTabWrapper
 *   Component={SettingsTab}
 *   data={settings}
 *   fallback={<CustomLoader />}
 * />
 * ```
 *
 * @example
 * // With typed data
 * ```tsx
 * interface DeviceData {
 *   id: string
 *   name: string
 * }
 *
 * <LazyTabWrapper<DeviceData>
 *   Component={DeviceTab}
 *   data={deviceData}
 * />
 * ```
 * @category layout
 * @domain generic
 * @tier agent-ready
 */
export const LazyTabWrapper = <T = Record<string, unknown>,>({
  Component,
  data,
  fallback,
  spinnerType = 'circle',
}: LazyTabWrapperProps<T>): ReactElement => {
  const defaultFallback = useMemo(() => <Spinner type={spinnerType} fullScreen />, [spinnerType])

  return (
    <Suspense fallback={fallback ?? defaultFallback}>
      <Component data={data} />
    </Suspense>
  )
}

LazyTabWrapper.displayName = 'LazyTabWrapper'
