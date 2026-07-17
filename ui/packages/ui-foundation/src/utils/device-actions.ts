/**
 * Device-action submission builders — the payloads the voting/approval
 * workflow accepts for miner / container / thing control actions. Owned by
 * ui-foundation so action names, param positions, and cross-thing shapes
 * never leak into the React layers.
 *
 * Ported from the reference app's `ACTION_TYPES` + `setAddPendingSubmissionAction`
 * dispatch sites. Ground rules carried over:
 *
 * - Submissions are `{ type: 'voting', action, tags, params, crossThing? }`.
 *   `tags` target devices by their `id-<deviceId>` tag (see `appendIdToTag`
 *   in `device-tags.ts`) or a whole container via `container-<name>`.
 * - `params` is positional and action-specific — the builders below pin each
 *   action's exact arity and encoding (e.g. `setPowerPct` sends the
 *   percentage as a string).
 * - Extra display-only fields (`codesList`, `firmwareLabel`, ...) ride along
 *   via the index signature and are ignored by the backend.
 */

import type { VotingActionParam, VotingActionPayload } from '../types/pool.types'

/** Submission `type` for the voting/approval workflow. */
export const VOTING_SUBMISSION_TYPE = 'voting'

/**
 * Action identifiers accepted by `POST /auth/actions/voting` (the reference app's
 * `ACTION_TYPES`, camelCase vocabulary).
 */
export const DEVICE_ACTION = {
  // Container actions
  SWITCH_CONTAINER: 'switchContainer',
  SWITCH_COOLING_SYSTEM: 'switchCoolingSystem',
  SET_TANK_ENABLED: 'setTankEnabled',
  SET_AIR_EXHAUST_ENABLED: 'setAirExhaustEnabled',
  RESET_COOLING_SYSTEM: 'resetCoolingSystem',
  SET_LIQUID_SUPPLY_TEMPERATURE: 'setLiquidSupplyTemperature',
  SET_TEMPERATURE_SETTINGS: 'setTemperatureSettings',
  SET_COOLING_FAN_THRESHOLD: 'setCoolingFanThreshold',
  SWITCH_SOCKET: 'switchSocket',
  SET_PLC_REGISTERS: 'setPlcRegisters',
  RESET_ALARM: 'resetAlarm',
  RESET_CONTAINER: 'resetContainer',
  EMERGENCY_STOP: 'emergencyStop',
  MAINTENANCE: 'maintenance',

  // Miner actions
  REBOOT: 'reboot',
  SET_POWER_MODE: 'setPowerMode',
  SET_POWER_PCT: 'setPowerPct',
  SETUP_FREQUENCY_SPEED: 'setUpfreqSpeed',
  SET_LED: 'setLED',
  SETUP_POOLS: 'setupPools',
  UPDATE_FIRMWARE: 'updateFirmware',
  DOWNLOAD_LOGS: 'downloadLogs',

  // Thing actions
  REGISTER_THING: 'registerThing',
  UPDATE_THING: 'updateThing',
  FORGET_THINGS: 'forgetThings',

  // Rack actions
  RACK_REBOOT: 'rackReboot',
} as const

export type DeviceActionValue = (typeof DEVICE_ACTION)[keyof typeof DEVICE_ACTION]

/**
 * Batch action identifiers (`POST /auth/actions/voting/batch`) — each groups
 * a set of per-thing sub-actions under one `batchActionUID`.
 */
export const DEVICE_BATCH_ACTION = {
  MOVE_MINER: 'moveMiner',
  DELETE_MINER: 'deleteMiner',
  ATTACH_SPARE_PARTS: 'attachSpareParts',
  BULK_ADD_SPARE_PARTS: 'bulkAddSpareParts',
  BATCH_MOVE_SPARE_PARTS: 'batchMoveSpareParts',
  MOVE_BACK_FROM_MAINTENANCE_TO_CONTAINER: 'moveBackFromMaintenanceToContainer',
} as const

export type DeviceBatchActionValue = (typeof DEVICE_BATCH_ACTION)[keyof typeof DEVICE_BATCH_ACTION]

/** Miner power modes accepted by `setPowerMode`. */
export const POWER_MODE = {
  SLEEP: 'sleep',
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
} as const

export type PowerModeValue = (typeof POWER_MODE)[keyof typeof POWER_MODE]

/**
 * Cross-thing fan-out — instructs the backend to mirror the action onto
 * related things (e.g. a container power-mode change touching its miners).
 */
export type DeviceActionCrossThing = {
  type: string
  params: Record<string, unknown>
}

/**
 * A staged device-action submission — the shape `setAddPendingSubmissionAction`
 * queues and `submitActionMutation` posts (compatible with
 * {@link VotingActionPayload}; the local queue id is added by the store).
 */
export type DeviceActionSubmission = VotingActionPayload & {
  type: typeof VOTING_SUBMISSION_TYPE
  action: DeviceActionValue
  tags: string[]
  params: VotingActionParam[]
  crossThing?: DeviceActionCrossThing
}

/** One socket toggle inside a `switchSocket` action. */
export type SocketSwitch = {
  pdu: string
  socket: string
  enabled: boolean
}

/** Params for an `updateThing` action (position change / add / replace miner). */
export type UpdateThingParams = {
  id: string
  rackId: string
  code?: string
  info?: Record<string, unknown>
  opts?: Record<string, unknown>
}

/** `{ type: 'container', params: { containers } }` fan-out for miner-level actions. */
export const buildContainerCrossThing = (containers: string[]): DeviceActionCrossThing => ({
  type: 'container',
  params: { containers },
})

/** `{ type: 'miner', params: { containers } }` fan-out for container-level actions. */
export const buildMinerCrossThing = (containers: string[]): DeviceActionCrossThing => ({
  type: 'miner',
  params: { containers },
})

/**
 * Core submission assembler. Prefer the per-action builders below — they pin
 * each action's param arity/encoding; this is the escape hatch for actions
 * without a dedicated builder. `extras` is spread first so it can never
 * override the pinned submission fields.
 */
export const buildDeviceActionSubmission = (
  action: DeviceActionValue,
  tags: string[],
  params: VotingActionParam[] = [],
  extras: Record<string, unknown> = {},
): DeviceActionSubmission => ({
  ...extras,
  type: VOTING_SUBMISSION_TYPE,
  action,
  tags,
  params,
})

/** Optional-`crossThing` extras fragment for the fan-out-capable builders. */
const withCrossThing = (crossThing?: DeviceActionCrossThing): Record<string, unknown> =>
  crossThing ? { crossThing } : {}

/** `reboot` — no params. */
export const buildRebootAction = (tags: string[]): DeviceActionSubmission =>
  buildDeviceActionSubmission(DEVICE_ACTION.REBOOT, tags)

/** `setPowerMode` — single power-mode param, optional container fan-out. */
export const buildSetPowerModeAction = (
  tags: string[],
  mode: PowerModeValue,
  crossThing?: DeviceActionCrossThing,
): DeviceActionSubmission =>
  buildDeviceActionSubmission(
    DEVICE_ACTION.SET_POWER_MODE,
    tags,
    [mode],
    withCrossThing(crossThing),
  )

/** `setPowerPct` — percentage encoded as a string, optional container fan-out. */
export const buildSetPowerPctAction = (
  tags: string[],
  percentage: number,
  crossThing?: DeviceActionCrossThing,
): DeviceActionSubmission =>
  buildDeviceActionSubmission(
    DEVICE_ACTION.SET_POWER_PCT,
    tags,
    [String(percentage)],
    withCrossThing(crossThing),
  )

/** `setLED` — single boolean param. */
export const buildSetLedAction = (tags: string[], isOn: boolean): DeviceActionSubmission =>
  buildDeviceActionSubmission(DEVICE_ACTION.SET_LED, tags, [isOn])

/** `switchContainer` — single boolean param. */
export const buildSwitchContainerAction = (
  tags: string[],
  isOn: boolean,
): DeviceActionSubmission =>
  buildDeviceActionSubmission(DEVICE_ACTION.SWITCH_CONTAINER, tags, [isOn])

/** `switchCoolingSystem` — single boolean param, optional miner fan-out. */
export const buildSwitchCoolingSystemAction = (
  tags: string[],
  isOn: boolean,
  crossThing?: DeviceActionCrossThing,
): DeviceActionSubmission =>
  buildDeviceActionSubmission(
    DEVICE_ACTION.SWITCH_COOLING_SYSTEM,
    tags,
    [isOn],
    withCrossThing(crossThing),
  )

/** `setTankEnabled` — positional `[tankNumber, isOn]`. */
export const buildSetTankEnabledAction = (
  tags: string[],
  tankNumber: number,
  isOn: boolean,
): DeviceActionSubmission =>
  buildDeviceActionSubmission(DEVICE_ACTION.SET_TANK_ENABLED, tags, [tankNumber, isOn])

/** `setAirExhaustEnabled` — single boolean param. */
export const buildSetAirExhaustEnabledAction = (
  tags: string[],
  isOn: boolean,
): DeviceActionSubmission =>
  buildDeviceActionSubmission(DEVICE_ACTION.SET_AIR_EXHAUST_ENABLED, tags, [isOn])

/** `resetAlarm` — no params. */
export const buildResetAlarmAction = (tags: string[]): DeviceActionSubmission =>
  buildDeviceActionSubmission(DEVICE_ACTION.RESET_ALARM, tags)

/** `switchSocket` — one `{ pdu, socket, enabled }` param per toggled socket. */
export const buildSwitchSocketAction = (
  tags: string[],
  sockets: SocketSwitch[],
): DeviceActionSubmission =>
  buildDeviceActionSubmission(DEVICE_ACTION.SWITCH_SOCKET, tags, sockets)

/** `setPlcRegisters` (Gamma) — single `{ register: value }` map param. */
export const buildSetPlcRegistersAction = (
  tags: string[],
  registers: Record<string, unknown>,
): DeviceActionSubmission =>
  buildDeviceActionSubmission(DEVICE_ACTION.SET_PLC_REGISTERS, tags, [registers])

/**
 * One `updateThing` entry inside a move/add/replace-miner batch — carries the
 * miner's new rack/position/network config plus the owning `minerId` the
 * backend uses to group batch progress.
 */
export const buildUpdateThingBatchEntry = (
  params: UpdateThingParams,
  minerId: string = params.id,
): VotingActionPayload => ({
  action: DEVICE_ACTION.UPDATE_THING,
  params: [params],
  minerId,
})
