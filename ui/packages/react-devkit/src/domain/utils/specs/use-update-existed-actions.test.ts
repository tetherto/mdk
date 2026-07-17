// @vitest-environment jsdom
import { actionsStore } from '@tetherto/mdk-ui-foundation'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Device } from '../../types'
import { useUpdateExistedActions } from '../use-update-existed-actions'

vi.mock('@domain/utils/action-utils', () => ({
  getExistedActions: vi.fn((actionType: string, submissions: { action: string }[]) =>
    submissions.filter((s) => s.action === actionType),
  ),
  getSelectedDevicesTags: vi.fn((devices: { id: string }[]) => devices.map((d) => `id-${d.id}`)),
}))

const makeSubmission = (
  id: number,
  action: string,
  tags: string[],
): { id: number; action: string; tags: string[] } => ({ id, action, tags })

const makeDevice = (id: string) => ({ id }) as unknown as Device

describe('useUpdateExistedActions', () => {
  let updateSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    actionsStore.getState().clearAllPendingSubmissions()
    updateSpy = vi.spyOn(actionsStore.getState(), 'updatePendingSubmissionAction')
    removeSpy = vi.spyOn(actionsStore.getState(), 'removePendingSubmissionAction')
  })

  afterEach(() => {
    updateSpy.mockRestore()
    removeSpy.mockRestore()
    actionsStore.getState().clearAllPendingSubmissions()
  })

  describe('hook setup', () => {
    it('returns an updateExistedActions function', () => {
      const { result } = renderHook(() => useUpdateExistedActions())
      expect(typeof result.current.updateExistedActions).toBe('function')
    })
  })

  describe('no matching actions', () => {
    it('does not call the store when no existing actions match the actionType', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'setup', ['id-a'])],
        selectedDevices: [makeDevice('a')],
      })

      expect(updateSpy).not.toHaveBeenCalled()
      expect(removeSpy).not.toHaveBeenCalled()
    })

    it('does not call the store when pendingSubmissions is empty', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [],
        selectedDevices: [makeDevice('a')],
      })

      expect(updateSpy).not.toHaveBeenCalled()
      expect(removeSpy).not.toHaveBeenCalled()
    })

    it('with no selected devices keeps all existing tags via update', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'reboot', ['id-x'])],
        selectedDevices: [],
      })

      expect(updateSpy).toHaveBeenCalledWith({ id: 1, tags: ['id-x'] })
    })
  })

  describe('updatePendingSubmissionAction', () => {
    it('dispatches an update when filtered tags remain after removing the selected ones', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'reboot', ['id-a', 'id-b', 'id-c'])],
        selectedDevices: [makeDevice('a')],
      })

      expect(updateSpy).toHaveBeenCalledWith({ id: 1, tags: ['id-b', 'id-c'] })
      expect(removeSpy).not.toHaveBeenCalled()
    })

    it('dispatches an update for each matching action that still has remaining tags', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [
          makeSubmission(1, 'reboot', ['id-a', 'id-b']),
          makeSubmission(2, 'reboot', ['id-c', 'id-d']),
        ],
        selectedDevices: [makeDevice('a'), makeDevice('c')],
      })

      expect(updateSpy).toHaveBeenCalledTimes(2)
      expect(updateSpy).toHaveBeenCalledWith({ id: 1, tags: ['id-b'] })
      expect(updateSpy).toHaveBeenCalledWith({ id: 2, tags: ['id-d'] })
    })
  })

  describe('removePendingSubmissionAction', () => {
    it('dispatches a remove when all tags are consumed', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'reboot', ['id-a', 'id-b'])],
        selectedDevices: [makeDevice('a'), makeDevice('b')],
      })

      expect(removeSpy).toHaveBeenCalledWith({ id: 1 })
    })

    it('dispatches a remove for each fully consumed action', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [
          makeSubmission(1, 'reboot', ['id-a']),
          makeSubmission(2, 'reboot', ['id-b']),
        ],
        selectedDevices: [makeDevice('a'), makeDevice('b')],
      })

      expect(removeSpy).toHaveBeenCalledTimes(2)
      expect(removeSpy).toHaveBeenCalledWith({ id: 1 })
      expect(removeSpy).toHaveBeenCalledWith({ id: 2 })
    })
  })

  describe('mixed actions', () => {
    it('updates some and removes others based on remaining tags', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [
          makeSubmission(1, 'reboot', ['id-a', 'id-b']),
          makeSubmission(2, 'reboot', ['id-c']),
        ],
        selectedDevices: [makeDevice('a'), makeDevice('c')],
      })

      expect(updateSpy).toHaveBeenCalledWith({ id: 1, tags: ['id-b'] })
      expect(removeSpy).toHaveBeenCalledWith({ id: 2 })
    })

    it('only processes actions matching the actionType', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [
          makeSubmission(1, 'reboot', ['id-a']),
          makeSubmission(2, 'setup', ['id-a']),
        ],
        selectedDevices: [makeDevice('a')],
      })

      expect(removeSpy).toHaveBeenCalledTimes(1)
      expect(removeSpy).toHaveBeenCalledWith({ id: 1 })
      expect(updateSpy).not.toHaveBeenCalled()
    })
  })
})
