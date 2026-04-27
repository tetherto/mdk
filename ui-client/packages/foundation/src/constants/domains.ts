export const STAGING_ENV = 'staging'

export const WEBAPP_URLS = {
  [STAGING_ENV]: ['dev-moria.tether.to', 'localhost'],
} as const

// Type exports
export type StagingEnvType = typeof STAGING_ENV
export type WebappUrlsKey = keyof typeof WEBAPP_URLS
export type WebappUrlsValue = (typeof WEBAPP_URLS)[WebappUrlsKey]
