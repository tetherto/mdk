import { Button, Spinner, Switch } from '@tetherto/core'

import type { HeaderPreferences } from '../../../../constants/header-controls.constants'
import { HEADER_ITEMS } from '../../../../constants/header-controls.constants'

import './header-controls-settings.scss'

export type HeaderControlsSettingsProps = {
  preferences: HeaderPreferences
  isLoading?: boolean
  onToggle: (key: keyof HeaderPreferences, value: boolean) => void
  onReset: VoidFunction
  className?: string
}

export const HeaderControlsSettings = ({
  preferences,
  isLoading = false,
  onToggle,
  onReset,
  className,
}: HeaderControlsSettingsProps) => {
  if (isLoading && !preferences) return <Spinner />

  return (
    <div className={`mdk-settings-header-controls ${className || ''}`}>
      <p className="mdk-settings-header-controls__description">
        Customize which metrics appear in your global header. Changes apply instantly.
      </p>

      <div className="mdk-settings-header-controls__table">
        <div className="mdk-settings-header-controls__table-header">
          <div className="mdk-settings-header-controls__header-column--wide">Header Item</div>
          <div className="mdk-settings-header-controls__header-column">Visibility Toggle</div>
        </div>
        {HEADER_ITEMS.map((item) => (
          <div key={item.key} className="mdk-settings-header-controls__table-row">
            <div className="mdk-settings-header-controls__row-column--wide">{item.label}</div>
            <div className="mdk-settings-header-controls__toggle-column">
              <Switch
                color="primary"
                checked={preferences[item.key]}
                onCheckedChange={(checked) => onToggle(item.key, checked)}
                disabled={isLoading}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mdk-settings-header-controls__actions">
        <Button variant="secondary" onClick={onReset} disabled={isLoading}>
          Reset to Default
        </Button>
      </div>
    </div>
  )
}
