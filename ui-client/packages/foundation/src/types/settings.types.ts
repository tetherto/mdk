export type SettingsUser = {
  id: string
  name?: string
  email: string
  role: string
  last_login?: string
  lastActive?: string
  [key: string]: unknown
}

export type RoleOption = {
  label: string
  value: string
}

export type PermLevel = 'rw' | 'r' | false

export type RolesPermissionsData = {
  permissions: Record<string, Record<string, PermLevel>>
  labels: Record<string, string>
}

export type SettingsExportData<TExtra extends Record<string, unknown> = Record<string, unknown>> = {
  headerControls?: Record<string, boolean>
  featureFlags?: Record<string, boolean>
  timestamp?: string
  version?: string
} & TExtra

export type ImportResult = {
  success: boolean
  applied?: string[]
  errors?: string[]
  message?: string
}
