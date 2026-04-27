import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

export const NO_CONTAINER_KEY = 'NO_CONTAINER'

type DevicePayload = {
  id: string
  [key: string]: unknown
}

type DeviceTagPayload = {
  id: string
  info: {
    pos?: string
    container?: string
    [key: string]: unknown
  }
}

export type SocketData = {
  containerId: string
  minerId: string
  pduIndex: number
  socketIndex: number
  miner: {
    id: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

type SocketPayload = SocketData & {
  containerId: string
  minerId: string
  pduIndex: number
  socketIndex: number
}

type RemoveSocketPayload = {
  containerId: string
  minerId: string
}

export type DeviceTag = {
  isPosTag: boolean
  minerId: string
}

export type DevicesState = {
  selectedDevices: DevicePayload[]
  selectedSockets: Record<string, { sockets: SocketData[] }>
  filterTags: string[]
  selectedDevicesTags: Record<string, Record<string, DeviceTag>>
  selectedContainers: Record<string, DevicePayload>
  selectedLvCabinets: Record<string, DevicePayload>
}

const initialState: DevicesState = {
  selectedDevices: [],
  selectedSockets: {},
  filterTags: [],
  selectedDevicesTags: {},
  selectedContainers: {},
  selectedLvCabinets: {},
}

const getTags = (
  payload: DeviceTagPayload,
): { minerId: string; posTag: string | undefined; containerTag: string | undefined } => {
  const { id, info } = payload
  return { minerId: id, posTag: info.pos, containerTag: info.container }
}

export const devicesSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    selectContainer: (state, { payload }: PayloadAction<DevicePayload>) => {
      state.selectedContainers[payload.id] = payload
    },

    selectLVCabinet: (state, { payload }: PayloadAction<DevicePayload>) => {
      state.selectedLvCabinets[payload.id] = payload
    },

    removeSelectedContainer: (state, { payload }: PayloadAction<DevicePayload>) => {
      delete state.selectedContainers[payload.id]
    },

    removeSelectedLVCabinet: (state, { payload }: PayloadAction<DevicePayload>) => {
      delete state.selectedLvCabinets[payload.id]
    },

    selectMultipleContainers: (state, { payload }: PayloadAction<DevicePayload[]>) => {
      payload.forEach((device) => {
        state.selectedContainers[device.id] = { ...device }
      })
    },

    removeMultipleContainers: (state, { payload }: PayloadAction<DevicePayload[]>) => {
      payload.forEach((device) => {
        delete state.selectedContainers[device.id]
      })
    },

    setSelectedDevices: (state, { payload }: PayloadAction<DevicePayload[]>) => {
      state.selectedDevices = payload
    },

    setSelectedLvCabinets: (state, { payload }: PayloadAction<Record<string, DevicePayload>>) => {
      state.selectedLvCabinets = payload
    },

    setMultipleSelectedDevices: (state, { payload }: PayloadAction<DevicePayload[]>) => {
      const prevSelectedIds = state.selectedDevices.map((device) => device.id)
      payload.forEach((newDevice) => {
        if (!prevSelectedIds.includes(newDevice.id)) {
          state.selectedDevices.push(newDevice)
        }
      })
    },

    removeMultipleSelectedDevices: (state, { payload }: PayloadAction<string[]>) => {
      payload.forEach((deviceId) => {
        state.selectedDevices = state.selectedDevices.filter(
          (selectedDevice) => selectedDevice.id !== deviceId,
        )
      })
    },

    setSelectDevice: (state, { payload }: PayloadAction<DevicePayload>) => {
      state.selectedDevices.push(payload)
    },

    removeSelectedDevice: (state, { payload }: PayloadAction<string>) => {
      state.selectedDevices = state.selectedDevices.filter((device) => device.id !== payload)
    },

    setFilterTags: (state, { payload }: PayloadAction<string[]>) => {
      state.filterTags = payload.map((item) => item.trim())
    },

    removeFilterTag: (state, { payload }: PayloadAction<string>) => {
      state.filterTags = state.filterTags.filter(
        (tag) => tag.toLocaleLowerCase() !== payload?.toLocaleLowerCase(),
      )
    },

    setSelectedSockets: (
      state,
      { payload }: PayloadAction<Record<string, { sockets: SocketData[] }>>,
    ) => {
      state.selectedSockets = payload
    },

    setSelectSocket: (state, { payload }: PayloadAction<SocketPayload>) => {
      const existingContainer = state.selectedSockets[payload.containerId]
      if (existingContainer) {
        existingContainer.sockets.push(payload)
      } else {
        state.selectedSockets[payload.containerId] = { sockets: [payload] }
      }
    },

    removeSelectedSocket: (state, { payload }: PayloadAction<RemoveSocketPayload>) => {
      const container = state.selectedSockets[payload.containerId]
      if (!container) return

      container.sockets = container.sockets.filter(({ miner }) => miner.id !== payload.minerId)

      if (container.sockets.length === 0) {
        delete state.selectedSockets[payload.containerId]
      }
    },

    setMultipleSelectedSockets: (state, { payload }: PayloadAction<SocketPayload[]>) => {
      const segregatedData: Record<string, { sockets: SocketPayload[] }> = {}

      payload.forEach((socket) => {
        const { containerId } = socket
        if (!segregatedData[containerId]) {
          segregatedData[containerId] = { sockets: [] }
        }

        const socketsArray = segregatedData[containerId].sockets
        const socketExists = socketsArray.some(
          (s) => s.pduIndex === socket.pduIndex && s.socketIndex === socket.socketIndex,
        )

        if (!socketExists) {
          socketsArray.push(socket)
        }
      })

      state.selectedSockets = segregatedData
    },

    removeMultipleSelectedSockets: (state, { payload }: PayloadAction<SocketPayload[]>) => {
      payload.forEach((socket) => {
        const { containerId } = socket
        const container = state.selectedSockets[containerId]
        if (!container) return

        payload.forEach((payloadSocket) => {
          container.sockets = container.sockets.filter(
            ({ pduIndex, socketIndex }) =>
              pduIndex !== payloadSocket.pduIndex && socketIndex !== payloadSocket.socketIndex,
          )
        })

        if (container.sockets.length === 0) {
          delete state.selectedSockets[containerId]
        }
      })
    },

    setResetSelections: (state) => {
      state.selectedDevices = []
      state.selectedSockets = {}
      state.selectedDevicesTags = {}
      state.selectedContainers = {}
      state.selectedLvCabinets = {}
    },

    resetSelectedDevicesTags: (state) => {
      state.selectedDevicesTags = {}
      state.selectedDevices = []
      state.selectedSockets = {}
    },

    selectDeviceTag: (state, { payload }: PayloadAction<DeviceTagPayload>) => {
      const { minerId, posTag, containerTag } = getTags(payload)

      if (!containerTag) {
        if (!state.selectedDevicesTags[NO_CONTAINER_KEY]) {
          state.selectedDevicesTags[NO_CONTAINER_KEY] = {}
        }
        state.selectedDevicesTags[NO_CONTAINER_KEY][`id-${minerId}`] = {
          isPosTag: false,
          minerId,
        }
        return
      }

      if (!state.selectedDevicesTags[containerTag]) {
        state.selectedDevicesTags[containerTag] = {}
      }

      if (posTag && !state.selectedDevicesTags[containerTag][`id-${minerId}`]) {
        state.selectedDevicesTags[containerTag][`pos-${posTag}`] = {
          isPosTag: true,
          minerId,
        }
        return
      }

      state.selectedDevicesTags[containerTag][`id-${minerId}`] = {
        isPosTag: false,
        minerId,
      }
    },

    removeDeviceTag: (state, { payload }: PayloadAction<DeviceTagPayload>) => {
      const { minerId, posTag, containerTag } = getTags(payload)

      if (!containerTag) {
        if (state.selectedDevicesTags[NO_CONTAINER_KEY]) {
          delete state.selectedDevicesTags[NO_CONTAINER_KEY][`id-${minerId}`]
        }
        return
      }

      const container = state.selectedDevicesTags[containerTag]
      if (!container) return

      delete container[`id-${minerId}`]

      if (posTag) {
        delete container[`pos-${posTag}`]
      }

      if (Object.keys(container).length === 0) {
        delete state.selectedDevicesTags[containerTag]
      }
    },
  },
  selectors: {
    selectSelectedDevices: ({ selectedDevices }): DevicePayload[] => selectedDevices,
    selectSelectedContainers: ({ selectedContainers }): Record<string, unknown> =>
      selectedContainers,
    selectSelectedLVCabinets: ({ selectedLvCabinets }): Record<string, unknown> =>
      selectedLvCabinets,
    selectSelectedSockets: ({ selectedSockets }): Record<string, { sockets: SocketData[] }> =>
      selectedSockets,
    selectFilterTags: ({ filterTags }): string[] => filterTags,
    selectSelectedDeviceTags: ({
      selectedDevicesTags,
    }): Record<string, Record<string, DeviceTag>> => selectedDevicesTags,
  },
})

export const {
  selectContainer,
  selectLVCabinet,
  removeSelectedContainer,
  removeSelectedLVCabinet,
  selectMultipleContainers,
  removeMultipleContainers,
  setSelectedDevices,
  setSelectedLvCabinets,
  setMultipleSelectedDevices,
  removeMultipleSelectedDevices,
  setSelectDevice,
  removeSelectedDevice,
  setFilterTags,
  removeFilterTag,
  setSelectedSockets,
  setSelectSocket,
  removeSelectedSocket,
  setMultipleSelectedSockets,
  removeMultipleSelectedSockets,
  setResetSelections,
  resetSelectedDevicesTags,
  selectDeviceTag,
  removeDeviceTag,
} = devicesSlice.actions

export const {
  selectFilterTags,
  selectSelectedContainers,
  selectSelectedDeviceTags,
  selectSelectedDevices,
  selectSelectedLVCabinets,
  selectSelectedSockets,
} = devicesSlice.selectors

export default devicesSlice.reducer
