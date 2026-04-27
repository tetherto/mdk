import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Import modular mocks
import './mocks'

// Make vi available globally
declare global {
  // eslint-disable-next-line vars-on-top
  var vi: (typeof import('vitest'))['vi']
}
globalThis.vi = vi
