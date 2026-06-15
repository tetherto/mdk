import { describe, expect, it } from 'vitest'
import { extractAuthTokenFromUrl, stripAuthTokenFromUrl } from '../url-utils'

describe('extractAuthTokenFromUrl', () => {
  it('returns the token from a leading-? query string', () => {
    expect(extractAuthTokenFromUrl('?authToken=abc.def.ghi')).toBe('abc.def.ghi')
  })

  it('returns the token from a bare query string (no leading ?)', () => {
    expect(extractAuthTokenFromUrl('authToken=abc.def.ghi')).toBe('abc.def.ghi')
  })

  it('returns the token when other params are present', () => {
    expect(extractAuthTokenFromUrl('?foo=1&authToken=xyz&bar=2')).toBe('xyz')
  })

  it('extracts from a full URL by trimming everything before ?', () => {
    expect(extractAuthTokenFromUrl('http://localhost:3030/?authToken=t1')).toBe('t1')
  })

  it('returns null when the param is missing', () => {
    expect(extractAuthTokenFromUrl('?foo=1')).toBeNull()
  })

  it('returns null for an empty input', () => {
    expect(extractAuthTokenFromUrl('')).toBeNull()
  })

  it('returns null when the param exists but is blank', () => {
    expect(extractAuthTokenFromUrl('?authToken=')).toBeNull()
  })
})

describe('stripAuthTokenFromUrl', () => {
  it('removes the authToken param and preserves the rest', () => {
    expect(stripAuthTokenFromUrl('?foo=1&authToken=xyz&bar=2')).toBe('?foo=1&bar=2')
  })

  it('returns an empty string when authToken was the only param', () => {
    expect(stripAuthTokenFromUrl('?authToken=xyz')).toBe('')
  })

  it('returns the input unchanged when the param is absent', () => {
    expect(stripAuthTokenFromUrl('?foo=1')).toBe('?foo=1')
  })

  it('preserves the leading-? style of the input', () => {
    expect(stripAuthTokenFromUrl('foo=1&authToken=xyz')).toBe('foo=1')
  })

  it('handles empty input', () => {
    expect(stripAuthTokenFromUrl('')).toBe('')
  })
})
