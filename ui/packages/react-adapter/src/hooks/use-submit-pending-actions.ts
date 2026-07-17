import { actionsStore, submitActionMutation } from '@tetherto/mdk-ui-foundation'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ACTIONS_WRITE_PERM,
  extractSubmitError,
  invalidateAfterActionWrite,
  toVotingPayload,
} from './action-write-utils'
import { useActions } from './store-hooks'
import { useCheckPerm } from './use-permissions'

export type UseSubmitPendingActionsResult = {
  /** Drains the staged queue, POSTs each action, clears the queue, invalidates caches. */
  submit: () => Promise<unknown[]>
  /** Number of actions currently staged in `actionsStore`. */
  pendingCount: number
  /** Whether the current token may submit actions (`actions:w`). */
  canSubmit: boolean
  isSubmitting: boolean
  error: unknown
}

/**
 * Submits the locally-staged `actionsStore` queue to the voting/approval
 * workflow. This is the network half of the write flow: the devkit modals
 * only *enqueue* (`setAddPendingSubmissionAction`); nothing posted to
 * `/auth/actions` until this hook runs.
 *
 * Each staged action is POSTed via `submitActionMutation`. On success the queue
 * is cleared and the pool-config, miners, pools, and actions caches are
 * invalidated. Gated by `actions:w` — the backend remains the authoritative
 * check.
 *
 * @category dashboard
 */
export const useSubmitPendingActions = (): UseSubmitPendingActionsResult => {
  const queryClient = useQueryClient()
  const { pendingSubmissions } = useActions()
  const canSubmit = useCheckPerm({ perm: ACTIONS_WRITE_PERM })
  const factory = submitActionMutation(queryClient)

  const mutation = useMutation({
    mutationKey: factory.mutationKey,
    mutationFn: async (): Promise<unknown[]> => {
      const results: unknown[] = []
      // Read the queue from the store (not the render closure) so the latest
      // staged actions are submitted. Snapshot once at mutation start, then
      // remove each item only after its POST confirms success — a later
      // embedded error throws and leaves the un-posted actions in the queue.
      const { pendingSubmissions: queued, removePendingSubmissionAction } = actionsStore.getState()
      for (const action of queued) {
        const data = await factory.mutationFn(toVotingPayload(action))
        const embeddedError = extractSubmitError(data)
        if (embeddedError) throw new Error(embeddedError)
        removePendingSubmissionAction({ id: action.id })
        results.push(data)
      }
      return results
    },
    onSuccess: async () => {
      // Safety net — all items should already be removed per-action above.
      actionsStore.getState().clearAllPendingSubmissions()
      await invalidateAfterActionWrite(queryClient)
    },
  })

  return {
    submit: () => mutation.mutateAsync(),
    pendingCount: pendingSubmissions.length,
    canSubmit,
    isSubmitting: mutation.isPending,
    error: mutation.error,
  }
}
