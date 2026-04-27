import type { UnknownRecord } from '@mdk/core'
import { useEffect, useState } from 'react'
import { THRESHOLD_LEVEL, THRESHOLD_TYPE } from '../constants/container-constants'
import {
  determineThresholdsToUse,
  findMatchingContainer,
  shouldAutoSaveDefaults,
} from '../utils/container-threshold-utils'
import { useNotification } from './use-notification'

// Mock data for development
const MOCK_SITE_DATA = {
  site: 'mock-site-id',
  name: 'Mock Site',
}

const MOCK_CONTAINER_SETTINGS: UnknownRecord[] = []

// Mock API functions (to be replaced with real API during integration)
const mockSetContainerSettings = async (): Promise<{ data: { success: boolean }; error: any }> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return {
    data: { success: true },
    error: null,
  }
}

export type UseContainerThresholdsProps = {
  data: UnknownRecord
  onSave?: (params: { data: UnknownRecord }) => Promise<void>
}

export type UseContainerThresholdsReturn = {
  // State
  thresholds: UnknownRecord
  parameters: UnknownRecord
  isEditing: boolean
  isSaving: boolean
  isSiteLoading: boolean
  isSettingsLoading: boolean

  // Methods
  handleThresholdChange: (thresholdType: string, key: string, value: string | number) => void
  handleThresholdBlur: (thresholdType: string, key: string, value: string) => void
  handleSave: () => Promise<void>
  handleReset: () => Promise<void>
  setParameters: (params: UnknownRecord | ((prev: UnknownRecord) => UnknownRecord)) => void
  setIsEditing: (isEditing: boolean) => void
}

/**
 * Hook for managing container thresholds
 *
 * Features:
 * - Load and save container threshold settings
 * - Auto-save default thresholds when none exist
 * - Validate and auto-adjust overlapping thresholds
 * - Handle reset to saved/default values
 *
 * @example
 * ```tsx
 * const {
 *   thresholds,
 *   isEditing,
 *   isSaving,
 *   handleThresholdChange,
 *   handleSave,
 *   handleReset,
 * } = useContainerThresholds({ data: containerData })
 * ```
 */
export const useContainerThresholds = ({
  data,
  onSave,
}: UseContainerThresholdsProps): UseContainerThresholdsReturn => {
  const { notifySuccess, notifyError } = useNotification()
  const [thresholds, setThresholds] = useState<UnknownRecord>({})
  const [parameters, setParameters] = useState<UnknownRecord>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasAutoSavedDefaults, setHasAutoSavedDefaults] = useState(false)

  // Mock loading states (to be replaced with real API)
  const isSiteLoading = false
  const isSettingsLoading = false

  // Mock data (to be replaced with real API)
  const siteData = MOCK_SITE_DATA
  const containerSettings = MOCK_CONTAINER_SETTINGS

  // Find matching container settings
  const matchingContainer = findMatchingContainer(containerSettings, data?.type as string)

  // Auto-save defaults handler
  const handleAutoSaveDefaults = async (): Promise<void> => {
    if (!siteData?.site) return

    try {
      const defaultThresholds = determineThresholdsToUse({
        matchingContainer: null,
        parentThresholds: null,
        containerType: data?.type as string,
      })

      if (defaultThresholds && Object.keys(defaultThresholds).length > 0) {
        // TODO: Replace with real API call during integration
        const { data: response } = await mockSetContainerSettings()

        if (response?.success) {
          setHasAutoSavedDefaults(true)
        }
      }
    } catch (error) {
      console.error('Error auto-saving defaults:', error)
    }
  }

  // Auto-save defaults if needed
  useEffect(() => {
    if (
      shouldAutoSaveDefaults({
        isSiteLoading,
        isSettingsLoading,
        siteData,
        matchingContainer,
        parentThresholds: data?.thresholds as UnknownRecord,
        hasAutoSavedDefaults,
      })
    ) {
      handleAutoSaveDefaults()
    } else {
      const thresholdsToUse = determineThresholdsToUse({
        matchingContainer,
        parentThresholds: data?.thresholds as UnknownRecord,
        containerType: data?.type as string,
      })

      setThresholds(thresholdsToUse)
      setParameters({})
    }
  }, [containerSettings])

  // Save handler
  const handleSave = async (): Promise<void> => {
    if (isSiteLoading || !siteData?.site) {
      notifyError(
        'Site information not available. Please try again.',
        'Please refresh the page and try again.',
      )
      return
    }

    try {
      setIsSaving(true)

      if (onSave) {
        await onSave({ data: { ...data, thresholds, parameters } })
      } else {
        // TODO: Replace with real API call during integration
        const { data: response, error } = await mockSetContainerSettings()

        if (response?.success) {
          notifySuccess(
            'Container settings saved successfully',
            'Settings have been updated successfully',
          )
          setIsEditing(false)
        } else {
          notifyError('Failed to save settings', error?.message || 'Unknown error')
        }
      }
    } catch (error) {
      notifyError('Failed to save settings', (error as Error)?.message || 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }

  // Reset handler
  const handleReset = async (): Promise<void> => {
    const thresholdsToUse = determineThresholdsToUse({
      matchingContainer,
      parentThresholds: data?.thresholds as UnknownRecord,
      containerType: data?.type as string,
    })

    setThresholds(thresholdsToUse)

    // If we're using defaults (no saved settings and no parent thresholds), save them to BE
    const hasNoSavedSettings = !matchingContainer
    const hasNoParentThresholds = !data?.thresholds || Object.keys(data.thresholds).length === 0
    const hasThresholdsToSave = thresholdsToUse && Object.keys(thresholdsToUse).length > 0

    if (hasNoSavedSettings && hasNoParentThresholds && siteData?.site && hasThresholdsToSave) {
      try {
        // TODO: Replace with real API call during integration
        const { data: response, error } = await mockSetContainerSettings()

        if (response?.success) {
          notifySuccess(
            'Reset to defaults and saved successfully',
            'Settings have been reset and saved successfully',
          )
        } else {
          notifyError('Failed to save defaults after reset', error?.message || 'Unknown error')
        }
      } catch (error) {
        notifyError(
          'Failed to save defaults after reset',
          (error as Error)?.message || 'Unknown error',
        )
      }
    }

    setIsEditing(false)
  }

  // Helper function to get the correct order of threshold keys
  const getThresholdOrder = (thresholdType: string): string[] => {
    // Common threshold order for most types
    const commonOrder: string[] = [
      THRESHOLD_LEVEL.CRITICAL_LOW,
      THRESHOLD_LEVEL.ALERT,
      THRESHOLD_LEVEL.NORMAL,
      THRESHOLD_LEVEL.ALARM,
      THRESHOLD_LEVEL.CRITICAL_HIGH,
    ]

    // Special cases for different container types
    if (
      thresholdType === THRESHOLD_TYPE.TANK_PRESSURE ||
      thresholdType === THRESHOLD_TYPE.SUPPLY_LIQUID_PRESSURE
    ) {
      return [
        THRESHOLD_LEVEL.CRITICAL_LOW,
        THRESHOLD_LEVEL.ALARM_LOW,
        THRESHOLD_LEVEL.NORMAL,
        THRESHOLD_LEVEL.ALARM_HIGH,
        THRESHOLD_LEVEL.CRITICAL_HIGH,
      ]
    }

    if (thresholdType === THRESHOLD_TYPE.WATER_TEMPERATURE) {
      return [
        THRESHOLD_LEVEL.CRITICAL_LOW,
        THRESHOLD_LEVEL.ALARM_LOW,
        THRESHOLD_LEVEL.NORMAL,
        THRESHOLD_LEVEL.ALARM_HIGH,
        THRESHOLD_LEVEL.CRITICAL_HIGH,
      ]
    }

    // Default order for oilTemperature and other types
    return commonOrder
  }

  // Helper function to auto-adjust threshold values to prevent overlaps
  const autoAdjustThresholds = (
    thresholdType: string,
    thresholds: UnknownRecord,
    changedKey: string,
  ): UnknownRecord => {
    const adjusted = { ...thresholds }
    const order = getThresholdOrder(thresholdType)
    const idx = order.indexOf(changedKey)

    if (idx === -1) return adjusted

    const v = adjusted[changedKey] as number
    if (v === null || v === undefined) return adjusted

    // Adjust values before the changed key
    for (let i = idx - 1; i >= 0; i--) {
      const k = order[i] as string
      if (adjusted[k] === undefined) continue
      if ((adjusted[k] as number) > v) adjusted[k] = v
      else break
    }

    // Adjust values after the changed key
    for (let i = idx + 1; i < order.length; i++) {
      const k = order[i] as string
      if (adjusted[k] === undefined) continue
      if ((adjusted[k] as number) < v) adjusted[k] = v
      else break
    }

    return adjusted
  }

  // Threshold change handler - updates the value without validation
  const handleThresholdChange = (
    thresholdType: string,
    key: string,
    value: string | number,
  ): void => {
    const newValue = Number.parseFloat(String(value)) || 0

    setThresholds((prev) => {
      const currentThresholds = (prev[thresholdType] as UnknownRecord) || {}

      return {
        ...prev,
        [thresholdType]: {
          ...currentThresholds,
          [key]: newValue,
        },
      }
    })
    setIsEditing(true)
  }

  // Blur handler for validation and auto-adjustment
  const handleThresholdBlur = (thresholdType: string, key: string, value: string): void => {
    const newValue = Number.parseFloat(value) || 0

    setThresholds((prev) => {
      const currentThresholds = (prev[thresholdType] as UnknownRecord) || {}
      const updatedThresholds = {
        ...currentThresholds,
        [key]: newValue,
      }

      // Auto-adjust overlapping values to maintain logical order
      const adjustedThresholds = autoAdjustThresholds(thresholdType, updatedThresholds, key)

      return {
        ...prev,
        [thresholdType]: adjustedThresholds,
      }
    })
  }

  return {
    // State
    thresholds,
    parameters,
    isEditing,
    isSaving,
    isSiteLoading,
    isSettingsLoading,

    // Methods
    handleThresholdChange,
    handleThresholdBlur,
    handleSave,
    handleReset,
    setParameters,
    setIsEditing,
  }
}
