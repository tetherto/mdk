import { actionsStore, type DeviceActionSubmission } from '@tetherto/mdk-ui-foundation'

import { ACTIONS_WRITE_PERM } from './action-write-utils'
import { useCheckPerm } from './use-permissions'

export type UseDeviceActionResult = {
  /**
   * Stage a device-action submission into the shared pending queue. Build
   * the submission with the foundation builders (`buildRebootAction`,
   * `buildSetPowerModeAction`, ...); the queue assigns the local `id` and
   * the Actions sidebar takes it from there (review → submit → vote).
   */
  queueAction: (submission: DeviceActionSubmission) => void
  /** Whether the current token has `actions:w` permission. */
  canSubmit: boolean
}

/**
 * Entry point for wiring device-control UI (reboot, power mode, LED,
 * socket switches, ...) into the voting/approval workflow: components build
 * a typed submission with the foundation's device-action builders and queue
 * it here. Submission and voting stay with the existing queue hooks
 * (`useSubmitPendingActions`, `useSubmitSingleAction`, `useVoteOnAction`),
 * so device actions and pool actions share one review tray.
 *
 * @category dashboard
 */
export const useDeviceAction = (): UseDeviceActionResult => {
  const canSubmit = useCheckPerm({ perm: ACTIONS_WRITE_PERM })

  return {
    queueAction: (submission: DeviceActionSubmission) =>
      actionsStore.getState().setAddPendingSubmissionAction(submission),
    canSubmit,
  }
}
