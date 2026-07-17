import {
  getRolesFromAuthToken,
  type LiveAction,
  liveActionsQuery,
  type LiveActionsResponse,
  USER_ROLE,
} from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { ACTIONS_WRITE_PERM } from './action-write-utils'
import { useAuthToken } from './use-auth-token'
import { useCurrentUserEmail } from './use-current-user-email'
import { LIVE_ACTIONS_POLL_INTERVAL_MS } from './poll-intervals'
import { useCheckPerm } from './use-permissions'

/** Roles allowed to approve/reject another user's action (mirrors the backend). */
const APPROVER_ROLES: string[] = [USER_ROLE.ADMIN, USER_ROLE.SITE_MANAGER]

/**
 * Partition a flat action list into [mine, others] by comparing `votesPos[0]`
 * (the submitter email) against the current user's email.
 *
 * When `email` is `undefined` (e.g. `/auth/userinfo` hasn't resolved yet) we
 * treat all actions as "mine" — a safe fallback that ensures the sidebar always
 * shows the current user's submitted actions.
 */
const partitionActions = (
  actions: LiveAction[] = [],
  email: string | undefined,
): [LiveAction[], LiveAction[]] => {
  // No email yet → can't distinguish — optimistically claim all as mine
  if (!email) return [actions, []]

  const mine: LiveAction[] = []
  const others: LiveAction[] = []
  for (const action of actions) {
    const submitter = Array.isArray(action.votesPos) ? action.votesPos[0] : undefined
    if (submitter === email) mine.push(action)
    else others.push(action)
  }
  return [mine, others]
}

export type LiveActionsData = {
  /** My actions awaiting a vote (status `voting`). */
  myVoting: LiveAction[]
  /** My actions that have been approved and are ready to execute. */
  myReady: LiveAction[]
  /** My actions currently executing. */
  myExecuting: LiveAction[]
  /** My recently completed actions. */
  myDone: LiveAction[]
  /** Other users' voting-state actions that the current user can approve/reject. */
  othersVoting: LiveAction[]
  /** Whether the current user can approve/reject (has `actions:w`). */
  canApprove: boolean
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Polls `GET /auth/actions` every 5 s (`voting`, `ready`, `executing`, `done`).
 * Partitions results into the current user's actions vs others', and gates
 * `othersVoting` behind the `actions:w` permission.
 *
 * @category dashboard
 */
export const useLiveActions = (): LiveActionsData => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  // Approve/reject rights come from the user's role in the token (admin /
  // site_manager, or the `*` wildcard). The permission-string check is kept as
  // a fallback for setups that populate `authStore.permissions`.
  const canApproveByPerm = useCheckPerm({ perm: ACTIONS_WRITE_PERM })
  const canApprove = useMemo(() => {
    if (canApproveByPerm) return true
    const roles = getRolesFromAuthToken(token ?? undefined)
    return roles.includes('*') || roles.some((role) => APPROVER_ROLES.includes(role))
  }, [canApproveByPerm, token])

  // Resolve current user email to partition actions into "mine" vs "others".
  const email = useCurrentUserEmail()

  const factory = liveActionsQuery(queryClient)
  const result = useQuery({
    ...factory,
    refetchInterval: LIVE_ACTIONS_POLL_INTERVAL_MS,
    enabled: !!token,
  })

  // Response is [{ voting: [...], ready: [...], ... }]
  const responseMap: LiveActionsResponse =
    (Array.isArray(result.data) ? result.data[0] : result.data) ?? {}

  const voting = responseMap.voting ?? []
  const ready = responseMap.ready ?? []
  const executing = responseMap.executing ?? []
  const done = responseMap.done ?? []

  const [myVoting, rawOthers] = partitionActions(voting, email)
  const [myReady] = partitionActions(ready, email)
  const [myExecuting] = partitionActions(executing, email)
  const [myDone] = partitionActions(done, email)

  // Exclude actions the current user already rejected
  const othersVoting = canApprove
    ? rawOthers.filter(
        (action) => !Array.isArray(action.votesNeg) || !action.votesNeg.includes(email ?? ''),
      )
    : []

  return {
    myVoting,
    myReady,
    myExecuting,
    myDone,
    othersVoting,
    canApprove,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
