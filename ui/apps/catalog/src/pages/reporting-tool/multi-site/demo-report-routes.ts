import _toLower from 'lodash/toLower'

import { DEMO_REPORT_SITES, REGION_DISPLAY_NAMES } from './demo-report-sites'

export type DemoReportScope = {
  siteId?: string
  pageTitle: string
  coverTitle: string
  locationLabel: string
}

const normalizeSiteId = (siteId: string): string => _toLower(siteId)

export const getDemoReportScope = (siteId?: string): DemoReportScope => {
  if (!siteId) {
    return {
      locationLabel: 'All Sites',
      coverTitle: 'All sites',
      pageTitle: 'All Sites · Reports',
    }
  }

  const normalized = normalizeSiteId(siteId)
  const site = DEMO_REPORT_SITES.find((s) => normalizeSiteId(s.id) === normalized)
  const name = site?.name ?? REGION_DISPLAY_NAMES[normalized.toUpperCase()] ?? normalized

  return {
    siteId: normalized,
    locationLabel: name,
    coverTitle: name,
    pageTitle: `${name} · Reports`,
  }
}

export const getSiteReportDetailPath = (siteId: string | undefined, search: string): string => {
  const base = siteId ? `/sites/${siteId}/site-reports/report` : '/site-reports/report'
  
  return search ? `${base}?${search}` : base
}
