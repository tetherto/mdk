import { COLOR } from '@primitives'

/** Badge background used when a location/status key has no mapped color. */
export const FALLBACK_BACKGROUND = 'transparent'

/** Badge border used when a location/status key has no mapped color. */
export const FALLBACK_BORDER = COLOR.GREY

/** Device attribute rows, in render order, mapped to their lodash `_get` accessor. */
export const DEVICE_ATTRIBUTES: { label: string; accessor: string }[] = [
  { label: 'Site', accessor: 'info.site' },
  { label: 'Container', accessor: 'info.container' },
  { label: 'SN', accessor: 'info.serialNum' },
  { label: 'MAC', accessor: 'info.macAddress' },
]
