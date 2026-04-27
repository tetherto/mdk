import { useDispatch } from 'react-redux'
import { actionsSlice } from '../state'
import type { Device } from '../types'
import { getExistedActions, getSelectedDevicesTags } from '../utils/action-utils'

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
 * Update existed actions
 * Remove tags from existed actions if they were already selected
 * To get rid of duplicates
 */
export const useUpdateExistedActions = () => {
  const dispatch = useDispatch()

  const { updatePendingSubmissionAction, removePendingSubmissionAction } = actionsSlice.actions

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
        dispatch(
          updatePendingSubmissionAction({
            id: existedAction.id as number,
            tags: filteredTags,
          }),
        )
      } else {
        dispatch(
          removePendingSubmissionAction({
            id: existedAction.id as number,
          }),
        )
      }
    })
  }

  return { updateExistedActions }
}
