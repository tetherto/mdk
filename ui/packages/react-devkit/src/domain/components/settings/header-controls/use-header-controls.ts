import { useLocalStorage } from '@tetherto/mdk-react-adapter'

import {
  DEFAULT_HEADER_PREFERENCES,
  HEADER_PREFERENCES_STORAGE_KEY,
} from '../../../constants/header-controls.constants'
import type { HeaderPreferences } from '../../../constants/header-controls.constants'
import { useNotification } from '../../../utils/use-notification'

/**
 * Read/write hook for the global header-controls store (toggles, sticky flag, theme).
 *
 * @category settings
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const useHeaderControls = () => {
  const { notifySuccess } = useNotification()
  const [preferences, setPreferences] = useLocalStorage<HeaderPreferences>(
    HEADER_PREFERENCES_STORAGE_KEY,
    DEFAULT_HEADER_PREFERENCES,
  )

  const handleToggle = (key: keyof HeaderPreferences, value: boolean) => {
    setPreferences({ ...preferences, [key]: value })
    notifySuccess('Header preference updated', '')
  }

  const handleReset = () => {
    setPreferences(DEFAULT_HEADER_PREFERENCES)
    notifySuccess('Header preferences reset to default', '')
  }

  return {
    preferences,
    isLoading: false,
    error: null,
    handleToggle,
    handleReset,
  }
}
