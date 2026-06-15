import _toLower from 'lodash/toLower'
import { useEffect, useState } from 'react'

/** Canonical OS identifiers returned by {@link detectPlatform} / {@link usePlatform}. */
export const OS_TYPES = {
  IOS: 'ios',
  Android: 'android',
  MAC: 'mac',
  Windows: 'windows',
  Linux: 'linux',
} as const

export type OsTypeValue = (typeof OS_TYPES)[keyof typeof OS_TYPES]

export type PlatformResult = OsTypeValue | 'unknown'

/**
 * Synchronously inspects `navigator.userAgent` and returns a normalised OS
 * identifier (or `'unknown'`). Safe to call inside effects only — calling
 * this during SSR will throw.
 */
export const detectPlatform = (): PlatformResult => {
  const userAgent = _toLower(navigator.userAgent)

  if (/iphone|ipad|ipod/.test(userAgent)) return OS_TYPES.IOS
  if (/android/.test(userAgent)) return OS_TYPES.Android
  if (/mac os/.test(userAgent)) return OS_TYPES.MAC
  if (/windows nt/.test(userAgent)) return OS_TYPES.Windows
  if (/linux/.test(userAgent)) return OS_TYPES.Linux

  return 'unknown'
}

/**
 * SSR-safe React hook returning the detected client OS.
 *
 * Returns `'unknown'` on the first render (and on the server), then
 * resolves to the real value once mounted — so components stay
 * hydration-safe.
 *
 * @category utility
 */
export const usePlatform = (): PlatformResult => {
  const [platform, setPlatform] = useState<PlatformResult>('unknown')

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  return platform
}
