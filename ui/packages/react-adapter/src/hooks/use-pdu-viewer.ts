import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

const MARGIN = 50
const RECENTER_ANIMATION_DURATION = 100
const ZOOM_INCREMENT = 0.1
const MIN_ZOOM_LEVEL = 0.5
const SCROLL_DEBOUNCE_MS = 100
const RESET_TIMEOUT_MS = 250
const SHRINKAGE_VERTICAL = 0.9
const SHRINKAGE_HORIZONTAL = 0.9
const ZOOM_INCREMENT_FACTOR = 0.001

export type ViewportBoundingBox = {
  boundingRect: DOMRect
  scrollWidth: number
  scrollHeight: number
}

export type UsePduViewerReturn = {
  minZoomLevel: number
  handleZoomIn: VoidFunction
  handleZoomOut: VoidFunction
  showBackToContent: boolean
  handleBackToContent: VoidFunction
  showViewerControls: boolean
  checkShowBackToContent: VoidFunction
  viewportBoundingBox: ViewportBoundingBox | undefined
  onViewerInit: (ref: ReactZoomPanPinchRef) => void
  resetViewer: (viewportBB?: ViewportBoundingBox) => void
  forceResetViewer: VoidFunction
}

const getResetScale = (
  wrapperEl: HTMLElement | null,
  viewportBoundingBox?: ViewportBoundingBox,
): number | undefined => {
  if (!wrapperEl || !viewportBoundingBox) return undefined

  const wrapperBB = wrapperEl.getBoundingClientRect()

  let basisDimension: 'width' | 'height' =
    viewportBoundingBox.scrollHeight > viewportBoundingBox.scrollWidth ? 'height' : 'width'

  const contentSize =
    basisDimension === 'width' ? viewportBoundingBox.scrollWidth : viewportBoundingBox.scrollHeight

  let scale = (wrapperBB[basisDimension] - MARGIN) / contentSize

  const widthAtScale = viewportBoundingBox.scrollWidth * scale
  const heightAtScale = viewportBoundingBox.scrollHeight * scale
  const nonBasisDimension = basisDimension === 'width' ? 'height' : 'width'
  const nonBasisAtScale = nonBasisDimension === 'width' ? widthAtScale : heightAtScale

  if (nonBasisAtScale > wrapperBB[nonBasisDimension]) {
    basisDimension = nonBasisDimension
    const newContentSize =
      basisDimension === 'width'
        ? viewportBoundingBox.scrollWidth
        : viewportBoundingBox.scrollHeight
    scale = (wrapperBB[basisDimension] - MARGIN) / newContentSize
  }

  return scale
}

/**
 * Pan/zoom controller for the PDU floor-plan viewer.
 *
 * Wraps `react-zoom-pan-pinch` with viewport-aware reset logic, a debounced
 * "back to content" indicator (when the user pans the layout off-screen),
 * and a wheel handler that treats Ctrl/⌘ + wheel as zoom and plain wheel
 * as scroll. Consumers pass `onViewerInit` into the underlying
 * `TransformWrapper` and spread the rest onto their custom toolbar.
 *
 * @category ui
 */
export const usePduViewer = (): UsePduViewerReturn => {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null)
  const resetTimeoutIdRef = useRef<number | undefined>(undefined)
  const debounceTimerRef = useRef<number | undefined>(undefined)

  const [viewportBoundingBox, setViewportBoundingBox] = useState<ViewportBoundingBox | undefined>(
    undefined,
  )
  const [showBackToContent, setShowBackToContent] = useState(false)
  const [showViewerControls, setShowViewerControls] = useState(false)

  const checkShowBackToContentDebounced = () => {
    clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(() => {
      const ref = transformRef.current

      if (!ref) return

      const { positionX, positionY, scale } = ref.instance.state
      const wrapperEl = ref.instance.wrapperComponent
      const contentEl = ref.instance.contentComponent
      if (!wrapperEl || !contentEl) return

      const wrapperBB = wrapperEl.getBoundingClientRect()
      const contentW = contentEl.scrollWidth * scale
      const contentH = contentEl.scrollHeight * scale

      const isOOBLeft = positionX > wrapperBB.width * SHRINKAGE_HORIZONTAL
      const isOOBRight = positionX < -(contentW * SHRINKAGE_HORIZONTAL)
      const isOOBTop = positionY > wrapperBB.height * SHRINKAGE_VERTICAL
      const isOOBBottom = positionY < -(contentH * SHRINKAGE_VERTICAL)

      setShowBackToContent(isOOBLeft || isOOBRight || isOOBTop || isOOBBottom)
    }, SCROLL_DEBOUNCE_MS)
  }

  useEffect(() => {
    const ref = transformRef.current
    if (!ref) return

    const wrapperEl = ref.instance.wrapperComponent
    if (!wrapperEl) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      const { positionX, positionY, scale } = ref.instance.state

      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * ZOOM_INCREMENT_FACTOR
        const newScale = Math.max(MIN_ZOOM_LEVEL, scale + delta * scale)
        ref.setTransform(positionX, positionY, newScale, 0)
      } else {
        const [dx, dy] = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? [e.deltaX, 0] : [0, e.deltaY]
        ref.setTransform(positionX - dx, positionY - dy, scale, 0)
      }

      checkShowBackToContentDebounced()
    }

    wrapperEl.addEventListener('wheel', handleWheel, { passive: false })
    return () => wrapperEl.removeEventListener('wheel', handleWheel)
  }, [showViewerControls])

  const minZoomLevel = (() => {
    const wrapperEl = transformRef.current?.instance.wrapperComponent ?? null
    if (!wrapperEl || !viewportBoundingBox) return MIN_ZOOM_LEVEL
    return getResetScale(wrapperEl, viewportBoundingBox) ?? MIN_ZOOM_LEVEL
  })()

  const resetViewer = useCallback((viewportBB?: ViewportBoundingBox) => {
    const ref = transformRef.current
    if (!ref) return

    const wrapperEl = ref.instance.wrapperComponent ?? null
    const scale = getResetScale(wrapperEl, viewportBB)

    ref.centerView(scale ?? undefined, 0)
  }, [])

  const updateViewportData = (): ViewportBoundingBox | undefined => {
    const contentEl = transformRef.current?.instance.contentComponent
    if (contentEl) {
      const viewportBB: ViewportBoundingBox = {
        boundingRect: contentEl.getBoundingClientRect(),
        scrollWidth: contentEl.scrollWidth,
        scrollHeight: contentEl.scrollHeight,
      }
      setViewportBoundingBox(viewportBB)
      return viewportBB
    }
    setViewportBoundingBox(undefined)
    return undefined
  }

  const forceResetViewer = () => {
    const viewportBB = updateViewportData()
    resetViewer(viewportBB)
  }

  useEffect(() => {
    return () => {
      clearTimeout(resetTimeoutIdRef.current)
      clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const onViewerInit = useCallback(
    (ref: ReactZoomPanPinchRef) => {
      if (resetTimeoutIdRef.current !== undefined) {
        clearTimeout(resetTimeoutIdRef.current)
        resetTimeoutIdRef.current = undefined
      }

      transformRef.current = ref
      setShowViewerControls(true)

      const viewportBB = updateViewportData()
      resetTimeoutIdRef.current = window.setTimeout(() => {
        resetViewer(viewportBB)
      }, RESET_TIMEOUT_MS)
    },
    [resetViewer],
  )

  const checkShowBackToContent = () => checkShowBackToContentDebounced()

  const handleBackToContent = () => {
    transformRef.current?.centerView(undefined, RECENTER_ANIMATION_DURATION)
    checkShowBackToContent()
  }

  const handleZoomIn = () => {
    transformRef.current?.zoomIn(ZOOM_INCREMENT, 0)
    checkShowBackToContent()
  }

  const handleZoomOut = () => {
    transformRef.current?.zoomOut(ZOOM_INCREMENT, 0)
    checkShowBackToContent()
  }

  return {
    minZoomLevel,
    handleZoomIn,
    handleZoomOut,
    showBackToContent,
    handleBackToContent,
    showViewerControls,
    checkShowBackToContent,
    viewportBoundingBox,
    onViewerInit,
    resetViewer,
    forceResetViewer,
  }
}
