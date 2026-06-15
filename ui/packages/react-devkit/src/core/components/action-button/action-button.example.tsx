/**
 * Runnable example for ActionButton.
 */
import { ActionButton } from '@tetherto/mdk-react-devkit'

export const ActionButtonExample = () => (
  <div className="mdk-example-row">
    <ActionButton
      label="Reboot Device"
      variant="secondary"
      confirmation={{
        title: 'Reboot Device',
        description:
          'This will restart all communication workers. The device will be temporarily unavailable.',
        confirmLabel: 'Reboot',
        cancelLabel: 'Cancel',
      }}
    />

    <ActionButton
      label="Factory Reset"
      variant="danger"
      mode="dialog"
      confirmation={{
        title: 'Confirm Factory Reset',
        description: 'This action cannot be undone. All device settings will be erased.',
        confirmLabel: 'Reset',
      }}
    />

    <ActionButton
      label="Disabled Action"
      variant="secondary"
      disabled
      confirmation={{
        title: 'Disabled',
      }}
    />
  </div>
)
