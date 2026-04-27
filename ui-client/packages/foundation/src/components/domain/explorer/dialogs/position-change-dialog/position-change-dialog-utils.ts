import type { UnknownRecord } from '@mdk/core'
import type { Device, PosHistoryEntry } from '../../../../../types'

export const getPosHistory = (selectedSocketToReplace: UnknownRecord): PosHistoryEntry[] => {
  const containerInfo = selectedSocketToReplace?.containerInfo as UnknownRecord | undefined
  const miner = selectedSocketToReplace?.miner as Device | undefined

  // Access existing history safely
  const existingHistory = miner?.info?.posHistory as PosHistoryEntry[] | undefined

  const containerName = (containerInfo?.container as string) || ''
  const selectedSocketToReplacePos = selectedSocketToReplace?.pos as string | undefined

  // Determine the position string: use explicit 'pos' or fallback to pdu_socket format
  const currentPos =
    selectedSocketToReplacePos ||
    `${selectedSocketToReplace?.pdu}_${selectedSocketToReplace?.socket}`

  const newEntry: PosHistoryEntry = {
    container: containerName,
    pos: currentPos,
    removedAt: Date.now(),
  }

  if (Array.isArray(existingHistory)) {
    return [newEntry, ...existingHistory]
  }

  return [newEntry]
}
