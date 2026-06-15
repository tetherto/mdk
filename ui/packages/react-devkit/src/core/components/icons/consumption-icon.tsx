import { createIcon } from './create-icon'

export const ConsumptionIcon = createIcon({
  displayName: 'ConsumptionIcon',
  viewBox: '0 0 11 14',
  defaultWidth: 11,
  defaultHeight: 14,
  path: ({ color }) => (
    <path
      d="M7.31864 1.1692C7.39325 0.865672 7.01195 0.664627 6.80364 0.897663L1.0123 7.37669C0.839526 7.56998 0.976719 7.87662 1.23597 7.87662H4.43756C4.63327 7.87662 4.77657 8.06099 4.72828 8.25065L3.54831 12.8848C3.47199 13.1846 3.84422 13.3897 4.05687 13.1651L10.3589 6.50946C10.54 6.31824 10.4044 6.00319 10.1411 6.00319H6.51313C6.31844 6.00319 6.17533 5.82064 6.2218 5.63158L7.31864 1.1692Z"
      stroke={color}
      fill="none"
    />
  ),
})
