import { actionsStore, submitActionMutation } from '@tetherto/mdk-ui-foundation'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ACTIONS_WRITE_PERM,
  extractSubmitError,
  invalidateAfterActionWrite,
  toVotingPayload,
} from './action-write-utils'
import { useCheckPerm } from './use-permissions'

export type UseSubmitSingleActionResult = {
  /** Submits a single staged action by its local queue `id`. */
  submitSingle: (actionId: number) => Promise<unknown>
  /** Whether the current token has `actions:w` permission. */
  canSubmit: boolean
  /** `true` when any single-action mutation is in flight. */
  isSubmitting: boolean
  /**
   * The local queue `id` of the action currently being submitted,
   * or `null` when idle. Use this to disable only the active card's buttons.
   */
  submittingActionId: number | null
}

/**
 * Submits a single action from the staged queue by its local `id`.
 * Inspects the 200 response body for embedded errors before treating the call
 * as successful. Removes the action from the queue only on genuine success.
 *
 * @category dashboard
 */
export const useSubmitSingleAction = (): UseSubmitSingleActionResult => {
  const queryClient = useQueryClient()
  const canSubmit = useCheckPerm({ perm: ACTIONS_WRITE_PERM })
  const factory = submitActionMutation(queryClient)

  const mutation = useMutation({
    mutationKey: [...factory.mutationKey, 'single'],
    mutationFn: async (actionId: number): Promise<unknown> => {
      // Read from the store so a stale render closure can't submit an
      // already-removed or outdated action.
      const action = actionsStore.getState().pendingSubmissions.find((a) => a.id === actionId)
      if (!action) throw new Error(`Action ${actionId} not found in queue`)
      const data = await factory.mutationFn(toVotingPayload(action))
      // The server can return HTTP 200 with errors embedded in the response array.
      // Throw so the mutation is treated as a failure and the queue is NOT cleared.
      const embeddedError = extractSubmitError(data)
      if (embeddedError) throw new Error(embeddedError)
      return data
    },
    onSuccess: async (_data, actionId) => {
      actionsStore.getState().removePendingSubmissionAction({ id: actionId })
      await invalidateAfterActionWrite(queryClient)
    },
  })

  return {
    submitSingle: (actionId: number) => mutation.mutateAsync(actionId),
    canSubmit,
    isSubmitting: mutation.isPending,
    submittingActionId: mutation.isPending ? (mutation.variables ?? null) : null,
  }
}
