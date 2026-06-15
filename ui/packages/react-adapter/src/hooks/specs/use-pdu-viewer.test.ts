import { act, renderHook } from '@testing-library/react'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePduViewer } from '../use-pdu-viewer'

const makeWrapperEl = (width = 800, height = 600): HTMLDivElement => {
  const el = document.createElement('div')
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  return el
}

const makeContentEl = (scrollWidth = 400, scrollHeight = 300): HTMLDivElement => {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    width: scrollWidth,
    height: scrollHeight,
    top: 0,
    left: 0,
    right: scrollWidth,
    bottom: scrollHeight,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  return el
}

const makeTransformRef = (
  overrides: Partial<{
    positionX: number
    positionY: number
    scale: number
    wrapperW: number
    wrapperH: number
    contentW: number
    contentH: number
  }> = {},
): ReactZoomPanPinchRef => {
  const {
    positionX = 0,
    positionY = 0,
    scale = 1,
    wrapperW = 800,
    wrapperH = 600,
    contentW = 400,
    contentH = 300,
  } = overrides

  return {
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    setTransform: vi.fn(),
    centerView: vi.fn(),
    resetTransform: vi.fn(),
    instance: {
      state: { positionX, positionY, scale },
      wrapperComponent: makeWrapperEl(wrapperW, wrapperH),
      contentComponent: makeContentEl(contentW, contentH),
    },
  } as unknown as ReactZoomPanPinchRef
}

describe('usePduViewer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('showViewerControls is false before registration', () => {
      const { result } = renderHook(() => usePduViewer())
      expect(result.current.showViewerControls).toBe(false)
    })

    it('showBackToContent is false initially', () => {
      const { result } = renderHook(() => usePduViewer())
      expect(result.current.showBackToContent).toBe(false)
    })

    it('viewportBoundingBox is undefined initially', () => {
      const { result } = renderHook(() => usePduViewer())
      expect(result.current.viewportBoundingBox).toBeUndefined()
    })

    it('minZoomLevel defaults to 0.5', () => {
      const { result } = renderHook(() => usePduViewer())
      expect(result.current.minZoomLevel).toBe(0.5)
    })
  })

  describe('onViewerInit', () => {
    it('sets showViewerControls to true when viewer is initialized', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef()
      act(() => result.current.onViewerInit(ref))
      expect(result.current.showViewerControls).toBe(true)
    })

    it('calls centerView after RESET_TIMEOUT_MS', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef()
      act(() => result.current.onViewerInit(ref))
      act(() => vi.advanceTimersByTime(250))
      expect(ref.centerView).toHaveBeenCalled()
    })

    it('clears pending reset timeout when a new viewer is initialized', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref1 = makeTransformRef()
      const ref2 = makeTransformRef()
      act(() => result.current.onViewerInit(ref1))
      act(() => result.current.onViewerInit(ref2))
      act(() => vi.advanceTimersByTime(250))
      expect(ref1.centerView).not.toHaveBeenCalled()
      expect(ref2.centerView).toHaveBeenCalled()
    })

    it('updates viewportBoundingBox on initialization', () => {
      const { result } = renderHook(() => usePduViewer())
      act(() => result.current.onViewerInit(makeTransformRef()))
      expect(result.current.viewportBoundingBox).toBeDefined()
      expect(result.current.viewportBoundingBox?.scrollWidth).toBe(400)
      expect(result.current.viewportBoundingBox?.scrollHeight).toBe(300)
    })
  })

  describe('resetViewer', () => {
    it('calls centerView with computed scale', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef()
      act(() => result.current.onViewerInit(ref))
      act(() => vi.advanceTimersByTime(250))
      ;(ref.centerView as ReturnType<typeof vi.fn>).mockClear()

      act(() =>
        result.current.resetViewer({
          boundingRect: new DOMRect(),
          scrollWidth: 400,
          scrollHeight: 300,
        }),
      )
      expect(ref.centerView).toHaveBeenCalledWith(expect.any(Number), 0)
    })

    it('calls centerView with undefined scale when no viewportBB provided', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef()
      act(() => result.current.onViewerInit(ref))
      act(() => vi.advanceTimersByTime(250))
      ;(ref.centerView as ReturnType<typeof vi.fn>).mockClear()

      act(() => result.current.resetViewer())
      expect(ref.centerView).toHaveBeenCalledWith(undefined, 0)
    })
  })

  describe('handleZoomIn / handleZoomOut', () => {
    it('calls zoomIn with ZOOM_INCREMENT', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef()
      act(() => result.current.onViewerInit(ref))
      act(() => result.current.handleZoomIn())
      expect(ref.zoomIn).toHaveBeenCalledWith(0.1, 0)
    })

    it('calls zoomOut with ZOOM_INCREMENT', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef()
      act(() => result.current.onViewerInit(ref))
      act(() => result.current.handleZoomOut())
      expect(ref.zoomOut).toHaveBeenCalledWith(0.1, 0)
    })
  })

  describe('handleBackToContent', () => {
    it('calls centerView with animation duration', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef()
      act(() => result.current.onViewerInit(ref))
      ;(ref.centerView as ReturnType<typeof vi.fn>).mockClear()
      act(() => result.current.handleBackToContent())
      expect(ref.centerView).toHaveBeenCalledWith(undefined, 100)
    })
  })

  describe('checkShowBackToContent', () => {
    it('sets showBackToContent true when content is OOB to the left', () => {
      const { result } = renderHook(() => usePduViewer())
      // positionX = 900 > wrapperW(800) * 0.9 = 720 → OOB left
      const ref = makeTransformRef({ positionX: 900, wrapperW: 800, contentW: 400 })
      act(() => result.current.onViewerInit(ref))
      act(() => result.current.checkShowBackToContent())
      act(() => vi.advanceTimersByTime(100))
      expect(result.current.showBackToContent).toBe(true)
    })

    it('sets showBackToContent true when content is OOB to the right', () => {
      const { result } = renderHook(() => usePduViewer())
      // positionX = -500 < -(contentW(400) * scale(1) * 0.9 = -360) → OOB right
      const ref = makeTransformRef({ positionX: -500, contentW: 400, scale: 1 })
      act(() => result.current.onViewerInit(ref))
      act(() => result.current.checkShowBackToContent())
      act(() => vi.advanceTimersByTime(100))
      expect(result.current.showBackToContent).toBe(true)
    })

    it('sets showBackToContent false when content is within bounds', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef({ positionX: 0, positionY: 0 })
      act(() => result.current.onViewerInit(ref))
      act(() => result.current.checkShowBackToContent())
      act(() => vi.advanceTimersByTime(100))
      expect(result.current.showBackToContent).toBe(false)
    })

    it('is debounced — only last call within window takes effect', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef({ positionX: 0, positionY: 0 })
      act(() => result.current.onViewerInit(ref))
      act(() => {
        result.current.checkShowBackToContent()
        result.current.checkShowBackToContent()
        result.current.checkShowBackToContent()
      })
      act(() => vi.advanceTimersByTime(100))
      expect(result.current.showBackToContent).toBe(false)
    })
  })

  describe('forceResetViewer', () => {
    it('updates viewportBoundingBox and calls centerView', () => {
      const { result } = renderHook(() => usePduViewer())
      const ref = makeTransformRef()
      act(() => result.current.onViewerInit(ref))
      act(() => vi.advanceTimersByTime(250))
      ;(ref.centerView as ReturnType<typeof vi.fn>).mockClear()

      act(() => result.current.forceResetViewer())
      expect(result.current.viewportBoundingBox).toBeDefined()
      expect(ref.centerView).toHaveBeenCalled()
    })
  })
})
