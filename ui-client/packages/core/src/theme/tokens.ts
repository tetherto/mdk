/**
 * Design tokens
 *
 * These tokens define the visual design system.
 */

export const colors = {
  primary: {
    50: 'hsl(222, 47%, 95%)',
    100: 'hsl(222, 47%, 90%)',
    200: 'hsl(222, 47%, 80%)',
    300: 'hsl(222, 47%, 70%)',
    400: 'hsl(222, 47%, 60%)',
    500: 'hsl(222, 47%, 50%)',
    600: 'hsl(222, 47%, 40%)',
    700: 'hsl(222, 47%, 30%)',
    800: 'hsl(222, 47%, 20%)',
    900: 'hsl(222, 47%, 11.2%)',
  },
  gray: {
    50: 'hsl(210, 40%, 98%)',
    100: 'hsl(210, 40%, 96.1%)',
    200: 'hsl(214, 32%, 91.4%)',
    300: 'hsl(213, 27%, 84.1%)',
    400: 'hsl(215, 20%, 65.1%)',
    500: 'hsl(215, 16%, 47%)',
    600: 'hsl(215, 19%, 35%)',
    700: 'hsl(215, 25%, 27%)',
    800: 'hsl(217, 33%, 17%)',
    900: 'hsl(222, 47%, 11%)',
  },
} as const

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
} as const

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
} as const
