import { useCallback, useState } from 'react'

const SIDEBAR_STORAGE_KEY = 'mdk-sidebar-state'
const SECTION_STORAGE_KEY = 'mdk-sidebar-sections'

type SidebarState = {
  expanded: boolean
}

type SectionStates = Record<string, boolean>

/**
 * Custom hook to persist sidebar expanded state in localStorage
 */
export const useSidebarExpandedState = (
  defaultExpanded: boolean,
): [boolean, (expanded: boolean) => void] => {
  const [expanded, setExpandedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (stored) {
        const state: SidebarState = JSON.parse(stored)
        return state.expanded
      }
    } catch (error) {
      console.warn('Failed to load sidebar state from localStorage:', error)
    }
    return defaultExpanded
  })

  const setExpanded = useCallback((newExpanded: boolean) => {
    setExpandedState(newExpanded)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify({ expanded: newExpanded }))
    } catch (error) {
      console.warn('Failed to save sidebar state to localStorage:', error)
    }
  }, [])

  return [expanded, setExpanded]
}

/**
 * Custom hook to persist individual section open/closed states in localStorage
 */
export const useSidebarSectionState = (
  sectionId: string,
  defaultOpen: boolean,
): [boolean, (open: boolean) => void] => {
  const [isOpen, setIsOpenState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SECTION_STORAGE_KEY)
      if (stored) {
        const states: SectionStates = JSON.parse(stored)
        return states[sectionId] ?? defaultOpen
      }
    } catch (error) {
      console.warn('Failed to load section states from localStorage:', error)
    }
    return defaultOpen
  })

  const setIsOpen = useCallback(
    (newOpen: boolean) => {
      setIsOpenState(newOpen)
      try {
        const stored = localStorage.getItem(SECTION_STORAGE_KEY)
        const states: SectionStates = stored ? JSON.parse(stored) : {}
        states[sectionId] = newOpen
        localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(states))
      } catch (error) {
        console.warn('Failed to save section state to localStorage:', error)
      }
    },
    [sectionId],
  )

  return [isOpen, setIsOpen]
}

/**
 * Clear all sidebar state from localStorage
 */
export const clearSidebarState = (): void => {
  try {
    localStorage.removeItem(SIDEBAR_STORAGE_KEY)
    localStorage.removeItem(SECTION_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear sidebar state from localStorage:', error)
  }
}
