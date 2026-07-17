import { useActions } from '@tetherto/mdk-react-adapter'

import type { Device } from '../types'
import { getExistedActions, getSelectedDevicesTags } from './action-utils'

export type PendingSubmission = {
  id: string | number
  action: string
  tags: string[]
  params: unknown[]
  [key: string]: unknown
}

export type UpdateExistedActionsParams = {
  actionType: string
  pendingSubmissions: PendingSubmission[]
  selectedDevices: Device[]
}

/**
 * Mutation hook that updates only the changed fields of an existing action record.
 *
 * Removes tags from existing pending submissions if those tags belong to the newly
 * selected devices; if the resulting tag list is empty, the submission itself is
 * removed. This avoids duplicate pending actions for the same device.
 * @category misc
 * @domain generic
 * @tier agent-ready
 */
export const useUpdateExistedActions = () => {
  const { updatePendingSubmissionAction, removePendingSubmissionAction } = useActions()

  const updateExistedActions = ({
    actionType,
    pendingSubmissions,
    selectedDevices,
  }: UpdateExistedActionsParams) => {
    const existedActions = getExistedActions(actionType, pendingSubmissions) as PendingSubmission[]
    const selectedDevicesTags = getSelectedDevicesTags(selectedDevices)

    existedActions.forEach((existedAction) => {
      const filteredTags = existedAction.tags.filter((tag) => !selectedDevicesTags.includes(tag))

      if (filteredTags.length > 0) {
        updatePendingSubmissionAction({
          id: existedAction.id as number,
          tags: filteredTags,
        })
      } else {
        removePendingSubmissionAction({
          id: existedAction.id as number,
        })
      }
    })
  }

  return { updateExistedActions }
}
