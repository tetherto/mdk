import { cancelActionsMutation, type CancelActionsPayload } from '@tetherto/mdk-ui-foundation'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ACTIONS_WRITE_PERM, invalidateAfterActionWrite } from './action-write-utils'
import { useCheckPerm } from './use-permissions'

const DEFAULT_ACTION_TYPE = 'voting'

export type CancelActionInput = {
  ids: Array<string | number>
  /** Action type URL segment. Defaults to `voting`. */
  type?: string
}

export type UseCancelActionResult = {
  /** Cancel one or more pending actions by id. */
  cancel: (input: CancelActionInput) => Promise<unknown>
  /** Whether the current token may cancel actions (`actions:w`). */
  canCancel: boolean
  isCancelling: boolean
  error: unknown
}

/**
 * Cancels pending actions via `DELETE /auth/actions/:type/cancel?ids=…`.
 * Invalidates the pool/miner/actions caches on success. Gated by `actions:w`.
 *
 * @category dashboard
 */
export const useCancelAction = (): UseCancelActionResult => {
  const queryClient = useQueryClient()
  const canCancel = useCheckPerm({ perm: ACTIONS_WRITE_PERM })
  const factory = cancelActionsMutation(queryClient)

  const mutation = useMutation({
    mutationKey: factory.mutationKey,
    mutationFn: ({ ids, type = DEFAULT_ACTION_TYPE }: CancelActionInput) =>
      factory.mutationFn({ ids, type } satisfies CancelActionsPayload),
    onSuccess: () => invalidateAfterActionWrite(queryClient),
  })

  return {
    cancel: (input) => mutation.mutateAsync(input),
    canCancel,
    isCancelling: mutation.isPending,
    error: mutation.error,
  }
}
