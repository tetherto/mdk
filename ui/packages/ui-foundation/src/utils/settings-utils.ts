import type { SettingsExportData, SettingsUser } from '../types/settings.types.js'
import { downloadJson } from './download-utils.js'

const WEBAPP_NAME = 'Appl.'

type FilterUsersParams = {
  users: SettingsUser[]
  email: string | null | undefined
  role: string | null | undefined
}

/**
 * Narrows a user list by email substring, by role, or by both. Omitted filters are
 * ignored, and the email match is case-insensitive.
 *
 * @category general
 */
export const filterUsers = ({ users, email, role }: FilterUsersParams): SettingsUser[] =>
  users.filter((user) => {
    let match = true
    if (email) {
      match = match && user.email.toLowerCase().includes(email.toLowerCase())
    }
    if (role) {
      match = match && user.role === role
    }
    return match
  })

/**
 * Turns a role key into a readable label, so `site_manager` becomes `Site Manager`.
 *
 * @category general
 */
export const formatRoleLabel = (role: string): string =>
  role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

/**
 * Formats a timestamp as `MM/DD/YYYY - HH:mm`. Returns `-` when the timestamp is
 * missing or unparseable.
 *
 * @category general
 */
export const formatLastActive = (timestamp: string | undefined): string => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '-'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day}/${year} - ${hours}:${minutes}`
}

/**
 * Type guard checking that parsed JSON looks like an exported settings file,
 * meaning it carries header controls, feature flags, or a timestamp.
 *
 * @category general
 */
export const validateSettingsJson = (data: unknown): data is SettingsExportData => {
  if (!data || typeof data !== 'object') {
    return false
  }

  const settingsData = data as Record<string, unknown>

  return (
    'headerControls' in settingsData ||
    'featureFlags' in settingsData ||
    'timestamp' in settingsData
  )
}

/**
 * Reads a settings file the user picked and resolves its parsed contents,
 * rejecting if the file cannot be read or does not validate.
 *
 * @category general
 */
export const parseSettingsFile = async (file: File): Promise<SettingsExportData> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const data = JSON.parse(text)

        if (!validateSettingsJson(data)) {
          reject(
            new Error(
              `Invalid settings file format. Please ensure the file is a valid ${WEBAPP_NAME} settings export.`,
            ),
          )
          return
        }

        resolve(data as SettingsExportData)
      } catch {
        reject(new Error('Failed to parse JSON file. Please ensure the file is valid JSON.'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file.'))
    }

    reader.readAsText(file)
  })

/**
 * Downloads the given settings as a JSON file and returns the filename written.
 *
 * @category general
 */
export const exportSettingsToFile = (data: SettingsExportData): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `mdk-settings-${timestamp}.json`

  downloadJson(data, filename)

  return filename
}
