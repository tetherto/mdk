import {
  addThingCommentMutation,
  AUTH_LEVELS,
  AUTH_PERMISSIONS,
  deleteThingCommentMutation,
  editThingCommentMutation,
  queryKeys,
  type ThingCommentBody,
} from '@tetherto/mdk-ui-foundation'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useCheckPerm } from './use-permissions'

/** Capability required to add / edit / delete device comments. */
export const COMMENTS_WRITE_PERM = `${AUTH_PERMISSIONS.COMMENTS}:${AUTH_LEVELS.WRITE}`

export type UseThingCommentResult = {
  /** `POST /auth/thing/comment` — add a comment to a thing. */
  addComment: (body: ThingCommentBody) => Promise<unknown>
  /** `PUT /auth/thing/comment` — edit an existing comment (`body.id` identifies it). */
  editComment: (body: ThingCommentBody) => Promise<unknown>
  /** `DELETE /auth/thing/comment` — remove an existing comment (`body.id` identifies it). */
  deleteComment: (body: ThingCommentBody) => Promise<unknown>
  /** Whether the current token has `comments:w` permission. */
  canComment: boolean
  /** `true` while any comment mutation is in flight. */
  isSaving: boolean
  error: unknown
}

/**
 * Device-comment writes for the Explorer detail panel — add, edit, and
 * delete against `/auth/thing/comment` (the author is stamped server-side
 * from the session token). Comments ride on the thing rows themselves
 * (`comments` in the list-things projection), so every write invalidates
 * the `list-things` queries to refresh the detail panel and tables.
 *
 * @category op-centre
 */
export const useThingComment = (): UseThingCommentResult => {
  const queryClient = useQueryClient()
  const canComment = useCheckPerm({ perm: COMMENTS_WRITE_PERM })

  const invalidateThings = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.listThings({}).slice(0, 2) })
  }

  const addMutation = useMutation({
    ...addThingCommentMutation(queryClient),
    onSuccess: invalidateThings,
  })
  const editMutation = useMutation({
    ...editThingCommentMutation(queryClient),
    onSuccess: invalidateThings,
  })
  const deleteMutation = useMutation({
    ...deleteThingCommentMutation(queryClient),
    onSuccess: invalidateThings,
  })

  return {
    addComment: (body: ThingCommentBody) => addMutation.mutateAsync(body),
    editComment: (body: ThingCommentBody) => editMutation.mutateAsync(body),
    deleteComment: (body: ThingCommentBody) => deleteMutation.mutateAsync(body),
    canComment,
    isSaving: addMutation.isPending || editMutation.isPending || deleteMutation.isPending,
    error: addMutation.error ?? editMutation.error ?? deleteMutation.error,
  }
}
