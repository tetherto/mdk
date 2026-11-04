/**
 * Type-prefix predicates and tag helpers for MDK device types: a miner's
 * `type` starts with `miner-` (then the brand code), a container's with
 * `container-`, and a device's own search tag is `id-<deviceId>`. Owned by
 * ui-foundation so the React layers stay free of tag-string knowledge.
 */

import { MINER_TYPE } from '../constants/device-constants.js'

const MINER_PREFIX = 'miner-'
const CONTAINER_PREFIX = 'container-'
const ID_TAG_PREFIX = 'id-'

/**
 * True when a device type is a miner, meaning it starts with `miner-`.
 *
 * @category general
 */
export const isMiner = (type: string | undefined): boolean =>
  typeof type === 'string' && type.startsWith(MINER_PREFIX)

/**
 * True when a device type is a container, meaning it starts with `container-`.
 *
 * @category general
 */
export const isContainer = (type: string | undefined): boolean =>
  typeof type === 'string' && type.startsWith(CONTAINER_PREFIX)

/**
 * True when a device type is a miner of the Avalon brand.
 *
 * @category general
 */
export const isAvalon = (type: string | undefined): boolean =>
  isMiner(type) && (type ?? '').includes(MINER_TYPE.AVALON)

/**
 * True when a device type is a miner of the Whatsminer brand.
 *
 * @category general
 */
export const isWhatsminer = (type: string | undefined): boolean =>
  isMiner(type) && (type ?? '').includes(MINER_TYPE.WHATSMINER)

/**
 * True when a device type is a miner of the Antminer brand.
 *
 * @category general
 */
export const isAntminer = (type: string | undefined): boolean =>
  isMiner(type) && typeof type === 'string' && type.includes(MINER_TYPE.ANTMINER)

/**
 * Strips the leading `container-` from a device type, leaving the model part.
 *
 * @category general
 */
export const removeContainerPrefix = (text: string): string => text.replace(/^container-/, '')

/**
 * Builds a container device type by prefixing a device id with `container-`.
 *
 * @category general
 */
export const appendContainerToTag = (deviceId: string): string => `${CONTAINER_PREFIX}${deviceId}`

/**
 * Builds a device's own search tag by prefixing its id with `id-`.
 *
 * @category general
 */
export const appendIdToTag = (deviceId: string): string => `${ID_TAG_PREFIX}${deviceId}`

/**
 * Builds the search tag for each device id in a list.
 *
 * @category general
 */
export const appendIdToTags = (deviceIdList: string[]): string[] =>
  deviceIdList.map((deviceId) => appendIdToTag(deviceId))
