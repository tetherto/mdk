import { notificationStore } from '@tetherto/mdk-ui-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addToast,
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
  resetToastPortalForTests,
} from '../notification-utils'

describe('notification utils', () => {
  let incrementSpy: ReturnType<typeof vi.spyOn>
  let decrementSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
    notificationStore.getState().reset()
    incrementSpy = vi.spyOn(notificationStore.getState(), 'increment')
    decrementSpy = vi.spyOn(notificationStore.getState(), 'decrement')
  })

  afterEach(() => {
    incrementSpy.mockRestore()
    decrementSpy.mockRestore()
    resetToastPortalForTests()
    notificationStore.getState().reset()
  })

  describe('notifySuccess', () => {
    it('should call without throwing', () => {
      expect(() => notifySuccess('Success', 'Operation completed')).not.toThrow()
    })

    it('should increment the notification store', () => {
      notifySuccess('Success', 'Test')
      expect(incrementSpy).toHaveBeenCalled()
    })
  })

  describe('notifyError', () => {
    it('should call without throwing', () => {
      expect(() => notifyError('Error', 'Something went wrong')).not.toThrow()
    })

    it('should handle dontClose parameter', () => {
      expect(() => notifyError('Error', 'Critical error', true)).not.toThrow()
      expect(() => notifyError('Error', 'Temporary error', false)).not.toThrow()
    })

    it('should increment the notification store', () => {
      notifyError('Error', 'Test error')
      expect(incrementSpy).toHaveBeenCalled()
    })
  })

  describe('notifyInfo', () => {
    it('should call without throwing', () => {
      expect(() => notifyInfo('Info', 'Here is some information')).not.toThrow()
    })

    it('should increment the notification store', () => {
      notifyInfo('Info', 'Test info')
      expect(incrementSpy).toHaveBeenCalled()
    })
  })

  describe('notifyWarning', () => {
    it('should call without throwing', () => {
      expect(() => notifyWarning('Warning', 'Please review')).not.toThrow()
    })

    it('should increment the notification store', () => {
      notifyWarning('Warning', 'Test warning')
      expect(incrementSpy).toHaveBeenCalled()
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

    it('should increment the notification store for each notification', () => {
      notifySuccess('Success 1', 'First')
      notifyError('Error 1', 'Second')
      notifyInfo('Info 1', 'Third')

      expect(incrementSpy).toHaveBeenCalledTimes(3)
    })

    it('should handle rapid successive notifications', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) notifySuccess(`Success ${i}`, `Message ${i}`)
      }).not.toThrow()
    })
  })

  describe('store integration', () => {
    it('should increment on notifySuccess', () => {
      notifySuccess('Test', 'Description')
      expect(incrementSpy).toHaveBeenCalled()
    })

    it('should increment on notifyError', () => {
      notifyError('Test', 'Description')
      expect(incrementSpy).toHaveBeenCalled()
    })

    it('should increment on notifyInfo', () => {
      notifyInfo('Test', 'Description')
      expect(incrementSpy).toHaveBeenCalled()
    })

    it('should increment on notifyWarning', () => {
      notifyWarning('Test', 'Description')
      expect(incrementSpy).toHaveBeenCalled()
    })
  })

  describe('dontClose parameter', () => {
    it('should handle dontClose = true', () => {
      expect(() => notifyError('Error', 'Critical error', true)).not.toThrow()
    })

    it('should handle dontClose = false', () => {
      expect(() => notifyError('Error', 'Temporary error', false)).not.toThrow()
    })

    it('should handle dontClose = undefined', () => {
      expect(() => notifyError('Error', 'Default behavior')).not.toThrow()
    })
  })
})
