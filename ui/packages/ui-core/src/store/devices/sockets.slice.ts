import type { StateCreator } from 'zustand/vanilla'
import type { DevicesStore, SocketData } from './types'

/** Selected miner sockets, grouped per container. */
export type SocketsSlice = Pick<
  DevicesStore,
  | 'selectedSockets'
  | 'setSelectedSockets'
  | 'setSelectSocket'
  | 'removeSelectedSocket'
  | 'setMultipleSelectedSockets'
  | 'removeMultipleSelectedSockets'
>

export const createSocketsSlice: StateCreator<DevicesStore, [], [], SocketsSlice> = (set) => ({
  selectedSockets: {},

  setSelectedSockets: (sockets) => set({ selectedSockets: sockets }),

  setSelectSocket: (socket) =>
    set((s) => {
      const existing = s.selectedSockets[socket.containerId]
      const next = { ...s.selectedSockets }
      next[socket.containerId] = existing
        ? { sockets: [...existing.sockets, socket] }
        : { sockets: [socket] }
      return { selectedSockets: next }
    }),

  removeSelectedSocket: ({ containerId, minerId }) =>
    set((s) => {
      const container = s.selectedSockets[containerId]
      if (!container) return s
      const sockets = container.sockets.filter(({ miner }) => miner.id !== minerId)
      const next = { ...s.selectedSockets }
      if (sockets.length === 0) delete next[containerId]
      else next[containerId] = { sockets }
      return { selectedSockets: next }
    }),

  setMultipleSelectedSockets: (sockets) =>
    set(() => {
      const grouped: Record<string, { sockets: SocketData[] }> = {}
      for (const socket of sockets) {
        const { containerId } = socket
        const bucket = grouped[containerId] ?? { sockets: [] }
        const exists = bucket.sockets.some(
          (s) => s.pduIndex === socket.pduIndex && s.socketIndex === socket.socketIndex,
        )
        if (!exists) bucket.sockets.push(socket)
        grouped[containerId] = bucket
      }
      return { selectedSockets: grouped }
    }),

  removeMultipleSelectedSockets: (sockets) =>
    // Removes the exact (pduIndex, socketIndex) tuples per container.
    // Note: the original Redux slice used `&&` between the coordinate
    // comparisons, which incorrectly removed any socket sharing either
    // coordinate. We use `||` here so only exact matches are removed.
    set((s) => {
      const next = { ...s.selectedSockets }
      for (const socket of sockets) {
        const container = next[socket.containerId]
        if (!container) continue
        const remaining = container.sockets.filter(
          ({ pduIndex, socketIndex }) =>
            pduIndex !== socket.pduIndex || socketIndex !== socket.socketIndex,
        )
        if (remaining.length === 0) delete next[socket.containerId]
        else next[socket.containerId] = { sockets: remaining }
      }
      return { selectedSockets: next }
    }),
})
