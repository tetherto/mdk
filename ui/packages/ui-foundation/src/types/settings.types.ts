/**
 * A user row on the settings screen. Carries the identity and role fields the UI
 * needs, and tolerates extra fields the backend adds.
 *
 * @category general
 */
export type SettingsUser = {
  id: string
  name?: string
  email: string
  role: string
  last_login?: string
  lastActive?: string
  [key: string]: unknown
}

/**
 * A selectable role in a dropdown: the stored value and the label shown for it.
 *
 * @category general
 */
export type RoleOption = {
  label: string
  value: string
}

/**
 * The access a role has over one resource: read and write, read only, or `false`
 * for none.
 *
 * @category general
 */
export type PermLevel = 'rw' | 'r' | false

/**
 * The permissions matrix behind the roles screen: the level each role holds over
 * each resource, with the display labels for those resources.
 *
 * @category general
 */
export type RolesPermissionsData = {
  permissions: Record<string, Record<string, PermLevel>>
  labels: Record<string, string>
}

/**
 * The contents of an exported settings file. Every field is optional, so a partial
 * export still imports, and extra product-specific fields can be added.
 *
 * @category general
 */
export type SettingsExportData<TExtra extends Record<string, unknown> = Record<string, unknown>> = {
  headerControls?: Record<string, boolean>
  featureFlags?: Record<string, boolean>
  timestamp?: string
  version?: string
} & TExtra

/**
 * The outcome of importing a settings file: whether it succeeded, which settings
 * were applied, and any errors to show.
 *
 * @category general
 */
export type ImportResult = {
  success: boolean
  applied?: string[]
  errors?: string[]
  message?: string
}
