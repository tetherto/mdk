import { useEffect, useState } from 'react'

/**
 * Window size dimensions
 */
export type WindowSize = {
  /** Current window width in pixels */
  windowWidth: number
  /** Current window height in pixels */
  windowHeight: number
}

/**
 * Hook to track window size changes
 *
 * Provides current window dimensions and updates on resize.
 * Optimized to prevent unnecessary re-renders by comparing previous values.
 *
 * @returns Object containing current window width and height
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const { windowWidth, windowHeight } = useWindowSize()
 *
 *   return (
 *     <div>
 *       <p>Width: {windowWidth}px</p>
 *       <p>Height: {windowHeight}px</p>
 *       {windowWidth < 768 && <MobileNav />}
 *       {windowWidth >= 768 && <DesktopNav />}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Responsive layout
 * function Layout() {
 *   const { windowWidth } = useWindowSize()
 *   const isMobile = windowWidth < 768
 *   const isTablet = windowWidth >= 768 && windowWidth < 1024
 *   const isDesktop = windowWidth >= 1024
 *
 *   return (
 *     <div>
 *       {isMobile && <MobileLayout />}
 *       {isTablet && <TabletLayout />}
 *       {isDesktop && <DesktopLayout />}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Conditional rendering based on viewport
 * function Gallery() {
 *   const { windowWidth } = useWindowSize()
 *   const columns = windowWidth < 640 ? 1 : windowWidth < 1024 ? 2 : 3
 *
 *   return <ImageGrid columns={columns} />
 * }
 * ```
 */
export const useWindowSize = (): WindowSize => {
  const [size, setSize] = useState<WindowSize>(() => ({
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  }))

  useEffect(() => {
    // Handle SSR - exit early if window is not available
    if (typeof window === 'undefined') return

    const handleResize = (): void => {
      const { innerWidth: nextWidth, innerHeight: nextHeight } = window

      // Only update if dimensions actually changed (prevent unnecessary re-renders)
      setSize((prev) =>
        prev.windowWidth === nextWidth && prev.windowHeight === nextHeight
          ? prev
          : { windowWidth: nextWidth, windowHeight: nextHeight },
      )
    }

    // Add resize listener
    window.addEventListener('resize', handleResize)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return size
}

export default useWindowSize
