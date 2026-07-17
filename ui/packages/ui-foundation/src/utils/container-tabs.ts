/**
 * Per-model container detail-tab matrix — which tabs a container type shows,
 * in which order. Pure data + string predicates, owned by ui-foundation so the
 * React layers stay free of container-model knowledge.
 *
 * Ported from the reference app's `containerTabsHelper.tsx` / `containerUtils.base.ts`
 * (verified 2026-07-01 against the running operator app). One quirk carried
 * over deliberately: the Power Adjustment tab is NOT per-model — it is spliced
 * in right after the PDU tab for Whatsminer-miner containers only.
 */

import { CONTAINER_MODEL, CONTAINER_TAB, CONTAINER_TYPE } from '../constants/container-constants'
import { CONTAINERS_MINER_TYPE } from '../constants/device-constants'
import type { ContainerTabValue } from '../constants/container-constants'
import { isContainer } from './device-tags'

const includesLower = (type: string | undefined, fragment: string): boolean =>
  (type ?? '').toLowerCase().includes(fragment)

/** Bitdeer family — `container-bd-*` and anything mentioning `bitdeer`. */
export const isBitdeerContainer = (type: string | undefined): boolean =>
  includesLower(type, CONTAINER_TYPE.BITDEER) || includesLower(type, CONTAINER_MODEL.BITDEER)

/** Antspace/Bitmain hydro family (`as-hk3`, `antspace-hydro`, `bitmain-hydro`). */
export const isAntspaceHydroContainer = (type: string | undefined): boolean =>
  includesLower(type, CONTAINER_TYPE.ANTSPACE_HYDRO) ||
  includesLower(type, CONTAINER_MODEL.ANTSPACE_HYDRO) ||
  includesLower(type, CONTAINER_MODEL.BITMAIN_HYDRO)

/** Antspace/Bitmain immersion family (`as-immersion`, `bitmain-imm[ersion]`). */
export const isAntspaceImmersionContainer = (type: string | undefined): boolean =>
  includesLower(type, CONTAINER_TYPE.ANTSPACE_IMMERSION) ||
  includesLower(type, CONTAINER_MODEL.ANTSPACE_IMMERSION) ||
  includesLower(type, CONTAINER_MODEL.BITMAIN_IMMERSION) ||
  includesLower(type, CONTAINER_MODEL.BITMAIN_IMM)

/** MicroBT family (`mbt`, `microbt`). */
export const isMicroBTContainer = (type: string | undefined): boolean =>
  includesLower(type, CONTAINER_TYPE.MICROBT) || includesLower(type, CONTAINER_MODEL.MICROBT)

/** Gamma family (`m221`, `gamma`). */
export const isGammaContainer = (type: string | undefined): boolean =>
  includesLower(type, CONTAINER_MODEL.M221) || includesLower(type, CONTAINER_MODEL.GAMMA)

/**
 * Containers populated with Whatsminer miners (`m56` / `m30` positions, or
 * any MicroBT container) — the set that gets the Power Adjustment tab.
 */
export const isWhatsminerContainer = (type: string | undefined): boolean =>
  isContainer(type) &&
  (includesLower(type, CONTAINERS_MINER_TYPE.M56) ||
    includesLower(type, CONTAINERS_MINER_TYPE.M30) ||
    isMicroBTContainer(type))

/**
 * Container model families the tab matrix distinguishes. Detection order
 * matters and mirrors the reference app's if/else chain — see
 * {@link resolveContainerModelFamily}.
 */
export const CONTAINER_MODEL_FAMILY = {
  BITDEER: 'bitdeer',
  ANTSPACE_HYDRO: 'antspace-hydro',
  ANTSPACE_IMMERSION: 'antspace-immersion',
  MICROBT: 'microbt',
  GAMMA: 'gamma',
} as const

export type ContainerModelFamily =
  (typeof CONTAINER_MODEL_FAMILY)[keyof typeof CONTAINER_MODEL_FAMILY]

const FAMILY_PREDICATES: ReadonlyArray<
  readonly [ContainerModelFamily, (type: string | undefined) => boolean]
> = [
  [CONTAINER_MODEL_FAMILY.BITDEER, isBitdeerContainer],
  [CONTAINER_MODEL_FAMILY.ANTSPACE_HYDRO, isAntspaceHydroContainer],
  [CONTAINER_MODEL_FAMILY.ANTSPACE_IMMERSION, isAntspaceImmersionContainer],
  [CONTAINER_MODEL_FAMILY.MICROBT, isMicroBTContainer],
  [CONTAINER_MODEL_FAMILY.GAMMA, isGammaContainer],
]

/**
 * Resolves a raw container `type` string (e.g. `container-bd-d40-m56`) to its
 * model family, or `undefined` for unknown types. First match wins, in
 * the reference app's original branch order.
 */
export const resolveContainerModelFamily = (
  type: string | undefined,
): ContainerModelFamily | undefined => FAMILY_PREDICATES.find(([, matches]) => matches(type))?.[0]

/**
 * Base tab sequence per model family — order is display order. Power
 * Adjustment is intentionally absent here: it is inserted positionally by
 * {@link getSupportedContainerTabs}.
 */
export const CONTAINER_TAB_MATRIX: Record<ContainerModelFamily, readonly ContainerTabValue[]> = {
  [CONTAINER_MODEL_FAMILY.BITDEER]: [
    CONTAINER_TAB.HOME,
    CONTAINER_TAB.PDU,
    CONTAINER_TAB.SETTINGS,
    CONTAINER_TAB.CHARTS,
    CONTAINER_TAB.HEATMAP,
  ],
  [CONTAINER_MODEL_FAMILY.ANTSPACE_HYDRO]: [
    CONTAINER_TAB.HOME,
    CONTAINER_TAB.PDU,
    CONTAINER_TAB.ALARM,
    CONTAINER_TAB.SETTINGS,
    CONTAINER_TAB.CHARTS,
    CONTAINER_TAB.HEATMAP,
  ],
  [CONTAINER_MODEL_FAMILY.ANTSPACE_IMMERSION]: [
    CONTAINER_TAB.HOME,
    CONTAINER_TAB.PDU,
    CONTAINER_TAB.ALARM,
    CONTAINER_TAB.SETTINGS,
    CONTAINER_TAB.CHARTS,
    CONTAINER_TAB.HEATMAP,
  ],
  [CONTAINER_MODEL_FAMILY.MICROBT]: [
    CONTAINER_TAB.HOME,
    CONTAINER_TAB.PDU,
    CONTAINER_TAB.SETTINGS,
    CONTAINER_TAB.CHARTS,
    CONTAINER_TAB.HEATMAP,
  ],
  [CONTAINER_MODEL_FAMILY.GAMMA]: [
    CONTAINER_TAB.HOME,
    CONTAINER_TAB.PDU,
    CONTAINER_TAB.SETTINGS,
    CONTAINER_TAB.CHARTS,
  ],
}

/**
 * Full tab sequence for a container type: the family's base sequence, plus
 * Power Adjustment spliced in after the PDU tab for Whatsminer containers.
 * Unknown types resolve to an empty list.
 */
export const getSupportedContainerTabs = (type: string | undefined): ContainerTabValue[] => {
  const family = resolveContainerModelFamily(type)
  if (!family) return []

  const tabs: ContainerTabValue[] = [...CONTAINER_TAB_MATRIX[family]]

  if (isWhatsminerContainer(type)) {
    const pduIndex = tabs.indexOf(CONTAINER_TAB.PDU)
    // PDU is guaranteed present for Whatsminer families; append as a fallback if not.
    const insertAt = pduIndex === -1 ? tabs.length : pduIndex + 1
    tabs.splice(insertAt, 0, CONTAINER_TAB.POWER_ADJUSTMENT)
  }

  return tabs
}

/** The PDU grid renders under the `pdu` tab key. */
export const isPduContainerTab = (tab: string | undefined): boolean =>
  tab === CONTAINER_TAB.PDU
