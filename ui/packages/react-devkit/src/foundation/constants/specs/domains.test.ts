import { describe, expect, it } from 'vitest'
import { STAGING_ENV, WEBAPP_URLS } from '../domains'

describe('domain constants', () => {
  it('should have staging environment defined', () => {
    expect(STAGING_ENV).toBe('staging')
  })

  it('should have webapp URLs for staging', () => {
    expect(WEBAPP_URLS[STAGING_ENV]).toBeDefined()
    expect(Array.isArray(WEBAPP_URLS[STAGING_ENV])).toBe(true)
  })

  it('should include dev and localhost URLs', () => {
    const stagingUrls = WEBAPP_URLS[STAGING_ENV]
    expect(stagingUrls).toContain('dev-moria.tether.to')
    expect(stagingUrls).toContain('localhost')
  })
})
