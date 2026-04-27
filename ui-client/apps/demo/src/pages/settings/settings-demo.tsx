import { useState } from 'react'
import type { ReactElement } from 'react'
import { DemoPageHeader } from '../../components/demo-page-header'
import { DEFAULT_HEADER_PREFERENCES, SettingsDashboard, WEBAPP_NAME } from '@mdk/foundation'
import type {
  HeaderPreferences,
  PermLevel,
  RoleOption,
  SettingsExportData,
  SettingsUser,
} from '@mdk/foundation'

import './settings-demo.scss'

const MOCK_USERS: SettingsUser[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'a.johnson@example.com',
    role: 'admin',
    lastActive: '2026-03-30T10:15:00Z',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'b.smith@example.com',
    role: 'site_operator',
    lastActive: '2026-03-29T08:30:00Z',
  },
  {
    id: '3',
    name: 'Carol Davis',
    email: 'c.davis@example.com',
    role: 'read_only_user',
    lastActive: '2026-03-25T14:00:00Z',
  },
  {
    id: '4',
    name: 'Dan Wilson',
    email: 'd.wilson@example.com',
    role: 'site_manager',
    lastActive: '2026-03-28T16:45:00Z',
  },
  { id: '5', name: 'Eve Brown', email: 'e.brown@example.com', role: 'field_operator' },
]

const MOCK_ROLES: RoleOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'site_manager', label: 'Site Manager' },
  { value: 'site_operator', label: 'Site Operator' },
  { value: 'field_operator', label: 'Field Operator' },
  { value: 'repair_technician', label: 'Repair Technician' },
  { value: 'read_only_user', label: 'Read Only User' },
]

const MOCK_PERMISSIONS: Record<string, Record<string, PermLevel>> = {
  admin: {
    miner: 'rw',
    container: 'rw',
    users: 'rw',
    settings: 'rw',
    alerts: 'rw',
    reporting: 'rw',
  },
  site_manager: {
    miner: 'rw',
    container: 'rw',
    users: 'r',
    settings: 'r',
    alerts: 'rw',
    reporting: 'rw',
  },
  site_operator: {
    miner: 'rw',
    container: 'r',
    users: false,
    settings: false,
    alerts: 'r',
    reporting: 'r',
  },
  field_operator: {
    miner: 'rw',
    container: false,
    users: false,
    settings: false,
    alerts: 'r',
    reporting: false,
  },
  read_only_user: {
    miner: 'r',
    container: 'r',
    users: false,
    settings: false,
    alerts: 'r',
    reporting: 'r',
  },
}

const MOCK_PERM_LABELS: Record<string, string> = {
  miner: 'Miners',
  container: 'Containers',
  users: 'User Management',
  settings: 'Settings',
  alerts: 'Alerts',
  reporting: 'Reporting',
}

const MOCK_FEATURE_FLAGS: Record<string, boolean> = {
  darkModeEnabled: true,
  betaFeaturesEnabled: false,
  advancedAnalytics: true,
  notificationsEnabled: false,
  experimentalUI: false,
}

export const SettingsDemoPage = (): ReactElement => {
  const [users, setUsers] = useState(MOCK_USERS)
  const [headerPrefs, setHeaderPrefs] = useState<HeaderPreferences>(DEFAULT_HEADER_PREFERENCES)
  const [featureFlags, setFeatureFlags] = useState(MOCK_FEATURE_FLAGS)

  const handleCreateUser = async (data: { name: string; email: string; role: string }) => {
    const newUser: SettingsUser = {
      id: String(Date.now()),
      name: data.name,
      email: data.email,
      role: data.role,
      lastActive: new Date().toISOString(),
    }
    setUsers((prev) => [...prev, newUser])
  }

  const handleUpdateUser = async (data: {
    id: string
    name: string
    email: string
    role: string
  }) => {
    setUsers((prev) => prev.map((u) => (u.id === data.id ? { ...u, ...data } : u)))
  }

  const handleDeleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const handleExport = () => {
    // eslint-disable-next-line no-console
    console.log('Export triggered', { headerPrefs, featureFlags })
  }

  const handleImport = (data: SettingsExportData) => {
    if (data.headerControls) {
      setHeaderPrefs(data.headerControls as unknown as HeaderPreferences)
    }
    if (data.featureFlags) {
      setFeatureFlags(data.featureFlags)
    }
  }

  return (
    <div className="settings-demo">
      <DemoPageHeader
        title="Settings"
        description="Full settings page with all sub-sections. Each section (Header Controls, RBAC, Import/Export, Feature Flags) can also be imported and used individually."
      />

      <div className="settings-demo__section">
        <SettingsDashboard
          dangerActions={[
            {
              label: `Reboot ${WEBAPP_NAME}`,
              variant: 'danger',
              mode: 'dialog',
              confirmation: {
                title: `Reboot ${WEBAPP_NAME}`,
                description: (
                  <p>
                    The Reboot feature restarts all device communication workers. Ensure no pending
                    actions exist before proceeding.
                  </p>
                ),
                onConfirm: () => {
                  // eslint-disable-next-line no-console
                  console.log('Reboot confirmed')
                },
              },
            },
            {
              label: 'Disable container automation',
              variant: 'danger',
              mode: 'dialog',
              confirmation: {
                title: 'Disable container automation',
                description: (
                  <p>
                    The container automation feature sends miners to sleep if critical pump failures
                    occur.
                  </p>
                ),
                onConfirm: () => {
                  // eslint-disable-next-line no-console
                  console.log('Toggle automation confirmed')
                },
              },
            },
          ]}
          headerControlsProps={{
            preferences: headerPrefs,
            onToggle: (key, value) => setHeaderPrefs((prev) => ({ ...prev, [key]: value })),
            onReset: () => setHeaderPrefs(DEFAULT_HEADER_PREFERENCES),
          }}
          rbacControlProps={{
            users,
            roles: MOCK_ROLES,
            rolePermissions: MOCK_PERMISSIONS,
            permissionLabels: MOCK_PERM_LABELS,
            canWrite: true,
            onCreateUser: handleCreateUser,
            onUpdateUser: handleUpdateUser,
            onDeleteUser: handleDeleteUser,
          }}
          importExportProps={{
            onExport: handleExport,
            onImport: handleImport,
          }}
          featureFlagsProps={{
            featureFlags,
            isEditingEnabled: true,
            onSave: (flags) => setFeatureFlags(flags),
          }}
          showFeatureFlags
        />
      </div>
    </div>
  )
}
