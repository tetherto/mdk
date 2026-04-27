import { useMemo } from 'react'

import { useWindowSize } from './use-windows-size'

/**
 * Standard device breakpoints in pixels
 */
export const BREAKPOINTS = {
  /** Maximum width for mobile devices (0-767px) */
  MOBILE_MAX: 767,
  /** Maximum width for tablet devices (768-991px) */
  TABLET_MAX: 991,
  /** Minimum width for desktop devices (992px+) */
  DESKTOP_MIN: 992,
} as const

/**
 * Device resolution detection result
 */
export type DeviceResolution = {
  /** True if viewport width is mobile (≤767px) */
  isMobile: boolean
  /** True if viewport width is tablet (768-991px) */
  isTablet: boolean
  /** True if viewport width is desktop (≥992px) */
  isDesktop: boolean
  /** Current viewport width in pixels */
  width: number
}

/**
 * Hook to detect current device resolution/viewport size
 *
 * Provides boolean flags for mobile, tablet, and desktop viewports
 * based on standard breakpoints. Updates automatically on resize.
 *
 * Breakpoints:
 * - Mobile: 0-767px
 * - Tablet: 768-991px
 * - Desktop: 992px+
 *
 * @returns Object with device type flags and current width
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const { isMobile, isTablet, isDesktop } = useDeviceResolution()
 *
 *   return (
 *     <div>
 *       {isMobile && <MobileView />}
 *       {isTablet && <TabletView />}
 *       {isDesktop && <DesktopView />}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Conditional rendering
 * function Navigation() {
 *   const { isMobile } = useDeviceResolution()
 *
 *   return isMobile ? <MobileMenu /> : <DesktopMenu />
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Multiple conditions
 * function Layout() {
 *   const { isMobile, isTablet, isDesktop, width } = useDeviceResolution()
 *
 *   return (
 *     <div>
 *       <p>Current width: {width}px</p>
 *       {(isMobile || isTablet) && <CompactHeader />}
 *       {isDesktop && <FullHeader />}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom logic
 * function Gallery() {
 *   const { isMobile, isTablet } = useDeviceResolution()
 *
 *   const columns = isMobile ? 1 : isTablet ? 2 : 4
 *   const spacing = isMobile ? 'sm' : 'md'
 *
 *   return <ImageGrid columns={columns} spacing={spacing} />
 * }
 * ```
 */
export const useDeviceResolution = (): DeviceResolution => {
  const { windowWidth } = useWindowSize()

  return useMemo(() => {
    const isMobile = windowWidth <= BREAKPOINTS.MOBILE_MAX
    const isTablet = windowWidth > BREAKPOINTS.MOBILE_MAX && windowWidth <= BREAKPOINTS.TABLET_MAX
    const isDesktop = windowWidth >= BREAKPOINTS.DESKTOP_MIN

    return {
      isMobile,
      isTablet,
      isDesktop,
      width: windowWidth,
    }
  }, [windowWidth])
}

export default useDeviceResolution
