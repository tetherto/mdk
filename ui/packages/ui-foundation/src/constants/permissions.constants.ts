export const AUTH_PERMISSIONS = {
  TEMP: 'temp',
  MINER: 'miner',
  USERS: 'users',
  ALERTS: 'alerts',
  TICKETS: 'tickets',
  ACTIONS: 'actions',
  REVENUE: 'revenue',
  FEATURES: 'features',
  CABINETS: 'cabinets',
  COMMENTS: 'comments',
  EXPLORER: 'explorer',
  SETTINGS: 'settings',
  REPORTING: 'reporting',
  INVENTORY: 'inventory',
  CONTAINER: 'container',
  MINERPOOL: 'minerpool',
  POWERMETER: 'powermeter',
  PRODUCTION: 'production',
  ELECTRICITY: 'electricity',
} as const

export const AUTH_LEVELS = {
  READ: 'r',
  WRITE: 'w',
} as const

export const USER_ROLE = {
  ADMIN: 'admin',
  READ_ONLY: 'read_only_user',
  SITE_MANAGER: 'site_manager',
  SITE_OPERATOR: 'site_operator',
  FIELD_OPERATOR: 'field_operator',
  REPAIR_TECHNICIAN: 'repair_technician',
  REPORTING_TOOL_MANAGER: 'reporting_tool_manager',
} as const

// Type exports
export type UserRoleKey = keyof typeof USER_ROLE
export type AuthLevelKey = keyof typeof AUTH_LEVELS
export type UserRoleValue = (typeof USER_ROLE)[UserRoleKey]
export type AuthPermissionKey = keyof typeof AUTH_PERMISSIONS
export type AuthLevelValue = (typeof AUTH_LEVELS)[AuthLevelKey]
export type AuthPermissionValue = (typeof AUTH_PERMISSIONS)[AuthPermissionKey]
