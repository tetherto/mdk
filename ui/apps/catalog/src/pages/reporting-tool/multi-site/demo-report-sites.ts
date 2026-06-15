import type { MiningReportSite } from '@tetherto/mdk-react-devkit/foundation'

/** Demo sites aligned with moria multi-site report mocks (UY / PY). */
export const DEMO_REPORT_SITES: MiningReportSite[] = [
  { id: 'uy', value: 'UY', label: 'Uruguay', name: 'Uruguay' },
  { id: 'py', value: 'PY', label: 'Paraguay', name: 'Paraguay' },
]

export const REGION_DISPLAY_NAMES: Record<string, string> = {
  UY: 'Uruguay',
  PY: 'Paraguay',
}
