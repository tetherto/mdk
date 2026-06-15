import { describe, expect, it } from 'vitest'

import { REPORT_DURATIONS } from '../site-reports.constants'
import { buildSiteReportRecords } from '../site-reports-utils'

describe('buildSiteReportRecords', () => {
  it('returns weekly rows for a fixed reference date', () => {
    const ref = new Date(2026, 4, 15)
    const rows = buildSiteReportRecords(REPORT_DURATIONS.WEEKLY, ref)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0]?.from).toBeInstanceOf(Date)
    expect(rows[0]?.publishedAt.getTime()).toBeGreaterThan(rows[0]!.to.getTime())
  })
})
