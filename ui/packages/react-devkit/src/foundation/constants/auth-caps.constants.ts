export const AUTH_CAPS = {
  temp: 't',
  miner: 'm',
  revenue: 'r',
  container: 'c',
  features: 'f',
  powermeter: 'p',
  minerpool: 'mp',
  electricity: 'e',
} as const

// Type exports
export type AuthCapKey = keyof typeof AUTH_CAPS
export type AuthCapValue = (typeof AUTH_CAPS)[AuthCapKey]
