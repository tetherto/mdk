/**
 * Tag / type-prefix predicates and helpers — the smallest data-layer
 * primitives describing how miner / container devices encode their kind
 * in their `type` string. Owned by ui-core so the React layers stay free
 * of tag-string knowledge.
 *
 * Lifted from `packages/react-devkit/src/foundation/utils/device-utils.ts`
 * per the layering rule documented in `docs/ARCHITECTURE.md`.
 */

import { MINER_TYPE } from '../constants/device-constants'

const MINER_PREFIX = 'miner-'
const CONTAINER_PREFIX = 'container-'
const ID_TAG_PREFIX = 'id-'

export const isMiner = (type: string | undefined): boolean =>
  typeof type === 'string' && type.startsWith(MINER_PREFIX)

export const isContainer = (type: string | undefined): boolean =>
  typeof type === 'string' && type.startsWith(CONTAINER_PREFIX)

export const isAvalon = (type: string | undefined): boolean =>
  isMiner(type) && (type ?? '').includes(MINER_TYPE.AVALON)

export const isWhatsminer = (type: string | undefined): boolean =>
  isMiner(type) && (type ?? '').includes(MINER_TYPE.WHATSMINER)

export const isAntminer = (type: string | undefined): boolean =>
  isMiner(type) && typeof type === 'string' && type.includes(MINER_TYPE.ANTMINER)

export const removeContainerPrefix = (text: string): string => text.replace(/^container-/, '')

export const appendContainerToTag = (deviceId: string): string => `${CONTAINER_PREFIX}${deviceId}`

export const appendIdToTag = (deviceId: string): string => `${ID_TAG_PREFIX}${deviceId}`

export const appendIdToTags = (deviceIdList: string[]): string[] =>
  deviceIdList.map((deviceId) => appendIdToTag(deviceId))
