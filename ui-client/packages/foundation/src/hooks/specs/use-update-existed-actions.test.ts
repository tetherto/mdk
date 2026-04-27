import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../types'
import { useUpdateExistedActions } from '../use-update-existed-actions'

const mockDispatch = vi.fn()

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}))

const mockUpdatePendingSubmissionAction = vi.fn((payload) => ({
  type: 'actions/updatePendingSubmissionAction',
  payload,
}))

const mockRemovePendingSubmissionAction = vi.fn((payload) => ({
  type: 'actions/removePendingSubmissionAction',
  payload,
}))

vi.mock('../../state', () => ({
  actionsSlice: {
    actions: {
      updatePendingSubmissionAction: (payload: unknown) =>
        mockUpdatePendingSubmissionAction(payload),
      removePendingSubmissionAction: (payload: unknown) =>
        mockRemovePendingSubmissionAction(payload),
    },
  },
}))

vi.mock('../../utils/action-utils.ts', () => ({
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hook setup', () => {
    it('returns updateExistedActions function', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      expect(typeof result.current.updateExistedActions).toBe('function')
    })
  })

  describe('no matching actions', () => {
    it('does not dispatch anything when no existing actions match actionType', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'setup', ['id-a'])],
        selectedDevices: [makeDevice('a')],
      })

      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('does not dispatch anything when pendingSubmissions is empty', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [],
        selectedDevices: [makeDevice('a')],
      })

      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('does not dispatch anything when selectedDevices is empty', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'reboot', ['id-x'])],
        selectedDevices: [],
      })

      // no selected tags → filteredTags = all original tags → updatePendingSubmissionAction
      expect(mockUpdatePendingSubmissionAction).toHaveBeenCalledWith({
        id: 1,
        tags: ['id-x'],
      })
    })
  })

  describe('updatePendingSubmissionAction', () => {
    it('dispatches update when filtered tags remain after removing selected', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'reboot', ['id-a', 'id-b', 'id-c'])],
        selectedDevices: [makeDevice('a')],
      })

      expect(mockUpdatePendingSubmissionAction).toHaveBeenCalledWith({
        id: 1,
        tags: ['id-b', 'id-c'],
      })
      expect(mockDispatch).toHaveBeenCalledOnce()
    })

    it('dispatches update with correct id', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(42, 'reboot', ['id-a', 'id-b'])],
        selectedDevices: [makeDevice('a')],
      })

      expect(mockUpdatePendingSubmissionAction).toHaveBeenCalledWith({
        id: 42,
        tags: ['id-b'],
      })
    })

    it('dispatches update for each matching action that still has remaining tags', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [
          makeSubmission(1, 'reboot', ['id-a', 'id-b']),
          makeSubmission(2, 'reboot', ['id-c', 'id-d']),
        ],
        selectedDevices: [makeDevice('a'), makeDevice('c')],
      })

      expect(mockUpdatePendingSubmissionAction).toHaveBeenCalledTimes(2)
      expect(mockUpdatePendingSubmissionAction).toHaveBeenCalledWith({ id: 1, tags: ['id-b'] })
      expect(mockUpdatePendingSubmissionAction).toHaveBeenCalledWith({ id: 2, tags: ['id-d'] })
    })

    it('does not dispatch remove when filtered tags remain', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'reboot', ['id-a', 'id-b'])],
        selectedDevices: [makeDevice('a')],
      })

      expect(mockRemovePendingSubmissionAction).not.toHaveBeenCalled()
    })
  })

  describe('removePendingSubmissionAction', () => {
    it('dispatches remove when all tags are selected (none remain)', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'reboot', ['id-a', 'id-b'])],
        selectedDevices: [makeDevice('a'), makeDevice('b')],
      })

      expect(mockRemovePendingSubmissionAction).toHaveBeenCalledWith({ id: 1 })
      expect(mockDispatch).toHaveBeenCalledOnce()
    })

    it('dispatches remove with the correct submission id', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(99, 'reboot', ['id-x'])],
        selectedDevices: [makeDevice('x')],
      })

      expect(mockRemovePendingSubmissionAction).toHaveBeenCalledWith({ id: 99 })
    })

    it('dispatches remove for each action whose tags are fully consumed', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [
          makeSubmission(1, 'reboot', ['id-a']),
          makeSubmission(2, 'reboot', ['id-b']),
        ],
        selectedDevices: [makeDevice('a'), makeDevice('b')],
      })

      expect(mockRemovePendingSubmissionAction).toHaveBeenCalledTimes(2)
      expect(mockRemovePendingSubmissionAction).toHaveBeenCalledWith({ id: 1 })
      expect(mockRemovePendingSubmissionAction).toHaveBeenCalledWith({ id: 2 })
    })

    it('does not dispatch update when all tags are removed', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [makeSubmission(1, 'reboot', ['id-a'])],
        selectedDevices: [makeDevice('a')],
      })

      expect(mockUpdatePendingSubmissionAction).not.toHaveBeenCalled()
    })
  })

  describe('mixed actions', () => {
    it('updates some and removes others based on remaining tags', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [
          makeSubmission(1, 'reboot', ['id-a', 'id-b']), // id-a removed → ['id-b'] → update
          makeSubmission(2, 'reboot', ['id-c']), // id-c removed → [] → remove
        ],
        selectedDevices: [makeDevice('a'), makeDevice('c')],
      })

      expect(mockUpdatePendingSubmissionAction).toHaveBeenCalledWith({ id: 1, tags: ['id-b'] })
      expect(mockRemovePendingSubmissionAction).toHaveBeenCalledWith({ id: 2 })
      expect(mockDispatch).toHaveBeenCalledTimes(2)
    })

    it('only processes actions matching actionType, ignores others', () => {
      const { result } = renderHook(() => useUpdateExistedActions())

      result.current.updateExistedActions({
        actionType: 'reboot',
        pendingSubmissions: [
          makeSubmission(1, 'reboot', ['id-a']),
          makeSubmission(2, 'setup', ['id-a']), // different action — ignored
        ],
        selectedDevices: [makeDevice('a')],
      })

      expect(mockDispatch).toHaveBeenCalledTimes(1)
      expect(mockRemovePendingSubmissionAction).toHaveBeenCalledWith({ id: 1 })
    })
  })
})
