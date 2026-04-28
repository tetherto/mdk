import { Accordion, ActionButton } from '@tetherto/core'
import type { ActionButtonProps } from '@tetherto/core'
import type { FeatureFlagsSettingsProps } from '../feature-flags'
import { FeatureFlagsSettings } from '../feature-flags'
import type { HeaderControlsSettingsProps } from '../header-controls'
import { HeaderControlsSettings } from '../header-controls'
import type { ImportExportSettingsProps } from '../import-export'
import { ImportExportSettings } from '../import-export'
import type { RBACControlSettingsProps } from '../rbac-control'
import { RBACControlSettings } from '../rbac-control'

import './settings-dashboard.scss'

export type SettingsDashboardProps = {
  dangerActions?: ActionButtonProps[]
  headerControlsProps?: HeaderControlsSettingsProps
  rbacControlProps?: RBACControlSettingsProps
  importExportProps?: ImportExportSettingsProps
  featureFlagsProps?: FeatureFlagsSettingsProps
  showFeatureFlags?: boolean
  className?: string
}

export const SettingsDashboard = ({
  dangerActions,
  headerControlsProps,
  rbacControlProps,
  importExportProps,
  featureFlagsProps,
  showFeatureFlags = false,
  className,
}: SettingsDashboardProps) => (
  <div className={`mdk-settings-dashboard ${className || ''}`}>
    <h2 className="mdk-settings-dashboard__title">Settings</h2>

    {dangerActions && dangerActions.length > 0 && (
      <div className="mdk-settings-dashboard__danger-actions">
        {dangerActions.map((action) => (
          <ActionButton key={action.label} {...action} />
        ))}
      </div>
    )}

    <div className="mdk-settings-dashboard__accordions">
      {headerControlsProps && (
        <Accordion title="Header Controls" isOpened={false}>
          <HeaderControlsSettings {...headerControlsProps} />
        </Accordion>
      )}

      {rbacControlProps && (
        <Accordion title="RBAC Control" isOpened={false}>
          <RBACControlSettings {...rbacControlProps} />
        </Accordion>
      )}

      {importExportProps && (
        <Accordion title="Import / Export Settings" isOpened={false}>
          <ImportExportSettings {...importExportProps} />
        </Accordion>
      )}

      {showFeatureFlags && featureFlagsProps && (
        <Accordion title="Feature Flags (Developer Mode)" isOpened={false}>
          <FeatureFlagsSettings {...featureFlagsProps} />
        </Accordion>
      )}
    </div>
  </div>
)
