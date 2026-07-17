import { getLocationLabel } from '@primitives'
import _get from 'lodash/get'
import _isNil from 'lodash/isNil'
import _map from 'lodash/map'
import type { ReactNode } from 'react'

import {
  MINER_LOCATION_BG_COLORS,
  MINER_LOCATION_BORDER_COLORS,
  MINER_STATUS_BG_COLORS,
  MINER_STATUS_BORDER_COLORS,
  MINER_STATUS_NAMES,
} from '../../../constants/miner-constants'
import { getMinerShortCode } from '../../../utils/device-utils'

import {
  DEVICE_ATTRIBUTES,
  FALLBACK_BACKGROUND,
  FALLBACK_BORDER,
} from './movement-details-modal.constants'
import type { MovementData, MovementDevice } from './movement-details-modal.types'

/** Display colors for a status/location badge. */
export type BadgeColors = {
  backgroundColor: string
  borderColor: string
}

/** Resolved label + colors for one side (origin or destination) of a movement. */
export type MovementSideView = {
  locationLabel: string
  locationColors: BadgeColors
  statusLabel: string
  statusColors: BadgeColors
}

/** A single labelled device attribute row. */
export type DeviceAttributeView = {
  label: string
  value: string
}

/** Render-ready device summary. */
export type MovementDeviceView = {
  code: string
  model: string
  attributes: DeviceAttributeView[]
}

/** Fully resolved, render-ready view of a movement. */
export type MovementDetailsViewModel = {
  device: MovementDeviceView | null
  origin: MovementSideView
  destination: MovementSideView
  comments?: ReactNode
}

// Location/status arrive as raw backend strings, not the typed MINER_* key unions, so we
// index the color maps loosely and fall back when a key is unknown (e.g. a typo or new value).
const resolveLocationColors = (location: string): BadgeColors => ({
  backgroundColor:
    (MINER_LOCATION_BG_COLORS as Record<string, string | undefined>)[location] ?? FALLBACK_BACKGROUND,
  borderColor:
    (MINER_LOCATION_BORDER_COLORS as Record<string, string | undefined>)[location] ?? FALLBACK_BORDER,
})

const resolveStatusColors = (status: string): BadgeColors => ({
  backgroundColor:
    (MINER_STATUS_BG_COLORS as Record<string, string | undefined>)[status] ?? FALLBACK_BACKGROUND,
  borderColor:
    (MINER_STATUS_BORDER_COLORS as Record<string, string | undefined>)[status] ?? FALLBACK_BORDER,
})

const resolveStatusLabel = (status: string): string =>
  (MINER_STATUS_NAMES as Record<string, string>)[status] ?? status

const buildSideView = (location: string, status: string): MovementSideView => ({
  locationLabel: getLocationLabel(location),
  locationColors: resolveLocationColors(location),
  statusLabel: resolveStatusLabel(status),
  statusColors: resolveStatusColors(status),
})

const buildDeviceView = (device: MovementDevice | undefined): MovementDeviceView | null => {
  if (_isNil(device)) return null

  // Use || (not ??) so empty backend strings fall through to the next source / dash.
  const model = _get(device, 'info.subType') || _get(device, 'type') || '-'

  return {
    code: getMinerShortCode(device.code, device.tags),
    model: String(model),
    attributes: _map(DEVICE_ATTRIBUTES, ({ label, accessor }) => ({
      label,
      value: String(_get(device, accessor) || '-'),
    })),
  }
}

/**
 * Pure view-model builder for `MovementDetailsModal`.
 * Resolves a raw movement into render-ready labels, badge colors, and device attributes.
 * No React, no side effects.
 *
 * @param movement - The selected historical movement, or `undefined` when nothing is open.
 */
export const buildMovementDetailsViewModel = (
  movement: MovementData | undefined,
): MovementDetailsViewModel | null => {
  if (_isNil(movement)) return null

  return {
    device: buildDeviceView(movement.device),
    origin: buildSideView(movement.origin, movement.previousStatus),
    destination: buildSideView(movement.destination, movement.newStatus),
    comments: movement.comments,
  }
}
