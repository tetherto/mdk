export const OsTypes = {
  IOS: 'iOS',
  MAC: 'Mac',
  Linux: 'Linux',
  Windows: 'Windows',
  Android: 'Android',
} as const

// Type exports
export type OsTypeKey = keyof typeof OsTypes
export type OsTypeValue = (typeof OsTypes)[OsTypeKey]
