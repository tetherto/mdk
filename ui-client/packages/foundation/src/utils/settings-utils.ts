import { WEBAPP_NAME } from '../constants'
import type { SettingsExportData, SettingsUser } from '../types/settings.types'

type FilterUsersParams = {
  users: SettingsUser[]
  email: string | null | undefined
  role: string | null | undefined
}

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

export const formatRoleLabel = (role: string): string =>
  role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

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

export const exportSettingsToFile = (data: SettingsExportData): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `miningos-settings-${timestamp}.json`

  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)

  return filename
}
