import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_HEADER_PREFERENCES } from '../../../../constants/header-controls.constants'
import { SettingsDashboard } from '../settings-dashboard'
import { WEBAPP_NAME } from '../../../../constants'

describe('SettingsDashboard', () => {
  it('renders title', () => {
    render(<SettingsDashboard />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders danger action buttons', () => {
    render(
      <SettingsDashboard
        dangerActions={[
          {
            label: `Reboot ${WEBAPP_NAME}`,
            variant: 'danger',
            mode: 'dialog',
            confirmation: { title: 'Reboot', onConfirm: vi.fn() },
          },
          {
            label: 'Disable automation',
            variant: 'danger',
            mode: 'dialog',
            confirmation: { title: 'Disable', onConfirm: vi.fn() },
          },
        ]}
      />,
    )
    expect(screen.getByText(`Reboot ${WEBAPP_NAME}`)).toBeInTheDocument()
    expect(screen.getByText('Disable automation')).toBeInTheDocument()
  })

  it('renders header controls accordion when props provided', () => {
    render(
      <SettingsDashboard
        headerControlsProps={{
          preferences: DEFAULT_HEADER_PREFERENCES,
          onToggle: vi.fn(),
          onReset: vi.fn(),
        }}
      />,
    )
    expect(screen.getByText('Header Controls')).toBeInTheDocument()
  })

  it('hides feature flags when showFeatureFlags is false', () => {
    render(
      <SettingsDashboard
        featureFlagsProps={{
          featureFlags: { test: true },
          isEditingEnabled: true,
          onSave: vi.fn(),
        }}
        showFeatureFlags={false}
      />,
    )
    expect(screen.queryByText('Feature Flags (Developer Mode)')).not.toBeInTheDocument()
  })

  it('shows feature flags when showFeatureFlags is true', () => {
    render(
      <SettingsDashboard
        featureFlagsProps={{
          featureFlags: { test: true },
          isEditingEnabled: true,
          onSave: vi.fn(),
        }}
        showFeatureFlags
      />,
    )
    expect(screen.getByText('Feature Flags (Developer Mode)')).toBeInTheDocument()
  })
})
