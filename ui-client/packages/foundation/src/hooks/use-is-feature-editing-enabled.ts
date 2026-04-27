import { useCheckPerm } from './use-permissions'

const FEATURES_CAP = 'features' as const

/**
 * Hook to check if the current user has the capability to edit feature flags.
 *
 * @returns true if the user has the 'features' capability
 */
export const useIsFeatureEditingEnabled = (): boolean => useCheckPerm({ cap: FEATURES_CAP })
