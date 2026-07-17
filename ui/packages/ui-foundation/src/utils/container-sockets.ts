/**
 * Container PDU / socket transform — the pure port of the reference app's
 * `DetailsView` socket machinery (`getSocketInfo`, `getPduByIndex`,
 * `findAndSetSelectedSockets`) and the `containerPdu` index helpers.
 *
 * Given the container detail snapshots (which carry
 * `last.snap.stats.container_specific.pdu_data`), the per-container selected
 * device-tag map, and the flat list of selected miners, this derives the
 * `selectedSockets` shape the devices store holds — WITHOUT dispatching. The
 * adapter/devkit feeds the result to `setSelectedSockets`.
 *
 * Vendor dispatch mirrors the reference app: it reads the container NAME
 * (`info.container`) and routes through the same substring predicates
 * (`isAntspaceHydroContainer` / `isAntspaceImmersionContainer`), with
 * Bitdeer / MicroBT as the fallback that joins the live PDU row.
 *
 * @category op-centre
 */

import { isAntspaceHydroContainer, isAntspaceImmersionContainer } from './container-tabs'
import { isMiner } from './device-tags'

/** A socket entry as it arrives on `pdu_data[].sockets[]`. */
export type PduSocketSnapshot = {
  socket: string
  enabled?: boolean
  cooling?: boolean
  [key: string]: unknown
}

/** A PDU entry on `last.snap.stats.container_specific.pdu_data`. */
export type PduSnapshot = {
  pdu: string
  sockets?: PduSocketSnapshot[]
  power_w?: number | string
  current_a?: number | string
  offline?: boolean
  [key: string]: unknown
}

/** The subset of a container detail snapshot the socket transform reads. */
export type ContainerSnapshotForSockets = {
  type?: string
  info?: { container?: string; pos?: string; [key: string]: unknown }
  last?: {
    snap?: {
      stats?: {
        container_specific?: { pdu_data?: PduSnapshot[] }
      }
    }
  }
  [key: string]: unknown
}

/** The subset of a miner the transform matches sockets against by position. */
export type MinerForSocket = {
  id: string
  type?: string
  info?: { pos?: string; container?: string; [key: string]: unknown }
  [key: string]: unknown
}

/**
 * A derived socket, structurally compatible with the store's `SocketData`.
 * `pduIndex` / `socketIndex` stay strings here (positions such as `a1` are
 * not numeric) — the store's looser `SocketData` type is cast at the adapter
 * boundary, exactly as the reference app does.
 */
export type DerivedSocket = {
  containerId: string
  minerId: string
  pduIndex: string
  socketIndex: string
  miner?: MinerForSocket
  enabled?: boolean
  cooling?: boolean
  [key: string]: unknown
}

/** The `pdu_data` array off a container detail snapshot, or undefined. */
export const getPduData = (
  last: ContainerSnapshotForSockets['last'],
): PduSnapshot[] | undefined => last?.snap?.stats?.container_specific?.pdu_data

/**
 * The first `count` underscore-delimited segments of `pos`, or `[]` when there
 * are fewer than `count`. Splitting (rather than matching adjacent `[^_]+`
 * capture groups) keeps this linear and avoids the polynomial-backtracking
 * ReDoS that an unanchored regex incurs on long delimiter-free input.
 */
const leadingSegments = (pos: string, count: number): string[] => {
  const parts = pos.split("_")
  return parts.length >= count ? parts.slice(0, count) : []
}

/** Bitdeer / MicroBT position → `[pdu, socket]`. */
export const getBitdeerIndexes = (pos: string): string[] =>
  leadingSegments(pos, 2)

/** Antspace Hydro position → `[rack, pdu, socket]`. */
export const getAntspaceHydroIndexes = (pos: string): string[] =>
  leadingSegments(pos, 3)

/** Antspace Immersion position → `[pdu, socket]`. */
export const getAntspaceImmersionIndexes = (pos: string): string[] =>
  leadingSegments(pos, 2)

/** The PDU row whose `pdu` matches `pduIndex` on this container, or undefined. */
export const getPduByIndex = (
  container: ContainerSnapshotForSockets | undefined,
  pduIndex: string | number,
): PduSnapshot | undefined => {
  const pduData = getPduData(container?.last)
  if (!pduData) {
    return undefined
  }
  return pduData.find((pdu) => String(pdu?.pdu) === String(pduIndex))
}

/** The selected miner sitting at `pos`, if any (miners only, exact position). */
export const getConnectedMinerForSocket = (
  devices: MinerForSocket[] | undefined,
  pos: string,
): MinerForSocket | undefined =>
  (devices ?? []).find((device) => isMiner(device.type) && device.info?.pos === pos)

/**
 * Resolve one socket for `pos` on `container`: pick the vendor index scheme
 * off the container name, then (for Bitdeer / MicroBT) join the live PDU row
 * so `enabled` / `cooling` reflect the snapshot. Hydro / Immersion have no
 * live socket table, so they report `enabled: true`.
 */
export const getSocketInfo = (
  container: ContainerSnapshotForSockets,
  pos: string,
  allDevices: MinerForSocket[] | undefined,
): DerivedSocket => {
  const miner = getConnectedMinerForSocket(allDevices, pos)
  const containerTag = container.info?.container
  const base = { containerId: containerTag ?? "", minerId: miner?.id ?? "", miner }

  if (!containerTag) {
    return { ...base, pduIndex: "", socketIndex: pos }
  }

  if (isAntspaceHydroContainer(containerTag)) {
    const [rack, pdu, socketIndex] = getAntspaceHydroIndexes(pos)
    return {
      ...base,
      pduIndex: `${rack ?? ""}_${pdu ?? ""}`,
      socketIndex: socketIndex ?? "",
      enabled: true,
    }
  }

  if (isAntspaceImmersionContainer(containerTag)) {
    const [pduIndex, socketIndex] = getAntspaceImmersionIndexes(pos)
    return { ...base, pduIndex: pduIndex ?? "", socketIndex: socketIndex ?? "", enabled: true }
  }

  const [pduIndex, socketIndex] = getBitdeerIndexes(pos)
  const row = getPduByIndex(container, pduIndex ?? "")
  if (!row?.sockets) {
    return { ...base, pduIndex: pduIndex ?? "", socketIndex: socketIndex ?? "" }
  }
  const socket = row.sockets.find((s) => String(s?.socket) === String(socketIndex))
  return {
    ...socket,
    ...base,
    enabled: socket?.enabled,
    cooling: socket?.cooling,
    pduIndex: pduIndex ?? "",
    socketIndex: socketIndex ?? "",
  }
}

/**
 * Derive the store's `selectedSockets` map (keyed by container tag) from the
 * selected device-tags — the pure body of the reference app's `findAndSetSelectedSockets`.
 * Each per-container tag key (`pos-…` / `id-…`) is stripped of its `pos-`
 * prefix and resolved through {@link getSocketInfo}. Containers with no
 * selected tags are omitted.
 */
export const deriveSelectedSockets = (
  containers: ContainerSnapshotForSockets[] | undefined,
  selectedDevicesTags: Record<string, Record<string, unknown>>,
  allDevices: MinerForSocket[] | undefined,
): Record<string, { sockets: DerivedSocket[] }> => {
  const result: Record<string, { sockets: DerivedSocket[] }> = {}
  for (const container of containers ?? []) {
    const containerTag = container.info?.container
    if (!containerTag) {
      continue
    }
    const tags = selectedDevicesTags[containerTag]
    if (!tags) {
      continue
    }
    result[containerTag] = {
      sockets: Object.keys(tags).map((tagKey) =>
        getSocketInfo(container, tagKey.replace(/^pos-/, ""), allDevices),
      ),
    }
  }
  return result
}
