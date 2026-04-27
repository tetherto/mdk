import '@testing-library/jest-dom'
import { vi } from 'vitest'

const _noop = (): void => {}

type MockCanvasRenderingContext2D = {
  arc: VoidFunction
  fill: VoidFunction
  save: VoidFunction
  rect: VoidFunction
  clip: VoidFunction
  scale: VoidFunction
  moveTo: VoidFunction
  lineTo: VoidFunction
  stroke: VoidFunction
  rotate: VoidFunction
  restore: VoidFunction
  fillRect: VoidFunction
  fillText: VoidFunction
  clearRect: VoidFunction
  drawImage: VoidFunction
  beginPath: VoidFunction
  closePath: VoidFunction
  translate: VoidFunction
  transform: VoidFunction
  setTransform: VoidFunction
  putImageData: VoidFunction
  createImageData: () => ImageData[]
  measureText: (text: string) => { width: number; height: number }
  getImageData: (x: number, y: number, w: number, h: number) => { data: number[] }
  createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => CanvasGradient
}

const mockGradient = {
  addColorStop: vi.fn(),
} as unknown as CanvasGradient

globalThis.HTMLCanvasElement.prototype.getContext = (() =>
  ({
    fillRect: _noop,
    clearRect: _noop,
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: Array.from({ length: w * h * 4 }),
    }),
    putImageData: _noop,
    createImageData: () => [],
    setTransform: _noop,
    drawImage: _noop,
    save: _noop,
    fillText: _noop,
    restore: _noop,
    beginPath: _noop,
    moveTo: _noop,
    lineTo: _noop,
    closePath: _noop,
    stroke: _noop,
    translate: _noop,
    scale: _noop,
    rotate: _noop,
    arc: _noop,
    fill: _noop,
    measureText: (text: string) => ({ width: 12 * text.length, height: 14 }),
    transform: _noop,
    rect: _noop,
    clip: _noop,
    createLinearGradient: () => mockGradient,
  }) as unknown as MockCanvasRenderingContext2D) as unknown as typeof HTMLCanvasElement.prototype.getContext

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

globalThis.URL.createObjectURL = vi.fn()
globalThis.URL.revokeObjectURL = vi.fn()

if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
}
if (typeof Element !== 'undefined' && !Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn()
}
if (typeof Element !== 'undefined' && !Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn()
}

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
