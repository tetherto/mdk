import { Button, SimpleTooltip, Switch } from '@primitives'
import type { ReactElement } from 'react'
import './enabled-disable-toggle.scss'

type EnabledDisableToggleCbParams = Pick<EnabledDisableToggleProps, 'tankNumber'> & {
  isOn: boolean
}

export type EnabledDisableToggleProps = {
  value: unknown
  tankNumber: number | string
  isButtonDisabled: boolean
  isOffline: boolean
  onToggle: (params: EnabledDisableToggleCbParams) => void
}

/**
 * Switch with confirmation that enables or disables a container, miner, or feature flag.
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const EnabledDisableToggle = ({
  value,
  tankNumber,
  isButtonDisabled,
  isOffline,
  onToggle,
}: EnabledDisableToggleProps): ReactElement => {
  const label = tankNumber ? `Tank ${tankNumber} Circulation` : 'Air Exhaust System'
  const isBoolean = typeof value === 'boolean'

  const handleToggle = (isOn: boolean) => {
    onToggle?.({ tankNumber, isOn })
  }

  return (
    <SimpleTooltip content={isOffline ? 'Container is offline' : undefined}>
      <div className="mdk-enabled-disable-toggle">
        {isBoolean && (
          <div className="mdk-enabled-disable-toggle__toggle">
            {label}
            <Switch checked={value as boolean} disabled />
          </div>
        )}

        {(!value || !isBoolean) && (
          <Button
            fullWidth
            size="sm"
            variant="primary"
            disabled={isOffline || isButtonDisabled}
            onClick={() => handleToggle(true)}
          >
            Enable {label}
          </Button>
        )}

        {(value || !isBoolean) && (
          <Button
            fullWidth
            size="sm"
            disabled={isOffline || isButtonDisabled}
            onClick={() => handleToggle(false)}
          >
            Disable {label}
          </Button>
        )}
      </div>
    </SimpleTooltip>
  )
}
