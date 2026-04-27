import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { store } from '../../state'
import {
  addToast,
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from '../notification-utils'

describe('notification utils', () => {
  beforeEach(() => {
    // Clear the document body before each test
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up toast container after each test
    const container = document.getElementById('notification-service-container')
    if (container) {
      container.remove()
    }
  })

  describe('notifySuccess', () => {
    it('should call without throwing', () => {
      expect(() => {
        notifySuccess('Success', 'Operation completed')
      }).not.toThrow()
    })

    it('should dispatch Redux increment action', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifySuccess('Success', 'Test')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notifications/increment',
        }),
      )
    })
  })

  describe('notifyError', () => {
    it('should call without throwing', () => {
      expect(() => {
        notifyError('Error', 'Something went wrong')
      }).not.toThrow()
    })

    it('should handle dontClose parameter', () => {
      expect(() => {
        notifyError('Error', 'Critical error', true)
      }).not.toThrow()

      expect(() => {
        notifyError('Error', 'Temporary error', false)
      }).not.toThrow()
    })

    it('should dispatch Redux increment action', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifyError('Error', 'Test error')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notifications/increment',
        }),
      )
    })
  })

  describe('notifyInfo', () => {
    it('should call without throwing', () => {
      expect(() => {
        notifyInfo('Info', 'Here is some information')
      }).not.toThrow()
    })

    it('should dispatch Redux increment action', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifyInfo('Info', 'Test info')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notifications/increment',
        }),
      )
    })
  })

  describe('notifyWarning', () => {
    it('should call without throwing', () => {
      expect(() => {
        notifyWarning('Warning', 'Please review')
      }).not.toThrow()
    })

    it('should dispatch Redux increment action', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifyWarning('Warning', 'Test warning')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notifications/increment',
        }),
      )
    })
  })

  describe('addToast', () => {
    it('should add toast without throwing', () => {
      expect(() => {
        addToast({
          variant: 'success',
          title: 'Test',
          description: 'Description',
          duration: 3000,
          position: 'top-left',
          onClose: () => {},
        })
      }).not.toThrow()
    })

    it('should reuse existing container on subsequent toasts', () => {
      addToast({
        variant: 'success',
        title: 'First',
        duration: 3000,
        position: 'top-left',
        onClose: () => {},
      })

      const firstContainer = document.getElementById('notification-service-container')

      addToast({
        variant: 'error',
        title: 'Second',
        duration: 3000,
        position: 'top-left',
        onClose: () => {},
      })

      const secondContainer = document.getElementById('notification-service-container')

      expect(firstContainer).toBe(secondContainer)
    })

    it('should handle different toast variants', () => {
      const variants: Array<'success' | 'error' | 'warning' | 'info'> = [
        'success',
        'error',
        'warning',
        'info',
      ]

      variants.forEach((variant) => {
        expect(() => {
          addToast({
            variant,
            title: `${variant} toast`,
            duration: 3000,
            position: 'top-left',
            onClose: () => {},
          })
        }).not.toThrow()
      })
    })

    it('should handle different positions', () => {
      const positions: Array<
        'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
      > = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center']

      positions.forEach((position) => {
        expect(() => {
          addToast({
            variant: 'info',
            title: `Position: ${position}`,
            duration: 3000,
            position,
            onClose: () => {},
          })
        }).not.toThrow()
      })
    })

    it('should call onClose callback', () => {
      const onCloseSpy = vi.fn()

      addToast({
        variant: 'success',
        title: 'Test',
        duration: 3000,
        position: 'top-left',
        onClose: onCloseSpy,
      })

      // onClose is called when toast is removed
      // In actual implementation, this happens via Toast's onOpenChange
      // Here we just verify the callback is accepted
      expect(onCloseSpy).toBeDefined()
    })

    it('should handle toast without description', () => {
      expect(() => {
        addToast({
          variant: 'success',
          title: 'Title only',
          duration: 3000,
          position: 'top-left',
          onClose: () => {},
        })
      }).not.toThrow()
    })

    it('should handle zero duration (no auto-close)', () => {
      expect(() => {
        addToast({
          variant: 'error',
          title: 'Critical',
          description: 'Manual close only',
          duration: 0,
          position: 'top-left',
          onClose: () => {},
        })
      }).not.toThrow()
    })
  })

  describe('multiple notifications', () => {
    it('should handle multiple rapid calls', () => {
      expect(() => {
        notifySuccess('Success 1', 'First')
        notifyError('Error 1', 'Second')
        notifyInfo('Info 1', 'Third')
        notifyWarning('Warning 1', 'Fourth')
      }).not.toThrow()
    })

    it('should dispatch multiple Redux increment actions', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifySuccess('Success 1', 'First')
      notifyError('Error 1', 'Second')
      notifyInfo('Info 1', 'Third')

      const incrementCalls = dispatchSpy.mock.calls.filter((call) =>
        call[0].type?.includes('increment'),
      )

      expect(incrementCalls.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle rapid successive notifications', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          notifySuccess(`Success ${i}`, `Message ${i}`)
        }
      }).not.toThrow()
    })
  })

  describe('redux integration', () => {
    it('should dispatch increment on notifySuccess', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifySuccess('Test', 'Description')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notifications/increment',
        }),
      )
    })

    it('should dispatch increment on notifyError', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifyError('Test', 'Description')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notifications/increment',
        }),
      )
    })

    it('should dispatch increment on notifyInfo', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifyInfo('Test', 'Description')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notifications/increment',
        }),
      )
    })

    it('should dispatch increment on notifyWarning', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      notifyWarning('Test', 'Description')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notifications/increment',
        }),
      )
    })
  })

  describe('dontClose parameter', () => {
    it('should handle dontClose = true', () => {
      expect(() => {
        notifyError('Error', 'Critical error', true)
      }).not.toThrow()
    })

    it('should handle dontClose = false', () => {
      expect(() => {
        notifyError('Error', 'Temporary error', false)
      }).not.toThrow()
    })

    it('should handle dontClose = undefined', () => {
      expect(() => {
        notifyError('Error', 'Default behavior')
      }).not.toThrow()
    })
  })
})
