/**
 * Theme system
 *
 * Design tokens, theme utilities, and theming system.
 */

export * from './tokens'
export * from './utils'

// Theme types
export type Theme = 'light' | 'dark' | 'system'

export type ThemeConfig = {
  defaultTheme?: Theme
  storageKey?: string
}
