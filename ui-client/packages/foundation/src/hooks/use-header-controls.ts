import {
  DEFAULT_HEADER_PREFERENCES,
  HEADER_PREFERENCES_STORAGE_KEY,
} from '../constants/header-controls.constants'
import type { HeaderPreferences } from '../constants/header-controls.constants'
import { useLocalStorage } from './use-local-storage'
import { useNotification } from './use-notification'

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
