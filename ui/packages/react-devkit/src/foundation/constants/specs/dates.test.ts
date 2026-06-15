import { describe, expect, it } from 'vitest'
import {
  DATE_FORMAT,
  DATE_FORMAT_SLASHED,
  DATE_TIME_FORMAT,
  DATE_TIME_FORMAT_WITH_SECONDS,
  SHORT_DATE_FORMAT,
  TIME_FORMAT,
} from '../dates'

describe('date constants', () => {
  it('should have time format defined', () => {
    expect(TIME_FORMAT).toBe('HH:mm')
  })

  it('should have date formats defined', () => {
    expect(DATE_FORMAT).toBe('dd-MM-yyyy')
    expect(DATE_FORMAT_SLASHED).toBe('dd/MM/yyyy')
    expect(SHORT_DATE_FORMAT).toBe('dd MMM yyyy')
  })

  it('should have datetime formats defined', () => {
    expect(DATE_TIME_FORMAT).toBe('dd-MM-yyyy HH:mm')
    expect(DATE_TIME_FORMAT_WITH_SECONDS).toBe('dd-MM-yyyy HH:mm:ss')
  })

  it('should compose datetime format from date and time formats', () => {
    expect(DATE_TIME_FORMAT).toContain(DATE_FORMAT)
    expect(DATE_TIME_FORMAT).toContain(TIME_FORMAT)
  })
})
